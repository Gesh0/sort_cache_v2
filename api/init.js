import { pool } from './db.js'

// ----------------------------------------
// Bootstrap Functions (Testing Only)
// ----------------------------------------
export async function bootstrapIngest() {
  const hasJobs = await pool.query(`SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'ingest')`)
  if (hasJobs.rows[0].exists) {
    return console.log('bootstrap: jobs exist, skipping')
  }

  // Testing data timeframe
  const dateFrom = '2025-10-28T10:00:00.00Z'
  const dateTo = '2025-10-28T11:00:00.00Z'

  await fetch(`http://localhost:3000/jobs/ingest?dateFrom=${dateFrom}&dateTo=${dateTo}`)
}

export async function bootstrapSortmap() {
  const hasJobs = await pool.query(`SELECT EXISTS(SELECT 1 FROM job_queue WHERE type = 'sort_map')`)
  if (hasJobs.rows[0].exists) {
    return console.log('bootstrap: sortmap exists, skipping')
  }

  await fetch(`http://localhost:3000/jobs/sortmap`)
}

// ----------------------------------------
// Production Init Functions
// ----------------------------------------
async function getLastJobTime() {
  // Get latest job's dateTo, using UTC
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

  return new Date(result.rows[0].last_time)
}

function generateIngestSegments(lastTime, nowTime) {
  const segments = []
  const oneHour = 60 * 60 * 1000

  // Ensure UTC comparison
  const utcLastTime = new Date(lastTime.toISOString())
  const utcNowTime = new Date(nowTime.toISOString())

  let currentFrom = utcLastTime

  while (currentFrom < utcNowTime) {
    const currentTo = new Date(
      Math.min(currentFrom.getTime() + oneHour, utcNowTime.getTime())
    )

    segments.push({
      dateFrom: currentFrom.toISOString(),
      dateTo: currentTo.toISOString(),
    })

    currentFrom = currentTo
  }

  return segments
}

export async function initIngest() {
  try {
    const lastTime = await getLastJobTime()
    const nowTime = new Date() // Will be converted to UTC in generateIngestSegments
    const segments = generateIngestSegments(lastTime, nowTime)

    if (segments.length === 0) {
      return console.log('init: no new segments needed')
    }

    // Bulk insert all segments
    const values = segments
      .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
      .join(',')
    const params = segments.flatMap((s) => ['ingest', JSON.stringify(s)])

    await pool.query(
      `INSERT INTO job_queue (type, data) VALUES ${values}`,
      params
    )
  } catch (error) {
    if (error.message === 'No previous jobs found - recovery needed') {
      console.error('Recovery needed - no previous state found')
      // Here you would trigger recovery process
      return
    }
    throw error
  }
}

