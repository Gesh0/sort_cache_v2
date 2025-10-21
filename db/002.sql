-- Notify on new job insertion (kickstart worker)
CREATE OR REPLACE FUNCTION notify_new_job()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_job', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_insert
AFTER INSERT ON job_queue
FOR EACH ROW
EXECUTE FUNCTION notify_new_job();

-- Notify on ingest_acc completion (check if queue empty, derive if yes)
CREATE OR REPLACE FUNCTION notify_ingest_complete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('ingest_complete', NEW.batch_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingest_acc_insert
AFTER INSERT ON ingest_acc
FOR EACH ROW
EXECUTE FUNCTION notify_ingest_complete();

-- Notify on sort_map update (check if queue empty, derive if yes)
CREATE OR REPLACE FUNCTION notify_sortmap_complete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('sortmap_complete', NEW.batch_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sort_map_insert
AFTER INSERT ON sort_map
FOR EACH ROW
EXECUTE FUNCTION notify_sortmap_complete();