import { pool } from '../utils/db.js'
import { toAPIFormat, fromAPIFormat } from '../utils/timestamps.js'
import { fetchWithRetry } from '../utils/network.js'
import { logOperation } from '../utils/logger.js'

export default async function () {
  const initLog = logOperation('init', {}, 'ingest_worker')

  try {
    const client = await pool.connect()
    await client.query('LISTEN ingest_worker')
    let lastJob = Date.now()

    setInterval(() => {
      const timeSinceLastJob = Date.now() - lastJob
      if (timeSinceLastJob > 90 * 60 * 1000) {
        const healthLog = logOperation(
          'healthCheck',
          {
            timeSinceLastJob: Math.floor(timeSinceLastJob / 60000),
            reason: 'LISTEN_connection_broken',
          },
          'ingest_worker'
        )
        healthLog.failure(
          new Error('No jobs for 90 minutes - LISTEN connection may be broken')
        )
      }
    }, 10 * 60 * 1000)

    initLog.success()

    client.on('notification', async (msg) => {
      if (msg.channel !== 'ingest_worker') {
        const ignoreLog = logOperation(
          'notification',
          { channel: msg.channel, reason: 'wrong_channel' },
          'ingest_worker'
        )
        ignoreLog.success({ action: 'ignored' })
        return
      }

      lastJob = Date.now()
      const {
        job_id,
        data: { dateFrom, dateTo },
      } = JSON.parse(msg.payload)

      const jobLog = logOperation(
        'processJob',
        { job_id, dateFrom, dateTo },
        'ingest_worker'
      )

      try {
        const apiUrl = process.env.API_URL || 'http://localhost:3000/data/mock'
        const useAuth = process.env.USE_AUTH === 'true'
        const endpoint = useAuth ? 'https://api.els.mk/v2/orders/sort' : apiUrl

        const url = new URL(endpoint)
        url.searchParams.set('dateFrom', toAPIFormat(dateFrom))
        url.searchParams.set('dateTo', toAPIFormat(dateTo))

        const result = await fetchWithRetry(
          url.toString(),
          'ingest_worker.processJob',
          5,
          useAuth
        )

        if (!result.success) {
          jobLog.failure(
            new Error(`Fetch failed after retries: ${result.error}`)
          )
          return
        }

        if (result.data.length === 0) {
          jobLog.success({
            job_id,
            inserted: 0,
            reason: 'no_data_in_timeframe',
          })
          return
        }

        const items = result.data.map((item) => [
          job_id,
          item.serialNumber,
          item.logisticsPointId,
          item.logisticsPointName,
          fromAPIFormat(item.updatedAt),
        ])

        await client.query(
          `INSERT INTO ingest_raw (job_ref, serial_number, logistics_point_id, logistics_point_name, updated_at)
           SELECT * FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::timestamptz[])`,
          [0, 1, 2, 3, 4].map((i) => items.map((v) => v[i]))
        )

        jobLog.success({ job_id, inserted: items.length })
      } catch (error) {
        jobLog.failure(error)
      }
    })
  } catch (error) {
    initLog.failure(error)
    throw error
  }
}
