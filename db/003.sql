-- ----------------------------------------------------------------------------
-- Start trigger: fires when new job inserted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION job_queue_start()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_queue(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_start_trigger
  AFTER INSERT ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION job_queue_start();

-- ----------------------------------------------------------------------------
-- Continue trigger: fires when results written
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION results_continue()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM process_queue();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION job_events_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  v_job_ref INTEGER;
  v_row_count INTEGER;
BEGIN
  IF NEW.event_type = 'raw_inserted' THEN
    v_job_ref := NEW.job_id;

    WITH
    new_state AS (
      SELECT DISTINCT ON (serial_number)
        serial_number,
        LEFT(logistics_point_name, 3) AS numeration,
        updated_at
      FROM ingest_raw
      WHERE job_ref = v_job_ref
      ORDER BY serial_number, updated_at DESC
    ),
    prev_state AS (
      SELECT DISTINCT ON (serial_number)
        serial_number,
        numeration,
        updated_at
      FROM ingest_acc
      WHERE job_ref < v_job_ref
        AND job_ref >= GREATEST(v_job_ref - 100, 1)  -- Lookback window: max 100 jobs
        AND updated_at >= NOW() - INTERVAL '21 days'  -- Time-based cutoff
      ORDER BY serial_number, job_ref DESC
    ),
    active_prev AS (
      SELECT ps.*
      FROM prev_state ps
      LEFT JOIN (
        SELECT DISTINCT serial_number
        FROM scan_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
      ) sl ON ps.serial_number = sl.serial_number
      WHERE sl.serial_number IS NULL  -- Not scanned in last 7 days
    ),
    merged AS (
      SELECT ap.*
      FROM active_prev ap
      LEFT JOIN new_state ns USING (serial_number)
      WHERE ns.serial_number IS NULL  -- Only items not in new_state
      UNION ALL
      SELECT * FROM new_state
    ),
    inserted AS (
      INSERT INTO ingest_acc (job_ref, serial_number, numeration, updated_at)
      SELECT v_job_ref, serial_number, numeration, updated_at
      FROM merged
      RETURNING *
    )
    SELECT COUNT(*) INTO v_row_count FROM inserted;

    INSERT INTO job_events (job_id, event_type, payload)
    VALUES (v_job_ref, 'acc_transformed', json_build_object('row_count', v_row_count));

  ELSIF NEW.event_type = 'acc_transformed' THEN
    INSERT INTO job_events (job_id, event_type, payload)
    VALUES (NEW.job_id, 'completed', NEW.payload);

  ELSIF NEW.event_type = 'completed' OR NEW.event_type = 'failed' THEN
    PERFORM process_queue();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_events_state_machine_trigger
  AFTER INSERT ON job_events
  FOR EACH ROW
  EXECUTE FUNCTION job_events_state_machine();