import pg from 'pg'

export const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  database: 'sort_cache_db',
  user: 'sort_cache',
  password: 'pass_pass_pass',
})

export async function getLastSuccessfulIngest() {
  const result = await pool.query(`
    SELECT MAX(created_at) as last_ingest
    FROM ingest_acc
  `)
  return result.rows[0].last_ingest
}

export async function isCacheStale(maxAgeMinutes = 30) {
  const lastIngest = await getLastSuccessfulIngest()
  if (!lastIngest) return true // No data yet

  const ageMinutes = (Date.now() - new Date(lastIngest)) / 60000
  return ageMinutes > maxAgeMinutes
}
