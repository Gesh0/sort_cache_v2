import { pool } from '../utils/db.js'
import { logOperation } from './logger.js'
import { utcNow, batchIngestJobs } from './timestamps.js'
import { StalenessTimer } from './timer.js'

export async function preloadSortmap() {
  const logger = logOperation('BOOTSTRAP SORTMAP')
  logger.pending()

  const response = await fetch(`http://localhost:3000/jobs/sortmap`)
  const result = await response.json()

  logger.success(`job_id: ${result.id}`)
}

export async function preloadIngestJobs(days) {
  const logger = logOperation('PRELOAD_INGEST')

  const end = utcNow()
  const start = end.minus({ days })
  const jobs = batchIngestJobs(start.toISO(), end.toISO())

  logger.pending(`job_count: ${jobs.length}, mode: FAST_PATH`)

  await pool.query("SET app.preload_mode = true")

  const values = jobs.map((_, i) => `('ingest', $${i + 1})`).join(', ')
  const params = jobs.map((j) => JSON.stringify(j))

  const result = await pool.query(
    `INSERT INTO job_queue (type, data) VALUES ${values} RETURNING id`,
    params
  )

  await new Promise((resolve) => setTimeout(resolve, jobs.length * 100))

  await pool.query("SET app.preload_mode = false")
  await pool.query("SELECT cleanup_after_preload()")

  const jobIds = result.rows.map((r) => r.id)
  logger.success(`job_ids: ${JSON.stringify(jobIds)}`)
}

async function getLastIngestTime() {
  const result = await pool.query(`
    SELECT data->>'dateTo' as last_time
    FROM job_queue
    WHERE type = 'ingest'
    ORDER BY id DESC
    LIMIT 1
  `)

  if (!result.rows[0]?.last_time) {
    throw new Error('No previous jobs found - recovery needed')
  }

  return result.rows[0].last_time
}

async function queueHourlyJob() {
  const logger = logOperation('QUEUE_HOURLY_JOB')


  const now = utcNow()
  const lastHourStart = now.minus({ hours: 1 }).startOf('hour').toISO()
  const lastHourEnd = now.startOf('hour').toISO()

  // const lastIngestTime = await getLastIngestTime()
  // const now = utcNow().toISO()

  const result = await pool.query(
    `INSERT INTO job_queue (type, data) VALUES ('ingest', $1) RETURNING id`,
    [JSON.stringify({ dateFrom: lastHourStart, dateTo: lastHourEnd })]
  )

  logger.success(`job_id: ${result.rows[0].id}`)
}

const ingestTimer = new StalenessTimer('ingest', 60, async () => {
  try {
    await queueHourlyJob()
  } catch (error) {
    const logger = logOperation('INGEST_TIMER')
    logger.failure(error)
  } finally {
    ingestTimer.reset()
  }
})

export async function initIngest() {
  const logger = logOperation('INIT_INGEST')

  try {
    const lastTimeISO = await getLastIngestTime()
    const nowISO = utcNow().toISO()
    const segments = batchIngestJobs(lastTimeISO, nowISO)

    if (segments.length > 0) {
      const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
      const params = segments.map((s) => JSON.stringify(s))

      const result = await pool.query(
        `INSERT INTO job_queue (type, data) VALUES ${values} RETURNING id`,
        params
      )

      const jobIds = result.rows.map((r) => r.id)
      logger.success(`job_ids: ${JSON.stringify(jobIds)}`)
    } else {
      logger.pending('No gap, skipping')
    }

    ingestTimer.reset()
  } catch (error) {
    logger.failure(error)
    ingestTimer.reset()
  }
}
