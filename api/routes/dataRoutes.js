// mock-server.js
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

  // Convert TZ query params to Unix timestamps for comparison
  const from = dateFrom ? new Date(dateFrom).getTime() : null
  const to = dateTo ? new Date(dateTo).getTime() : null

  console.log('Filter range:', from, 'to', to)

  const filtered = data.filter(({ updatedAt }) => {
    const timestamp = new Date(updatedAt).getTime()
    const passes = (!from || timestamp >= from) && (!to || timestamp <= to)
    console.log('Item:', updatedAt, '→', timestamp, 'passes:', passes)
    return passes
  })

  console.log('Filtered count:', filtered.length)
  res.json(filtered)
})

export default router
