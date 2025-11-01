export class StalenessTimer {
  constructor(name, ttlMinutes) {
    this.name = name
    this.ttl = ttlMinutes * 60 * 1000
    this.expiresAt = null
  }

  reset() {
    this.expiresAt = Date.now() + this.ttl
    console.log(
      `[TIMER] [${this.name}] ${this.ttl / 60000} minutes - ${new Date(
        this.expiresAt
      ).toISOString()}`
    )
  }

  isStale() {
    return !this.expiresAt || Date.now() > this.expiresAt
  }

  getRemainingMs() {
    if (!this.expiresAt) return 0
    return Math.max(0, this.expiresAt - Date.now())
  }
}
