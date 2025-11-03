import { logOperation } from './logger.js'

async function retryWrapper(fn, origin = '') {
  const maxRetries = 5
  const delays = [60000, 120000, 240000, 480000, 960000]
  const logger = logOperation(origin)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      logger.failure(`attempt ${attempt + 1} failed: ${error.message}`)

      if (attempt === maxRetries) {
        throw error
      }

      const delay = delays[attempt]
      logger.pending(`retrying in ${delay / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export async function authenticate() {
  const logger = logOperation('AUTH')
  logger.pending()

  const token = await retryWrapper(async () => {
    const response = await fetch('https://api.els.mk/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: '6605606e9f6bae01522f1b829e9f2324',
        client_secret: 'de027eb49c9c6febcca1711e8bd73687',
        username: 'test.sort',
        password: 'Pf82ZSrTx$csr',
        grant_type: 'password',
      }),
      signal: AbortSignal.timeout(30000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.access_token
    })

    return response
  }, 'AUTH')

  logger.success()
  return token
}

export async function fetchWithRetry(url, token = null) {
  const logger = logOperation('FETCH')
  logger.pending(url)

  const data = await retryWrapper(async () => {
    const fetchOptions = {
      signal: AbortSignal.timeout(30000),
    }

    if (token) {
      fetchOptions.headers = {
        Authorization: `Bearer ${token}`,
      }
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()

    if (!Array.isArray(data)) throw new Error('Response is not an array')

    return data
  }, 'FETCH')

  logger.success(url)
  return data
}
