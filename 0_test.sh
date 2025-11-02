
curl -X POST https://api.els.mk/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "6605606e9f6bae01522f1b829e9f2324",
    "client_secret": "de027eb49c9c6febcca1711e8bd73687",
    "username": "test.sort",
    "password": "Pf82ZSrTx$csr",
    "grant_type": "password"
  }'

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-10-25T17%3A00%3A00%2B02%3A00&dateTo=2025-10-25T18%3A00%3A00%2B02%3A00" \
  -H "Authorization: Bearer e15a6d37affe7507847998f515c5ec71cc52ae05" > output.json

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-10-25T15:00:00Z&dateTo=2025-10-25T16:00:00Z" \
  -H "Authorization: Bearer 7d1d06690de109e58c224ef9858ad0401eb5e102" > output.json

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-11-01T13%3A30%3A47.654%2B01%3A00&dateTo=2025-11-01T14%3A00%3A00.000%2B01%3A00" \
  -H "Authorization: Bearer 1b0a898516a9bb6e1eca37944d8e28f1cf0660c8" 


