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
import { initIngest, bootstrapIngest, bootstrapSortmap } from './init.js'

app.use(express.json())

// TESTING UTILS
app.use('/query', queryRoutes)
app.use('/jobs', jobsRoutes)

// init ingest worker
await ingest_worker()

// init
// async race condition on preload ei init starts before bootstrap finishes

// cache endpoint
app.use('/cache', cacheRoute)

// FAKE EXTERNAL API
app.use('/data', dataRoutes)

app.listen(3000, async () => {
  console.log('Server running on http://localhost:3000')
  await bootstrapSortmap()
  await bootstrapIngest()
  // initIngest()
})
