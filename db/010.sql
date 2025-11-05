CREATE TABLE
  IF NOT EXISTS events_comp (
    id SERIAL PRIMARY KEY,
    event_id TEXT,
    barcode TEXT,
    status_id INT,
    status_name TEXT,
    location_type_id INT,
    location_name TEXT,
    updated_at TIMESTAMP
  );

CREATE TABLE
  IF NOT EXISTS location_comp (
    id SERIAL PRIMARY KEY,
    serial_number TEXT NOT NULL,
    logistics_point_id INTEGER,
    logistics_point_name TEXT,
    updated_at TIMESTAMPTZ NOT NULL
  );