// cache_loader.js
export default async function (pool) {
  const client = await pool.connect()
  await client.query('LISTEN load_cache')

  let cache = new Map()

  client.on('notification', async (msg) => {
    if (msg.channel !== 'load_cache') return

    const { rows } = await client.query(
      `SELECT serial_number, port 
       FROM derived_cache 
       WHERE id IN (
         SELECT MAX(id) FROM derived_cache GROUP BY serial_number
       )`
    )

    cache = new Map(rows.map((r) => [r.serial_number, r.port]))
    console.log(`Cache loaded: ${cache.size} items`)
  })

  return (serial_number) => cache.get(serial_number) || null
}
