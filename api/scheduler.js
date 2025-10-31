import { pool } from './utils/db.js'
import { logOperation } from './utils/logger.js'
import sortMapData from './data/sort_map.js'

function toLocalISOString(timestamp) {
  const date = new Date(timestamp)
  const tzOffset = -2 * 60 // +02:00 in minutes
  const localTime = new Date(date.getTime() - (tzOffset * 60 * 1000))
  const isoString = localTime.toISOString().slice(0, -1) // Remove 'Z'
  return isoString + '+02:00'
}

export async function bootstrapIngest() {
  const log = logOperation('bootstrapIngest', {}, 'scheduler')

  try {
    const hasJobs = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`
    )
    if (hasJobs.rows[0].exists) {
      log.success({ skipped: true, reason: 'jobs_exist' })
      return
    }

    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const hoursBack = parseInt(process.env.BOOTSTRAP_HOURS_BACK || '2')
    const targetTime = now - hoursBack * oneHour
    const targetHourStart = Math.floor(targetTime / oneHour) * oneHour
    const targetHourEnd = targetHourStart + oneHour

    const dateFrom = new Date(targetHourStart).toISOString()
    const dateTo = new Date(targetHourEnd).toISOString()

    await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ('ingest', $1)`,
      [JSON.stringify({ dateFrom, dateTo })]
    )

    log.success({ dateFrom, dateTo, hoursBack })
  } catch (error) {
    log.failure(error)
    throw error
  }
}

export async function bootstrapSortmap() {
  const log = logOperation('bootstrapSortmap', {}, 'scheduler')

  try {
    const hasJobs = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'sort_map')`
    )
    if (hasJobs.rows[0].exists) {
      log.success({ skipped: true, reason: 'sortmap_exists' })
      return
    }

    await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ('sort_map', $1)`,
      [JSON.stringify(sortMapData)]
    )

    log.success({ entries: sortMapData.length })
  } catch (error) {
    log.failure(error)
    throw error
  }
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

  return new Date(result.rows[0].last_time).getTime()
}

function batchHours(fromTime, toTime) {
  const segments = []
  const oneHour = 60 * 60 * 1000

  // Round down to hour boundary
  const startHour = Math.floor(fromTime / oneHour) * oneHour

  for (let start = startHour; start < toTime; start += oneHour) {
    const end = start + oneHour
    segments.push({
      dateFrom: new Date(start).toISOString(),
      dateTo: new Date(end).toISOString(),
    })
  }

  return segments
}

function msUntilNextHour() {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const nextHour = Math.ceil(now / oneHour) * oneHour
  return nextHour - now
}

async function queueHourlyJob() {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const lastHourStart = Math.floor(now / oneHour) * oneHour - oneHour
  const lastHourEnd = lastHourStart + oneHour

  const log = logOperation('queueHourlyJob', {
    dateFrom: new Date(lastHourStart).toISOString(),
    dateTo: new Date(lastHourEnd).toISOString()
  }, 'scheduler')

  try {
    await pool.query(`INSERT INTO job_queue (type, data) VALUES ('ingest', $1)`, [
      JSON.stringify({
        dateFrom: new Date(lastHourStart).toISOString(),
        dateTo: new Date(lastHourEnd).toISOString(),
      }),
    ])
    log.success()
  } catch (error) {
    log.failure(error)
    throw error
  }
}

function scheduleTimer() {
  const delay = msUntilNextHour()
  const nextRun = new Date(Date.now() + delay).toISOString()

  const log = logOperation('scheduleTimer', { nextRun, delayMs: delay }, 'scheduler')
  log.success({ reason: 'timer_set_for_next_hour' })

  setTimeout(async () => {
    await queueHourlyJob()
    scheduleTimer()
  }, delay)
}

export async function initIngest() {
  const log = logOperation('initIngest', {}, 'scheduler')

  try {
    const lastTime = await getLastIngestTime()
    const segments = batchHours(lastTime, Date.now())

    if (segments.length === 0) {
      log.success({ queued: 0, scheduled: true, reason: 'no_catchup_needed' })
    } else {
      const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
      const params = segments.map((s) => JSON.stringify(s))

      await pool.query(
        `INSERT INTO job_queue (type, data) VALUES ${values}`,
        params
      )

      log.success({ queued: segments.length, scheduled: true, reason: 'catchup_jobs_created' })
    }

    scheduleTimer()
  } catch (error) {
    if (error.message === 'No previous jobs found - recovery needed') {
      log.failure(new Error('No previous state - cannot determine catchup range, skipping timer'))
      // DO NOT schedule timer if we have no baseline
      return
    }
    log.failure(error)
    throw error
  }
}
