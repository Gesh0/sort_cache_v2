import express from 'express'
import pg from 'pg'
import sort_map from './sort_map.js'
import ingest_worker from './ingest_worker.js'
import load_cache from './load_cache.js'

const app = express()
const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  database: 'sort_cache_db',
  user: 'sort_cache',
  password: 'pass_pass_pass',
})

app.use(express.json())

ingest_worker(pool)
const getPort = await load_cache(pool)

// CACHE

app.get('/cache/:barcode', (req, res) => {
  const port = getPort(req.params.barcode)
  if (port === null) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.json({ port })
})


// QUERY ENDPOINTS

app.get('/table', async (req, res) => {
  try {
    const { table } = req.query
    const result = await pool.query(`SELECT * FROM ${table}`)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// FAKE EXTERNAL API

app.get('/data', (req, res) => {
  res.json([
    {
      // test 1
      serialNumber: 'ABC1',
      logisticsPointId: 1,
      logisticsPointName: '001 - Jug',
      updatedAt: '2025-10-23T10:19:01.139Z',
    },
    {
      // test 2
      serialNumber: 'ABC2',
      logisticsPointId: 2,
      logisticsPointName: '002 - Test',
      updatedAt: '2025-10-23T10:19:01.139Z',
    },
    {
      // test 1 overwrite
      serialNumber: 'ABC1',
      logisticsPointId: 1,
      logisticsPointName: '001 - Jug',
      updatedAt: '2025-10-23T10:25:01.139Z',
    },
  ])
})

// INGEST JOB

app.get('/ingest', async (req, res) => {
  try {
    const { start_time, end_time } = {
      start_time: '2025-10-23T10:19:01.139Z',
      end_time: '2025-10-23T10:25:01.139Z',
    }

    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('ingest', $1)
      RETURNING *
    `,
      [JSON.stringify({ start_time, end_time })]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// SORTMAP JOB

app.get('/sortmap', async (req, res) => {
  try {
    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('sort_map',$1)
      RETURNING *
      `,
      [JSON.stringify(sort_map)]
    )
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})

// NOTIFY LOGGING

