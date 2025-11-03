import { pool } from './db.js'
import { toAPIFormat, utcNow } from './timestamps.js'
import { logOperation } from './logger.js'

async function auth() {
  const logger = logOperation('TEST_AUTH')
  logger.pending()

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

    if (!response.ok) {
      logger.failure(`HTTP ${response.status}: ${response.statusText}`)
      return null
    }

    const results = await response.json()
    logger.success()
    return results.access_token
  } catch (error) {
    logger.failure(error)
    return null
  }
}

export async function fetchEvents(config = {}) {
  const logger = logOperation('TEST_FETCH_EVENTS')
  logger.pending()

  const token = await auth()
  if (!token) {
    logger.failure('Authentication failed - no token received')
    return []
  }

  const address = 'https://api.els.mk/courier-analytics/orders/status-track'

  const daysBack = config.range ? config.range / 24 : 1
  const dateFrom = utcNow().minus({ days: daysBack }).toISO()
  const dateTo = utcNow().toISO()

  const fetchConfig = { headers: { Authorization: `Bearer ${token}` } }

  try {
    const url = new URL(address)
    url.searchParams.set('eventDateFrom', toAPIFormat(dateFrom))
    url.searchParams.set('eventDateTo', toAPIFormat(dateTo))
    url.searchParams.set('limit', 0)

    const response = await fetch(url, fetchConfig)

    if (!response.ok) {
      logger.failure(`HTTP ${response.status}: ${response.statusText}`)
      return []
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      logger.failure(`Unexpected content-type: ${contentType}`)
      return []
    }

    const results = await response.json()

    if (!results || !results.data) {
      logger.failure('Response missing data property')
      return []
    }

    logger.success(`events: ${results.data.length}`)
    return results.data
  } catch (error) {
    logger.failure(error)
    return []
  }
}

export async function insertEvents(config = {}) {
  const logger = logOperation('TEST_INSERT_EVENTS')
  logger.pending()

  const events = await fetchEvents(config)

  if (!events || !Array.isArray(events)) {
    return logger.failure('Failed to fetch events - received invalid data')
  }

  if (events.length === 0) {
    return logger.failure('No events returned from API')
  }

  const filteredEvents = events.filter(
    (event) => event.locationName === '"001 - Скопје Југ - Главен магацин"'
  )

  if (filteredEvents.length === 0) {
    return logger.failure(
      `No events matching filter | Total events: ${events.length}`
    )
  }

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
    const result = await pool.query(
      `
      INSERT INTO events_data (serial_number, created_at)
      VALUES ${valuesStr}
      RETURNING id
      `,
      params
    )
    const ids = result.rows.map(r => r.id)
    logger.success(`event_ids: ${JSON.stringify(ids)}`)
  } catch (error) {
    logger.failure(error)
  }
}

export async function testCache(parcelsPerHour = 3600) {
  const logger = logOperation('TEST_CACHE')
  logger.pending()

  const { rows } = await pool.query('SELECT serial_number FROM events_data ORDER BY created_at DESC')

  if (rows.length === 0) return logger.failure('No barcodes in events_data')

  const intervalMs = (60 * 60 * 1000) / parcelsPerHour
  logger.success(`testing ${rows.length} barcodes at ${parcelsPerHour}/hour (${intervalMs}ms interval)`)

  const results = { total: rows.length, success: 0, failure: 0, totalResponseMs: 0 }

  for (const { serial_number } of rows) {
    const start = utcNow().toJSDate()

    try {
      const response = await fetch(`http://localhost:3000/cache/${serial_number}`)
      const end = utcNow().toJSDate()
      const { port } = await response.json()

      const { rows: [{ numeration } = {}] } = await pool.query(
        'SELECT numeration FROM sort_map WHERE port = $1 LIMIT 1',
        [port]
      )

      await pool.query(
        `INSERT INTO test_results (serial_number, port, numeration, request_start, request_end, response_time_ms, status_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [serial_number, port, numeration, start, end, end - start, response.status]
      )

      results.success++
      results.totalResponseMs += end - start
    } catch (error) {
      await pool.query(
        `INSERT INTO test_results (serial_number, request_start, request_end, response_time_ms, status_code, error)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [serial_number, start, utcNow().toJSDate(), utcNow().toJSDate() - start, 500, error.message]
      )
      results.failure++
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  results.avgResponseMs = Math.round(results.totalResponseMs / results.success || 1)
  logger.success(`completed | success: ${results.success}, failure: ${results.failure}, avg: ${results.avgResponseMs}ms`)

  return results
}
