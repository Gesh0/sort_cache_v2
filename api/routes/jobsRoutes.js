import sort_map from '../data/sort_map.js'
import { pool } from '../utils/db.js'
import { preloadIngestJobs } from '../utils/init.js'
import { setTimeOffset } from '../utils/timestamps.js'

import express from 'express'
const router = express.Router()

// INGEST JOB

router.get('/ingest', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query

    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('ingest', $1)
      RETURNING *
    `,
      [JSON.stringify({ dateFrom, dateTo })]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// SORTMAP JOB

router.get('/sortmap', async (req, res) => {
  try {
    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('sort_map',$1)
      RETURNING *
      `,
      [JSON.stringify(sort_map)]
    )
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PRELOAD JOB

router.post('/preload', async (req, res) => {
  try {
    const { days, timeOffsetDays } = req.body

    if (!days || days <= 0) {
      return res.status(400).json({ error: 'days must be a positive integer' })
    }

    if (timeOffsetDays !== undefined) {
      setTimeOffset(timeOffsetDays)
    }

    await preloadIngestJobs(days)

    res.json({
      success: true,
      message: `Preloaded ${days} days of jobs`,
      timeOffsetDays: timeOffsetDays || 0
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
