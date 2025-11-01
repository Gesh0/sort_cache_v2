import { pool } from '../utils/db.js'
import { logOperation } from './logger.js'
import { utcMinus, utcNow, batchIngestJobs, msUntilNextHour } from './timestamps.js'

export async function bootstrapIngest() {
  const logger = logOperation('BOOTSTRAP INGEST')
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`
  )
  if (hasJobs.rows[0].exists)
    return logger.failure(JSON.stringify(hasJobs.rows[0].exists))

  const jobs = batchIngestJobs(utcMinus(2), utcNow().toISO())
  const url = `http://localhost:3000/jobs/ingest?dateFrom=${encodeURIComponent(
    jobs[0].dateFrom
  )}&dateTo=${encodeURIComponent(jobs[0].dateTo)}`

  try {
    await fetch(url)
    logger.success(url)
  } catch (error) {
    logger.failure(error)
  }
}

export async function bootstrapSortmap() {
  await fetch(`http://localhost:3000/jobs/sortmap`)
}

export async function preloadIngestJobs(days) {
  const logger = logOperation('PRELOAD INGEST')

  const end = utcNow()
  const start = end.minus({ days })

  const jobs = batchIngestJobs(start.toISO(), end.toISO())

  logger.success(`Creating ${jobs.length} jobs for ${days} days`)

  const values = jobs.map((_, i) => `('ingest', $${i + 1})`).join(', ')
  const params = jobs.map((j) => JSON.stringify(j))

  await pool.query(
    `INSERT INTO job_queue (type, data) VALUES ${values}`,
    params
  )

  logger.success(`Preloaded ${jobs.length} jobs from ${start.toISO()} to ${end.toISO()}`)
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

// function scheduleTimer() {
//   setTimeout(async () => {
//     await queueHourlyJob()
//     scheduleTimer()
//   }, msUntilNextHour())
// }

export async function initIngest() {
  const logger = logOperation('INIT INGEST')
  try {
    const lastTimeISO = await getLastIngestTime()
    const segments = batchIngestJobs(lastTimeISO, utcNow().toISO())

    if (segments.length === 0) {
      return logger.failure()
    }

    const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
    const params = segments.map((s) => JSON.stringify(s))

    await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ${values}`,
      params
    )

    // scheduleTimer()
    logger.success(JSON.stringify(segments))
  } catch (error) {
    return logger.failure(error)
  }
}
