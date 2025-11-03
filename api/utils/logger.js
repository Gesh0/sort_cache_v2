export function logOperation(origin) {
  return {
    pending: (context = '') => {
      console.log(`[${origin}] - [PENDING] ${context}`)
    },
    success: (context = '') => {
      console.log(`[${origin}] - [SUCCESS] ${context}`)
    },
    failure: (error) => {
      const msg = error?.message || error?.toString() || 'Unknown error'
      console.error(`[${origin}] - [FAILURE] ${msg}`)
    },
  }
}
