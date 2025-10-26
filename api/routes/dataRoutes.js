import express from 'express'
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

  const from = dateFrom ? new Date(dateFrom) : null
  const to = dateTo ? new Date(dateTo) : null

  const filtered = data.filter(({ updatedAt }) => {
    const d = new Date(updatedAt)
    return (!from || d >= from) && (!to || d <= to)
  })

  res.json(filtered)
})

export default router
