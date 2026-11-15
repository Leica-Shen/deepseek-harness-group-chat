/**
 * Flood and spend guards for Group-Talk-L.
 *
 * Every accepted send can wake up to `maxRecipientsPerSend` model turns, and
 * every group message also makes future prompt sections more expensive. The
 * guard therefore charges a conservative daily budget *before* a message is
 * persisted:
 *
 *   - per sender: messages, deliveries and estimated tokens
 *   - per group: messages, deliveries and estimated tokens
 *   - per target: deliveries and estimated tokens
 *
 * The token figure is deliberately an estimate. A delivery causes the target
 * to assemble its own system prompt and context, which this plugin cannot
 * measure before the turn runs. `assumedTokensPerDelivery` is a conservative
 * fixed overhead added to the envelope estimate, not a billing statement.
 */
import { emptyUsage, GroupError, HUMAN_SESSION } from './store.js'

/** CJK characters carry roughly 1.5 tokens each; ASCII roughly 4 chars/token. */
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u

/** Conservative-enough text estimate for both Latin and CJK envelopes. */
export function estimateTextTokens(text) {
  let cjk = 0
  let other = 0
  for (const character of String(text ?? '')) {
    if (CJK.test(character)) cjk += 1
    else other += 1
  }
  return Math.ceil(cjk * 1.5 + other / 4)
}

/** UTC day key used by the durable ledger. */
export function dayKey(now) {
  return new Date(now).toISOString().slice(0, 10)
}

/** Ensure the state carries today's ledger; resets all counters at UTC midnight. */
export function ensureUsage(state, now) {
  const day = dayKey(now)
  if (!state.usage || state.usage.day !== day) state.usage = emptyUsage(day)
  return state.usage
}

/** One counter, created on first use. */
function counter(map, key) {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new GroupError('invalid-session', 'Unsafe session key.')
  }
  let value = map[key]
  if (!value) {
    value = { messages: 0, deliveries: 0, tokens: 0 }
    map[key] = value
  }
  return value
}

/** Throw a typed quota failure. */
function deny(code, message) {
  throw new GroupError(code, message)
}

/** Recent message records across all groups, bounded by a wall-clock window. */
function recentMessages(state, now, windowMs) {
  if (!(Number.isFinite(windowMs) && windowMs > 0)) return []
  const cutoff = now - windowMs
  const recent = []
  for (const group of Object.values(state.groups ?? {})) {
    for (const message of group.messages ?? []) {
      if (message.kind !== 'message') continue
      if (!(Number.isFinite(message.at) && message.at > cutoff && message.at <= now)) continue
      recent.push(message)
    }
  }
  return recent
}

/** Sum the conservative token estimate stored on a message. */
function tokensOf(messages) {
  return messages.reduce((sum, message) => sum + (Number.isFinite(message.estimatedTokens) ? message.estimatedTokens : 0), 0)
}

/** Aggregate today's counters across all senders. */
function hostTotals(usage) {
  const total = { messages: 0, deliveries: 0, tokens: 0 }
  for (const value of Object.values(usage.senders ?? {})) {
    total.messages += value.messages
    total.deliveries += value.deliveries
    total.tokens += value.tokens
  }
  return total
}

/** Whether a transcript row proves delivery (or an attempted delivery) to one target. */
function deliveredTo(message, sessionId) {
  // Count pending as well as delivered: a concurrent send sees the earlier
  // delivery already admitted but not yet acknowledged, and must not slip past
  // the per-target burst cap.
  return (message.deliveries ?? []).some((delivery) => delivery.sessionId === sessionId && delivery.status !== 'failed')
}

/**
 * Check every quota and charge the ledger in one atomic draft mutation.
 *
 * The caller runs this inside `store.write`, after duplicate suppression and
 * before appending the message. A throw leaves the draft uncommitted, so a
 * rejected send neither appears in the transcript nor consumes quota.
 *
 * @param {object} options
 * @param {object} options.state store draft (must contain `usage`)
 * @param {number} options.now epoch milliseconds
 * @param {string} options.groupId
 * @param {string} options.senderSessionId
 * @param {Array<{sessionId: string}>} options.targets resolved recipients
 * @param {string} options.text normalized message body
 * @param {number} [options.envelopeChars] actual framed message size for the largest target
 * @param {string} [options.envelopeText] the largest framed envelope, for a CJK-aware estimate
 * @param {object} options.limits resolved row config
 * @returns {{estimatedTokens: number, perTargetTokens: number}}
 */
