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
import { initIngest, bootstrapIngest, bootstrapSortmap } from './utils/init.js'

app.use(express.json())
app.listen(3000, async () => {
  console.log('Server running on http://localhost:3000')
  app.use('/query', queryRoutes)
  app.use('/jobs', jobsRoutes)
  app.use('/cache', cacheRoute)
  app.use('/data', dataRoutes)

  await ingest_worker()

  await bootstrapSortmap()
  await bootstrapIngest()
  // await initIngest()
})
