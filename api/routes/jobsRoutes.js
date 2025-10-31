import sort_map from '../data/mock.js'
import { pool } from '../utils/db.js'

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

export default router
