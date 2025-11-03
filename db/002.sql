-- ----------------------------------------------------------------------------
-- Get incomplete jobs (jobs without completed/failed events)
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
      AND (p_max_job_id IS NULL OR jq.id <= p_max_job_id)
      AND NOT EXISTS (
      SELECT 1 FROM job_events je
      WHERE je.job_id = jq.id
      AND je.event_type IN ('completed', 'failed')
    )
    AND NOT EXISTS (
      SELECT 1 FROM job_events je
      WHERE je.job_id = jq.id
      AND je.event_type IN ('notified', 'worker_started', 'raw_inserted', 'acc_transformed', 'sortmap_written')
    )
    AND (
      jq.id = 1
      OR EXISTS (
        SELECT 1 FROM job_events je
        WHERE je.job_id = jq.id - 1
        AND je.event_type = 'completed'
      )
    )
  ORDER BY jq.id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Process job and log event
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION try_process_job(
  p_job_type TEXT,
  p_job_id INTEGER,
  p_job_data JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO job_events (job_id, event_type) VALUES (p_job_id, 'notified');

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