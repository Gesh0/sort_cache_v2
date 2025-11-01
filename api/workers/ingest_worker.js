import { pool } from '../utils/db.js'
import { toAPIFormat, fromAPIFormat } from '../utils/timestamps.js'
import { fetchWithRetry } from '../utils/network.js'
import { StalenessTimer } from '../utils/timer.js'

export default async function () {
  const client = await pool.connect()
  await client.query('LISTEN ingest_worker')
  const notifyTimer = new StalenessTimer('notify', 80)
  notifyTimer.reset()

  setInterval(() => {
    if (notifyTimer.isStale()) {
      console.error('[INGEST WORKER] No jobs for 80 minutes, worker may be disconnected')
      process.exit(1)
    }
  }, 10 * 60 * 1000)

  client.on('notification', async (msg) => {
    notifyTimer.reset()

    if (msg.channel !== 'ingest_worker') return

    console.log(msg.payload)

    const { job_id, data } = JSON.parse(msg.payload)
    const { dateFrom, dateTo } = data

    const url = new URL('http://localhost:3000/data/')
    url.searchParams.set('dateFrom', toAPIFormat(dateFrom))
    url.searchParams.set('dateTo', toAPIFormat(dateTo))

    const result = await fetchWithRetry(url.toString())

    if (!result.success) {
      console.log('[INGEST WORKER] failed - retry exhausted')
      console.log(JSON.stringify({ dateFrom, dateTo, url: url.toString(), error: result.error }))
      return
    }

    const items = result.data

    const values = items.map((item) => [
      job_id,
      item.serialNumber,
      item.logisticsPointId,
      item.logisticsPointName,
      fromAPIFormat(item.updatedAt),
    ])

    await client.query(
      `INSERT INTO ingest_raw (job_ref, serial_number, logistics_point_id, logistics_point_name, updated_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::timestamptz[])`,
      [
        values.map((v) => v[0]),
        values.map((v) => v[1]),
        values.map((v) => v[2]),
        values.map((v) => v[3]),
        values.map((v) => v[4]),
      ]
    )
  })
}
