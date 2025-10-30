import { pool } from './db.js'

function toLocalISOString(timestamp) {
  const date = new Date(timestamp)
  const tzOffset = -2 * 60 // +02:00 in minutes
  const localTime = new Date(date.getTime() - (tzOffset * 60 * 1000))
  const isoString = localTime.toISOString().slice(0, -1) // Remove 'Z'
  return isoString + '+02:00'
}

export async function bootstrapIngest() {
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`
  )
  if (hasJobs.rows[0].exists) {
    return console.log('bootstrap: jobs exist, skipping')
  }

  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const twoHoursAgo = now - 2 * oneHour
  const targetHourStart = Math.floor(twoHoursAgo / oneHour) * oneHour
  const targetHourEnd = targetHourStart + oneHour
  
  const dateFrom = toLocalISOString(targetHourStart)
  const dateTo = toLocalISOString(targetHourEnd)
  
  const url = `http://localhost:3000/jobs/ingest?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`
  
  console.log(url)
  await fetch(url)
}

export async function bootstrapSortmap() {
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'sort_map')`
  )
  if (hasJobs.rows[0].exists) {
    return console.log('bootstrap: sortmap exists, skipping')
  }

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
  console.log('segments to create:', segments.length)

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

  await pool.query(`INSERT INTO job_queue (type, data) VALUES ('ingest', $1)`, [
    JSON.stringify({
      dateFrom: new Date(lastHourStart).toISOString(),
      dateTo: new Date(lastHourEnd).toISOString(),
    }),
  ])

  console.log(
    `timer: queued ${new Date(lastHourStart).toISOString()} to ${new Date(
      lastHourEnd
    ).toISOString()}`
  )
}

function scheduleTimer() {
  setTimeout(async () => {
    await queueHourlyJob()
    scheduleTimer()
  }, msUntilNextHour())
}

export async function initIngest() {
  try {
    const lastTime = await getLastIngestTime()
    const segments = batchHours(lastTime, Date.now())

    if (segments.length === 0) {
      console.log('init: no missing hours')
    } else {
      const values = segments.map((_, i) => `('ingest', $${i + 1})`).join(', ')
      const params = segments.map((s) => JSON.stringify(s))

      await pool.query(
        `INSERT INTO job_queue (type, data) VALUES ${values}`,
        params
      )

      console.log(`init: queued ${segments.length} hour(s)`)
    }

    scheduleTimer()
    console.log(`timer: scheduled for next hour boundary`)
  } catch (error) {
    if (error.message === 'No previous jobs found - recovery needed') {
      console.error('Recovery needed - no previous state found')
      return
    }
    throw error
  }
}
