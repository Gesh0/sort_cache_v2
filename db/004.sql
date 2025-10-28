-- ----------------------------------------------------------------------------
-- Transform raw ingest data to accumulated state
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transform_to_acc()
RETURNS TRIGGER AS $$
DECLARE
  v_new_job_ref INTEGER;
BEGIN
  SELECT MAX(job_ref) INTO v_new_job_ref FROM ingest_raw;

  WITH 
  new_state AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      LEFT(logistics_point_name, 3) AS numeration,
      updated_at
    FROM ingest_raw
    WHERE job_ref = v_new_job_ref
    ORDER BY serial_number, updated_at DESC
  ),
  prev_state AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      numeration,
      updated_at
    FROM ingest_acc
    WHERE job_ref < v_new_job_ref
    ORDER BY serial_number, job_ref DESC
  ),
  active_prev AS (
    SELECT ps.*
    FROM prev_state ps
    WHERE NOT EXISTS (
      SELECT 1 FROM scan_log
      WHERE serial_number = ps.serial_number
      AND created_at < NOW() - INTERVAL '7 days'
    )
  ),
  merged AS (
    SELECT * FROM active_prev
    WHERE serial_number NOT IN (SELECT serial_number FROM new_state)
    UNION ALL
    SELECT * FROM new_state
  )
  
  INSERT INTO ingest_acc (job_ref, serial_number, numeration, updated_at)
  SELECT v_new_job_ref, serial_number, numeration, updated_at
  FROM merged;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transform_acc_trigger
  AFTER INSERT ON ingest_raw
  FOR EACH STATEMENT
  EXECUTE FUNCTION transform_to_acc();

-- ----------------------------------------------------------------------------
-- Process sortmap job inline
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Derive cache from latest accumulated state and sortmap
-- ----------------------------------------------------------------------------
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
