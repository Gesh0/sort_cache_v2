-- ----------------------------------------------------------------------------
-- Get incomplete jobs (jobs without results)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_incomplete_jobs(
  p_job_type TEXT,
  p_max_job_id INTEGER DEFAULT NULL
)
RETURNS TABLE(job_id INTEGER, job_data JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT jq.id, jq.data
  FROM job_queue jq
  WHERE jq.type = p_job_type
    AND (p_max_job_id IS NULL OR jq.id < p_max_job_id)
    AND CASE
      WHEN p_job_type = 'ingest' THEN
        NOT EXISTS (SELECT 1 FROM ingest_acc WHERE job_ref = jq.id)
      WHEN p_job_type = 'sort_map' THEN
        NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = jq.id)
    END
  ORDER BY jq.id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Try to acquire lock and process job
-- Returns true if processed, false if lock failed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_process_job(
  p_job_type TEXT, 
  p_job_id INTEGER, 
  p_job_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT pg_try_advisory_xact_lock(p_job_id) THEN
    RETURN false;
  END IF;
  
  IF p_job_type = 'ingest' THEN
    PERFORM pg_notify('ingest_worker', json_build_object(
      'job_id', p_job_id,
      'data', p_job_data
    )::text);
  ELSIF p_job_type = 'sort_map' THEN
    PERFORM process_sortmap_job(p_job_id);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Unified queue processor
-- Processes incomplete jobs or derives cache when ready
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_queue(p_max_job_id INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_job RECORD;
  v_latest_acc INTEGER;
  v_latest_sortmap INTEGER;
  v_derived_acc INTEGER;
  v_derived_sortmap INTEGER;
BEGIN
  -- PHASE 1: Try to process incomplete jobs
  FOR v_job IN 
    SELECT * FROM get_incomplete_jobs('ingest', p_max_job_id)
    UNION ALL
    SELECT * FROM get_incomplete_jobs('sort_map', p_max_job_id)
    ORDER BY job_id
  LOOP
    IF try_process_job(
      (SELECT type FROM job_queue WHERE id = v_job.job_id),
      v_job.job_id,
      v_job.job_data
    ) THEN
      RETURN 'PROCESSED_JOB_' || v_job.job_id;
    END IF;
  END LOOP;
  
  -- PHASE 2: Check if derivation needed
  IF NOT EXISTS(SELECT 1 FROM get_incomplete_jobs('ingest', p_max_job_id))
     AND NOT EXISTS(SELECT 1 FROM get_incomplete_jobs('sort_map', p_max_job_id))
  THEN
    v_latest_acc := COALESCE((SELECT MAX(job_ref) FROM ingest_acc), 0);
    v_latest_sortmap := COALESCE((SELECT MAX(job_ref) FROM sort_map), 0);
    v_derived_acc := COALESCE((SELECT MAX(acc_ref) FROM derived_cache), 0);
    v_derived_sortmap := COALESCE((SELECT MAX(sortmap_ref) FROM derived_cache), 0);
    
    IF v_latest_acc > v_derived_acc OR v_latest_sortmap > v_derived_sortmap THEN
      PERFORM derive_cache(v_latest_acc, v_latest_sortmap);
      RETURN 'DERIVED';
    END IF;
  END IF;
  
  RETURN 'IDLE';
END;
$$ LANGUAGE plpgsql;