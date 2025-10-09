CREATE TABLE queue (
  base_id SERIAL PRIMARY KEY,
  prev_id INTEGER REFERENCES queue(base_id),
  target VARCHAR(50) NOT NULL CHECK (target IN ('IngestBatch', 'DeriveChain')),
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'completed', 'failed')),
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_prev_id ON queue(prev_id);
CREATE INDEX idx_queue_created_at ON queue(created_at);

-- Notify function for queue changes
CREATE FUNCTION notify_queue_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('queue_channel', json_build_object(
    'base_id', NEW.base_id,
    'target', NEW.target,
    'status', NEW.status
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_insert_trigger
AFTER INSERT ON queue
FOR EACH ROW EXECUTE FUNCTION notify_queue_change();