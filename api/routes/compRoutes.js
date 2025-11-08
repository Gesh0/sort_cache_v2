import express from 'express'
import { pool } from '../utils/db.js'
import { fetchEvents, fetchLocations } from '../utils/comparison.js'

const router = express.Router()

router.get('/start', async (req, res) => {
  await fetchLocations({ days: 1 }, { days: 60 })
  await fetchEvents({ days: 5 }, { days: 1 })
  res.status(200).send('done')
})

router.get('/view/:query', async (req, res) => {
  const { rows } = await pool.query(queryMap[req.params.query])
  res.json(rows)
})

router.get('/clear/:table', async (req, res) => {
  const table = req.params?.table || 'events_comp, location_comp'

  const result = await pool.query(`
  TRUNCATE TABLE ${table} RESTART IDENTITY;
  `)

  res.send(result)
})

const queryMap = {
  count: `
  SELECT
  (SELECT COUNT(*) FROM events_comp) AS events_count,
  (SELECT COUNT(*) FROM location_comp) AS locations_count;

  `,
  match: `select
    date(l.updated_at) as location_date,
    count(distinct e.barcode) as matched_count,
    round(count(distinct e.barcode)::numeric * 100
        / (select count(*) from events_comp e),2)
    from location_comp l
    left join events_comp e
        on e.barcode = l.serial_number
    group by date(l.updated_at)
    order by location_date;`,
  match_jug: `select
    date(l.updated_at) as location_date,
    count(distinct e.barcode) as matched_count,
    round(count(distinct e.barcode)::numeric * 100
        / (select count(*) from events_comp e 
           where e.location_name = '"001 - Скопје Југ - Главен магацин"'),2)
    from location_comp l
    left join events_comp e
        on e.barcode = l.serial_number
        and e.location_name = '"001 - Скопје Југ - Главен магацин"'
    group by date(l.updated_at)
    order by location_date;`,
    grouped:
    `
    WITH first_locations AS (
    SELECT 
        serial_number,
        MIN(updated_at) as first_location_ts,
        MAX(updated_at) as last_location_ts,
        COUNT(*) as location_update_count
    FROM location_comp
    GROUP BY serial_number
    ),
    first_events AS (
        SELECT 
            barcode,
            MIN(updated_at AT TIME ZONE 'Europe/Skopje') as first_event_ts,
            MAX(updated_at AT TIME ZONE 'Europe/Skopje') as last_event_ts,
            COUNT(*) as event_count
        FROM events_comp
        GROUP BY barcode
    )
    SELECT
        CASE 
            WHEN fl.first_location_ts < fe.first_event_ts THEN 'Location BEFORE event (predictive)'
            WHEN fl.first_location_ts > fe.first_event_ts THEN 'Location AFTER event (reactive)'
            ELSE 'Simultaneous'
        END as timing_pattern,
        COUNT(*) as barcode_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (fl.first_location_ts - fe.first_event_ts))/3600), 2) as avg_hours_diff,
        MIN(fl.first_location_ts - fe.first_event_ts) as min_diff,
        MAX(fl.first_location_ts - fe.first_event_ts) as max_diff
    FROM first_locations fl
    INNER JOIN first_events fe ON fl.serial_number = fe.barcode
    GROUP BY timing_pattern
    ORDER BY barcode_count DESC;
    `
}

export default router
