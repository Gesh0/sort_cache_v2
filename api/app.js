import express from 'express'
import pg from 'pg'
//
import sort_map from './sort_map.js'
import ingest_worker from './ingest_worker.js'
import load_cache from './load_cache.js'
//
import mock from './test_data/mock.js'
import real from './test_data/real.js'

const app = express()
const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  database: 'sort_cache_db',
  user: 'sort_cache',
  password: 'pass_pass_pass',
})

app.use(express.json())

// ingest worker
ingest_worker(pool)

// sort endpoint
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

app.get('/data/:type', (req, res) => {
  const { type } = req.params
  const { dateFrom } = req.query

  function dateFilter(data, dateFrom) {
    if (!dateFrom) return data

    const filterDate = new Date(dateFrom)

    return data.filter((item) => {
      const itemDate = new Date(item.updatedAt)
      return itemDate >= filterDate
    })
  }

  if (type === 'mock') return res.json(dateFilter(mock, dateFrom))
  if (type === 'real') return res.json(dateFilter(real, dateFrom))

  res.status(400).json({ error: 'Invalid type. Use "mock" or "real"' })
})

// INGEST JOB

app.get('/ingest', async (req, res) => {
  try {
    const { dateFrom } = req.query

    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('ingest', $1)
      RETURNING *
    `,
      [JSON.stringify({dateFrom})]
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

