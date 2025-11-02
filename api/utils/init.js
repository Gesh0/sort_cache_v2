import { pool } from '../utils/db.js'
import { logOperation } from './logger.js'
import { utcNow, batchIngestJobs, msUntilNextHour } from './timestamps.js'


export async function bootstrapSortmap() {
  const logger = logOperation('BOOTSTRAP_SORTMAP')
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

  logger.pending(`job_count: ${jobs.length}`)

  const values = jobs.map((_, i) => `('ingest', $${i + 1})`).join(', ')
  const params = jobs.map((j) => JSON.stringify(j))

  const result = await pool.query(
    `INSERT INTO job_queue (type, data) VALUES ${values} RETURNING id`,
    params
  )

  const jobIds = result.rows.map(r => r.id)
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
  const now = utcNow()
  const lastHourStart = now.minus({ hours: 1 }).startOf('hour').toISO()
  const lastHourEnd = now.startOf('hour').toISO()

  await pool.query(`INSERT INTO job_queue (type, data) VALUES ('ingest', $1)`, [
    JSON.stringify({ dateFrom: lastHourStart, dateTo: lastHourEnd }),
  ])
}

function scheduleTimer() {
  setTimeout(async () => {
    await queueHourlyJob()
    scheduleTimer()
  }, msUntilNextHour())
}

export async function initIngest() {
  const logger = logOperation('INIT_INGEST')
  logger.pending()

  try {
    const lastTimeISO = await getLastIngestTime()
    const segments = batchIngestJobs(lastTimeISO, utcNow().toISO())

    if (segments.length === 0) {
      return logger.failure('No segments to process')
    }

    const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
    const params = segments.map((s) => JSON.stringify(s))

    const result = await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ${values} RETURNING id`,
      params
    )

    scheduleTimer()
    const jobIds = result.rows.map(r => r.id)
    logger.success(`job_ids: ${JSON.stringify(jobIds)}`)
  } catch (error) {
    return logger.failure(error)
  }
}
