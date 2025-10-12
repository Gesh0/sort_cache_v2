CREATE OR REPLACE FUNCTION notify_worker() RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.type
        WHEN 'ingest' THEN
            PERFORM pg_notify('ingest_worker_channel', NEW.id::text);
        WHEN 'id_map' THEN
            PERFORM pg_notify('id_map_worker_channel', NEW.id::text);
        WHEN 'sort_map' THEN
            PERFORM pg_notify('sort_map_worker_channel', NEW.id::text);
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_notify
AFTER INSERT ON job_queue
FOR EACH ROW EXECUTE FUNCTION notify_worker();