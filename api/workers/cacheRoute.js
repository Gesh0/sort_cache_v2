import express from 'express'
import { pool } from '../app.js'
const router = express.Router()

async function loadCache(pool) {
  const client = await pool.connect()
  await client.query('LISTEN load_cache')

  let cache = new Map()

  client.on('notification', async (msg) => {
    if (msg.channel !== 'load_cache') return

    const { rows } = await client.query(
      `SELECT serial_number, port 
       FROM derived_cache 
       WHERE id IN (
         SELECT MAX(id) FROM derived_cache GROUP BY serial_number
       )`
    )

    cache = new Map(rows.map((r) => [r.serial_number, r.port]))
    console.log(`Cache loaded: ${cache.size} items`)
  })

  return (serial_number) => cache.get(serial_number) || null
}

router.get('/:barcode', (req, res) => {
  const cache = loadCache(pool)
  const port = cache(req.params.barcode)
  if (port === null) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.json({ port })
})

export default router