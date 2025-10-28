
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
)