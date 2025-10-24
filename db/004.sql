CREATE OR REPLACE FUNCTION derive_cache(p_acc_ref INTEGER, p_sortmap_ref INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO derived_cache (acc_ref, sortmap_ref, serial_number, port)
  SELECT 
    ia.id,
    sm.id,
    ia.serial_number,
    sm.port
  FROM (
    SELECT DISTINCT ON (serial_number)
      id,
      serial_number,
      numeration
    FROM ingest_acc
    ORDER BY serial_number, id DESC
  ) ia
  JOIN sort_map sm ON ia.numeration = sm.numeration
  WHERE sm.job_ref = p_sortmap_ref;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE derivation_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_acc_ref INTEGER DEFAULT 0,
  last_sortmap_ref INTEGER DEFAULT 0,
  CHECK (id = 1)
);

INSERT INTO derivation_state (id) VALUES (1);

CREATE OR REPLACE FUNCTION results_queue_check()
RETURNS TRIGGER AS $$
DECLARE
  v_latest_acc INTEGER;
  v_latest_sortmap INTEGER;
  v_last_derived_acc INTEGER;
  v_last_derived_sortmap INTEGER;
BEGIN
  SELECT last_acc_ref, last_sortmap_ref INTO v_last_derived_acc, v_last_derived_sortmap FROM derivation_state;
  
  v_latest_acc := COALESCE((SELECT MAX(job_ref) FROM ingest_acc), 0);
  v_latest_sortmap := COALESCE((SELECT MAX(job_ref) FROM sort_map), 0);
  
  IF NOT EXISTS(
    SELECT 1 FROM job_queue
    WHERE type = 'ingest' AND id > v_latest_acc
      AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE job_ref = job_queue.id)
  ) AND NOT EXISTS(
    SELECT 1 FROM job_queue
    WHERE type = 'sort_map' AND id > v_latest_sortmap
      AND NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = job_queue.id)
  ) AND (v_latest_acc > v_last_derived_acc OR v_latest_sortmap > v_last_derived_sortmap) THEN
    
    PERFORM derive_cache(v_latest_acc, v_latest_sortmap);
    UPDATE derivation_state SET last_acc_ref = v_latest_acc, last_sortmap_ref = v_latest_sortmap;
    
  ELSE
    IF EXISTS(
      SELECT 1 FROM job_queue WHERE type = 'ingest'
        AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE job_ref = job_queue.id)
    ) THEN
      PERFORM pg_notify('ingest_worker', json_build_object(
        'job_id', (SELECT MIN(id) FROM job_queue WHERE type = 'ingest' AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE job_ref = job_queue.id)),
        'data', (SELECT data FROM job_queue WHERE id = (SELECT MIN(id) FROM job_queue WHERE type = 'ingest' AND NOT EXISTS (SELECT 1 FROM ingest_acc WHERE job_ref = job_queue.id)))
      )::text);
    END IF;
    
    IF EXISTS(
      SELECT 1 FROM job_queue WHERE type = 'sort_map'
        AND NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = job_queue.id)
    ) THEN
      PERFORM process_sortmap_job((SELECT MIN(id) FROM job_queue WHERE type = 'sort_map' AND NOT EXISTS (SELECT 1 FROM sort_map WHERE job_ref = job_queue.id)));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingest_acc_results_trigger
  AFTER INSERT ON ingest_acc
  FOR EACH STATEMENT
  EXECUTE FUNCTION results_queue_check();

CREATE TRIGGER sort_map_results_trigger
  AFTER INSERT ON sort_map
  FOR EACH STATEMENT
  EXECUTE FUNCTION results_queue_check();