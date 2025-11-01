import { DateTime } from 'luxon'

const TIMEZONE = 'Europe/Skopje'

export function utcNow() {
  return DateTime.utc()
}

export function parseISO(isoString) {
  return DateTime.fromISO(isoString, { zone: 'utc' })
}

export function utcMinus(hours) {
  return utcNow().minus({ hours }).toISO()
}

export function msUntilNextHour() {
  const now = utcNow()
  const nextHour = now.plus({ hours: 1 }).startOf('hour')
  return nextHour.diff(now).milliseconds
}

export function toAPIFormat(utcISO) {
  return parseISO(utcISO).setZone(TIMEZONE).toISO()
}

export function fromAPIFormat(tzString) {
  return DateTime.fromISO(tzString).toUTC().toISO()
}

export function fromAPIFormatDT(tzString) {
  return DateTime.fromISO(tzString).toUTC()
}

export function batchIngestJobs(startISO, endISO) {
  const start = parseISO(startISO)
  const end = parseISO(endISO)
  const jobs = []
  let current = start

  while (current < end) {
    const hourStart = current.startOf('hour')
    const hourEnd = hourStart.plus({ hours: 1 })
    const isLeading = current > hourStart
    const isTrailing = end < hourEnd
    const segmentEnd = isTrailing ? end : hourEnd

    jobs.push({
      dateFrom: current.toISO(),
      dateTo: segmentEnd.toISO(),
      type: isLeading ? 'leading' : isTrailing ? 'trailing' : 'normal',
    })

    current = segmentEnd
  }

  return jobs
}


