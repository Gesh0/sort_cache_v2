
# APPEND INGEST JOB
curl -X POST http://localhost:3000/ingest -H "Content-Type: application/json" -d '{"start_time":"2025-01-01T00:00:00Z","end_time":"2025-01-01T01:00:00Z"}'

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-10-02T12:00:00Z" \
  -H "Authorization: Bearer fdb4cbae3cef74ab2455e69a54e15e3e04235f7d" 

curl -X POST https://api.els.mk/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "6605606e9f6bae01522f1b829e9f2324",
    "client_secret": "de027eb49c9c6febcca1711e8bd73687",
    "username": "test.sort",
    "password": "Pf82ZSrTx$csr",
    "grant_type": "password"
  }'