export async function fetchWithRetry(url, maxRetries = 5) {
  const delays = [60000, 120000, 240000, 480000, 960000] // 1min, 2min, 4min, 8min, 16min
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30s timeout
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()

      if (!Array.isArray(data)) throw new Error('Response is not an array')

      return { success: true, data }
    } catch (error) {
      console.error(`Fetch attempt ${url}`)
      console.error(`Fetch attempt ${attempt + 1} failed:`, error.message)

      if (attempt === maxRetries) {
        console.error('All retry attempts exhausted')
        return { success: false, error: error.message }
      }

      const delay = delays[attempt]
      console.log(`Retrying in ${delay / 1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
