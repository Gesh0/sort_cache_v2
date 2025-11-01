// logger.js
export function logOperation(origin, context) {
  console.log(`[${origin}]-[START] ${context || ''}`)

  return {
    success: () => {
      console.log(`[${origin}]-[SUCCESS] ${context}`)
    },
    failure: (error) => {
      const msg = error?.message || error?.toString() || 'Unknown error'
      console.error(`[${origin}]-[FAILURE] ${JSON.stringify(msg)}`)
    },
  }
}
