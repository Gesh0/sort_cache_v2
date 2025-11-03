import { batchIngestJobs, toAPIFormat, parseISO } from '../utils/timestamps.js'

const locations = [
  { id: 1, name: '001 - Skopje Center' },
  { id: 2, name: '101 - Aerodrom' },
  { id: 3, name: '103 - Cair' },
  { id: 4, name: '203 - Bunjakovec' },
  { id: 5, name: '112 - City Mall' },
]

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

export function generateMockData(dateFrom, dateTo, index) {
  const timestamp = toAPIFormat(dateFrom)
  const dynamicSN = `DYNAMIC${index}`
  const seed = hashCode(`${dateFrom}-${dateTo}`)
  const loc = locations[Math.floor(seededRandom(seed + 1) * locations.length)]

  return [
    {
      serialNumber: 'STATIC',
      logisticsPointId: locations[0].id,
      logisticsPointName: locations[0].name,
      updatedAt: timestamp,
    },
    {
      serialNumber: dynamicSN,
      logisticsPointId: loc.id,
      logisticsPointName: loc.name,
      updatedAt: timestamp,
    },
  ]
}

export default function (startISO, endISO) {
  const extendedEnd = parseISO(endISO).plus({ hours: 1 }).toISO()
  const jobs = batchIngestJobs(startISO, extendedEnd)
  return jobs.flatMap((job, index) => generateMockData(job.dateFrom, job.dateTo, index + 1))
}
