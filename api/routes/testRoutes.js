import express from 'express'
import { pool } from '../utils/db.js'
import { testCache } from '../utils/test.js'
import { getMatchRate } from '../utils/comparison.js'

export default function createTestRoutes(config) {
  const router = express.Router()

  router.get('/start', async (req, res) => {

    testCache(config.parcelsPerHour)

    res.json({
      status: 'started',
      parcelsPerHour: config.parcelsPerHour,
    })
  })

  router.get('/results', async (req, res) => {
    const { rows } = await pool.query(`
      SELECT
        port,
        COUNT(*) as count,
        COUNT(DISTINCT serial_number) as unique_serials,
        ROUND(AVG(response_time_ms)) as avg_ms,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percent
      FROM test_results
      WHERE port IS NOT NULL
      GROUP BY port
      ORDER BY count DESC
    `)

    res.json(rows)
  })

  router.get('/results/detail', async (req, res) => {
    const limit = parseInt(req.query.limit) || 100

    const { rows } = await pool.query(
      `SELECT * FROM test_results ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )

    res.json(rows)
  })

  router.get('/match-rate', async (req, res) => {
    const matchRate = await getMatchRate()
    res.json(matchRate)
  })

  return router
}
