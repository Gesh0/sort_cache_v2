# Testing Guide - Sort Cache System

## Quick Test Setup (First Runs - Mock Data)

### Test 1: Bootstrap Test (Full Transform Pipeline)
**Goal:** Test bootstrap → ingest → transform → derive → cache refresh

**Steps:**
```bash
# 1. Edit docker-compose.yaml
TEST_MODE: "bootstrap"
MOCK_DYNAMIC_DATES: "true"
BOOTSTRAP_HOURS_BACK: "2"

# 2. Start system
docker compose up -d

# 3. Watch logs
docker logs -f sort_cache_api-1

# 4. Expected log sequence:
# [SUCCESS] app.startup (mode: bootstrap)
# [SUCCESS] scheduler.bootstrapSortmap
# [SUCCESS] scheduler.bootstrapIngest (hoursBack: 2)
# [SUCCESS] ingest_worker.processJob (inserted: X)
# [SUCCESS] cacheRoute.notification (action: triggering_refresh)
# [SUCCESS] cacheRoute.refreshCache (items: X)

# 5. Verify cache works
curl http://localhost:3000/cache/BOOT001
# Should return: {"port": 5}

# 6. Check database state
docker exec -it sort_cache psql -U sort_cache -d sort_cache_db -c "
SELECT
  (SELECT COUNT(*) FROM job_queue) as jobs,
  (SELECT COUNT(*) FROM ingest_raw) as raw,
  (SELECT COUNT(*) FROM ingest_acc) as acc,
  (SELECT COUNT(*) FROM sort_map) as sortmap,
  (SELECT COUNT(*) FROM derived_cache) as cache;
"

# 7. Cleanup
docker compose down -v
```

**What this tests:**
- ✅ Bootstrap creates first job
- ✅ Worker processes job
- ✅ Transform trigger fires (ingest_raw → ingest_acc)
- ✅ Derive trigger fires (ingest_acc + sort_map → derived_cache)
- ✅ Cache LISTEN/NOTIFY works
- ✅ Cache serves queries

**Expected results:**
- jobs: 2 (1 ingest + 1 sortmap)
- raw: ~6 items
- acc: ~6 items
- sortmap: ~95 entries
- cache: ~6 items
- Cache returns port for BOOT001

---

### Test 2: Init Test (Catchup + Timer)
**Goal:** Test initIngest catch-up logic and timer scheduling

**Steps:**
```bash
# 1. Edit docker-compose.yaml
TEST_MODE: "init"
MOCK_DYNAMIC_DATES: "true"
BOOTSTRAP_HOURS_BACK: "3"

# 2. First, bootstrap to create baseline
# (Change TEST_MODE to "bootstrap", start, then stop)
TEST_MODE: "bootstrap"
docker compose up -d
sleep 10
docker compose down

# 3. Now test init (catch-up should create 2 more jobs for gap)
TEST_MODE: "init"
MOCK_DYNAMIC_DATES: "true"
docker compose up -d

# 4. Watch logs
docker logs -f sort_cache_api-1

# 5. Expected log sequence:
# [SUCCESS] app.startup (mode: init)
# [SUCCESS] scheduler.initIngest (queued: 2, reason: catchup_jobs_created)
# [SUCCESS] scheduler.scheduleTimer (nextRun: ...)
# [SUCCESS] ingest_worker.processJob (job_id: 2)
# [SUCCESS] ingest_worker.processJob (job_id: 3)

# 6. Check catchup worked
docker exec -it sort_cache psql -U sort_cache -d sort_cache_db -c "
SELECT id, type, data->>'dateFrom' as from, data->>'dateTo' as to
FROM job_queue
ORDER BY id;
"

# 7. Cleanup
docker compose down -v
```

**What this tests:**
- ✅ initIngest detects gap between last job and now
- ✅ Catch-up jobs created for missing hours
- ✅ Timer scheduled for next hour
- ✅ Multiple jobs processed in sequence

**Expected results:**
- Job 1: Bootstrap job (3 hours ago)
- Job 2: Catchup hour 1
- Job 3: Catchup hour 2
- Timer: Scheduled for next hour boundary

---

### Test 3: Cache Queries Under Load
**Goal:** Simulate 3600 queries/hour (1 per second)

