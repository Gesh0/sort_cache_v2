import express from 'express'
import { pool } from '../utils/db.js'
import { LoadTester } from '../utils/load_test.js'

export default function createTestRoutes(config) {
  const router = express.Router()
  let tester = null

  router.get('/start', async (req, res) => {
    if (tester) {
      return res.status(400).json({ error: 'Test already running' })
    }

    tester = new LoadTester(config.test)
    await tester.prepareTestPool(config.test.hoursToSpread)
    tester.start()

    res.json({
      status: 'started',
      poolSize: tester.testPool.length,
      intervalMs: tester.intervalMs,
    })
  })

  router.get('/stop', (req, res) => {
    if (!tester) {
      return res.status(400).json({ error: 'No test running' })
    }

    const completed = tester.currentIndex
    tester.stop()
    tester = null

    res.json({ status: 'stopped', completed })
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

  return router
}
