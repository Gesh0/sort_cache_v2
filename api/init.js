import { pool } from './db.js'

async function tableCheck(table) {
  const results = await pool.query(`SELECT COUNT(*) FROM ${table}`)
  const count = parseInt(results.rows[0].count, 10)
  console.log('count: ' + count)
  if (count <= 0) return false
  if (count >= 1) return true
}

export async function initSortmap() {
  const check = await tableCheck('sort_map')
  if (check === false) await fetch(`http://localhost:3000/jobs/sortmap`)
  if (check === true) console.log('init sortmap skip')
}

export async function initIngest() {
  const check = await tableCheck('ingest_raw')
  if (check) return console.log('init ingest skip')

  const now = new Date()
  const dateFrom = new Date(now.setMinutes(0, 0, 0)).toISOString()
  const dateTo = new Date(now.setHours(now.getHours() + 1)).toISOString()

  const domain = `http://localhost:3000/jobs/ingest`
  await fetch(`${domain}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
}
