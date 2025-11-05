
curl -X POST https://api.els.mk/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "6605606e9f6bae01522f1b829e9f2324",
    "client_secret": "de027eb49c9c6febcca1711e8bd73687",
    "username": "test.sort",
    "password": "Pf82ZSrTx$csr",
    "grant_type": "password"
  }'

curl -X GET "https://api.els.mk/v2/orders/sort?dateFrom=2025-11-01T13%3A30%3A47.654%2B01%3A00&dateTo=2025-11-01T14%3A00%3A00.000%2B01%3A00" \
  -H "Authorization: Bearer 30c87386f70ba8f3f06cb3cef9184a5b43cdda2b" > output.js


curl -X POST https://api.els.mk/users/login \
  -H "Content-Type: application/json" \
  -d '{
		"username": "leo.leo",
		"password": "LG1704.15korpus",
		"grant_type": "password",
		"client_id": "ef823a7b20286788d17f3811bf72f21a",
		"client_secret": "df36bacc81d3df173fa00c963e2d6993"
	}'

curl https://api.els.mk/courier-analytics/orders/status-track?eventDateFrom=2025-06-25&eventDateTo=2025-06-25&limit=1 \
  -H "Authorization: Bearer bb227b0d444ef5d7c317f643ab61a2b2c4cc0d60"
	
