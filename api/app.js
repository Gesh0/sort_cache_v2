//
import express from 'express'
const app = express()
//
import ingest_worker from './workers/ingest_worker.js'
//
import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
import dataRoutes from './routes/dataRoutes.js'
import cacheRoute from './routes/cacheRoute.js'
//
import { initIngest, initSortmap } from './init.js'

app.use(express.json())

// TESTING UTILS
app.use('/query', queryRoutes)
app.use('/jobs', jobsRoutes)

// init ingest worker
ingest_worker()

// init
initSortmap()
initIngest()

// cache endpoint
app.use('/cache', cacheRoute)

// FAKE EXTERNAL API
app.use('/data', dataRoutes)

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
