import { pool } from './db.js'

export async function bootstrapIngest() {
  const hasJobs = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`
  )
  if (hasJobs.rows[0].exists) {
    return console.log('bootstrap: jobs exist, skipping')
  }

  const oneHour = 60 * 60 * 1000
  const now = Date.now()
  const currentHourStart = Math.floor(now / oneHour) * oneHour
  const lastHourStart = currentHourStart - oneHour
  const lastHourEnd = currentHourStart // Not lastHourStart + oneHour
  console.log('now:', Date.now())
  console.log(
    'lastHourStart:',
    lastHourStart,
    new Date(lastHourStart).toISOString()
  )

  console.log(
    `http://localhost:3000/jobs/ingest?dateFrom=${new Date(
      lastHourStart
    ).toISOString()}&dateTo=${new Date(lastHourEnd).toISOString()}`
  )

  await fetch(
    `http://localhost:3000/jobs/ingest?dateFrom=${new Date(
      lastHourStart
    ).toISOString()}&dateTo=${new Date(lastHourEnd).toISOString()}`
  )
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
