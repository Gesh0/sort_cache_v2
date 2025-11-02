import { pool } from './db.js'
import { toAPIFormat, utcMinus, utcNow } from './timestamps.js'

async function auth() {
  const address = 'https://api.els.mk/users/login'
  const config = {
    method: 'POST',
    body: JSON.stringify({
      username: 'leo.leo',
      password: 'LG1704.15korpus',
      grant_type: 'password',
      client_id: 'ef823a7b20286788d17f3811bf72f21a',
      client_secret: 'df36bacc81d3df173fa00c963e2d6993',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  }

  try {
    const url = new URL(address)
    const response = await fetch(url, config)
    const results = await response.json()
    return results.access_token
  } catch (error) {
    console.log('[TEST AUTH] ', JSON.stringify(error))
  }
}

async function fetchEvents() {
  const token = await auth()
  const address = 'https://api.els.mk/courier-analytics/orders/status-track'
  const dateFrom = utcMinus(2)
  const dateTo = utcNow()
  const config = { headers: { Authorization: `Bearer ${token}` } }

  try {
    const url = new URL(address)
    url.searchParams.set('eventDateFrom', toAPIFormat(dateFrom))
    url.searchParams.set('eventDateTo', toAPIFormat(dateTo))
    url.searchParams.set('limit', 0)
    console.log(JSON.stringify(url))

    const response = await fetch(url, config)
    const results = await response.json()
    return results.data
  } catch (error) {}
}

export async function insertEvents() {
  const events = await fetchEvents()
  const filteredEvents = events.filter((event) => event.statusId === 80)

  if (filteredEvents.length === 0)
    return console.log('no events matching filter')

  const { values, params } = filteredEvents.reduce(
    (acc, { barcode, date }, i) => {
      acc.values.push(`($${i * 2 + 1}, $${i * 2 + 2})`)
      acc.params.push(barcode, date)
      return acc
    },
    { values: [], params: [] }
  )

  const valuesStr = values.join(', ')

  try {
    await pool.query(
      `
      INSERT INTO events_data (serial_number, created_at)
      VALUES ${valuesStr}
      RETURNING *
      `,
      params
    )
  } catch (error) {
    console.log(JSON.stringify(error))
  }
}
