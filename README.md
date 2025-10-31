# TASKS

- [X] sortmap jobs
- [X] queueCheck()
- [X] dep map plan
- [X] job to sortmap
- [X] job to raw
- [X] raw to acc
- [X] continue loop
- [X] derive
- [X] load
---
- [X] TEST 1
- [X] Refactor 1
- [X] date to and from node filter
- [X] scan_log
- [X] Revamp queue logic < // loop on no data double execution jobs
- [X] init
- [X] hourly jobs
- [X] refactor hourly
- [X] in memory timer
- [X] unified timestamps
- [X] ghost removal
- [X] retries + exponential backoff
- [X] cache safety timer
- [X] DB health checks
- [X] logging
- [X] error ports
- [X] auth for external API
- [ ] overnight test
- [ ] register scanned parcels

---

## Quick Fix: Bootstrap Test Not Working

**Problem**: Bootstrap skipped + code changes not picked up

**Root Cause**:
1. Old database volume persists (has existing jobs)
2. Docker container needs rebuild to pick up code changes

**Solution** (run from `docker/` directory):

```powershell
# Stop and remove everything including volumes
docker compose down -v

# Rebuild without cache to ensure code changes are picked up
docker compose build --no-cache api

# Start fresh
docker compose up -d

# Wait 15 seconds for bootstrap to complete
Start-Sleep -Seconds 15

# Test cache query
curl http://localhost:3000/cache/BOOT001
# Expected: {"port": 5} instead of {"port": 2}

# Check logs for successful pipeline
docker logs docker-api-1 | Select-String "SUCCESS"
# Should see: bootstrapSortmap, bootstrapIngest, processJob, refreshCache

# Verify database
docker exec -it sort_cache psql -U sort_cache -d sort_cache_db -c "
SELECT
  (SELECT COUNT(*) FROM job_queue) as jobs,
  (SELECT COUNT(*) FROM ingest_raw) as raw,
  (SELECT COUNT(*) FROM ingest_acc) as acc,
  (SELECT COUNT(*) FROM sort_map) as sortmap,
  (SELECT COUNT(*) FROM derived_cache) as cache;
"
# Expected: jobs=2, raw=6, acc=6, sortmap=95, cache=6
```

**Why this works**:
- `-v` flag removes old database volume with stale jobs
- `--no-cache` forces Docker to rebuild and pick up code changes
- Fresh start triggers bootstrap properly


