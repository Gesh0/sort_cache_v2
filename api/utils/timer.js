import { utcNow } from './timestamps.js'

export class StalenessTimer {
  constructor(name, ttlMinutes) {
    this.name = name
    this.ttl = ttlMinutes * 60 * 1000
    this.expiresAt = null
  }

  reset() {
    this.expiresAt = utcNow().toMillis() + this.ttl
    console.log(
      `[TIMER] [${this.name}] ${this.ttl / 60000} minutes - ${utcNow()
        .plus({ milliseconds: this.ttl })
        .toISO()}`
    )
  }

  isStale() {
    return !this.expiresAt || utcNow().toMillis() > this.expiresAt
  }

  getRemainingMs() {
    if (!this.expiresAt) return 0
    return Math.max(0, this.expiresAt - utcNow().toMillis())
  }
}
