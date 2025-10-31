import express from 'express'
import { pool } from '../utils/db.js'
import { logOperation } from '../utils/logger.js'

const router = express.Router()

let cache = new Map()
let ready = false
let cacheTimeout = null
let errorPort = null

async function refreshCache() {
  const log = logOperation('refreshCache', {}, 'cacheRoute')

  try {
    const { rows } = await pool.query(`
      SELECT serial_number, port
      FROM derived_cache
      WHERE id IN (SELECT MAX(id) FROM derived_cache GROUP BY serial_number)
    `)
    cache = new Map(rows.map((r) => [r.serial_number, r.port]))
    ready = true

    if (cacheTimeout) clearTimeout(cacheTimeout)
    cacheTimeout = setTimeout(() => {
      ready = false
      const expireLog = logOperation('cacheExpired', { reason: 'no_updates_for_75_minutes' }, 'cacheRoute')
      expireLog.failure(new Error('Cache marked stale - no updates for 75 minutes'))
    }, 75 * 60 * 1000)

    log.success({ items: rows.length })
  } catch (error) {
    log.failure(error)
    throw error
  }
}

async function initCache() {
  const log = logOperation('init', {}, 'cacheRoute')

  try {
    const client = await pool.connect()
    await client.query('LISTEN load_cache')
    client.on('notification', (msg) => {
      if (msg.channel === 'load_cache') {
        const notifyLog = logOperation('notification', { channel: msg.channel, reason: 'derived_cache_updated' }, 'cacheRoute')
        notifyLog.success({ action: 'triggering_refresh' })
        refreshCache()
      }
    })

    // Fetch error port from sort_map
    const errResult = await pool.query(`
      SELECT port FROM sort_map
      WHERE numeration = 'ERR'
      ORDER BY id DESC
      LIMIT 1
    `)
    errorPort = errResult.rows[0]?.port || 2 // fallback to port 2 if not found

    await refreshCache()
    log.success({ errorPort })
  } catch (error) {
    log.failure(error)
    throw error
  }
}

router.get('/:barcode', async (req, res) => {
  const barcode = req.params.barcode
  const log = logOperation('query', { barcode }, 'cacheRoute')

  if (!ready) {
    log.failure(new Error('Cache stale'))
    return res.status(503).json({ error: 'Cache stale' })
  }

  const port = cache.get(barcode) || errorPort || 2

  pool.query('INSERT INTO scan_log (serial_number, port) VALUES ($1, $2)', [barcode, port])

  log.success({ barcode, port, isError: !cache.has(barcode) })
  res.json({ port })
})

export async function initCacheRoute() {
  await initCache()
  return router
}

export default router
