import express from 'express'
import mock from '../data/mock.js'
import real from '../data/real.js'
import { logOperation } from '../utils/logger.js'

const router = express.Router()

// Dynamic date adjustment: shift mock data timestamps to current time
function adjustMockDates(data) {
  const envValue = process.env.MOCK_DYNAMIC_DATES
  const enabled = envValue === 'true' || envValue === true

  console.log(`[DEBUG] MOCK_DYNAMIC_DATES="${envValue}" (type: ${typeof envValue}), enabled: ${enabled}`)

  if (!enabled) return data

  const now = new Date()
  // Align to current hour's start (so bootstrap queries current hour data)
  const currentHour = new Date(Math.floor(now.getTime() / 3600000) * 3600000)

  // Mock data earliest: 2025-10-30T15:20 UTC (EARLY001 at 18:20+02:00)
  // We want that to align with 2 hours ago (bootstrap looks back 2 hours)
  const baseDate = new Date('2025-10-30T15:00:00Z')
  const targetDate = new Date(currentHour.getTime() - 2 * 3600000) // 2 hours ago
  const offset = targetDate.getTime() - baseDate.getTime()

  console.log(`[DEBUG] Adjusting dates: baseDate=${baseDate.toISOString()}, targetDate=${targetDate.toISOString()}, offset=${offset}ms (${Math.floor(offset/3600000)} hours)`)

  const adjusted = data.map(item => {
    const original = new Date(item.updatedAt).getTime()
    const shifted = new Date(original + offset).toISOString()
    return {
      ...item,
      updatedAt: shifted
    }
  })

  console.log(`[DEBUG] Original first item: ${data[0].updatedAt}, Shifted: ${adjusted[0].updatedAt}`)

  return adjusted
}

router.get('/:type', (req, res) => {
  const { type } = req.params
  const { dateFrom, dateTo } = req.query
  const log = logOperation('mockAPI', { type, dateFrom, dateTo }, 'dataRoutes')

  const sources = { mock, real }
  let data = sources[type]

  if (!data) {
    log.failure(new Error('Invalid type'))
    return res.status(400).json({ error: 'Invalid type. Use "mock" or "real".' })
  }

  // Apply dynamic date adjustment if enabled
  if (type === 'mock') {
    data = adjustMockDates(data)
  }

  const from = dateFrom ? new Date(dateFrom).getTime() : null
  const to = dateTo ? new Date(dateTo).getTime() : null

  console.log(`[DEBUG] Filter range: ${dateFrom} to ${dateTo}`)
  console.log(`[DEBUG] Sample shifted dates: ${data.slice(0, 3).map(d => d.updatedAt).join(', ')}`)

  const filtered = data.filter(({ updatedAt }) => {
    const timestamp = new Date(updatedAt).getTime()
    const passes = (!from || timestamp >= from) && (!to || timestamp <= to)
    return passes
  })

  log.success({ returned: filtered.length, total: data.length })
  res.json(filtered)
})

export default router
