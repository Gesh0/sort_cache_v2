import { DateTime } from 'luxon'

export function toAPIFormat(timestamp, timezone = 'Europe/Skopje') {
  const dt = DateTime.fromISO(timestamp, { zone: 'utc' })
  return dt.setZone(timezone).toISO()
}

export function fromAPIFormat(tzString) {
  return DateTime.fromISO(tzString).toUTC().toISO()
}

export function batchIngestJobs(lastJobEnd, now = DateTime.utc()) {
  const start = DateTime.fromISO(lastJobEnd, { zone: 'utc' })
  const end = now
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


