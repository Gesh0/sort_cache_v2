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