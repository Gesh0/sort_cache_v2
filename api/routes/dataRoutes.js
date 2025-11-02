import express from 'express'
import generateDynamic from '../data/dynamic.js'
import { utcMinus, utcNow, fromAPIFormatDT } from '../utils/timestamps.js'

const router = express.Router()

const data = generateDynamic(utcMinus(48), utcNow().toISO())

router.get('/', (req, res) => {
  const { dateFrom, dateTo } = req.query

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'dateFrom and dateTo required' })
  }

  const from = fromAPIFormatDT(dateFrom)
  const to = fromAPIFormatDT(dateTo)

  const filtered = data.filter(({ updatedAt }) => {
    const timestamp = fromAPIFormatDT(updatedAt)
    return timestamp >= from && timestamp <= to
  })

  res.json(filtered)
})

export default router
