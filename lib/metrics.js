/**
 * In-memory observability counters (S22).
 *
 * Deliberately not persisted: these answer "what is happening right now", while
 * the durable audit rows answer "what happened". A restart resetting them is
 * the correct tradeoff; a corrupted counter must never block a send.
 */

/** One bounded, reset-friendly counter store. */
export class Metrics {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now
    this.startedAt = now()
    this.counters = {
      sends: 0,
      deliveries: 0,
      delivered: 0,
      failed: 0,
      held: 0,
      inRoom: 0,
      rejected: 0,
      deduplicated: 0,
      broadcasts: 0,
      nudges: 0,
      relays: 0,
      relayReplies: 0,
      pauses: 0,
      readReceipts: 0,
    }
    this.rejections = new Map()
    this.estimatedTokens = 0
    this.actualTokens = 0
    this.actualSamples = 0
    this.promptLatencies = []
    this.waitingSince = new Map()
  }

  /** Increment one named counter. */
  bump(name, by = 1) {
    if (!Object.hasOwn(this.counters, name)) return
    this.counters[name] += by
  }

  /** Record a rejected operation by stable code. */
  reject(code) {
    this.counters.rejected += 1
    this.rejections.set(code, (this.rejections.get(code) ?? 0) + 1)
  }

  /** Record a send charge: estimate is always known, actual may arrive later. */
  charge({ estimated = 0, deliveries = 0, targets = 0, broadcast = false, nudge = false } = {}) {
    this.counters.sends += 1
    this.counters.deliveries += deliveries
    if (broadcast) this.counters.broadcasts += 1
    if (nudge) this.counters.nudges += 1
    if (targets > 0) {
      this.estimatedTokens += Math.max(0, Math.trunc(estimated))
    }
  }

  /** Record provider-reported usage for one delivery, when the host exposes it. */
  actual(tokens) {
    if (!Number.isFinite(tokens) || tokens <= 0) return
    this.counters.actualSamples = (this.counters.actualSamples ?? 0) + 1
    this.actualTokens += Math.trunc(tokens)
  }

  /** Record how long admitting one delivery took. */
  latency(ms) {
    if (!Number.isFinite(ms) || ms < 0) return
    this.promptLatencies.push(Math.trunc(ms))
    if (this.promptLatencies.length > 200) this.promptLatencies.shift()
  }

  /** Mark one target as waiting since a timestamp; `null` clears it. */
  waiting(sessionId, at) {
    if (at === null) this.waitingSince.delete(sessionId)
    else this.waitingSince.set(sessionId, at)
  }

  /** Bounded, JSON-safe snapshot for the panel. */
  snapshot() {
    const sortedLatencies = [...this.promptLatencies].sort((a, b) => a - b)
    const percentile = (value) => (sortedLatencies.length === 0 ? 0 : sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * value))])
    return {
      startedAt: this.startedAt,
      uptimeMs: Math.max(0, this.now() - this.startedAt),
      counters: { ...this.counters },
      rejections: Object.fromEntries([...this.rejections.entries()].sort((a, b) => b[1] - a[1])),
      estimatedTokens: this.estimatedTokens,
      actualTokens: this.actualTokens,
      actualSamples: this.actualSamples,
      latency: {
        count: sortedLatencies.length,
        p50: percentile(0.5),
        p95: percentile(0.95),
      },
      waiting: this.waitingSince.size,
    }
  }
}
