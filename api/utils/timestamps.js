import { DateTime } from 'luxon'

export function toAPIFormat(timestamp, timezone = 'Europe/Skopje') {
  const dt = DateTime.fromISO(timestamp, { zone: 'utc' })
  return dt.setZone(timezone).toISO()
}

export function fromAPIFormat(tzString) {
  return DateTime.fromISO(tzString).toUTC().toISO()
}


