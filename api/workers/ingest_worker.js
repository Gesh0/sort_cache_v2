import { pool } from '../db.js'

export default async function () {
  const client = await pool.connect()
  await client.query('LISTEN ingest_worker')

  client.on('notification', async (msg) => {
    if (msg.channel !== 'ingest_worker') return

    console.log(msg.payload)

    const { job_id, data } = JSON.parse(msg.payload)
    const { dateFrom, dateTo } = data

    const url = new URL('http://localhost:3000/data/mock')
    url.searchParams.set('dateFrom', dateFrom)
    url.searchParams.set('dateTo', dateTo)
    console.log(url.toString())
    const response = await fetch(url.toString())

    const items = await response.json()

    const values = items.map((item) => [
      job_id,
      item.serialNumber,
      item.logisticsPointId,
      item.logisticsPointName,
      item.updatedAt,
    ])

    await client.query(
      `INSERT INTO ingest_raw (job_ref, serial_number, logistics_point_id, logistics_point_name, updated_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::int[], $4::text[], $5::timestamptz[])`,
      [
        values.map((v) => v[0]),
        values.map((v) => v[1]),
        values.map((v) => v[2]),
        values.map((v) => v[3]),
        values.map((v) => v[4]),
      ]
    )
  })
}
