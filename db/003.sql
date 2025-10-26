CREATE OR REPLACE FUNCTION transform_to_acc()
RETURNS TRIGGER AS $$
DECLARE
  v_new_job_ref INTEGER;
BEGIN
  SELECT MAX(job_ref) INTO v_new_job_ref FROM ingest_raw;

  WITH 
  -- Get latest state from new raw data
  new_state AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      LEFT(logistics_point_name, 3) AS numeration,
      updated_at
    FROM ingest_raw
    WHERE job_ref = v_new_job_ref
    ORDER BY serial_number, updated_at DESC
  ),
  -- Get all previous accumulated state
  prev_state AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      numeration,
      updated_at
    FROM ingest_acc
    WHERE job_ref < v_new_job_ref
    ORDER BY serial_number, job_ref DESC
  ),
  -- Remove parcels scanned more than 7 days ago
  active_prev AS (
    SELECT ps.*
    FROM prev_state ps
    WHERE NOT EXISTS (
      SELECT 1 FROM scan_log
      WHERE serial_number = ps.serial_number
      AND created_at < NOW() - INTERVAL '7 days'
    )
  ),
  -- Merge: new data overwrites old, keep unscanned old data
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