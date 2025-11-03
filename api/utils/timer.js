import { utcNow } from './timestamps.js'
import { logOperation } from './logger.js'

export class StalenessTimer {
  constructor(name, ttlMinutes, onExpire = null) {
    this.name = name
    this.ttl = ttlMinutes * 60 * 1000
    this.expiresAt = null
    this.onExpire = onExpire
    this.timeoutId = null
  }

  reset() {
    if (this.timeoutId) clearTimeout(this.timeoutId)

    this.expiresAt = utcNow().toMillis() + this.ttl
    const logger = logOperation('TIMER')
    logger.pending(`${this.name} ${this.ttl / 60000}m expires: ${utcNow().plus({ milliseconds: this.ttl }).toISO()}`)

    if (this.onExpire) {
      this.timeoutId = setTimeout(() => {
        const logger = logOperation('TIMER')
        logger.failure(`${this.name} expired after ${this.ttl / 60000}m`)
        this.onExpire()
      }, this.ttl)
    }
  }

  isStale() {
    return !this.expiresAt || utcNow().toMillis() > this.expiresAt
  }

  getRemainingMs() {
    if (!this.expiresAt) return 0
    return Math.max(0, this.expiresAt - utcNow().toMillis())
  }

  clear() {
    if (this.timeoutId) clearTimeout(this.timeoutId)
    this.timeoutId = null
    this.expiresAt = null
  }
}
