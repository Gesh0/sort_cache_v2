import express from 'express'
const app = express()

import ingest_worker from './workers/ingest_worker.js'

import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
import dataRoutes from './routes/dataRoutes.js'
import cacheRoute from './routes/cacheRoute.js'
import createTestRoutes from './routes/testRoutes.js'

import {
  preloadSortmap,
  initIngest,
  preloadIngestJobs,
} from './utils/init.js'
import { setTimeOffset } from './utils/timestamps.js'
import { insertEvents } from './utils/test.js'
import { LoadTester } from './utils/load_test.js'

const CONFIG = {
  offset: 4,
  range: 504,
  data: 'real',
  test: {
    queriesPerHour: 12000,
    hoursToSpread: 1.25,
  },
}

app.use(express.json())
app.listen(3000, async () => {
  console.log('Server running on http://localhost:3000')
  app.use('/query', queryRoutes)
  app.use('/jobs', jobsRoutes)
  app.use('/cache', cacheRoute)
  app.use('/data', dataRoutes)
  app.use('/test', createTestRoutes(CONFIG))

  setTimeOffset(CONFIG.offset)

  await ingest_worker(CONFIG)

  await preloadSortmap()
  
  if (CONFIG.range > 0) {
    await preloadIngestJobs(CONFIG.range / 24)
  }

  await initIngest()

  await insertEvents(CONFIG)

  const tester = new LoadTester({ ...CONFIG.test, ...CONFIG })
  await tester.prepareTestPool(CONFIG.test.hoursToSpread)
  // tester.start()
})
