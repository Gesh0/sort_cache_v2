1. INSERT job_queue → pg_notify 'new_job'
2. Worker receives notification
3. Worker pulls oldest job WHERE id NOT IN (SELECT batch_id FROM ingest_raw UNION SELECT batch_id FROM sort_map)
4. Worker executes:
   - If ingest: call API → INSERT ingest_raw (with batch_id) → compute dedup → INSERT ingest_acc
   - If sort_map: parse job.data → INSERT sort_map (with batch_id)
5. Worker checks queue complete:
   - SELECT id FROM job_queue LIMIT 24
   - Check if all ids exist in (ingest_raw.batch_id UNION sort_map.batch_id)
   - If ALL exist: queue complete → derive (JOIN ingest_acc + sort_map → parcel_cache), exit
   - If NOT all: goto step 3
6. Next INSERT job_queue → repeat from step 1
