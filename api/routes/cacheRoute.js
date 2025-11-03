import express from 'express'
import { pool } from '../utils/db.js'
import { StalenessTimer } from '../utils/timer.js'
import { logOperation } from '../utils/logger.js'

const router = express.Router()

let cache = new Map()
const cacheTimer = new StalenessTimer('cache', 80)

async function refreshCache() {
  const logger = logOperation('REFRESH_CACHE')
  logger.pending()

  const { rows } = await pool.query(`
    SELECT serial_number, port
    FROM derived_cache
    WHERE id IN (SELECT MAX(id) FROM derived_cache GROUP BY serial_number)
  `)
  cache = new Map(rows.map((r) => [r.serial_number, r.port]))
  cacheTimer.reset()

  logger.success(`cache_size: ${cache.size}`)
}

async function initCache() {
  const client = await pool.connect()
  await client.query('LISTEN load_cache')

  const notifyTimer = new StalenessTimer('cache-notify', 80, () => {
    const logger = logOperation('CACHE_NOTIFY_TIMER')
    logger.failure('No notifications for 80 minutes, connection may be lost')
    process.exit(1)
  })
  notifyTimer.reset()

  client.on('notification', (msg) => {
    if (msg.channel === 'load_cache') {
      notifyTimer.reset()
      refreshCache()
    }
  })

  await refreshCache()
}

initCache()

router.get('/full', (_req, res) => {
  if (cacheTimer.isStale()) return res.status(503).json({ error: 'Cache stale' })
  if (cache.size === 0) return res.json({ error: 'Cache empty' })
  res.json(Object.fromEntries(cache))
})

router.get('/:barcode', async (req, res) => {
  if (cacheTimer.isStale()) return res.status(503).json({ error: 'Cache stale' })

  const port = cache.get(req.params.barcode)
  if (!port) return res.status(404).json({ error: 'Not found' })

  pool.query('INSERT INTO scan_log (serial_number, port) VALUES ($1, $2)', [
    req.params.barcode,
    port,
  ])

  res.json({ port })
})

export default router
