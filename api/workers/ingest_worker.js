import { pool } from '../utils/db.js'
import { toAPIFormat, fromAPIFormat } from '../utils/timestamps.js'
import { fetchWithRetry } from '../utils/network.js'

export default async function () {
  const client = await pool.connect()
  await client.query('LISTEN ingest_worker')
  let lastJob = Date.now()

  client.on('notification', async (msg) => {
    lastJob = Date.now()

    setInterval(() => {
      if (Date.now() - lastJob > 90 * 60 * 1000) {
        console.error('No jobs for 90 minutes, worker may be disconnected')
        process.exit(1)
      }
    }, 10 * 60 * 1000) // Check every 10 m

    if (msg.channel !== 'ingest_worker') return

    console.log(msg.payload)

    const { job_id, data } = JSON.parse(msg.payload)
    const { dateFrom, dateTo } = data

    const url = new URL('http://localhost:3000/data/')
    url.searchParams.set('dateFrom', toAPIFormat(dateFrom))
    url.searchParams.set('dateTo', toAPIFormat(dateTo))

    const result = await fetchWithRetry(url.toString())

    if (result.length === 0) {
      console.log('[INGEST WORKER] failed no fetched data')
      console.log(JSON.stringify({ dateFrom, dateTo, url: url.toString() }))
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
  setInterval(() => {
    if (Date.now() - lastJob > 90 * 60 * 1000) {
      console.error('No jobs for 90 minutes, worker may be disconnected')
      process.exit(1)
    }
  }, 10 * 60 * 1000)
}
