-- Migration 008: Preload Performance Optimization
-- Strategy: Eliminate O(n²) bottlenecks with targeted indexes and query rewrites
-- Focus: State machine transformation pipeline during bulk preload

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- 1. Composite index for bounded prev_state lookback
--    Query pattern: WHERE job_ref < X AND job_ref >= X - 100 AND updated_at >= Y
--    Impact: Enables index-only scan for prev_state CTE with lookback window
CREATE INDEX IF NOT EXISTS idx_ingest_acc_job_ref_updated
ON ingest_acc(job_ref DESC, updated_at DESC);

-- 2. Index for scan_log anti-join
--    Query pattern: LEFT JOIN scan_log WHERE serial_number IS NULL
--    Impact: Fast lookups for "not scanned" checks in active_prev
--    Note: No partial index (NOW() is not IMMUTABLE), but still provides benefit
CREATE INDEX IF NOT EXISTS idx_scan_log_serial_recent
ON scan_log(serial_number, created_at DESC);

-- =============================================================================
-- STATISTICS REFRESH
-- =============================================================================
-- Ensure query planner uses these new indexes effectively
ANALYZE ingest_acc;
ANALYZE scan_log;

-- =============================================================================
-- MONITORING QUERY
-- =============================================================================
-- After deployment, verify index usage:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as "Scans",
--   pg_size_pretty(pg_relation_size(indexrelid)) as "Size"
-- FROM pg_stat_user_indexes
-- WHERE indexname IN ('idx_ingest_acc_job_ref_updated', 'idx_scan_log_serial_recent')
-- ORDER BY idx_scan DESC;
--
-- Expected: idx_scan should increase rapidly during preload
-- =============================================================================
