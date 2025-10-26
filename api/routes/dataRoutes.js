import express from 'express'
const router = express.Router()
//
import mock from '../data/mock.js'
import real from '../data/real.js'


router.get('/:type', (req, res) => {
  const { type } = req.params
  const { dateFrom } = req.query

  function dateFilter(data, dateFrom) {
    if (!dateFrom) return data

    const filterDate = new Date(dateFrom)

    return data.filter((item) => {
      const itemDate = new Date(item.updatedAt)
      return itemDate >= filterDate
    })
  }

  if (type === 'mock') return res.json(dateFilter(mock, dateFrom))
  if (type === 'real') return res.json(dateFilter(real, dateFrom))

  res.status(400).json({ error: 'Invalid type. Use "mock" or "real"' })
})

export default router