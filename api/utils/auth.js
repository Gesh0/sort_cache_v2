import { logOperation } from './logger.js'

const AUTH_URL = 'https://api.els.mk/users/login'
const TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes
const REFRESH_BUFFER = 30 * 1000 // Refresh 30s before expiry

let token = null
let tokenExpiry = 0

export async function getAuthToken() {
  const now = Date.now()

  // Return cached token if still valid
  if (token && now < tokenExpiry - REFRESH_BUFFER) {
    return token
  }

  // Need to authenticate
  const log = logOperation('authenticate', {}, 'auth')

  const credentials = {
    client_id: process.env.API_CLIENT_ID || '6605606e9f6bae01522f1b829e9f2324',
    client_secret: process.env.API_CLIENT_SECRET || 'de027eb49c9c6febcca1711e8bd73687',
    username: process.env.API_USERNAME || 'test.sort',
    password: process.env.API_PASSWORD || 'Pf82ZSrTx$csr',
    grant_type: 'password'
  }

  const delays = [1000, 2000, 4000, 8000, 16000] // Exponential backoff: 1s, 2s, 4s, 8s, 16s

  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.access_token) {
        throw new Error('No access_token in response')
      }

      token = data.access_token
      tokenExpiry = now + TOKEN_EXPIRY

      log.success({ expiresIn: TOKEN_EXPIRY / 1000 })
      return token
    } catch (error) {
      const isLastAttempt = attempt === delays.length - 1

      if (isLastAttempt) {
        log.failure(new Error(`Auth failed after ${delays.length} attempts: ${error.message}`))
        throw new Error(`Authentication failed: ${error.message}`)
      }

      console.log(`[AUTH] Attempt ${attempt + 1} failed, retrying in ${delays[attempt] / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, delays[attempt]))
    }
  }
}

export function clearAuthToken() {
  token = null
  tokenExpiry = 0
}