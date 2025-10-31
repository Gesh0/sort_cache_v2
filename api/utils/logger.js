export function logOperation(name, context = {}, origin = null) {
  const fullName = origin ? `${origin}.${name}` : name
  const startTime = Date.now()
  const ctx = Object.keys(context).length ? ` ${JSON.stringify(context)}` : ''
  console.log(`[START] ${fullName}${ctx}`)

  return {
    success: (result = {}) => {
      const duration = Date.now() - startTime
      const res = Object.keys(result).length ? ` ${JSON.stringify(result)}` : ''
      console.log(`[SUCCESS] ${fullName} (${duration}ms)${res}`)
    },
    failure: (error) => {
      const duration = Date.now() - startTime
      const msg = error?.message || error?.toString() || 'Unknown error'
      console.error(`[FAILURE] ${fullName} (${duration}ms) ${msg}`)
    }
  }
}