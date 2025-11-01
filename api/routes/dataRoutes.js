// mock-server.js
import express from 'express'
import { DateTime } from 'luxon'
import mock from '../data/mock.js'
import real from '../data/real.js'

const router = express.Router()

router.get('/:type', (req, res) => {
  const { type } = req.params
  const { dateFrom, dateTo } = req.query
  const sources = { mock, real }
  const data = sources[type]

  if (!data)
    return res
      .status(400)
      .json({ error: 'Invalid type. Use "mock" or "real".' })

  // Convert TZ query params to DateTime objects for comparison
  const from = dateFrom ? DateTime.fromISO(dateFrom) : null
  const to = dateTo ? DateTime.fromISO(dateTo) : null

  const filtered = data.filter(({ updatedAt }) => {
    const timestamp = DateTime.fromISO(updatedAt)
    const passes = (!from || timestamp >= from) && (!to || timestamp <= to)
    return passes
  })

  res.json(filtered)
})

export default router
