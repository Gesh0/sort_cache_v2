-- Core job queue
CREATE TABLE job_queue (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('ingest', 'id_map', 'sort_map')),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ingest tables
CREATE TABLE ingest_raw (
    id SERIAL PRIMARY KEY,
    job_ref INTEGER NOT NULL REFERENCES job_queue(id),
    barcode TEXT NOT NULL,
    location_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ingest_acc (
    id SERIAL PRIMARY KEY,
    raw_ref INTEGER NOT NULL REFERENCES ingest_raw(id),
    barcode TEXT NOT NULL,
    location_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(barcode)  -- Safety: prevent duplicates
);

-- Derivation tables (add later, but showing structure)
-- CREATE TABLE derived_batch (
--     id SERIAL PRIMARY KEY,
--     job_ids INTEGER[] NOT NULL,  -- Array of job_queue.id
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE derived_data (
--     id SERIAL PRIMARY KEY,
--     batch_ref INTEGER NOT NULL REFERENCES derived_batch(id),
--     ingest_ref INTEGER NOT NULL REFERENCES ingest_acc(id),
--     barcode TEXT NOT NULL,
--     port TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW(),
--     UNIQUE(barcode, batch_ref)  -- Safety: one barcode per batch
-- );

-- Indexes for performance
-- CREATE INDEX idx_job_queue_type ON job_queue(type);
-- CREATE INDEX idx_ingest_raw_job_ref ON ingest_raw(job_ref);
-- CREATE INDEX idx_ingest_acc_barcode ON ingest_acc(barcode);