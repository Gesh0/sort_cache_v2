import { pool } from './db.js'
import { logOperation } from './logger.js'
import { fetchEvents } from './test.js'

const QUERIES_PER_HOUR = 3600
const DEFAULT_HOURS = 1

export class LoadTester {
  constructor(config = {}) {
    this.queriesPerHour = config.queriesPerHour || QUERIES_PER_HOUR
    this.intervalMs = (60 * 60 * 1000) / this.queriesPerHour
    this.testPool = []
    this.currentIndex = 0
    this.intervalId = null
    this.hoursToSpread = config.hoursToSpread || DEFAULT_HOURS
    this.config = config
  }

  async loadTestData() {
    const logger = logOperation('LOAD_TEST_DATA')
    logger.pending()

    const events = await fetchEvents(this.config)
    const filtered = events.filter((e) => e.statusId === 80)

    logger.success(`loaded ${filtered.length} events with statusId=80`)
    return filtered.map((e) => e.barcode)
  }

  async prepareTestPool(hours = 1) {
    const logger = logOperation('PREPARE_TEST_POOL')
    logger.pending()

    const serialNumbers = await this.loadTestData()
    const totalQueries = this.queriesPerHour * hours

    this.testPool = []
    for (let i = 0; i < totalQueries; i++) {
      this.testPool.push(serialNumbers[i % serialNumbers.length])
    }

    logger.success(
      `pool_size: ${this.testPool.length}, unique_serials: ${serialNumbers.length}`
    )
    return this.testPool.length
  }

  async executeQuery(serialNumber) {
    const requestStart = new Date()

    try {
      const response = await fetch(`http://localhost:3000/cache/${serialNumber}`)
      const requestEnd = new Date()
      const responseTimeMs = requestEnd - requestStart

      const data = await response.json()

      const { rows } = await pool.query(
        `SELECT numeration FROM sort_map WHERE port = $1 LIMIT 1`,
        [data.port]
      )
      const numeration = rows[0]?.numeration || null

      await pool.query(
        `INSERT INTO test_results
         (serial_number, port, numeration, request_start, request_end,
          response_time_ms, status_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          serialNumber,
          data.port,
          numeration,
          requestStart,
          requestEnd,
          responseTimeMs,
          response.status,
        ]
      )

      return { success: true, responseTimeMs, status: response.status }
    } catch (error) {
      const requestEnd = new Date()
      const responseTimeMs = requestEnd - requestStart

      await pool.query(
        `INSERT INTO test_results
         (serial_number, port, numeration, request_start, request_end,
          response_time_ms, status_code, error)
         VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6)`,
        [
          serialNumber,
          requestStart,
          requestEnd,
          responseTimeMs,
          error.status || 500,
          error.message,
        ]
      )

      return { success: false, error: error.message }
    }
  }

  start() {
    const logger = logOperation('LOAD_TEST_START')
    logger.success(
      `interval: ${this.intervalMs}ms, pool_size: ${this.testPool.length}`
    )

    this.intervalId = setInterval(async () => {
      if (this.currentIndex >= this.testPool.length) {
        this.stop()
        return
      }

      const serialNumber = this.testPool[this.currentIndex]
      const result = await this.executeQuery(serialNumber)

      if (this.currentIndex % 100 === 0) {
        const logger = logOperation('LOAD_TEST_PROGRESS')
        logger.success(
          `progress: ${this.currentIndex}/${this.testPool.length}, ` +
            `last_response: ${result.responseTimeMs || 'error'}ms`
        )
      }

      this.currentIndex++
    }, this.intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      const logger = logOperation('LOAD_TEST_COMPLETE')
      logger.success(`completed ${this.currentIndex} queries`)
      this.intervalId = null
    }
  }
}
