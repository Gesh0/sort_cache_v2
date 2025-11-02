
-- GLOBAL SCHEMA

CREATE TABLE job_queue (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ingest', 'sort_map')),
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ingest_raw (
  id SERIAL PRIMARY KEY,
  job_ref INTEGER NOT NULL REFERENCES job_queue(id),
  serial_number TEXT NOT NULL,
  logistics_point_id INTEGER NOT NULL,
  logistics_point_name TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ingest_acc (
  id SERIAL PRIMARY KEY,
  job_ref INTEGER NOT NULL REFERENCES job_queue(id),
  serial_number TEXT NOT NULL,
  numeration VARCHAR(3) NOT NULL,
  updated_at TIMESTAMP NOT NULL, 
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sort_map (
  id SERIAL PRIMARY KEY,
  job_ref INTEGER NOT NULL REFERENCES job_queue(id),
  numeration VARCHAR(3) NOT NULL,
  port INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE derived_cache (
  id SERIAL PRIMARY KEY,
  acc_ref INTEGER NOT NULL REFERENCES ingest_acc(id),
  sortmap_ref INTEGER NOT NULL REFERENCES sort_map(id),
  serial_number TEXT NOT NULL,
  port INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE scan_log (
  id SERIAL PRIMARY KEY,
  serial_number TEXT NOT NULL,
  port INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_events (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES job_queue(id),
  event_type TEXT CHECK (event_type IN (
    'notified', 'worker_started', 'raw_inserted',
    'acc_transformed', 'sortmap_written', 'completed', 'failed',
    'derive_started', 'cache_written', 'derive_completed', 'derive_failed'
  )),
  created_at TIMESTAMP DEFAULT NOW(),
  payload JSONB DEFAULT '{}'
);

CREATE INDEX idx_job_events_job_id ON job_events(job_id, id DESC);
CREATE INDEX idx_job_events_type ON job_events(event_type, created_at DESC);

CREATE VIEW job_current_state AS
SELECT DISTINCT ON (job_id)
  job_id,
  event_type as phase,
  created_at,
  payload
FROM job_events
WHERE job_id IS NOT NULL
ORDER BY job_id, id DESC;

CREATE TABLE events_data (
  id SERIAL PRIMARY KEY,
  serial_number TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);