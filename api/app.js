import express from 'express'
import ingest_worker from './workers/ingest_worker.js'
import queryRoutes from './routes/queryRoutes.js'
import jobsRoutes from './routes/jobsRoutes.js'
import dataRoutes from './routes/dataRoutes.js'
import { initCacheRoute } from './routes/cacheRoute.js'
import { initIngest, bootstrapIngest, bootstrapSortmap } from './scheduler.js'
import { logOperation } from './utils/logger.js'

const app = express()
app.use(express.json())

async function startServer() {
  const testMode = process.env.TEST_MODE || 'normal'
  const log = logOperation('startup', { testMode }, 'app')

  try {
    // 1. Initialize worker (LISTEN for jobs)
    await ingest_worker()

    // 2. Initialize cache route (LISTEN for cache updates, load initial cache)
    const cacheRoute = await initCacheRoute()

    // 3. Mount routes
    app.use('/query', queryRoutes)
    app.use('/jobs', jobsRoutes)
    app.use('/cache', cacheRoute)
    app.use('/data', dataRoutes)

    // 4. Start HTTP server
    app.listen(3000, async () => {
      // 5. Initialize based on test mode
      if (testMode === 'bootstrap') {
        await bootstrapSortmap()
        await bootstrapIngest()
        log.success({ port: 3000, mode: 'bootstrap', reason: 'bootstrap_only' })
      } else if (testMode === 'init') {
        initIngest()
        log.success({ port: 3000, mode: 'init', reason: 'catchup_and_timer' })
      } else {
        // Normal production mode - do nothing, manual control
        log.success({ port: 3000, mode: 'normal', reason: 'manual_control' })
      }
    })
  } catch (error) {
    log.failure(error)
    process.exit(1)
  }
}

startServer()
