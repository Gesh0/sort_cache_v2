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
- [ ] TEST
- [ ] Refactor this ugly mess
- [ ] preload map
- [ ] in memory timer
- [ ] scan_log
- [ ] register scanned parcels


---

1. hourly time diff
2. append jobs 
3. queueCheck() 4 - true | x - false
4. derive based on latest state
5. do nothing

queueCheck()
- returns true OR false if x jobs have relations to results

adapters
- job_queue without latest true = notify worker false = null
- ingest_acc || sortmap true = derive false = notify worker
  