import { pool } from './db.js'

export async function getLastSuccessfulIngest() {
  const result = await pool.query(`
    SELECT MAX(created_at) as last_ingest
    FROM ingest_acc
  `)
  return result.rows[0].last_ingest
}

export async function isCacheStale(maxAgeMinutes = 30) {
  const lastIngest = await getLastSuccessfulIngest()
  if (!lastIngest) return true // No data yet

  const ageMinutes = (Date.now() - new Date(lastIngest)) / 60000
  return ageMinutes > maxAgeMinutes
}

// Retry with exponential backoff
export async function fetchWithRetry(url, maxRetries = 5) {
  const delays = [60000, 120000, 300000, 600000, 600000] // 1min, 2min, 5min, 10min, 10min

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetch attempt ${attempt + 1}/${maxRetries + 1}: ${url}`)

      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30s timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // Validate response
      if (!Array.isArray(data)) {
        throw new Error('Response is not an array')
      }

      console.log(`Fetch succeeded, got ${data.length} items`)
      return { success: true, data }
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, error.message)

      // If this was the last attempt, return failure
      if (attempt === maxRetries) {
        console.error('All retry attempts exhausted')
        return { success: false, error: error.message }
      }

      // Wait before next retry
      const delay = delays[attempt]
      console.log(`Retrying in ${delay / 1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export function toAPIFormat(timestamp) {
  const date = new Date(timestamp)

  const offsetMinutes = -date.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
  const offsetMins = Math.abs(offsetMinutes) % 60
  const sign = offsetMinutes >= 0 ? '+' : '-'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(
    offsetMins
  ).padStart(2, '0')}`

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`
}

export function fromAPIFormat(tzString) {
  return new Date(tzString).toISOString()
}


