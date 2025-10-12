// app.js
import express from 'express'
import pg from 'pg'

const app = express()
const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  database: 'sort_cache_db',
  user: 'sort_cache',
  password: 'pass_pass_pass',
})

app.use(express.json())

// ============================================
// FAKE EXTERNAL API
// ============================================
app.get('/fake-external-api', (req, res) => {
  const { start_time, end_time } = req.query

  console.log(`Fake API called: ${start_time} to ${end_time}`)

  // Return two parcels with SAME barcode (to test deduplication)
  res.json([
    {
      barcode: 'ABC123',
      location_id: 5,
      scanned_at: start_time,
    },
    {
      barcode: 'ABC123', // Same barcode, different location
      location_id: 7,
      scanned_at: end_time,
    },
    {
      barcode: 'XYZ789',
      location_id: 3,
      scanned_at: start_time,
    },
  ])
})

// ============================================
// INGEST ENDPOINT (triggers the job)
// ============================================
app.post('/ingest', async (req, res) => {
  try {
    const { start_time, end_time } = req.body

    // 1. Insert job into queue
    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('ingest', $1)
      RETURNING id
    `,
      [JSON.stringify({ start_time, end_time })]
    )

    const jobId = result.rows[0].id

    console.log(`Created ingest job ${jobId}`)

    // 2. Fetch from fake API
    const apiUrl = `http://localhost:3000/fake-external-api?start_time=${start_time}&end_time=${end_time}`
    const apiResponse = await fetch(apiUrl)
    const parcels = await apiResponse.json()

    console.log(`Fetched ${parcels.length} parcels from API`)

    // 3. Insert into ingest_raw (single INSERT)
    const values = parcels
      .map((p, i) => `(${jobId}, '${p.barcode}', ${p.location_id})`)
      .join(',')

    await pool.query(`
      INSERT INTO ingest_raw (job_ref, barcode, location_id)
      VALUES ${values}
    `)

    console.log(`Inserted ${parcels.length} rows into ingest_raw`)

    res.json({
      success: true,
      job_id: jobId,
      parcels_processed: parcels.length,
    })
  } catch (error) {
    console.error('Ingest error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// QUERY ENDPOINTS (to check results)
// ============================================
app.get('/check-raw', async (req, res) => {
  const result = await pool.query('SELECT * FROM ingest_raw ORDER BY id')
  res.json(result.rows)
})

app.get('/check-acc', async (req, res) => {
  const result = await pool.query('SELECT * FROM ingest_acc ORDER BY id')
  res.json(result.rows)
})

app.get('/check-jobs', async (req, res) => {
  const result = await pool.query('SELECT * FROM job_queue ORDER BY id')
  res.json(result.rows)
})

// ============================================
// START SERVER
// ============================================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
  console.log('\nTest commands:')
  console.log(
    'curl -X POST http://localhost:3000/ingest -H "Content-Type: application/json" -d \'{"start_time":"2025-01-01T00:00:00Z","end_time":"2025-01-01T01:00:00Z"}\''
  )
  console.log('\ncurl http://localhost:3000/check-raw')
  console.log('curl http://localhost:3000/check-acc')
  console.log('curl http://localhost:3000/check-jobs')
})
