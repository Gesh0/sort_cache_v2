
# APPEND INGEST JOB
curl -X POST http://localhost:3000/ingest -H "Content-Type: application/json" -d '{"start_time":"2025-01-01T00:00:00Z","end_time":"2025-01-01T01:00:00Z"}'