**Steps:**
```bash
# 1. Start system in bootstrap mode
TEST_MODE: "bootstrap"
MOCK_DYNAMIC_DATES: "true"
docker compose up -d

# 2. Wait for cache to be ready
sleep 15

# 3. Run load test (1 hour = 3600 requests)
# Install hey: https://github.com/rakyll/hey
# Or use: go install github.com/rakyll/hey@latest

# Test with valid barcode
hey -z 60s -q 1 http://localhost:3000/cache/BOOT001

# Test with mix of valid/invalid
cat > barcodes.txt <<EOF
BOOT001
BOOT002
SPAN001
INVALID123
DEDUPE001
EARLY001
NOTFOUND999
EOF

# Rotate through barcodes (simulates real usage)
for i in {1..600}; do
  barcode=$(shuf -n 1 barcodes.txt)
  curl -s http://localhost:3000/cache/$barcode > /dev/null
  sleep 0.1
done

# 4. Check logs for errors
docker logs sort_cache_api-1 | grep "\[FAILURE\]"

# 5. Verify error port usage
docker logs sort_cache_api-1 | grep "isError\":true" | wc -l

# 6. Check scan_log table
docker exec -it sort_cache psql -U sort_cache -d sort_cache_db -c "
SELECT port, COUNT(*) as scans
FROM scan_log
GROUP BY port
ORDER BY scans DESC;
"
```

**What this tests:**
- ✅ Cache handles 1 req/sec sustained
- ✅ Error port works for invalid barcodes
- ✅ scan_log records all queries
- ✅ No 503 errors under load

**Expected results:**
- All requests return 200
- Port 2 (ERR) used for invalid barcodes
- scan_log has ~600 entries
- No FAILURE logs

---

## Environment Variables Quick Reference

### Core Settings
```yaml
TEST_MODE: "normal"        # Options: normal, bootstrap, init
USE_AUTH: "false"          # true = real API, false = mock
MOCK_DYNAMIC_DATES: "false" # true = shift mock dates to now
```

### Bootstrap Control
```yaml
BOOTSTRAP_HOURS_BACK: "2"  # How many hours back to create first job
```

### Production (when ready)
```yaml
USE_AUTH: "true"
API_URL: ""  # Not used when USE_AUTH=true
TEST_MODE: "init"  # Or "normal" for manual control
MOCK_DYNAMIC_DATES: "false"
```

---

## Test Modes Explained

### `TEST_MODE=normal` (Default)
- Server starts
- Worker listens
- Cache initialized
- **No automatic job creation**
- You manually call `/jobs/ingest` or `/jobs/sortmap`
- Use for: Manual testing, production

### `TEST_MODE=bootstrap`
- Runs `bootstrapSortmap()` + `bootstrapIngest()`
- Creates initial sortmap + one ingest job
- **Does NOT start timer**
- Use for: First-time setup, full pipeline test

### `TEST_MODE=init`
- Runs `initIngest()` (catch-up + timer)
- Finds last job, creates gap-filling jobs
- **Starts hourly timer**
- Use for: Testing scheduler, endurance tests

---

## Dynamic Dates Feature

**Problem:** Mock data has hardcoded dates from Oct 30, 2025. When testing weeks later, date filters miss everything.

**Solution:** `MOCK_DYNAMIC_DATES=true`

**How it works:**
```javascript
// Mock data: 2025-10-30T15:00:00Z
// Current time: 2025-11-15T10:00:00Z
// Offset: +16 days

// Adjusted: 2025-11-15T15:00:00Z
```

All mock timestamps shift forward to align with current time, so date range filters always work.

**When to use:**
- ✅ Testing with bootstrap (needs recent dates)
- ✅ Testing timer (needs current hour)
- ❌ Production (not applicable, uses real API)

---

## Quick Troubleshooting

### Cache returns 503
```bash
docker logs sort_cache_api-1 | grep "cacheRoute"
# Check for: refreshCache success, items count
```

### No jobs processed
```bash
docker logs sort_cache_api-1 | grep "ingest_worker"
# Check for: notification received, processJob start
```

### Timer not firing
```bash
docker logs sort_cache_api-1 | grep "scheduleTimer"
# Should see: nextRun timestamp
```

### Empty data returned
```bash
docker logs sort_cache_api-1 | grep "no_data_in_timeframe"
# Reason: Date range doesn't match mock data
# Solution: Enable MOCK_DYNAMIC_DATES=true
```

---

## Progression Path

1. **Tonight:** Bootstrap test (5 min)
2. **Tonight:** Init test with 3-hour catchup (10 min)
3. **Tonight:** Load test 600 queries (1 min runtime)
4. **Tomorrow:** Real API test (USE_AUTH=true)
5. **Tomorrow:** Multi-hour endurance (timer runs 3+ cycles)
6. **Tomorrow:** Production deployment

Total first-round testing: ~20 minutes
