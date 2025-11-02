export function logOperation(origin) {
  return {
    pending: (context = '') => {
      console.log(`[${origin}] - [PENDING] ${context} ${new Date().toISOString()}`)
    },
    success: (context = '') => {
      console.log(`[${origin}] - [SUCCESS] ${context} ${new Date().toISOString()}`)
    },
    failure: (error) => {
      const msg = error?.message || error?.toString() || 'Unknown error'
      console.error(`[${origin}] - [FAILURE] ${msg} ${new Date().toISOString()}`)
    },
  }
}
