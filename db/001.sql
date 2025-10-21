-- Job queue for kickstarting worker
CREATE TABLE job_queue (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ingest', 'sort_map')),
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Raw ingest data (immutable audit trail)
CREATE TABLE ingest_raw (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES job_queue(id),
  serial_number TEXT NOT NULL,
  logistics_point_id INTEGER NOT NULL,
  logistics_point_name TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Accumulated ingest data (deduplicated, numeration extracted)
CREATE TABLE ingest_acc (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES job_queue(id),
  serial_number TEXT NOT NULL,
  numeration TEXT NOT NULL, -- first 3 chars of logistics_point_name
  updated_at TIMESTAMP NOT NULL,
  accumulated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sort map configuration (numeration to port mapping)
CREATE TABLE sort_map (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES job_queue(id),
  numeration TEXT NOT NULL,
  port INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);x 