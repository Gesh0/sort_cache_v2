import express from 'express'
import { pool } from '../utils/db.js'

const router = express.Router()

let cache = new Map()
let ready = false
let cacheTimeout = null

async function refreshCache() {
  const { rows } = await pool.query(`
    SELECT serial_number, port
    FROM derived_cache
    WHERE id IN (SELECT MAX(id) FROM derived_cache GROUP BY serial_number)
  `)
  cache = new Map(rows.map((r) => [r.serial_number, r.port]))
  ready = true

  // Reset 75-minute timeout
  if (cacheTimeout) clearTimeout(cacheTimeout)
  cacheTimeout = setTimeout(() => {
    ready = false
  }, 75 * 60 * 1000)
}

async function initCache() {
  const client = await pool.connect()
  await client.query('LISTEN load_cache')
  client.on('notification', (msg) => {
    if (msg.channel === 'load_cache') refreshCache()
  })
  await refreshCache()
}

initCache()


router.get('/full', async (req, res) => {
  if (cache.size === 0 ) return console.log('[Cache] empty')
  res.send(Object.fromEntries(cache))
})

router.get('/:barcode', async (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Cache stale' })

  const port = cache.get(req.params.barcode)
  if (!port) return res.status(404).json({ error: 'Not found' })

  pool.query('INSERT INTO scan_log (serial_number, port) VALUES ($1, $2)', [
    req.params.barcode,
    port,
  ])

  res.json({ port })
})

export default router
