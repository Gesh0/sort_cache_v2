import { DateTime, Interval } from 'luxon'
import { toAPIFormat } from './timestamps.js'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { pool } from './db.js'

const authUrl = 'https://api.els.mk/users/login'
const authConfig = {
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

export async function fetchLocations(offset, range) {
  const timeRef = DateTime.utc().minus(offset)
  const epoch = timeRef.minus(range)

  const interval = Interval.fromDateTimes(epoch, timeRef)
  // console.log('interval: ', JSON.stringify(interval))

  const batches = interval.splitBy({ days: 1 })
  // console.log('batches: ', JSON.stringify(batches))

  try {
    const authRes = await fetch(authUrl, authConfig.locations)
    const tokenData = await authRes.json()
    const token = tokenData.access_token

    const dataRes = await Promise.all(
      batches.map(async (e) => {
        const batchUrl = new URL('https://api.els.mk/v2/orders/sort')
        batchUrl.searchParams.set('dateFrom', toAPIFormat(e.start.toISO()))
        batchUrl.searchParams.set('dateTo', toAPIFormat(e.end.toISO()))
        console.log(batchUrl.href)
        const response = await fetch(batchUrl.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        await insertLocations(result)
        return result
      })
    )

    // await writeToFile('locations.json', dataRes)
    return dataRes
  } catch (error) {
    // console.log('error at fetch locations:', error.message || error)
    throw error
  }
}

export async function fetchEvents(offset) {
  const timeRef = DateTime.utc().minus(offset)
  const epoch = timeRef.minus({ days: 1 })

  try {
    const authRes = await fetch(authUrl, authConfig.events)
    const tokenData = await authRes.json()
    const token = tokenData.access_token

    const baseUrl = new URL(
      'https://api.els.mk/courier-analytics/orders/status-track'
    )
    baseUrl.searchParams.set('eventDateFrom', toAPIFormat(epoch))
    baseUrl.searchParams.set('eventDateTo', toAPIFormat(timeRef))
    baseUrl.searchParams.set('limit', 0)

    console.log(baseUrl.href)
    const response = await fetch(baseUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    const result = await response.json()
    // await writeToFile('events.json', result)

    // Handle nested data structure if events are in a property
    const events = Array.isArray(result)
      ? result
      : result.data || result.events || []
    await insertEvents(events)

    return result
  } catch (error) {
    // console.log('error at fetch events:', error.message || error)
    throw error
  }
}

async function writeToFile(filename, data) {
  try {
    const filePath = join(process.cwd(), filename)
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    // console.log(`Successfully wrote data to ${filename}`)
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error.message || error)
    throw error
  }
}

async function insertEvents(events) {
  if (!events?.length) return

  // console.log(`Inserting ${events.length} events...`)
  let inserted = 0

  const batchSize = 1000
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    const values = batch
      .map((_, idx) => {
        const base = idx * 7
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${
          base + 5
        }, $${base + 6}, $${base + 7})`
      })
      .join(', ')

    const params = batch.flatMap((e) => [
      e.eventId?.toString(),
      e.barcode,
      e.statusId,
      e.statusName,
      e.locationTypeId,
      e.locationName,
      e.date,
    ])


    const result = await pool.query(
      `INSERT INTO events_comp (event_id, barcode, status_id, status_name, location_type_id, location_name, updated_at)
       VALUES ${values}
       ON CONFLICT DO NOTHING
       RETURNING id`,
      params
    )
    inserted += result.rowCount
  }

  // console.log(`Inserted ${inserted} events`)
}

async function insertLocations(locations) {
  if (!locations?.length) return

  // console.log(`Inserting ${locations.length} locations...`)
  let inserted = 0

  const batchSize = 1000
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize)
    const values = batch
      .map((_, idx) => {
        const base = idx * 4
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
      })
      .join(', ')

    const params = batch.flatMap((l) => [
      l.serialNumber,
      l.logisticsPointId,
      l.logisticsPointName,
      l.updatedAt,
    ])

    const result = await pool.query(
      `INSERT INTO location_comp (serial_number, logistics_point_id, logistics_point_name, updated_at)
       VALUES ${values}
       ON CONFLICT DO NOTHING
       RETURNING id`,
      params
    )
    inserted += result.rowCount
  }

  // console.log(`Inserted ${inserted} locations`)
}

export async function getMatchRate() {
  const { rows } = await pool.query(
    `
    select
      d.location_date,
      e.location_name,
      count(e.id) as total_events,
      sum(case when lc.serial_number is not null then 1 else 0 end) as matched_events,
      count(e.id) - sum(case when lc.serial_number is not null then 1 else 0 end) as unmatched_events,
      cast(sum(case when lc.serial_number is not null then 1 else 0 end) as numeric) * 100 / count(e.id) as matched_percentage
    from
      events_comp e
    cross join lateral (
      select distinct date(updated_at) as location_date
      from location_comp
    ) d
    left join
      location_comp lc
      on lc.serial_number = e.barcode
      and date(lc.updated_at) = d.location_date
    group by
      d.location_date, e.location_name
    order by
      d.location_date, e.location_name;
    `
  )

  return rows
}
