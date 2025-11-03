-- ----------------------------------------------------------------------------
-- Test Results Table
-- Stores performance metrics from load testing cache queries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  serial_number TEXT NOT NULL,
  port INTEGER,
  request_start TIMESTAMP NOT NULL,
  request_end TIMESTAMP NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_results_serial
  ON test_results(serial_number);

CREATE INDEX IF NOT EXISTS idx_test_results_created_at
  ON test_results(created_at DESC);
