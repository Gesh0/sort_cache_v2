import { pool } from '../utils/db.js'
import { toAPIFormat, fromAPIFormat } from '../utils/timestamps.js'
import { fetchWithRetry, authenticate } from '../utils/network.js'
import { StalenessTimer } from '../utils/timer.js'
import { logOperation } from '../utils/logger.js'

export default async function (config) {
  const client = await pool.connect()
  await client.query('LISTEN ingest_worker')
  const notifyTimer = new StalenessTimer('notify', 80, () => {
    console.error(
      '[INGEST WORKER] No jobs for 80 minutes, worker may be disconnected'
    )
    process.exit(1)
  })
  notifyTimer.reset()

  let authToken = null
  if (config.data === 'real') {
    try {
      authToken = await authenticate()
      console.log('AUTH TOKEN: ', authToken)
    } catch (error) {
      console.error('[INGEST WORKER] Authentication failed:', error.message)
      process.exit(1)
    }
  }

  client.on('notification', async (msg) => {
    notifyTimer.reset()

    if (msg.channel !== 'ingest_worker') return

    const { job_id, data } = JSON.parse(msg.payload)
    const { dateFrom, dateTo } = data

    const logger = logOperation('INGEST_WORKER')
    logger.pending(`job_id: ${job_id}`)

    await pool.query(
      `INSERT INTO job_events (job_id, event_type) VALUES ($1, 'worker_started')`,
      [job_id]
    )

    let url
    if (config.data === 'test') {
      url = new URL('http://localhost:3000/data/')
      url.searchParams.set('dateFrom', toAPIFormat(dateFrom))
      url.searchParams.set('dateTo', toAPIFormat(dateTo))
    } else {
      url = new URL('https://api.els.mk/v2/orders/sort')
      url.searchParams.set('dateFrom', toAPIFormat(dateFrom))
      url.searchParams.set('dateTo', toAPIFormat(dateTo))
    }

    let items
    try {
      items = await fetchWithRetry(url.toString(), authToken)
    } catch (error) {
      logger.failure(error)
      await pool.query(
        `INSERT INTO job_events (job_id, event_type, payload) VALUES ($1, 'failed', $2)`,
        [job_id, JSON.stringify({ error: error.message })]
      )
      return
    }

    const values = items
      .filter(
        (item) =>
          item.logisticsPointId != null && item.logisticsPointName != null
      )
      .map((item) => [
        job_id,
        item.serialNumber,
        item.logisticsPointId,
        item.logisticsPointName,
        fromAPIFormat(item.updatedAt),
      ])

    const rawResult = await client.query(
      `INSERT INTO ingest_raw (job_ref, serial_number, logistics_point_id, logistics_point_name, updated_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::timestamptz[])
       RETURNING id`,
      [
        values.map((v) => v[0]),
        values.map((v) => v[1]),
        values.map((v) => v[2]),
        values.map((v) => v[3]),
        values.map((v) => v[4]),
      ]
    )

    const rawIds = rawResult.rows.map(r => r.id)
    logger.success(`ingest_raw_ids: ${JSON.stringify(rawIds)}`)

    await pool.query(
      `INSERT INTO job_events (job_id, event_type) VALUES ($1, 'raw_inserted')`,
      [job_id]
    )
  })
}
