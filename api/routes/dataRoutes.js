import express from 'express'
import { DateTime } from 'luxon'
import generateDynamic from '../data/dynamic.js'
import { fromAPIFormat } from '../utils/timestamps.js'

const router = express.Router()

const twoHoursAgo = DateTime.utc().minus({ hours: 2 }).toISO()
const now = DateTime.utc().toISO()
const data = generateDynamic(twoHoursAgo, now)
console.log(JSON.stringify(data, null, 2))

router.get('/', (req, res) => {
  const { dateFrom, dateTo } = req.query

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'dateFrom and dateTo required' })
  }

  console.log(`[DATA] request for ${dateFrom} - ${dateTo}`)

  const from = DateTime.fromISO(fromAPIFormat(dateFrom))
  const to = DateTime.fromISO(fromAPIFormat(dateTo))

  const filtered = data.filter(({ updatedAt }) => {
    const timestamp = DateTime.fromISO(fromAPIFormat(updatedAt))
    return timestamp >= from && timestamp <= to
  })

  res.json(filtered)
})

export default router
