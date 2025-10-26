import express from 'express'
import pg from 'pg'
//
import ingest_worker from './workers/ingest_worker.js'
import load_cache from './workers/load_cache.js'
//
import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
//
import mock from './test_data/mock.js'
import real from './test_data/real.js'

const app = express()
export const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  database: 'sort_cache_db',
  user: 'sort_cache',
  password: 'pass_pass_pass',
})

app.use(express.json())

// TESTING UTILS
app.use('/query', queryRoutes)
app.use('/jobs', jobsRoutes)

// init ingest worker
ingest_worker(pool)

// cache endpoint
const getPort = await load_cache(pool)
app.get('/cache/:barcode', (req, res) => {
  const port = getPort(req.params.barcode)
  if (port === null) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.json({ port })
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

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
