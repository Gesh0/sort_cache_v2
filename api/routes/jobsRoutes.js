import sort_map from '../sort_map.js'
import { pool } from '../app.js'


import express from 'express'
const router = express.Router()


// INGEST JOB

router.get('/ingest', async (req, res) => {
  try {
    const { dateFrom } = req.query

    const result = await pool.query(
      `
      INSERT INTO job_queue (type, data)
      VALUES ('ingest', $1)
      RETURNING *
    `,
      [JSON.stringify({ dateFrom })]
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
