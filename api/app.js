import express from 'express'
import pg from 'pg'
//
import ingest_worker from './workers/ingest_worker.js'
import cacheRoute from './workers/cacheRoute.js'
//
import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
import dataRoutes from './routes/dataRoutes.js'

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
app.use('/cache', cacheRoute)

// FAKE EXTERNAL API
app.use('/data', dataRoutes)

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
