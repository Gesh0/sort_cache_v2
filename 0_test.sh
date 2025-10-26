
curl -X POST https://api.els.mk/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "6605606e9f6bae01522f1b829e9f2324",
    "client_secret": "de027eb49c9c6febcca1711e8bd73687",
    "username": "test.sort",
    "password": "Pf82ZSrTx$csr",
    "grant_type": "password"
  }'

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-10-25T15:00:00Z" \
  -H "Authorization: Bearer b91c8c51dd2ad7ce3c132428f5d4d635bba9baba" > output.json