export function chargeSend({ state, now, groupId, senderSessionId, targets, text, envelopeChars, envelopeText, limits }) {
  // In-room targets (the human operator) are recorded without a session
  // wakeup: they count as a message, not as a delivery, burst or token charge.
  const sessionTargets = targets.filter((target) => target.sessionId !== HUMAN_SESSION)
  const count = sessionTargets.length
  // The human operator has information priority: their messages are never
  // blocked by a target's cooldown, burst or daily delivery cap. They still
  // consume the group/Host/sender budgets so one person cannot silently turn
  // the room into an unbounded broadcast bus.
  const humanSender = senderSessionId === HUMAN_SESSION
  const bypassTargetCaps = humanSender && limits.humanBypassTargetCaps !== false
  if (targets.length === 0) deny('no-recipients', 'That target would deliver to no other member.')
  if (count > limits.maxRecipientsPerSend) {
    deny(
      'fanout-exceeded',
      `That target resolves to ${count} recipients; the per-message fan-out limit is ${limits.maxRecipientsPerSend}. Use a direct @alias or raise maxRecipientsPerSend in the Group-Talk-L row.`,
    )
  }

  const usage = ensureUsage(state, now)
  const sender = counter(usage.senders, senderSessionId)
  const group = counter(usage.groups, groupId)
  const lastSend = usage.lastSend[senderSessionId]
  // The sender cooldown is a transport-level guard, not a target cap: the human
  // operator is exempt from target limits, not from spamming the bus.
  if (Number.isFinite(lastSend) && limits.sendCooldownMs > 0) {
    const wait = limits.sendCooldownMs - (now - lastSend)
    if (wait > 0) {
      deny(
        'rate-limited',
        `Group message cooldown: wait ${Math.ceil(wait / 1000)}s before sending again.`,
      )
    }
  }

  const framedChars = Number.isFinite(envelopeChars) && envelopeChars > 0 ? envelopeChars : text.length
  const estimate = estimateTextTokens(envelopeText || text) || Math.ceil(Math.max(1, framedChars) / 4)
  const perTargetTokens = Math.max(1, estimate) + limits.assumedTokensPerDelivery
  const totalTokens = perTargetTokens * count
  const host = hostTotals(usage)

  if (sender.messages + 1 > limits.dailyMessagesPerSender) {
    deny('quota-exceeded', `Daily message budget reached for this sender (${limits.dailyMessagesPerSender}).`)
  }
  // The operator's per-sender delivery/token ceilings are deliberately not
  // enforced: one broadcast fans out to several sessions, so a 6-member room
  // would lock the human out after ~10 broadcasts even though the room and
  // Host budgets are still far from full. Group/Host ceilings still bound the
  // room; the operator keeps the message count and cooldown so the panel stays
  // truthful and a stuck key cannot spin.
  if (!humanSender && sender.deliveries + count > limits.dailyDeliveriesPerSender) {
    deny('quota-exceeded', `Daily delivery budget reached for this sender (${limits.dailyDeliveriesPerSender}).`)
  }
  if (group.messages + 1 > limits.dailyMessagesPerGroup) {
    deny('quota-exceeded', `Daily message budget reached for this group (${limits.dailyMessagesPerGroup}).`)
  }
  if (group.deliveries + count > limits.dailyDeliveriesPerGroup) {
    deny('quota-exceeded', `Daily delivery budget reached for this group (${limits.dailyDeliveriesPerGroup}).`)
  }
  if (host.messages + 1 > limits.dailyMessagesPerHost) {
    deny('quota-exceeded', `Host-wide daily group-message budget reached (${limits.dailyMessagesPerHost}).`)
  }
  if (host.deliveries + count > limits.dailyDeliveriesPerHost) {
    deny('quota-exceeded', `Host-wide daily delivery budget reached (${limits.dailyDeliveriesPerHost}).`)
  }
  if (!humanSender && sender.tokens + totalTokens > limits.dailyEstimatedTokensPerSender) {
    deny('quota-exceeded', `Daily estimated token budget reached for this sender (${limits.dailyEstimatedTokensPerSender}).`)
  }
  if (group.tokens + totalTokens > limits.dailyEstimatedTokensPerGroup) {
    deny('quota-exceeded', `Daily estimated token budget reached for this group (${limits.dailyEstimatedTokensPerGroup}).`)
  }
  if (host.tokens + totalTokens > limits.dailyEstimatedTokensPerHost) {
    deny('quota-exceeded', `Host-wide daily estimated token budget reached (${limits.dailyEstimatedTokensPerHost}).`)
  }

  // Sliding-window guards. They stop a burst long before the daily ceiling and
  // protect a target from being steered by many parallel groups at once.
  const recent = recentMessages(state, now, limits.burstWindowMs)
  const senderRecent = recent.filter((message) => message.fromSessionId === senderSessionId)
  if (senderRecent.length + 1 > limits.maxMessagesPerSenderPerBurst) {
    deny('rate-limited', `Too many group messages from this sender in the burst window (limit ${limits.maxMessagesPerSenderPerBurst}).`)
  }
  // `recentMessages` does not retain the owning group key; count this group's
  // rows directly from the store (never from model-supplied fields).
  const groupRows = []
  for (const [id, value] of Object.entries(state.groups ?? {})) {
    if (id !== groupId) continue
    for (const message of value.messages ?? []) {
      if (message.kind !== 'message' || !Number.isFinite(message.at)) continue
      if (message.at > now - limits.burstWindowMs && message.at <= now) groupRows.push(message)
    }
  }
  if (groupRows.length + 1 > limits.maxMessagesPerGroupPerBurst) {
    deny('rate-limited', `Too many messages in this group chat in the burst window (limit ${limits.maxMessagesPerGroupPerBurst}).`)
  }
  if (recent.length + 1 > limits.maxMessagesPerHostPerBurst) {
    deny('rate-limited', `Host-wide group-message burst limit reached (${limits.maxMessagesPerHostPerBurst}).`)
  }
  if (!humanSender && tokensOf(senderRecent) + totalTokens > limits.maxEstimatedTokensPerSenderPerBurst) {
    deny('rate-limited', `Estimated token burst limit reached for this sender (${limits.maxEstimatedTokensPerSenderPerBurst}).`)
  }
  if (tokensOf(groupRows) + totalTokens > limits.maxEstimatedTokensPerGroupPerBurst) {
    deny('rate-limited', `Estimated token burst limit reached for this group chat (${limits.maxEstimatedTokensPerGroupPerBurst}).`)
  }
  if (tokensOf(recent) + totalTokens > limits.maxEstimatedTokensPerHostPerBurst) {
    deny('rate-limited', `Host-wide estimated token burst limit reached (${limits.maxEstimatedTokensPerHostPerBurst}).`)
  }

  for (const target of sessionTargets) {
    if (bypassTargetCaps) break
    const targetRecent = recent.filter((message) => deliveredTo(message, target.sessionId))
    if (targetRecent.length + 1 > limits.maxDeliveriesPerTargetPerBurst) {
      deny(
        'rate-limited',
        `@${target.alias} is receiving too many group messages in the burst window; wait before sending again (limit ${limits.maxDeliveriesPerTargetPerBurst}).`,
      )
    }
  }

  const targetCounters = []
  if (!bypassTargetCaps) {
    for (const target of sessionTargets) {
      const value = counter(usage.targets, target.sessionId)
      if (value.deliveries + 1 > limits.dailyDeliveriesPerTarget) {
        deny(
          'quota-exceeded',
          `Daily delivery budget reached for @${target.alias} (${limits.dailyDeliveriesPerTarget}).`,
        )
      }
      if (value.tokens + perTargetTokens > limits.dailyEstimatedTokensPerTarget) {
        deny(
          'quota-exceeded',
          `Daily estimated token budget reached for @${target.alias} (${limits.dailyEstimatedTokensPerTarget}).`,
        )
      }
      targetCounters.push(value)
    }
  }

  // All checks passed: commit the charge.
  sender.messages += 1
  sender.deliveries += count
  sender.tokens += totalTokens
  group.messages += 1
  group.deliveries += count
  group.tokens += totalTokens
  for (const value of targetCounters) {
    value.deliveries += 1
    value.tokens += perTargetTokens
  }
  usage.lastSend[senderSessionId] = now
  return { estimatedTokens: totalTokens, perTargetTokens, inRoom: targets.length - count }
}

/** Read-only daily usage view for one sender, without creating state. */
export function usageView(state, senderSessionId, now) {
  const empty = { messages: 0, deliveries: 0, tokens: 0 }
  const usage = state.usage
  if (!usage || usage.day !== dayKey(now)) {
    return { day: dayKey(now), sender: empty }
  }
  const sender = usage.senders?.[senderSessionId]
  return {
    day: usage.day,
    sender: sender ? { messages: sender.messages, deliveries: sender.deliveries, tokens: sender.tokens } : empty,
  }
}
