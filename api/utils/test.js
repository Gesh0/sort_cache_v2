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
    (event) => event.locationName = '"001 - Скопје Југ - Главен магацин"'
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
