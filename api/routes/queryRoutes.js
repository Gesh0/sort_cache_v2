import express from 'express'
import { pool } from '../utils/db.js'
const router = express.Router()


router.get('/table', async (req, res) => {
  try {
    const { table } = req.query
    const result = await pool.query(`SELECT * FROM ${table}`)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router