import { logOperation } from './logger.js'
import { getAuthToken } from './auth.js'

export async function fetchWithRetry(url, origin = null, maxRetries = 5, useAuth = false) {
  const log = logOperation('fetch', { url, maxRetries, useAuth }, origin)
  const delays = [60000, 120000, 300000, 600000, 600000]

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers = { 'Content-Type': 'application/json' }

      // Get fresh token if auth is required
      if (useAuth) {
        const token = await getAuthToken()
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Response is not an array')

      log.success({ items: data.length, attempts: attempt + 1 })
      return { success: true, data }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries

      if (isLastAttempt) {
        log.failure(new Error(`All retries exhausted: ${error.message}`))
        return { success: false, error: error.message }
      }

      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delays[attempt] / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delays[attempt]))
    }
  }
}
