import express from 'express'
const app = express()

import ingest_worker from './workers/ingest_worker.js'

import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
import dataRoutes from './routes/dataRoutes.js'
import cacheRoute from './routes/cacheRoute.js'

import {
  bootstrapSortmap,
  initIngest,
  preloadIngestJobs,
} from './utils/init.js'
import { setTimeOffset } from './utils/timestamps.js'
import { insertEvents } from './utils/test.js'

const CONFIG = {
  offset: 3,
  range: 0,
  data: 'real',
}

app.use(express.json())
app.listen(3000, async () => {
  console.log('Server running on http://localhost:3000')
  app.use('/query', queryRoutes)
  app.use('/jobs', jobsRoutes)
  app.use('/cache', cacheRoute)
  app.use('/data', dataRoutes)

  setTimeOffset(CONFIG.offset)

  await ingest_worker(CONFIG)

  await bootstrapSortmap()

  await initIngest()

  if (CONFIG.range > 0) {
    await preloadIngestJobs(CONFIG.range / 24)
  }
})
