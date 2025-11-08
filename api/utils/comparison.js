import { DateTime, Interval } from 'luxon'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { pool } from './db.js'

async function auth(type) {
  try {
    const authRes = await fetch('https://api.els.mk/users/login', authMap[type])
    const tokenData = await authRes.json()
    const token = tokenData.access_token

    return token
  } catch (error) {
    console.log('[AUTH] error: ', JSON.stringify(error))
  }
}

const authMap = {
  locations: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: '6605606e9f6bae01522f1b829e9f2324',
      client_secret: 'de027eb49c9c6febcca1711e8bd73687',
      username: 'test.sort',
      password: 'Pf82ZSrTx$csr',
      grant_type: 'password',
    }),
  },
  events: {
    method: 'POST',
    body: JSON.stringify({
      username: 'leo.leo',
      password: 'LG1704.15korpus',
      grant_type: 'password',
      client_id: 'ef823a7b20286788d17f3811bf72f21a',
      client_secret: 'df36bacc81d3df173fa00c963e2d6993',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  },
}

function getBatches(offset, range) {
  const timeRef = DateTime.utc().minus(offset)
  const epoch = timeRef.minus(range)

  const interval = Interval.fromDateTimes(epoch, timeRef)
  const batches = interval.splitBy({ hours: 8 })

  return batches
}

async function chunkInsert(data, tableName, columnMap) {
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`[INSERT] no ${tableName} data`)
    return
  }

  const columns = Object.keys(columnMap)
  const paramsPerRow = columns.length
  const CHUNK_SIZE = Math.floor(60000 / paramsPerRow) // Stay under 65535 limit

  let totalInserted = 0

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE)

    const params = chunk.flatMap((row) =>
      columns.map((col) => row[columnMap[col]] ?? null)
    )

    const values = chunk
      .map((_, idx) => {
        const placeholders = columns
          .map((_, colIdx) => `$${idx * paramsPerRow + colIdx + 1}`)
          .join(', ')
        return `(${placeholders})`
      })
      .join(', ')

    const columnNames = columns.join(', ')
    const result = await pool.query(
      `INSERT INTO ${tableName} (${columnNames}) VALUES ${values} ON CONFLICT DO NOTHING`,
      params
    )

    totalInserted += result.rowCount
  }

  console.log(`[INSERT] ${tableName} ${totalInserted}`)
}

async function insertEvents(events) {
  const valid = events.filter((e) => e.barcode && e.date)
  if (valid.length === 0) {
    console.log('[INSERT] no valid events')
    return
  }

  await chunkInsert(valid, 'events_comp', {
    event_id: 'eventId',
    barcode: 'barcode',
    status_id: 'statusId',
    status_name: 'statusName',
    location_type_id: 'locationTypeId',
    location_name: 'locationName',
    updated_at: 'date',
  })
}

async function insertLocations(locations) {
  const valid = locations.filter((l) => l.serialNumber && l.updatedAt)
  if (valid.length === 0) {
    console.log('[INSERT] no valid locations')
    return
  }

  await chunkInsert(valid, 'location_comp', {
    serial_number: 'serialNumber',
    logistics_point_id: 'logisticsPointId',
    logistics_point_name: 'logisticsPointName',
    updated_at: 'updatedAt',
  })
}

export async function fetchLocations(offset, range) {
  const batches = getBatches(offset, range)
  const token = await auth('locations')

  try {
    await Promise.all(
      batches.map(async (e) => {
        const batchUrl = new URL('https://api.els.mk/v2/orders/sort')
        batchUrl.searchParams.set('dateFrom', formatDate(e.start))
        batchUrl.searchParams.set('dateTo', formatDate(e.end))

        const response = await fetch(batchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        console.log(`[LOC] ${e.start} -> ${e.end}`)
        await insertLocations(result)
      })
    )

    // await writeToFile('locations.json', dataRes)
  } catch (error) {
    console.log('error at fetch locations:', error.message || error)
    throw error
  }
}

export async function fetchEvents(offset, range) {
  const batches = getBatches(offset, range)
  const token = await auth('events')

  try {
    await Promise.all(
      batches.map(async (e) => {
        const batchUrl = new URL(
          'https://api.els.mk/courier-analytics/orders/status-track'
        )
        batchUrl.searchParams.set('eventDateFrom', formatDate(e.start))
        batchUrl.searchParams.set('eventDateTo', formatDate(e.end))
        batchUrl.searchParams.set('limit', 0)

        const response = await fetch(batchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        console.log(`[EVE] ${e.start} -> ${e.end}`)
        await insertEvents(result.data)
      })
    )

    // await writeToFile('locations.json', dataRes)
  } catch (error) {
    console.log('error at fetch events:', error.message || error)
    throw error
  }
}

function formatDate(date) {
  return new DateTime(date).toFormat('yyyy-MM-dd HH:mm:ss')
}

async function writeToFile(filename, data) {
  try {
    const filePath = join(process.cwd(), filename)
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Successfully wrote data to ${filename}`)
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error.message || error)
    throw error
  }
}
