CREATE OR REPLACE FUNCTION transform_to_acc()
RETURNS TRIGGER AS $$
DECLARE
  v_new_job_ref INTEGER;
BEGIN
  -- Get the latest job_ref that was just inserted
  SELECT MAX(job_ref) INTO v_new_job_ref FROM ingest_raw;

  WITH previous_raw AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      LEFT(logistics_point_name, 3) AS numeration,
      updated_at
    FROM ingest_raw
    WHERE job_ref < v_new_job_ref
    ORDER BY serial_number, updated_at DESC
  ),
  current_raw AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      LEFT(logistics_point_name, 3) AS numeration,
      updated_at
    FROM ingest_raw
    WHERE job_ref = v_new_job_ref
    ORDER BY serial_number, updated_at DESC
  ),
  combined_raw AS (
    SELECT * FROM previous_raw
    UNION ALL
    SELECT * FROM current_raw
  ),
  deduped_raw AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      numeration,
      updated_at
    FROM combined_raw
    ORDER BY serial_number, updated_at DESC
  ),
  previous_acc AS (
    SELECT DISTINCT ON (serial_number)
      serial_number,
      numeration,
      updated_at
    FROM ingest_acc
    WHERE job_ref < v_new_job_ref
    ORDER BY serial_number, job_ref DESC
  ),
  filtered_acc AS (
    SELECT *
    FROM previous_acc
    WHERE updated_at > NOW() - INTERVAL '21 days'
  ),
  merged_acc AS (
    SELECT * FROM filtered_acc
    WHERE serial_number NOT IN (SELECT serial_number FROM deduped_raw)
    UNION ALL
    SELECT * FROM deduped_raw
  )
  
  INSERT INTO ingest_acc (job_ref, serial_number, numeration, updated_at)
  SELECT v_new_job_ref, serial_number, numeration, updated_at
  FROM merged_acc;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transform_acc_trigger
  AFTER INSERT ON ingest_raw
  FOR EACH STATEMENT
  EXECUTE FUNCTION transform_to_acc();