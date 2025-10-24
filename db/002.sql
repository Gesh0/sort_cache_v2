
-- FUNCTIONS

-- INGEST LOOP START

CREATE OR REPLACE FUNCTION job_queue_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type != 'ingest' THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 
    FROM job_queue jq
    WHERE jq.type = 'ingest'
      -- get latest job
      AND jq.id > COALESCE((SELECT MAX(id) FROM ingest_acc), 0)
      -- that is not newer than this job
      AND jq.id < NEW.id
      AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE ingest_acc.id = jq.id)
  ) THEN
    PERFORM pg_notify('ingest_worker', json_build_object(
      'job_id', (
        SELECT MIN(id) 
        FROM job_queue 
        WHERE type = 'ingest' 
          AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE ingest_acc.id = job_queue.id)
      ),
      'data', NEW.data
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_trigger
  AFTER INSERT ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION job_queue_check();

-- SORTMAP LOOP START

CREATE OR REPLACE FUNCTION process_sortmap_job(p_job_id INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sort_map (job_ref, numeration, port)
  SELECT 
    p_job_id,
    (item->>'numeration')::VARCHAR(3),
    (item->>'port')::INTEGER
  FROM jsonb_array_elements((SELECT data FROM job_queue WHERE id = p_job_id)) AS item;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION sortmap_queue_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type != 'sort_map' THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 
    FROM job_queue jq
    WHERE jq.type = 'sort_map'
      AND jq.id > COALESCE((SELECT MAX(job_ref) FROM sort_map), 0)
      AND jq.id < NEW.id
      AND NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = jq.id)
  ) THEN
    PERFORM process_sortmap_job((
      SELECT MIN(id) 
      FROM job_queue 
      WHERE type = 'sort_map' 
        AND NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = job_queue.id)
    ));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sortmap_queue_trigger
  AFTER INSERT ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION sortmap_queue_check();

