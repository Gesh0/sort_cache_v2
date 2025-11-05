-- Migration 009: Preload Mode Fast Path
-- Skips expensive checks during bulk preload, runs cleanup at end

CREATE OR REPLACE FUNCTION is_preload_mode()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.preload_mode', true), '')::boolean, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION cleanup_after_preload()
RETURNS VOID AS $$
BEGIN
  DELETE FROM ingest_acc
  WHERE serial_number IN (
    SELECT DISTINCT serial_number
    FROM scan_log
    WHERE created_at >= NOW() - INTERVAL '7 days'
  )
  OR updated_at < NOW() - INTERVAL '21 days';

  DELETE FROM ingest_acc ia
  WHERE id NOT IN (
    SELECT DISTINCT ON (serial_number) id
    FROM ingest_acc
    ORDER BY serial_number, job_ref DESC
  );
END;
$$ LANGUAGE plpgsql;
