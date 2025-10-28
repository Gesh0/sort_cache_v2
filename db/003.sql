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

CREATE TRIGGER ingest_acc_continue_trigger
  AFTER INSERT ON ingest_acc
  FOR EACH STATEMENT
  EXECUTE FUNCTION results_continue();

CREATE TRIGGER sort_map_continue_trigger
  AFTER INSERT ON sort_map
  FOR EACH STATEMENT
  EXECUTE FUNCTION results_continue();