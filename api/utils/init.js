import { pool } from '../utils/db.js'
import { logOperation } from './logger.js'
import { DateTime } from 'luxon'

export async function bootstrapIngest() {
  const logger = logOperation('BOOTSTRAP INGEST')
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`
  )
  if (hasJobs.rows[0].exists)
    return logger.failure(JSON.stringify(hasJobs.rows[0].exists))

  const now = DateTime.utc()
  const twoHoursAgo = now.minus({ hours: 2 })
  const targetHourStart = twoHoursAgo.startOf('hour')
  const targetHourEnd = targetHourStart.plus({ hours: 1 })

  const dateFrom = targetHourStart.toISO()
  const dateTo = targetHourEnd.toISO()

  const url = `http://localhost:3000/jobs/ingest?dateFrom=${encodeURIComponent(
    dateFrom
  )}&dateTo=${encodeURIComponent(dateTo)}`

  console.log('URL: ', url)
  logger.success(url)

  try {
    const result = await fetch(url)
    logger.success(JSON.stringify(result))
  } catch (error) {
    logger.failure(error)
  }
}

export async function bootstrapSortmap() {
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'sort_map')`
  )
  if (hasJobs.rows[0].exists) return

  await fetch(`http://localhost:3000/jobs/sortmap`)
}

async function getLastIngestTime() {
  const result = await pool.query(`
    SELECT (data->>'dateTo')::timestamptz at time zone 'UTC' as last_time
    FROM job_queue
    WHERE type = 'ingest'
    ORDER BY id DESC
    LIMIT 1
  `)

  if (!result.rows[0]?.last_time) {
    throw new Error('No previous jobs found - recovery needed')
  }

  return DateTime.fromISO(result.rows[0].last_time, { zone: 'utc' })
}

function batchHours(fromTime, toTime) {
  const segments = []

  let current = fromTime.startOf('hour')
  const end = toTime

  while (current < end) {
    const nextHour = current.plus({ hours: 1 })
    segments.push({
      dateFrom: current.toISO(),
      dateTo: nextHour.toISO(),
    })
    current = nextHour
  }
  return segments
}

function msUntilNextHour() {
  const now = DateTime.utc()
  const nextHour = now.plus({ hours: 1 }).startOf('hour')
  return nextHour.diff(now).milliseconds
}

async function queueHourlyJob() {
  const now = DateTime.utc()
  const lastHourStart = now.minus({ hours: 1 }).startOf('hour')
  const lastHourEnd = lastHourStart.plus({ hours: 1 })

  await pool.query(`INSERT INTO job_queue (type, data) VALUES ('ingest', $1)`, [
    JSON.stringify({
      dateFrom: lastHourStart.toISO(),
      dateTo: lastHourEnd.toISO(),
    }),
  ])
}

function scheduleTimer() {
  setTimeout(async () => {
    await queueHourlyJob()
    scheduleTimer()
  }, msUntilNextHour())
}

export async function initIngest() {
  const logger = logOperation('INIT INGEST')
  try {
    const lastTime = await getLastIngestTime()
    const segments = batchHours(lastTime, DateTime.utc())

    if (segments.length === 0) {
      return logger.failure()
    }

    const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
    const params = segments.map((s) => JSON.stringify(s))

    await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ${values}`,
      params
    )

    scheduleTimer()
    logger.success(JSON.stringify(segments))
  } catch (error) {
    return logger.failure(error)
  }
}
