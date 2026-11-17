/**
 * Session-group domain operations.
 *
 * The service is the only writer of group state and the only place that
 * delivers a routed message into another Session. It receives the exact live
 * caller session id from a command, a scoped tool, or an authenticated Web
 * request; every operation re-checks access against the current store instead
 * of trusting a previously rendered view.
 */
import {
  appendControl,
  appendSystem,
  auditViewOfGroup,
  GroupError,
  HUMAN_SESSION,
  MAX_NOTE,
  MESSAGE_PURPOSES,
  nameTaken,
  newGroupId,
  newMessageId,
  normalizeAlias,
  normalizeDuties,
  normalizeMessage,
  normalizeName,
  normalizeRole,
  normalizeSessionId,
  normalizeTopic,
  pruneRetention,
  redactMessage,
  resolveGroupReference,
  SENSITIVITIES,
  trimTranscript,
  viewOfGroup,
} from './store.js'
import { DEFAULTS } from './config.js'
import { buildDeliveryEnvelope } from './policy.js'
import { chargeSend, estimateTextTokens, recordActualUsage, usageView } from './guard.js'
import { Metrics } from './metrics.js'
import { createDshAdapter } from './adapters.js'
import { redactForExport, scanSecrets } from './secrets.js'
import { hasPresetRole, roleIdOf, roleMatches } from './roles.js'
import {
  RELAY_INTENTS,
  RELAY_MAX_ACTIVE,
  RELAY_MAX_MESSAGE,
  RELAY_MAX_TTL_MS,
  buildRelayEnvelope,
  buildRelayReplyEnvelope,
  buildRelayTimeoutEnvelope,
  mentionsRelayTool,
  newRelayId,
  pairRelaysRecent,
  relayPayloadProblem,
  relayView,
  roundsFor,
  trimRelays,
} from './relay.js'

const DEFAULT_ROLE = 'Participant'
const OWNER_ROLE = 'owner'
/** Role ids allowed to write an audited note / delegate a subagent. */
const NOTE_ROLE_IDS = new Set(['secretary', 'organizer', 'security'])
const DELEGATE_ROLE_IDS = new Set(['organizer'])
/** Tool-name fragments a read-only delegated subagent may not receive (S7). */
const DELEGATION_WRITE_TOOLS = [
  'bash', 'shell', 'exec', 'terminal', 'write', 'edit', 'patch', 'delete', 'remove',
  'fetch', 'http', 'web', 'browser', 'curl', 'git', 'npm', 'pnpm', 'yarn',
]
/** Group tools a delegated subagent must never acquire. */
const DELEGATION_DENY = [
  'group_talk_list', 'group_talk_send', 'group_talk_history', 'group_talk_leave',
  'group_talk_manage', 'group_talk_create', 'group_talk_note', 'group_talk_delegate',
  'group_talk_relay', 'group_talk_relay_reply',
]
/** Synthetic member used when the human operator addresses a legacy group. */
const HUMAN_MEMBER = Object.freeze({ sessionId: HUMAN_SESSION, alias: 'human', role: 'human', roleId: 'custom', duties: '', organizer: true })

/** Case-fold an alias or role. */
function fold(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US')
}

/** True when a member holds one of the allowed role ids (or the organizer grant). */
function hasRole(member, roleIds) {
  if (member?.sessionId === HUMAN_SESSION) return true
  if (member?.organizer === true) return true
  return hasPresetRole(member, roleIds)
}

/** Facts that belong in the durable audit even when the chat transcript trims. */
function appendAudit(group, actorAlias, entry, historyLimit, at) {
  appendControl(group, actorAlias, entry, historyLimit, at, { transcript: false })
}

/**
 * Organizer/owner/human exemption from the send-purpose gate.
 *
 * Authority is an explicit owner grant (`member.organizer`) plus the legacy
 * exact role labels, never a substring: an agent that renames itself
 * "non-organizer" must not inherit the exemption.
 */
export function isOrganizer(member, group) {
  if (!member) return false
  if (member.sessionId === HUMAN_SESSION) return true
  if (group && member.sessionId === group.ownerSessionId) return true
  if (member.organizer === true) return true
  const role = fold(member.role ?? '')
  if (role === 'organizer' || role === '组织者' || role === 'owner') return true
  return (member.roleId ?? roleIdOf(member.role)) === 'organizer'
}

/** Extract a bounded text result from a subagent output. */
function delegationText(result) {
  const blocks = Array.isArray(result?.output) ? result.output : []
  const text = blocks.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('\n').trim()
  return text
}

/** Whitespace/case-folded key for duplicate detection. */
function dedupeKey(value) {
  return String(value).normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en-US')
}

/** Active groups holding one session in a draft. */
function activeGroupCount(draft, sessionId) {
  return Object.values(draft.groups).filter((group) => (
    group.status === 'active' && group.members.some((member) => member.sessionId === sessionId)
  )).length
}

/**
 * Enforce the group-sprawl ceilings inside the same draft mutation that adds
 * membership, so two concurrent creates cannot both pass a stale count.
 *
 * Only active rooms count against the ceiling: dissolved history must not eat
 * the operator's ability to start a new room (F16). Retention trims the
 * dissolved rows themselves.
 */
function assertGroupCapacity(draft, memberIds, config) {
  const activeTotal = Object.values(draft.groups).filter((group) => group.status === 'active').length
  if (activeTotal >= config.maxGroupsTotal) {
    throw new GroupError('too-many-groups', `This Host has reached the total group limit (${config.maxGroupsTotal}). Delete a group before creating another.`, {
      params: { max: config.maxGroupsTotal },
    })
  }
  for (const sessionId of new Set(memberIds)) {
    if (sessionId === HUMAN_SESSION) continue
    if (activeGroupCount(draft, sessionId) >= config.maxGroupsPerSession) {
      throw new GroupError('too-many-groups', `Session "${sessionId}" already belongs to ${config.maxGroupsPerSession} active groups.`, {
        params: { max: config.maxGroupsPerSession },
      })
    }
  }
}

/** Find one member by exact alias or session id. */
function findMember(group, reference) {
  const value = typeof reference === 'string' ? reference.trim().replace(/^@/u, '') : ''
  if (!value) return undefined
  const folded = fold(value)
  return group.members.find((member) => fold(member.alias) === folded || member.sessionId === value)
}

/** Require a member; return it with a useful error otherwise. */
function requireMember(group, sessionId) {
  if (sessionId === HUMAN_SESSION) {
    return group.members.find((entry) => entry.sessionId === HUMAN_SESSION) ?? { ...HUMAN_MEMBER }
  }
  const member = group.members.find((entry) => entry.sessionId === sessionId)
  if (!member) throw new GroupError('not-a-member', `Session "${sessionId}" is not a member of group "${group.name}".`)
  return member
}

/** Require ownership. The human operator manages every group. */
function requireOwner(group, sessionId) {
  if (sessionId === HUMAN_SESSION) return requireMember(group, sessionId)
  if (group.ownerSessionId !== sessionId) {
    throw new GroupError('owner-only', `Only the owner of group "${group.name}" can change it.`)
  }
  const member = requireMember(group, sessionId)
  return member
}

/** Normalize one requested member. */
function memberInput(raw, fallbackAlias, fallbackRole = DEFAULT_ROLE) {
  if (typeof raw !== 'object' || raw === null) throw new GroupError('invalid-member', 'Each group member must be an object.')
  const sessionId = normalizeSessionId(raw.sessionId)
  const alias = normalizeAlias(raw.alias || fallbackAlias)
  if (sessionId !== HUMAN_SESSION && fold(alias) === HUMAN_SESSION) {
    throw new GroupError('invalid-alias', 'Alias "human" is reserved for the human operator.')
  }
  const role = normalizeRole(raw.role, fallbackRole)
  return {
    sessionId,
    alias,
    role,
    roleId: typeof raw.roleId === 'string' && /^[a-z][a-z-]{0,31}$/u.test(raw.roleId) ? raw.roleId : roleIdOf(role),
    duties: normalizeDuties(raw.duties),
    joinedAt: Date.now(),
    ...(raw.organizer === true ? { organizer: true } : {}),
  }
}

/** Split a target into one selector kind and value. */
export function parseTarget(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) throw new GroupError('target-required', 'Choose a target: @alias, #role, or *.')
  if (raw === '*' || raw === '@all' || raw === '#all' || fold(raw) === 'all') return { kind: 'all', label: '*' }
  if (raw.startsWith('#')) {
    const role = raw.slice(1).trim()
    if (!role) throw new GroupError('target-required', 'A role target looks like #reviewer.')
    return { kind: 'role', label: `#${role}`, value: role }
  }
  const alias = raw.replace(/^@/u, '').trim()
  if (!alias) throw new GroupError('target-required', 'An alias target looks like @reviewer.')
  return { kind: 'alias', label: `@${alias}`, value: alias }
}

/** Resolve a target selector against current membership. */
export function resolveTargets(group, senderSessionId, target) {
  const selector = parseTarget(target)
  // The human operator is a member of every group, including legacy rooms that
  // predate the human actor. Only an explicit @human needs the synthetic member;
  // `*` keeps its historical recipient count and falls back to the room when a
  // session has nobody else to answer.
  const hasHuman = group.members.some((member) => member.sessionId === HUMAN_SESSION)
  let members
  if (selector.kind === 'all') {
    members = group.members.filter((member) => member.sessionId !== senderSessionId)
    if (members.length === 0 && senderSessionId !== HUMAN_SESSION) members = [{ ...HUMAN_MEMBER }]
  } else if (selector.kind === 'role') {
    members = group.members.filter((member) => member.sessionId !== senderSessionId && roleMatches(member, selector.value))
    if (members.length === 0) {
      const roles = [...new Set(group.members.map((member) => member.role))].join(', ')
      throw new GroupError(
        'role-not-found',
        `No other member in "${group.name}" has role "${selector.value}". Roles: ${roles}.`,
        { params: { role: selector.value } },
      )
    }
  } else {
    const found = group.members.filter((member) => fold(member.alias) === fold(selector.value))
    const humanTarget = fold(selector.value) === HUMAN_SESSION
    const storedHuman = group.members.find((member) => member.sessionId === HUMAN_SESSION)
    if (humanTarget && senderSessionId !== HUMAN_SESSION && storedHuman) {
      // Rooms created before 2.0 may store the human under another alias
      // (e.g. "owner"); @human still addresses the person.
      members = [storedHuman]
    } else if (found.length !== 1) {
      if (humanTarget && senderSessionId !== HUMAN_SESSION && !hasHuman) {
        members = [{ ...HUMAN_MEMBER }]
      } else {
        const aliases = group.members.map((member) => `@${member.alias}`).join(', ')
        throw new GroupError('alias-not-found', `No member in "${group.name}" has alias "@${selector.value}". Aliases: ${aliases}.`)
      }
    } else {
      if (found[0].sessionId === senderSessionId) {
        throw new GroupError('self-target', 'Choose another member: a group message is not sent back to its sender.')
      }
      members = found
    }
  }
  if (members.length === 0) throw new GroupError('no-recipients', 'That target would deliver to no other member.')
  return { selector, members }
}

/** A compact delivery row. */
function deliveryRow(member) {
  return { sessionId: member.sessionId, alias: member.alias, status: 'pending', at: Date.now() }
}

/**
 * Close outstanding deliveries for sessions that are leaving or losing the
 * room: a pending row must not sit in "waiting" forever (chapter 9 #64).
 */
function closePendingDeliveries(group, sessionIds, reason) {
  const ids = new Set(sessionIds)
  let changed = 0
  for (const message of group.messages ?? []) {
    for (const delivery of message.deliveries ?? []) {
      if (!ids.has(delivery.sessionId)) continue
      if (!['pending', 'delivered', 'queued', 'held'].includes(delivery.status)) continue
      delivery.status = 'unknown'
      delivery.error = reason
      changed += 1
    }
  }
  return changed
}

export class GroupService {
  /**
   * @param {object} options
   * @param {import('./store.js').GroupStore} options.store
   * @param {object} options.ctx Host context (services read lazily)
   * @param {object} options.config resolved config
   * @param {(message: string, error?: unknown) => void} [options.log]
   * @param {(sessionIds: string[]) => void} [options.onMembershipChanged]
   * @param {() => number} [options.now] injectable clock for deterministic guard tests
   */
  constructor({ store, ctx, config, log = () => {}, onMembershipChanged = () => {}, now = () => Date.now(), adapter }) {
    this.store = store
    this.ctx = ctx
    this.config = { ...DEFAULTS, ...config }
    this.log = log
    this.onMembershipChanged = onMembershipChanged
    this.now = now
    this.readHistory = new Map()
    this.noteHistory = new Map()
    this.metrics = new Metrics({ now })
    this.adapter = adapter ?? createDshAdapter(ctx, { log })
    this.deliveryActive = 0
    this.deliveryQueue = []
    this.timer = undefined
    this.lastRetentionAt = 0
    // Reconciliation is best-effort: a store write failure must not take the
    // whole plugin down, because `ready()` gates the HTTP route and the tools.
    this.readyPromise = store.ready.then(async () => {
      await this.#reconcilePending().catch((error) => this.log('could not reconcile stale pending deliveries', error))
      await this.#maintenance().catch((error) => this.log('could not run the startup maintenance pass', error))
      this.#startTimer()
    })
  }

  /** Start the periodic maintenance loop. `unref` keeps a CLI/test process free to exit. */
  #startTimer() {
    if (this.timer !== undefined) return
    this.timer = setInterval(() => {
      void this.#maintenance().catch((error) => this.log('maintenance pass failed', error))
    }, 15000)
    this.timer.unref?.()
  }

  /** Stop timers and release the store lock (idempotent). */
  async dispose() {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    await this.store.dispose?.()
  }

  /**
   * One maintenance pass: expire stale pending deliveries (F2), expire relays,
   * prune retention once an hour. Exposed for deterministic tests.
   */
  async tick() {
    await this.#maintenance()
  }

  async #maintenance() {
    await this.store.ready
    const now = this.now()
    const staleBefore = now - this.config.pendingTimeoutMs
    const stale = []
    for (const group of Object.values(this.store.state.groups)) {
      for (const message of group.messages) {
        for (const delivery of message.deliveries) {
          if (delivery.status !== 'pending' && delivery.status !== 'queued' && delivery.status !== 'held') continue
          const at = Number.isFinite(delivery.at) ? delivery.at : message.at
          if (at > staleBefore) continue
          stale.push({ groupId: group.id, messageId: message.id, sessionId: delivery.sessionId })
        }
      }
    }
    const expiredRelays = []
    const retentionCutoff = this.config.retentionDays > 0 ? now - this.config.retentionDays * 24 * 60 * 60 * 1000 : 0
    // Run at most hourly, but immediately when a row is already past the
    // window (for example after the operator lowers retentionDays).
    const retentionDue = this.config.retentionDays > 0 && (
      now - this.lastRetentionAt > 60 * 60 * 1000
      || Object.values(this.store.state.groups).some((group) => group.messages.some((message) => message.kind !== 'control' && message.at < retentionCutoff))
    )
    if (stale.length > 0 || retentionDue) {
      try {
        await this.store.write((draft) => {
          for (const row of stale) {
            const message = draft.groups[row.groupId]?.messages?.find((entry) => entry.id === row.messageId)
            const delivery = message?.deliveries?.find((entry) => entry.sessionId === row.sessionId)
            if (delivery && (delivery.status === 'pending' || delivery.status === 'queued' || delivery.status === 'held')) delivery.status = 'unknown'
          }
          if (retentionDue) {
            const result = pruneRetention(draft, { now, retentionDays: this.config.retentionDays })
            if (result.removed > 0) this.log(`retention: trimmed ${result.removed} message(s) in ${result.groups} group(s)`)
          }
        })
        if (retentionDue) this.lastRetentionAt = now
      } catch (error) {
        this.log('could not persist the maintenance pass', error)
      }
    }
    // Relay expiry is persisted separately so a failed retention prune cannot
    // keep a relay "open" in the panel forever.
    for (const relay of Object.values(this.store.state.relays ?? {})) {
      if (relay.status !== 'created' && relay.status !== 'delivered') continue
      if (!Number.isFinite(relay.expiresAt) || relay.expiresAt > now) continue
      expiredRelays.push(relay)
    }
    if (expiredRelays.length > 0) {
      try {
        await this.store.write((draft) => {
          for (const relay of Object.values(draft.relays ?? {})) {
            if (relay.status !== 'created' && relay.status !== 'delivered') continue
            if (!Number.isFinite(relay.expiresAt) || relay.expiresAt > now) continue
            relay.status = 'timeout'
            relay.updatedAt = now
          }
          trimRelays(draft)
        })
        for (const relay of expiredRelays) {
          // The write replaced the state copy; notify from the committed row so
          // the envelope reports "timeout", not the pre-write status.
          const committed = this.store.state.relays?.[relay.id] ?? relay
          await this.#notifyRelayEnd(committed).catch((error) => this.log('could not notify relay timeout', error))
        }
      } catch (error) {
        this.log('could not persist relay expiry', error)
      }
    }
  }

  /** Deliver a short timeout notice to a relay origin; a failed notice is logged only. */
  async #notifyRelayEnd(relay, reason = 'timeout') {
    const capabilities = this.adapter.capabilities()
    this.metrics.bump('relays')
    if (relay.fromSessionId === HUMAN_SESSION || capabilities.wake !== true) return
    try {
      await this.adapter.prompt({
        requestId: `group-talk-l:${relay.id}:timeout`,
        sessionId: relay.fromSessionId,
        mode: 'queue',
        text: buildRelayTimeoutEnvelope(relay, { toAlias: relay.toAlias, reason }),
        signal: AbortSignal.timeout(15000),
      })
    } catch (error) {
      this.log(`could not notify relay ${relay.id} timeout`, error)
    }
  }

  /** Bound model-facing read loops; each call still renders its own output. */
  noteRead(sessionId) {
    const now = this.now()
    const recent = (this.readHistory.get(sessionId) ?? []).filter((at) => now - at < 60000)
    if (recent.length >= this.config.maxReadsPerAgentPerMinute) {
      throw new GroupError('rate-limited', 'Too many group read calls in one minute; wait before reading again.')
    }
    recent.push(now)
    this.readHistory.set(sessionId, recent)
  }

  /** Bound note writes so a secretary loop cannot bury the transcript. */
  noteWrite(sessionId) {
    const limit = this.config.maxNotesPerAgentPerMinute
    if (!(Number.isFinite(limit) && limit > 0)) return
    const now = this.now()
    const recent = (this.noteHistory.get(sessionId) ?? []).filter((at) => now - at < 60000)
    if (recent.length >= limit) {
      throw new GroupError('rate-limited', 'Too many group notes in one minute; wait before writing again.')
    }
    recent.push(now)
    this.noteHistory.set(sessionId, recent)
  }

  /** Wait for the durable state to be read. */
  ready() {
    return this.readyPromise
  }

  /** Whether the store can be written, without forcing a write. */
  storeStatus() {
    if (this.store.loadFailure === undefined) return { ok: true }
    const failure = this.store.loadFailure
    return {
      ok: false,
      code: failure instanceof GroupError ? failure.code : 'store-unavailable',
      message: failure instanceof GroupError
        ? failure.message
        : 'The Group-Talk-L store is not safe to write; fix or move the data file.',
    }
  }

  /** What this Host can actually do, surfaced in the panel (S28). */
  capabilities() {
    const adapter = this.adapter.capabilities()
    return {
      inRoom: true,
      priority: true,
      control: true,
      audit: true,
      purpose: true,
      notes: this.config.allowAgentNote === true,
      delegate: this.config.allowAgentDelegate === true,
      relay: this.config.allowRelay === true,
      pause: true,
      sensitivity: true,
      secretScan: this.config.secretScan === true,
      actualUsage: this.metrics.snapshot().actualSamples > 0,
      wake: adapter.wake === true,
      mailbox: adapter.mailbox === true,
      transport: adapter.transport,
      members: adapter.listSessions === true,
    }
  }

  /** Dedicated audit payload, kept out of the 8-second list poll. */
  auditFor(sessionId, reference, limit = 80) {
    const group = this.resolveFor(sessionId, reference, { activeOnly: false })
    return auditViewOfGroup(group, limit)
  }

  /**
   * Startup reconciliation: rows stranded by a previous process become
   * `unknown`, but only once they are older than `pendingTimeoutMs`. A fresh
   * restart therefore keeps a just-admitted delivery pending for its timeout
   * instead of instantly declaring it unconfirmed (F2).
   */
  async #reconcilePending() {
    const now = this.now()
    const staleBefore = now - this.config.pendingTimeoutMs
    const mark = []
    for (const group of Object.values(this.store.state.groups)) {
      for (const message of group.messages) {
        for (const delivery of message.deliveries) {
          if (delivery.status !== 'pending' && delivery.status !== 'queued' && delivery.status !== 'held') continue
          const at = Number.isFinite(delivery.at) ? delivery.at : message.at
          if (at > staleBefore) continue
          mark.push({ group, message, delivery })
        }
      }
    }
    if (mark.length === 0) return
    await this.store.write((draft) => {
      for (const { group, message, delivery } of mark) {
        const current = draft.groups[group.id]?.messages?.find((entry) => entry.id === message.id)
        const row = current?.deliveries?.find((entry) => entry.sessionId === delivery.sessionId)
        if (row && (row.status === 'pending' || row.status === 'queued' || row.status === 'held')) row.status = 'unknown'
      }
    })
  }

  /** Groups visible to one member, including dissolved records. */
  listFor(sessionId, { messageLimit = this.config.uiMessageLimit } = {}) {
    return this.store.groupsFor(sessionId).map((group) => viewOfGroup(group, sessionId, { messageLimit }))
  }

  /** Daily ledger view for the Web panel. */
  usageFor(sessionId) {
    return usageView(this.store.state, sessionId, this.now())
  }

  /** Aggregate metrics for the observability panel (S22). */
  statsFor() {
    const groups = Object.values(this.store.state.groups)
    const active = groups.filter((group) => group.status === 'active')
    return {
      ...this.metrics.snapshot(),
      groups: { total: groups.length, active, paused: active.filter((group) => group.paused === true).length },
      relays: { open: Object.values(this.store.state.relays ?? {}).filter((relay) => relay.status === 'created' || relay.status === 'delivered').length },
      gate: this.store.state.gate,
      delivery: { active: this.deliveryActive, queued: this.deliveryQueue.length, max: this.config.maxConcurrentDeliveries },
    }
  }

  /** Non-secret limits and feature switches shown beside the composer. */
  limitsForClient() {
    return {
      maxMessageChars: this.config.maxMessageChars,
      noteChars: MAX_NOTE,
      maxRecipientsPerSend: this.config.maxRecipientsPerSend,
      maxBroadcastRecipients: this.config.maxBroadcastRecipients,
      sendCooldownMs: this.config.sendCooldownMs,
      humanCooldownMs: this.config.humanCooldownMs,
      dedupeWindowMs: this.config.dedupeWindowMs,
      dailyMessagesPerSender: this.config.dailyMessagesPerSender,
      dailyMessagesPerHuman: this.config.dailyMessagesPerHuman,
      dailyBroadcastsPerSender: this.config.dailyBroadcastsPerSender,
      dailyEstimatedTokensPerSender: this.config.dailyEstimatedTokensPerSender,
      assumedTokensPerDelivery: this.config.assumedTokensPerDelivery,
      replyNudgeAfterMs: this.config.replyNudgeAfterMs,
      pendingTimeoutMs: this.config.pendingTimeoutMs,
      retentionDays: this.config.retentionDays,
      maxMembersPerGroup: this.config.maxMembersPerGroup,
      policyMaxChars: this.config.policyMaxChars,
      policyRecentMessages: this.config.policyRecentMessages,
      maxConcurrentDeliveries: this.config.maxConcurrentDeliveries,
      allowAgentDelegate: this.config.allowAgentDelegate === true,
      allowRelay: this.config.allowRelay === true,
      secretScan: this.config.secretScan === true,
      sensitivities: [...SENSITIVITIES],
      defaultSensitivity: this.config.defaultSensitivity,
    }
  }

  /** Active groups only, for prompt/tool advertisement. */
  activeGroupsFor(sessionId) {
    return this.store.groupsFor(sessionId).filter((group) => group.status === 'active')
  }

  /** Resolve one accessible group, optionally restricted to active groups. */
  resolveFor(sessionId, reference, { activeOnly = true } = {}) {
    const groups = this.store
      .groupsFor(sessionId)
      .filter((group) => !activeOnly || group.status === 'active')
    if (groups.length === 0) {
      throw new GroupError(
        'group-not-found',
        activeOnly
          ? 'This session does not belong to an active group.'
          : 'This session does not belong to any group.',
      )
    }
    return resolveGroupReference(groups, reference)
  }

  /** Best-effort visibility check for ids chosen in the UI or by a command. */
  async validateSessions(sessionIds) {
    const unique = [...new Set(sessionIds)].filter((id) => id !== HUMAN_SESSION)
    if (unique.length === 0) return
    if (this.adapter.capabilities().listSessions !== true) return
    try {
      const value = await this.adapter.listSessions(AbortSignal.timeout(5000))
      const items = new Map((Array.isArray(value) ? value : []).map((item) => [String(item.sessionId), item]))
      const missing = unique.filter((id) => !items.has(id))
      if (missing.length > 0) {
        throw new GroupError(
          'session-not-found',
          `Session "${missing[0]}" is not a visible session in this Host.`,
          { params: { session: missing[0] } },
        )
      }
      const subagent = unique.find((id) => items.get(id)?.origin === 'subagent')
      if (subagent !== undefined) {
        throw new GroupError(
          'session-not-ordinary',
          `Session "${subagent}" is a subagent session; groups address ordinary sessions only.`,
          { params: { session: subagent } },
        )
      }
    } catch (error) {
      if (error instanceof GroupError) throw error
      // Listing is an extra guard, not the source of truth. A cold or restricted
      // listing must not make group management impossible.
      this.log('could not verify session visibility', error)
    }
  }

  /**
   * Create a group owned by the calling session.
   * @param {string} ownerSessionId
   * @param {{name: string, topic?: string, members?: Array<object>}} request
   */
  async create(ownerSessionId, request = {}) {
    const owner = normalizeSessionId(ownerSessionId)
    const human = owner === HUMAN_SESSION
    const name = normalizeName(request.name)
    const topic = normalizeTopic(request.topic)
    const sensitivity = SENSITIVITIES.includes(request.sensitivity) ? request.sensitivity : this.config.defaultSensitivity
    // A secret room is human-initiated by definition: it forbids model tools,
    // delegation and relay, and only the panel can send into it (S15).
    if (sensitivity === 'secret' && !human) {
      throw new GroupError('sensitivity-human-only', 'A secret group can only be created by the human operator from the panel.', {
        params: { sensitivity },
      })
    }
    const requested = Array.isArray(request.members)
      ? request.members.filter((raw) => !human || String(raw?.sessionId ?? '').trim() !== HUMAN_SESSION)
      : []
    const ownerRequested = human ? true : requested.some((raw) => {
      try {
        return normalizeSessionId(raw?.sessionId) === owner
      } catch {
        return false
      }
    })
    if (requested.length + (human ? 1 : (ownerRequested ? 0 : 1)) > this.config.maxMembersPerGroup) {
      throw new GroupError('too-many-members', `A group can have at most ${this.config.maxMembersPerGroup} members.`, {
        params: { max: this.config.maxMembersPerGroup },
      })
    }

    const members = []
    const seenSessions = new Set()
    const seenAliases = new Set()

    const push = (member) => {
      const alias = fold(member.alias)
      if (seenAliases.has(alias)) throw new GroupError('duplicate-alias', `Alias "@${member.alias}" is already used in this group.`)
      if (seenSessions.has(member.sessionId)) throw new GroupError('duplicate-session', 'A session can appear only once in a group.')
      seenAliases.add(alias)
      seenSessions.add(member.sessionId)
      members.push(member)
    }

    if (human) {
      // The person is the only ownerless actor: no session becomes "the owner".
      push({ ...HUMAN_MEMBER, joinedAt: Date.now() })
      for (const [index, raw] of requested.entries()) push(memberInput(raw, `member-${index + 1}`))
    } else {
      // The creator is always the owner and always a member.
      const ownerInput = requested.find((raw) => {
        try {
          return normalizeSessionId(raw?.sessionId) === owner
        } catch {
          return false
        }
      })
      push({ ...memberInput(ownerInput ?? { sessionId: owner, alias: 'owner' }, 'owner', OWNER_ROLE), roleId: 'owner', organizer: true })
      for (const [index, raw] of requested.entries()) {
        if (raw && typeof raw === 'object' && String(raw.sessionId ?? '').trim() === owner) continue
        push(memberInput(raw, `member-${index + 1}`))
      }
    }

    // The owner is the live caller; validating it against the visibility list
    // would reject a brand-new blank session that the list has not surfaced yet.
    await this.validateSessions(members
      .filter((member) => member.sessionId !== owner && member.sessionId !== HUMAN_SESSION)
      .map((member) => member.sessionId))

    const id = newGroupId()
    const now = this.now()
    await this.store.write((draft) => {
      if (draft.groups[id] !== undefined) throw new GroupError('group-exists', 'Could not allocate a group id; retry.')
      if (nameTaken(Object.values(draft.groups), name)) {
        throw new GroupError('group-exists', `A group named "${name}" already exists; pick another name.`, { params: { name } })
      }
      assertGroupCapacity(draft, members.map((member) => member.sessionId), this.config)
      const group = {
        id,
        name,
        topic,
        sensitivity,
        ownerSessionId: human ? HUMAN_SESSION : owner,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        members,
        messages: [],
        audit: [],
      }
      appendSystem(group, members[0].alias, `Group "${name}" created by @${members[0].alias}.`, this.config.historyLimit, now)
      appendAudit(group, members[0].alias, {
        fromSessionId: human ? HUMAN_SESSION : owner,
        action: 'membership',
        outcome: 'created',
        text: `Group "${name}" created (${sensitivity}).`,
      }, this.config.historyLimit, now)
      draft.groups[id] = group
      return group
    })
    this.onMembershipChanged(members.filter((member) => member.sessionId !== HUMAN_SESSION).map((member) => member.sessionId))
    const group = this.store.get(id)
    return viewOfGroup(group, owner)
  }

  /** Add one existing session to a group. Owner only. */
  async addMember(callerSessionId, reference, request = {}) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    if (group.members.length >= this.config.maxMembersPerGroup) {
      throw new GroupError('too-many-members', `A group can have at most ${this.config.maxMembersPerGroup} members.`)
    }
    const sessionId = normalizeSessionId(request.sessionId)
    if (group.members.some((member) => member.sessionId === sessionId)) {
      throw new GroupError('duplicate-session', 'That session is already a member.')
    }
    const member = memberInput(
      { sessionId, alias: request.alias, role: request.role, roleId: request.roleId, duties: request.duties, organizer: request.organizer },
      `member-${group.members.length + 1}`,
    )
    if (group.members.some((entry) => fold(entry.alias) === fold(member.alias))) {
      throw new GroupError('duplicate-alias', `Alias "@${member.alias}" is already used in this group.`)
    }
    await this.validateSessions([sessionId])
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      requireOwner(current, callerSessionId)
      if (current.members.some((entry) => entry.sessionId === sessionId)) {
        throw new GroupError('duplicate-session', 'That session is already a member.')
      }
      if (current.members.some((entry) => fold(entry.alias) === fold(member.alias))) {
        throw new GroupError('duplicate-alias', `Alias "@${member.alias}" is already used in this group.`)
      }
      if (current.members.length >= this.config.maxMembersPerGroup) {
        throw new GroupError('too-many-members', `A group can have at most ${this.config.maxMembersPerGroup} members.`)
      }
      if (activeGroupCount(draft, sessionId) >= this.config.maxGroupsPerSession) {
        throw new GroupError('too-many-groups', `Session "${sessionId}" already belongs to ${this.config.maxGroupsPerSession} active groups.`)
      }
      current.members.push(member)
      const actor = requireOwner(current, callerSessionId)
      appendSystem(current, actor.alias, `@${member.alias} joined with role "${member.role}".`, this.config.historyLimit, this.now())
      appendAudit(current, actor.alias, {
        fromSessionId: callerSessionId,
        action: 'membership',
        outcome: 'joined',
        text: `@${member.alias} joined with role "${member.role}".`,
      }, this.config.historyLimit, this.now())
    })
    this.onMembershipChanged([...group.members.map((entry) => entry.sessionId), sessionId])
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Remove a member. Owner only; the owner cannot remove itself. */
  async removeMember(callerSessionId, reference, memberReference) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const member = findMember(group, memberReference)
    if (!member) throw new GroupError('member-not-found', 'That alias does not belong to this group.')
    if (member.sessionId === group.ownerSessionId) {
      throw new GroupError('cannot-remove-owner', 'The owner cannot be removed from its own group. Delete the group instead.')
    }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      requireOwner(current, callerSessionId)
      current.members = current.members.filter((entry) => entry.sessionId !== member.sessionId)
      const actor = current.members.find((entry) => entry.sessionId === callerSessionId)
      closePendingDeliveries(current, [member.sessionId], 'The recipient was removed from the group.')
      appendSystem(current, actor?.alias, `@${member.alias} left the group.`, this.config.historyLimit, this.now())
      appendAudit(current, actor?.alias, {
        fromSessionId: callerSessionId,
        action: 'membership',
        outcome: 'removed',
        text: `@${member.alias} was removed from the group.`,
      }, this.config.historyLimit, this.now())
    })
    // Notify the *remaining* members: the removed session must lose its tools.
    const remaining = this.store.get(group.id)
    this.onMembershipChanged([...remaining.members.map((entry) => entry.sessionId), member.sessionId])
    return viewOfGroup(remaining, callerSessionId)
  }

  /** Leave a group as a non-owner member. The owner must dissolve or delete. */
  async leave(callerSessionId, reference) {
    if (callerSessionId === HUMAN_SESSION) {
      throw new GroupError('human-cannot-leave', 'The human operator is not a member session; dissolve or delete the group instead.')
    }
    const group = this.resolveFor(callerSessionId, reference)
    const member = group.members.find((entry) => entry.sessionId === callerSessionId)
    if (!member) throw new GroupError('not-a-member', 'This session is not a member of the group.')
    if (callerSessionId === group.ownerSessionId) {
      throw new GroupError('owner-cannot-leave', 'The owner cannot leave its own group; dissolve or delete it instead.')
    }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      current.members = current.members.filter((entry) => entry.sessionId !== callerSessionId)
      closePendingDeliveries(current, [callerSessionId], 'The recipient left the group.')
      appendSystem(current, member.alias, `@${member.alias} left the group.`, this.config.historyLimit, this.now())
      appendAudit(current, member.alias, {
        fromSessionId: callerSessionId,
        action: 'membership',
        outcome: 'left',
        text: `@${member.alias} left the group.`,
      }, this.config.historyLimit, this.now())
    })
    const remaining = this.store.get(group.id)
    this.onMembershipChanged([...remaining.members.map((entry) => entry.sessionId), callerSessionId])
    return { group: viewOfGroup(remaining, callerSessionId), alias: member.alias }
  }

  /**
   * Assign a role (and optional duties) to one member. Owner only.
   *
   * `roleId` is the stable identity used by `#role`; `role` is the localized
   * label shown to people. A custom label keeps `roleId = custom` and stays
   * routable by its exact text in any language it was written in.
   */
  async setRole(callerSessionId, reference, memberReference, role, duties, roleId) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const member = findMember(group, memberReference)
    if (!member) throw new GroupError('member-not-found', 'That alias does not belong to this group.')
    const nextRole = normalizeRole(role, member.role)
    const nextDuties = duties === undefined ? member.duties : normalizeDuties(duties)
    const nextRoleId = typeof roleId === 'string' && /^[a-z][a-z-]{0,31}$/u.test(roleId) ? roleId : roleIdOf(nextRole)
    const organizer = nextRoleId === 'organizer' ? true : (member.organizer === true)
    if (nextRole === member.role && nextDuties === member.duties && nextRoleId === member.roleId) {
      return viewOfGroup(group, callerSessionId)
    }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const currentOwner = requireOwner(current, callerSessionId)
      const target = current.members.find((entry) => entry.sessionId === member.sessionId)
      if (!target) throw new GroupError('member-not-found', 'That member is no longer in the group.')
      target.role = nextRole
      target.roleId = nextRoleId
      target.duties = nextDuties
      // The organizer capability follows the owner's explicit grant. Setting a
      // label alone is not authority (chapter 9 #54).
      if (nextRoleId === 'organizer') target.organizer = true
      appendSystem(current, currentOwner.alias, `@${target.alias} is now "${nextRole}".`, this.config.historyLimit, this.now())
      appendAudit(current, currentOwner.alias, {
        fromSessionId: callerSessionId,
        action: 'role',
        outcome: 'changed',
        text: `@${target.alias} is now "${nextRole}" (${nextRoleId}${organizer ? ', organizer' : ''}).`,
      }, this.config.historyLimit, this.now())
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Grant or revoke the explicit organizer capability. Owner only. */
  async setOrganizer(callerSessionId, reference, memberReference, granted) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const member = findMember(group, memberReference)
    if (!member) throw new GroupError('member-not-found', 'That alias does not belong to this group.')
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      const target = current.members.find((entry) => entry.sessionId === member.sessionId)
      if (!target) throw new GroupError('member-not-found', 'That member is no longer in the group.')
      if (granted === true) target.organizer = true
      else if (target.sessionId === current.ownerSessionId) throw new GroupError('owner-only', 'The owner stays an organizer.')
      else delete target.organizer
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'role',
        outcome: granted === true ? 'granted' : 'revoked',
        text: `@${target.alias} ${granted === true ? 'was granted' : 'lost'} the organizer capability.`,
      }, this.config.historyLimit, this.now())
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Rename a group. Owner only. */
  async rename(callerSessionId, reference, name) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const nextName = normalizeName(name)
    if (nextName === group.name) return viewOfGroup(group, callerSessionId)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      if (nameTaken(Object.values(draft.groups), nextName, current.id)) {
        throw new GroupError('group-exists', `A group named "${nextName}" already exists; pick another name.`, { params: { name: nextName } })
      }
      current.name = nextName
      appendSystem(current, owner.alias, `Group renamed to "${nextName}".`, this.config.historyLimit, this.now())
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'rename',
        outcome: 'renamed',
        text: `Group renamed to "${nextName}".`,
      }, this.config.historyLimit, this.now())
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /**
   * Set the topic (the room's durable "what we agreed to work on" carrier).
   * Owner only; a topic edit used to be impossible after creation (#61).
   */
  async setTopic(callerSessionId, reference, topic) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const nextTopic = normalizeTopic(topic)
    if (nextTopic === group.topic) return viewOfGroup(group, callerSessionId)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      current.topic = nextTopic
      appendSystem(current, owner.alias, nextTopic ? `Group topic set to "${nextTopic}".` : 'Group topic cleared.', this.config.historyLimit, this.now())
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'topic',
        outcome: 'updated',
        text: nextTopic ? `Group topic set to "${nextTopic}".` : 'Group topic cleared.',
      }, this.config.historyLimit, this.now())
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Freeze an active group; membership and transcript stay readable. */
  async dissolve(callerSessionId, reference) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const memberIds = group.members.map((member) => member.sessionId)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      if (current.status === 'dissolved') return
      current.status = 'dissolved'
      current.dissolvedAt = this.now()
      closePendingDeliveries(current, current.members.map((member) => member.sessionId), 'The group was dissolved.')
      appendSystem(current, owner.alias, `Group dissolved by @${owner.alias}. Membership and transcript are now read-only.`, this.config.historyLimit, this.now())
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'dissolve',
        outcome: 'dissolved',
        text: `Group dissolved by @${owner.alias}.`,
      }, this.config.historyLimit, this.now())
    })
    this.onMembershipChanged(memberIds)
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Permanently delete a group and its transcript. Owner only. */
  async delete(callerSessionId, reference) {
    const group = this.resolveFor(callerSessionId, reference, { activeOnly: false })
    requireOwner(group, callerSessionId)
    const memberIds = group.members.map((member) => member.sessionId)
    const deleted = viewOfGroup(group, callerSessionId)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      requireOwner(current, callerSessionId)
      // Relays tied to this room cannot be answered any more; close them
      // explicitly instead of leaving a "delivered" row in the panel.
      for (const relay of Object.values(draft.relays ?? {})) {
        if (relay.groupId !== group.id) continue
        if (relay.status !== 'created' && relay.status !== 'delivered') continue
        relay.status = 'cancelled'
        relay.updatedAt = this.now()
      }
      delete draft.groups[group.id]
    })
    this.onMembershipChanged(memberIds)
    return deleted
  }

  /**
   * Pause or resume one room (S12). A paused room records messages but wakes
   * nobody: the emergency stop must be one click, not a YAML edit plus restart.
   */
  async pauseGroup(callerSessionId, reference, paused, reason = '') {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const want = paused === true
    if ((group.paused === true) === want) return viewOfGroup(group, callerSessionId)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      if (want) {
        current.paused = true
      } else {
        delete current.paused
      }
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'pause',
        outcome: want ? 'paused' : 'resumed',
        text: want ? `Group paused${reason ? `: ${reason}` : ''}.` : 'Group resumed.',
      }, this.config.historyLimit, this.now())
    })
    if (want) this.metrics.bump('pauses')
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Host-wide emergency stop. Only the person can flip it. */
  async pauseHost(callerSessionId, paused, reason = '') {
    if (callerSessionId !== HUMAN_SESSION) {
      throw new GroupError('human-only', 'Only the human operator can pause every group at once.')
    }
    const want = paused === true
    await this.store.write((draft) => {
      draft.gate = {
        ...(draft.gate ?? {}),
        paused: want,
        pausedAt: want ? this.now() : 0,
        pausedBy: want ? HUMAN_SESSION : '',
        reason: want ? String(reason).slice(0, 240) : '',
      }
    })
    if (want) this.metrics.bump('pauses')
    return { paused: want, gate: this.store.state.gate }
  }

  /** Pause relay traffic separately from room traffic (S23 red line 5). */
  async pauseRelay(callerSessionId, paused) {
    if (callerSessionId !== HUMAN_SESSION) {
      throw new GroupError('human-only', 'Only the human operator can pause relay traffic.')
    }
    const want = paused === true
    await this.store.write((draft) => {
      draft.gate = { ...(draft.gate ?? {}), relayPaused: want }
    })
    return { relayPaused: want }
  }

  /** Change the sensitivity of a room. Owner only (S15). */
  async setSensitivity(callerSessionId, reference, sensitivity) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    if (!SENSITIVITIES.includes(sensitivity)) {
      throw new GroupError('bad-request', 'Sensitivity must be public, internal or secret.')
    }
    if (sensitivity === 'secret' && callerSessionId !== HUMAN_SESSION) {
      throw new GroupError('sensitivity-human-only', 'Only the human operator can mark a group secret.', { params: { sensitivity } })
    }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      current.sensitivity = sensitivity
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'sensitivity',
        outcome: 'changed',
        text: `Sensitivity set to ${sensitivity}.`,
      }, this.config.historyLimit, this.now())
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /**
   * Start or continue one point-to-point relay (S23).
   *
   * The five red lines live in `relay.js` and are enforced here before the row
   * is written: no chaining, no authorization semantics, no imperative payload,
   * no implicit external action, and full panel visibility via `relaysFor`.
   *
   * @param {string} callerSessionId
   * @param {{to?: string, intent?: string, message: string, maxRounds?: number, relayId?: string, ttlMs?: number}} request
   */
  async relay(callerSessionId, request = {}) {
    if (!this.config.allowRelay) throw new GroupError('relay-disabled', 'Relay is disabled in this profile.')
    if (this.store.state.gate?.relayPaused === true) {
      throw new GroupError('relay-paused', 'Relay is paused. Resume it before sending another message.')
    }
    const text = normalizeMessage(request.message)
    if (text.length > RELAY_MAX_MESSAGE) {
      throw new GroupError('message-too-long', `Relay messages are limited to ${RELAY_MAX_MESSAGE} characters.`, { params: { max: RELAY_MAX_MESSAGE } })
    }
    const intent = RELAY_INTENTS.includes(request.intent) ? request.intent : 'confirm'
    const problem = relayPayloadProblem(text, { intent })
    if (problem) throw new GroupError(problem, 'Relay messages may not carry instructions to ignore rules or call tools, and confirm may not ask for authorization.', { params: {} })
    if (mentionsRelayTool(text)) throw new GroupError('relay-loop', 'A relay cannot start another relay.', { params: {} })
    const secretHit = this.config.secretScan ? scanSecrets(text) : { hit: false, labels: [] }
    if (secretHit.hit) throw new GroupError('secret-detected', `Relay content looks like a credential (${secretHit.labels.join(', ')}).`, { labels: secretHit.labels })

    const now = this.now()
    const caller = callerSessionId === HUMAN_SESSION
      ? { sessionId: HUMAN_SESSION, alias: 'human' }
      : this.#memberEverywhere(callerSessionId)

    // Continue an existing relay (origin asks one follow-up round).
    if (typeof request.relayId === 'string' && request.relayId) {
      const existing = this.store.state.relays?.[request.relayId]
      if (!existing) throw new GroupError('relay-not-found', 'That relay was not found or has expired.')
      if (existing.fromSessionId !== callerSessionId) throw new GroupError('relay-not-recipient', 'Only the session that started this relay can continue it.')
      if (existing.status !== 'created' && existing.status !== 'delivered') {
        throw new GroupError('relay-closed', `This relay is already ${existing.status}.`, { params: { status: existing.status } })
      }
      if (existing.round >= existing.maxRounds) {
        throw new GroupError('relay-rounds-exceeded', `Relay round limit reached (${existing.round}/${existing.maxRounds}).`, { params: { max: existing.maxRounds } })
      }
      const updated = await this.store.write((draft) => {
        const relay = draft.relays[existing.id]
        if (!relay) throw new GroupError('relay-not-found', 'That relay no longer exists.')
        if (relay.round >= relay.maxRounds) {
          throw new GroupError('relay-rounds-exceeded', `Relay round limit reached (${relay.round}/${relay.maxRounds}).`, { params: { max: relay.maxRounds } })
        }
        relay.round += 1
        relay.status = 'created'
        relay.updatedAt = now
        relay.expiresAt = now + this.config.relayTtlMs
        relay.messages.push({ round: relay.round, from: 'from', at: now, text })
        const envelope = buildRelayEnvelope(relay, { fromAlias: caller.alias, toAlias: relay.toAlias, fromKind: callerSessionId === HUMAN_SESSION ? 'human' : 'agent' })
        const charge = chargeSend({
          state: draft,
          now,
          groupId: relay.groupId ?? `relay:${callerSessionId}`,
          senderSessionId: callerSessionId,
          targets: [{ sessionId: relay.toSessionId, alias: relay.toAlias }],
          text,
          envelopeText: envelope,
          limits: this.config,
        })
        relay.estimatedTokens = (relay.estimatedTokens ?? 0) + charge.estimatedTokens
        trimRelays(draft)
        return JSON.parse(JSON.stringify(relay))
      })
      await this.#deliverRelay(updated, caller)
      return relayView(this.store.state.relays[updated.id], callerSessionId)
    }

    const target = this.#resolveRelayTarget(callerSessionId, request.to)
    if (target.sessionId === callerSessionId) throw new GroupError('self-target', 'Choose another session for a relay.')
    const maxRounds = roundsFor(intent, request.maxRounds)
    const id = newRelayId()
    const ttl = Math.min(RELAY_MAX_TTL_MS, Math.max(60000, Number(request.ttlMs) || this.config.relayTtlMs))
    const record = {
      id,
      fromSessionId: callerSessionId,
      fromAlias: callerSessionId === HUMAN_SESSION ? 'human' : caller.alias,
      toSessionId: target.sessionId,
      toAlias: target.alias,
      intent,
      status: 'created',
      round: 1,
      maxRounds,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ttl,
      ...(target.groupId ? { groupId: target.groupId } : {}),
      purpose: intent,
      messages: [{ round: 1, from: 'from', at: now, text }],
    }
    await this.store.write((draft) => {
      // Chain guard: a session currently addressed by an open relay may not
      // start its own relay. That is the difference between "ask" and a game
      // of telephone.
      const openForCaller = Object.values(draft.relays ?? {}).find((relay) => (
        relay.toSessionId === callerSessionId && (relay.status === 'created' || relay.status === 'delivered')
      ))
      if (openForCaller) throw new GroupError('relay-loop', 'Chained relays are not allowed; answer the relay you received instead.', { params: {} })
      const samePair = pairRelaysRecent(draft, callerSessionId, target.sessionId, now, 60 * 60 * 1000)
      if (samePair >= this.config.relayPairPerHour) {
        throw new GroupError('relay-rate', 'Too many relays between these sessions; wait before trying again.', { retryAfterMs: 60000 })
      }
      const open = Object.values(draft.relays ?? {}).filter((relay) => (
        (relay.status === 'created' || relay.status === 'delivered')
        && (relay.fromSessionId === callerSessionId || relay.toSessionId === callerSessionId)
      ))
      if (open.length >= RELAY_MAX_ACTIVE) {
        throw new GroupError('relay-rate', 'Two relays are already open for this session; wait for one to finish.', { retryAfterMs: 5000 })
      }
      // A relay wakes a full turn too, so it is charged to the same sender /
      // room / Host ledgers as a group message (S23 cost rule).
      const envelope = buildRelayEnvelope(record, {
        fromAlias: record.fromAlias,
        toAlias: record.toAlias,
        fromKind: callerSessionId === HUMAN_SESSION ? 'human' : 'agent',
      })
      const charge = chargeSend({
        state: draft,
        now,
        groupId: target.groupId ?? `relay:${callerSessionId}`,
        senderSessionId: callerSessionId,
        targets: [{ sessionId: target.sessionId, alias: target.alias }],
        text,
        envelopeText: envelope,
        limits: this.config,
      })
      record.estimatedTokens = charge.estimatedTokens
      draft.relays[id] = record
      trimRelays(draft)
      if (target.groupId) {
        const group = draft.groups[target.groupId]
        if (group) {
          appendAudit(group, caller.alias, {
            fromSessionId: callerSessionId,
            action: 'relay',
            outcome: 'created',
            text: `Relay ${id} (${intent}) to @${target.alias}, round 1/${maxRounds}.`,
          }, this.config.historyLimit, now)
        }
      }
    })
    this.metrics.bump('relays')
    await this.#deliverRelay(record, caller)
    return relayView(this.store.state.relays[id], callerSessionId)
  }

  /** Answer an open relay. The reply returns to the origin inbox, never a room. */
  async relayReply(callerSessionId, request = {}) {
    const id = typeof request.relayId === 'string' ? request.relayId.trim() : ''
    const relay = id ? this.store.state.relays?.[id] : undefined
    if (!relay) throw new GroupError('relay-not-found', 'That relay was not found or has expired.')
    if (relay.toSessionId !== callerSessionId) {
      throw new GroupError('relay-not-recipient', 'Only the addressed session can answer this relay.')
    }
    if (relay.status !== 'created' && relay.status !== 'delivered') {
      throw new GroupError('relay-closed', `This relay is already ${relay.status}.`, { params: { status: relay.status } })
    }
    if (!Number.isFinite(relay.expiresAt) || relay.expiresAt <= this.now()) {
      throw new GroupError('relay-not-found', 'That relay has expired.')
    }
    const text = normalizeMessage(request.message)
    if (text.length > RELAY_MAX_MESSAGE) {
      throw new GroupError('message-too-long', `Relay replies are limited to ${RELAY_MAX_MESSAGE} characters.`, { params: { max: RELAY_MAX_MESSAGE } })
    }
    if (mentionsRelayTool(text)) throw new GroupError('relay-loop', 'A relay reply cannot start another relay.', { params: {} })
    const secretHit = this.config.secretScan ? scanSecrets(text) : { hit: false, labels: [] }
    if (secretHit.hit) throw new GroupError('secret-detected', `Relay replies may not contain credentials (${secretHit.labels.join(', ')}).`, { labels: secretHit.labels })
    const followup = request.followup === true
    const now = this.now()
    const updated = await this.store.write((draft) => {
      const current = draft.relays[id]
      if (!current) throw new GroupError('relay-not-found', 'That relay no longer exists.')
      if (current.status !== 'created' && current.status !== 'delivered') {
        throw new GroupError('relay-closed', `This relay is already ${current.status}.`, { params: { status: current.status } })
      }
      const nextRound = followup ? current.round + 1 : current.round
      if (followup && current.round >= current.maxRounds) {
        throw new GroupError('relay-rounds-exceeded', `Relay round limit reached (${current.round}/${current.maxRounds}).`, { params: { max: current.maxRounds } })
      }
      current.messages.push({ round: nextRound, from: 'to', at: now, text })
      current.updatedAt = now
      current.round = nextRound
      current.status = followup ? 'delivered' : 'replied'
      if (current.groupId) {
        const group = draft.groups[current.groupId]
        if (group) {
          appendAudit(group, current.toAlias, {
            fromSessionId: callerSessionId,
            action: 'relay',
            outcome: current.status,
            text: `Relay ${id} ${current.status} by @${current.toAlias}${followup ? ' (follow-up requested)' : ''}.`,
          }, this.config.historyLimit, now)
        }
      }
      trimRelays(draft)
      return JSON.parse(JSON.stringify(current))
    })
    this.metrics.bump('relayReplies')
    const fromAlias = updated.toAlias
    if (updated.fromSessionId !== HUMAN_SESSION && this.adapter.capabilities().wake === true) {
      try {
        await this.adapter.prompt({
          requestId: `group-talk-l:${updated.id}:reply:${updated.round}`,
          sessionId: updated.fromSessionId,
          mode: 'queue',
          text: buildRelayReplyEnvelope(updated, text, { toAlias: fromAlias }),
          signal: AbortSignal.timeout(30000),
        })
      } catch (error) {
        this.log(`could not deliver relay reply ${updated.id}`, error)
      }
    }
    return relayView(updated, callerSessionId)
  }

  /** Visible relays for the panel/tools, newest first. */
  relaysFor(sessionId, limit = 20) {
    const bounded = Math.min(Math.max(1, Number(limit) || 20), 100)
    return Object.values(this.store.state.relays ?? {})
      .filter((relay) => sessionId === HUMAN_SESSION || relay.fromSessionId === sessionId || relay.toSessionId === sessionId)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, bounded)
      .map((relay) => relayView(relay, sessionId))
  }

  /** Deliver one relay envelope to its target. */
  async #deliverRelay(relay, caller) {
    if (relay.toSessionId === HUMAN_SESSION) return
    const fromMember = { sessionId: relay.fromSessionId, alias: relay.fromAlias }
    try {
      await this.#withDeliverySlot(async () => this.adapter.prompt({
        requestId: `group-talk-l:${relay.id}:${relay.round}`,
        sessionId: relay.toSessionId,
        mode: 'queue',
        text: buildRelayEnvelope(relay, {
          fromAlias: fromMember.alias,
          toAlias: relay.toAlias,
          fromKind: relay.fromSessionId === HUMAN_SESSION ? 'human' : 'agent',
        }),
        signal: AbortSignal.timeout(30000),
      }))
      if (this.adapter.capabilities().wake !== true) this.log(`relay ${relay.id} written to the ${this.adapter.name} inbox (no wake)`)
      await this.store.write((draft) => {
        const current = draft.relays?.[relay.id]
        if (!current) return
        if (current.status === 'created') current.status = 'delivered'
        current.updatedAt = this.now()
      })
    } catch (error) {
      this.log(`could not deliver relay ${relay.id}`, error)
      await this.store.write((draft) => {
        const current = draft.relays?.[relay.id]
        if (!current) return
        current.status = 'failed'
        current.updatedAt = this.now()
      }).catch(() => {})
      throw new GroupError('relay-failed', 'The relay could not be delivered; see the Host log.')
    }
  }

  /** Find one session across every group the caller shares. */
  #memberEverywhere(sessionId, reference) {
    const groups = this.store.groupsFor(sessionId).filter((group) => group.status === 'active')
    const member = groups.flatMap((group) => group.members).find((entry) => entry.sessionId === sessionId)
    if (!member) throw new GroupError('not-a-member', 'This session is not a member of any group.')
    if (!reference) return member
    return member
  }

  /** Resolve a relay target (`@alias`, alias, or an exact session id). */
  #resolveRelayTarget(callerSessionId, to) {
    const raw = typeof to === 'string' ? to.trim() : ''
    if (!raw) throw new GroupError('target-required', 'A relay needs a target session.')
    const needle = raw.replace(/^@/u, '')
    if (needle === HUMAN_SESSION) throw new GroupError('self-target', 'A relay cannot target the human operator; send a group message instead.')
    const groups = this.store.groupsFor(callerSessionId).filter((group) => group.status === 'active')
    const found = []
    for (const group of groups) {
      for (const member of group.members) {
        if (member.sessionId === callerSessionId || member.sessionId === HUMAN_SESSION) continue
        if (fold(member.alias) === fold(needle) || member.sessionId === raw) found.push({ ...member, groupId: group.id })
      }
    }
    if (found.length === 0) {
      throw new GroupError('alias-not-found', `No session @${needle} is reachable from your groups.`, { params: { alias: needle } })
    }
    const unique = [...new Map(found.map((member) => [member.sessionId, member])).values()]
    if (unique.length > 1) {
      throw new GroupError('ambiguous-alias', `More than one group has @${needle}; use the exact session id.`, { params: { alias: needle } })
    }
    return unique[0]
  }

  /**
   * Redacted, shareable transcript export (#16, #48, S18).
   * A member may export what they can read; the human exports everything.
   */
  /** Redacted relay rows for the export (relays are not room messages). */
  #relayRowsForExport(group) {
    return Object.values(this.store.state.relays ?? {})
      .filter((relay) => relay.groupId === group.id)
      .sort((left, right) => left.createdAt - right.createdAt)
      .slice(-20)
      .flatMap((relay) => [
        `**${relay.id}** · ${relay.intent} · @${relay.fromAlias} → @${relay.toAlias} · ${relay.status} · ${relay.round}/${relay.maxRounds}`,
        '',
        ...relay.messages.map((entry) => `- ${entry.from === 'from' ? '→' : '←'} ${redactForExport(entry.text)}`),
        '',
      ])
  }

  exportGroup(callerSessionId, reference, { format = 'markdown' } = {}) {
    const group = this.resolveFor(callerSessionId, reference, { activeOnly: false })
    const scope = callerSessionId === HUMAN_SESSION ? group.messages : this.history(callerSessionId, group.id, 100).messages
    const lines = [
      `# ${redactForExport(group.name)} (${group.id})`,
      '',
      `- Status: ${group.status}`,
      `- Sensitivity: ${group.sensitivity ?? 'internal'}`,
      `- Members: ${group.members.map((member) => `@${member.alias} (${member.role})`).join(', ')}`,
      group.topic ? `- Topic: ${redactForExport(group.topic)}` : '',
      `- Exported: ${new Date(this.now()).toISOString()}`,
      '',
      ...(this.#relayRowsForExport(group).length > 0
        ? ['## Relays', '', ...this.#relayRowsForExport(group), '']
        : []),
      '## Transcript',
      '',
      ...scope.map((message) => {
        if (message.kind === 'system') return `_${redactForExport(message.text)}_`
        if (message.kind === 'control') return `> [${message.action ?? 'control'}] @${message.fromAlias ?? 'system'}: ${redactForExport(message.text)}`
        return `**@${message.fromAlias ?? '?'} → ${message.target ?? '*'}** (${new Date(message.at).toISOString()}${message.taint ? ` · ${message.taint}` : ''})\n\n${redactForExport(message.text)}`
      }),
    ].filter(Boolean)
    return { group: { id: group.id, name: group.name }, format, text: lines.join('\n'), redacted: true }
  }

  /** Redact one transcript row; the audit keeps the fact and the digest. */
  async redact(callerSessionId, reference, messageId) {
    const group = this.resolveFor(callerSessionId, reference, { activeOnly: false })
    requireOwner(group, callerSessionId)
    let redacted
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      requireOwner(current, callerSessionId)
      redacted = redactMessage(current, messageId, this.now())
    })
    if (!redacted) throw new GroupError('member-not-found', 'That message was not found or was already redacted.')
    return viewOfGroup(this.store.get(group.id), callerSessionId)
  }

  /** Remove members whose sessions no longer exist in this Host. */
  async removeMissingMembers(callerSessionId, reference) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    if (this.adapter.capabilities().listSessions !== true) {
      throw new GroupError('unsupported', 'This Host cannot list sessions.')
    }
    const visible = new Set((await this.adapter.listSessions(AbortSignal.timeout(5000))).map((item) => String(item.sessionId)))
    const missing = group.members.filter((member) => (
      member.sessionId !== HUMAN_SESSION
      && member.sessionId !== group.ownerSessionId
      && !visible.has(member.sessionId)
    ))
    if (missing.length === 0) return { removed: [], group: viewOfGroup(group, callerSessionId) }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const owner = requireOwner(current, callerSessionId)
      const ids = new Set(missing.map((member) => member.sessionId))
      current.members = current.members.filter((member) => !ids.has(member.sessionId))
      closePendingDeliveries(current, [...ids], 'The session no longer exists in this Host.')
      appendAudit(current, owner.alias, {
        fromSessionId: callerSessionId,
        action: 'membership',
        outcome: 'cleaned',
        text: `Removed ${missing.length} missing session(s): ${missing.map((member) => `@${member.alias}`).join(', ')}.`,
      }, this.config.historyLimit, this.now())
    })
    const remaining = this.store.get(group.id)
    this.onMembershipChanged([...remaining.members.map((member) => member.sessionId), ...missing.map((member) => member.sessionId)])
    return { removed: missing.map((member) => member.alias), group: viewOfGroup(remaining, callerSessionId) }
  }

  /**
   * Read a bounded transcript. Any member (active or dissolved) may read.
   *
   * `before` marks the oldest row the caller already has, so the panel's
   * "load earlier" can page backwards instead of re-fetching the tail.
   * `memberHistoryScope: own` restricts a member to rows they sent or that
   * were addressed to them (S17); the human panel always sees everything.
   */
  history(callerSessionId, reference, limit = 20, { before } = {}) {
    const group = this.resolveFor(callerSessionId, reference, { activeOnly: false })
    const bounded = Math.min(Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : 20), 100)
    let rows = group.messages
    if (callerSessionId !== HUMAN_SESSION && this.config.memberHistoryScope === 'own') {
      const me = group.members.find((member) => member.sessionId === callerSessionId)
      const aliasTag = me ? `@${me.alias}` : ''
      rows = rows.filter((message) => {
        if (message.kind === 'system') return true
        if (message.fromSessionId === callerSessionId) return true
        if (message.target === aliasTag || message.target === '*') return true
        if (typeof message.target === 'string' && message.target.startsWith('#')) {
          return me ? roleMatches(me, message.target.slice(1)) : false
        }
        return false
      })
    }
    if (Number.isFinite(before) && before > 0) {
      rows = rows.filter((message) => message.at < before)
    }
    return {
      group: {
        id: group.id,
        name: group.name,
        status: group.status,
      },
      messages: rows.slice(-bounded),
      total: rows.length,
      hasOlder: rows.length > bounded,
    }
  }

  /**
   * Pre-flight recipient/cost preview for the panel's confirmation step (S2).
   * Pure: it neither charges the ledger nor writes a transcript row.
   */
  broadcastPreview(callerSessionId, { group: reference, target, message } = {}) {
    const group = this.resolveFor(callerSessionId, reference)
    const sender = requireMember(group, callerSessionId)
    const { selector, members } = resolveTargets(group, callerSessionId, target)
    const text = typeof message === 'string' ? message.slice(0, this.config.maxMessageChars) : ''
    const sessionTargets = members.filter((member) => member.sessionId !== HUMAN_SESSION)
    const sample = sessionTargets[0] ?? members[0]
    const envelope = sample
      ? buildDeliveryEnvelope(group, sender, sample, { text, priority: 'ambient', taint: callerSessionId === HUMAN_SESSION ? 'human-typed' : 'peer' })
      : ''
    const perTarget = estimateTextTokens(envelope) + this.config.assumedTokensPerDelivery
    const estimatedTokens = perTarget * sessionTargets.length
    return {
      target: selector.label,
      recipients: members.map((member) => `@${member.alias}`),
      sessions: sessionTargets.length,
      inRoom: members.length - sessionTargets.length,
      estimatedTokens,
      perTargetTokens: perTarget,
      overCap: sessionTargets.length > this.config.maxRecipientsPerSend,
      needsConfirm: sessionTargets.length > 1 || estimatedTokens > 8000,
      paused: group.paused === true || this.store.state.gate?.paused === true,
    }
  }

  /**
   * Append and deliver one group message.
   *
   * Order matters: resolve access, normalize, apply the secret/paste/taint
   * gates, then *one* store mutation decides dedupe, budgets and the transcript
   * row. Delivery happens afterwards, so a slow target never holds the write
   * lock and a failed delivery never rolls the message back.
   *
   * @param {string} callerSessionId
   * @param {{group?: string, target: string, message: string, priority?: string, mode?: string, purpose?: string, taint?: string, refs?: Array<object>, broadcast?: boolean, confirmSecrets?: boolean, nudge?: boolean}} request
   */
  async send(callerSessionId, request = {}) {
    const group = this.resolveFor(callerSessionId, request.group)
    const caller = requireMember(group, callerSessionId)
    const text = normalizeMessage(request.message)
    if (text.length > this.config.maxMessageChars) {
      throw new GroupError('message-too-long', `Group messages are limited to ${this.config.maxMessageChars} characters.`, {
        params: { max: this.config.maxMessageChars },
      })
    }
    // A secret room is panel-only: no model tool may inject into it (S15).
    if (group.sensitivity === 'secret' && callerSessionId !== HUMAN_SESSION) {
      throw new GroupError('sensitivity-human-only', 'This group is marked secret; only the human operator can send into it.', {
        params: { sensitivity: 'secret' },
      })
    }
    // Credential gate (S8). The human may override after an explicit confirm in
    // the panel; a model tool never may, because it cannot see the person's
    // intent and cannot ask.
    const secretHit = this.config.secretScan ? scanSecrets(text) : { hit: false, labels: [] }
    if (secretHit.hit && !(callerSessionId === HUMAN_SESSION && request.confirmSecrets === true)) {
      throw new GroupError(
        'secret-detected',
        `That message looks like it contains a credential (${secretHit.labels.join(', ')}). Send a reference instead, or confirm in the panel.`,
        { labels: secretHit.labels },
      )
    }
    const { selector, members } = resolveTargets(group, callerSessionId, request.target)
    const priority = request.priority === 'urgent' ? 'urgent' : 'ambient'
    const explicitMode = request.mode === 'queue' || request.mode === 'steer' ? request.mode : undefined
    // ambient means "finish the current turn first" (queue); urgent means
    // "handle at the next step boundary" (steer). An explicit mode still wins
    // for advanced callers.
    const deliveryMode = explicitMode ?? (priority === 'urgent' ? 'steer' : this.config.deliveryMode)
    const purpose = MESSAGE_PURPOSES.includes(request.purpose) ? request.purpose : undefined
    const taint = callerSessionId === HUMAN_SESSION
      ? (request.taint === 'human-pasted' ? 'human-pasted' : 'human-typed')
      : (request.taint === 'tool' ? 'tool' : 'peer')
    const refs = Array.isArray(request.refs)
      ? request.refs
        .filter((entry) => entry && typeof entry === 'object' && typeof entry.value === 'string')
        .slice(0, 4)
        .map((entry) => ({
          kind: ['file', 'url', 'session', 'relay', 'message', 'other'].includes(entry.kind) ? entry.kind : 'other',
          value: entry.value.slice(0, 400),
        }))
      : []
    // Only the person can confirm a wide broadcast; the flag is ignored for agents.
    const broadcast = callerSessionId === HUMAN_SESSION && request.broadcast === true
    const nudge = request.nudge === true
    const now = this.now()
    const fingerprint = dedupeKey(text)

    let prepared
    try {
      prepared = await this.store.write((draft) => {
        const current = draft.groups[group.id]
        if (current.status !== 'active') throw new GroupError('group-dissolved', 'This group is dissolved and read-only.')
        const sender = requireMember(current, callerSessionId)
        const targets = resolveTargets(current, callerSessionId, selector.label)
        // A message that only lands in the room (the human operator) wakes no
        // session and cannot cause cross-session chatter; it does not need a purpose.
        const inRoomOnly = targets.members.every((member) => member.sessionId === HUMAN_SESSION)
        if (!inRoomOnly && callerSessionId !== HUMAN_SESSION && !isOrganizer(sender, current) && purpose === undefined) {
          throw new GroupError(
            'purpose-required',
            'Group messages from non-organizer members need purpose=verify|correct|review|anomaly|question|blocked|handoff. Do not send status, acknowledgements or chatter.',
          )
        }

        // Read receipts: a member speaking in the room proves it read what was
        // addressed to it. This derives "read" without an extra tool or poll.
        for (const entry of current.messages) {
          for (const delivery of entry.deliveries ?? []) {
            if (delivery.sessionId !== callerSessionId) continue
            if (delivery.status !== 'delivered') continue
            delivery.status = 'read'
            delivery.readAt = now
            this.metrics.bump('readReceipts')
          }
        }

        // Duplicate suppression is deliberately scoped to one sender, target and
        // body inside a short window. A repeated tool call therefore does not
        // wake the same sessions twice. The human panel is exempt: the composer
        // has a busy state, and a person repeating "收到" is meaningful (#14).
        const duplicate = this.config.dedupeWindowMs > 0 && callerSessionId !== HUMAN_SESSION
          ? [...current.messages].reverse().find((entry) => (
              entry.kind === 'message'
              && entry.fromSessionId === callerSessionId
              && entry.target === selector.label
              && dedupeKey(entry.text) === fingerprint
              && now - entry.at >= 0
              && now - entry.at <= this.config.dedupeWindowMs
              && (entry.deliveries.length === 0 || entry.deliveries.some((delivery) => delivery.status === 'delivered' || delivery.status === 'pending'))
            ))
          : undefined
        if (duplicate) {
          this.metrics.bump('deduplicated')
          return {
            deduplicated: true,
            messageId: duplicate.id,
            targets: [],
            deliveries: duplicate.deliveries,
          }
        }

        const held = current.paused === true || draft.gate?.paused === true
        const envelopes = targets.members.map((target) => (
          buildDeliveryEnvelope(current, sender, target, { text, priority, purpose, taint, refs })
        ))
        const envelopeChars = Math.max(...envelopes.map((envelope) => envelope.length))
        const envelopeText = envelopes.reduce((largest, envelope) => (envelope.length >= largest.length ? envelope : largest), '')
        const charge = chargeSend({
          state: draft,
          now,
          groupId: current.id,
          senderSessionId: callerSessionId,
          targets: targets.members,
          text,
          envelopeChars,
          envelopeText,
          limits: this.config,
          broadcast,
          held,
          nudge,
        })
        const message = {
          id: newMessageId(),
          kind: 'message',
          at: now,
          fromSessionId: callerSessionId,
          fromAlias: sender.alias,
          fromKind: callerSessionId === HUMAN_SESSION ? 'human' : 'agent',
          target: selector.label,
          text,
          priority,
          taint,
          ...(purpose ? { purpose } : {}),
          ...(refs.length > 0 ? { refs } : {}),
          ...(nudge ? { nudge: true } : {}),
          estimatedTokens: charge.estimatedTokens,
          deliveries: targets.members.map((member) => ({
            ...deliveryRow(member),
            status: held ? 'held' : 'pending',
            at: now,
          })),
        }
        current.messages.push(message)
        trimTranscript(current, this.config.historyLimit)
        current.updatedAt = message.at
        return {
          deduplicated: false,
          held,
          messageId: message.id,
          message: {
            id: message.id,
            kind: 'message',
            at: message.at,
            fromSessionId: message.fromSessionId,
            fromAlias: message.fromAlias,
            fromKind: message.fromKind,
            target: message.target,
            text: message.text,
            priority: message.priority,
            taint: message.taint,
            ...(message.purpose ? { purpose: message.purpose } : {}),
            estimatedTokens: message.estimatedTokens,
            deliveries: message.deliveries.map((delivery) => ({ ...delivery })),
          },
          targets: targets.members.map((member) => ({ ...member })),
          deliveries: undefined,
          estimatedTokens: charge.estimatedTokens,
        }
      })
    } catch (error) {
      // A tripped breaker must persist the pause; otherwise the next send
      // simply tries again and the room can never recover on its own.
      if (error instanceof GroupError && error.code === 'circuit-open') {
        await this.store.write((draft) => {
          const current = draft.groups[group.id]
          if (!current || current.paused === true) return
          current.paused = true
          appendAudit(current, caller.alias, {
            fromSessionId: callerSessionId,
            action: 'pause',
            outcome: 'paused',
            text: 'Circuit breaker: too many broadcasts in one hour.',
          }, this.config.historyLimit, this.now())
        }).catch(() => {})
      }
      throw error
    }

    if (prepared.deduplicated) {
      const current = this.store.get(group.id)
      const deliveries = prepared.deliveries ?? []
      const base = {
        messageId: prepared.messageId,
        target: selector.label,
        deliveries,
        failures: deliveries.filter((delivery) => delivery.status === 'failed'),
        text,
        deduplicated: true,
        estimatedTokens: 0,
      }
      return current
        ? { ...base, group: viewOfGroup(current, callerSessionId, { messageLimit: 4 }) }
        : { ...base, group: { id: group.id, name: group.name, status: 'deleted' } }
    }

    this.metrics.charge({
      estimated: prepared.estimatedTokens ?? 0,
      deliveries: prepared.deliveries === undefined ? prepared.targets.length : 0,
      targets: prepared.targets.length,
      broadcast: prepared.targets.length > 1,
      nudge: request.nudge === true,
    })
    const deliveries = prepared.held
      ? (this.store.get(group.id)?.messages.find((entry) => entry.id === prepared.messageId)?.deliveries ?? [])
        .map((delivery) => ({ ...delivery }))
      : await this.#deliver(group, prepared.messageId, caller, text, prepared.targets, deliveryMode, priority, purpose, taint, refs)
    const latest = this.store.get(group.id)
    const result = {
      messageId: prepared.messageId,
      message: prepared.message,
      target: selector.label,
      deliveries,
      failures: deliveries.filter((delivery) => delivery.status === 'failed'),
      text,
      deduplicated: false,
      held: prepared.held === true,
      estimatedTokens: prepared.estimatedTokens ?? 0,
    }
    if (!latest) {
      // The room was deleted while delivery was in flight. The accepted message
      // is gone with it; report the accepted id instead of throwing a 500.
      return { ...result, group: { id: group.id, name: group.name, status: 'deleted' } }
    }
    return { ...result, group: viewOfGroup(latest, callerSessionId, { messageLimit: 4 }) }
  }

  /**
   * Admit one accepted message into every target, bounded by a concurrency
   * gate (S10). Deliveries never roll back the transcript.
   */
  async #deliver(group, messageId, sender, text, targets, mode = this.config.deliveryMode, priority = 'ambient', purpose = undefined, taint = 'peer', refs = []) {
    const capabilities = this.adapter.capabilities()
    const results = await Promise.all(targets.map(async (target) => {
      if (!this.store.get(group.id)) {
        // A concurrent delete removed the room after the message was accepted.
        return { sessionId: target.sessionId, alias: target.alias, status: 'failed', error: 'Group was deleted before delivery.' }
      }
      if (target.sessionId === HUMAN_SESSION) {
        // No session to wake: the message is recorded in the room for the person.
        return { sessionId: target.sessionId, alias: target.alias, status: 'in-room' }
      }
      if (capabilities.wake !== true) {
        // Mailbox transports are honest about not waking a session: the
        // envelope is written to that agent's inbox and the row stays
        // "queued" until the agent reads it.
        try {
          await this.#withDeliverySlot(async () => this.adapter.prompt({
            requestId: `group-talk-l:${messageId}:${target.sessionId}`,
            sessionId: target.sessionId,
            mode,
            text: buildDeliveryEnvelope(group, sender, target, { text, priority, purpose, taint, refs }),
            signal: AbortSignal.timeout(30000),
          }))
          return { sessionId: target.sessionId, alias: target.alias, status: 'queued', error: 'Mailbox mode: written to the inbox; no session wake.' }
        } catch (error) {
          this.log(`mailbox delivery to ${target.sessionId} failed`, error)
          return {
            sessionId: target.sessionId,
            alias: target.alias,
            status: 'failed',
            error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
          }
        }
      }
      const startedAt = this.now()
      try {
        const outcome = await this.#withDeliverySlot(async () => this.adapter.prompt({
          requestId: `group-talk-l:${messageId}:${target.sessionId}`,
          sessionId: target.sessionId,
          mode,
          text: buildDeliveryEnvelope(group, sender, target, { text, priority, purpose, taint, refs }),
          signal: AbortSignal.timeout(30000),
        }))
        this.metrics.latency(this.now() - startedAt)
        return {
          sessionId: target.sessionId,
          alias: target.alias,
          status: 'delivered',
          ...(Number.isFinite(outcome?.tokens) ? { actualTokens: Math.trunc(outcome.tokens) } : {}),
        }
      } catch (error) {
        this.log(`delivery to ${target.sessionId} failed`, error)
        return {
          sessionId: target.sessionId,
          alias: target.alias,
          status: 'failed',
          error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        }
      }
    }))
    this.metrics.bump('deliveries', results.length)
    for (const row of results) {
      if (row.status === 'delivered') this.metrics.bump('delivered')
      else if (row.status === 'failed') this.metrics.bump('failed')
      else if (row.status === 'in-room') this.metrics.bump('inRoom')
      else if (row.status === 'queued') this.metrics.bump('held')
    }
    const actualTotal = results.reduce((sum, row) => sum + (Number.isFinite(row.actualTokens) ? row.actualTokens : 0), 0)

    try {
      await this.store.write((draft) => {
        const current = draft.groups[group.id]
        if (!current) return
        const message = current.messages.find((entry) => entry.id === messageId)
        if (!message) return
        message.deliveries = results.map(({ sessionId, alias, status, error, actualTokens }) => ({
          sessionId,
          alias,
          status,
          at: this.now(),
          ...(error === undefined ? {} : { error }),
          ...(actualTokens === undefined ? {} : { actualTokens }),
        }))
        if (actualTotal > 0) message.actualTokens = actualTotal
        current.updatedAt = this.now()
        if (actualTotal > 0) recordActualUsage(draft, { senderSessionId: sender.sessionId, groupId: group.id, tokens: actualTotal, now: this.now() })
      })
      if (actualTotal > 0) this.metrics.actual(actualTotal)
    } catch (error) {
      this.log('could not persist delivery receipts', error)
    }
    return results
  }

  /**
   * Concurrency gate: at most `maxConcurrentDeliveries` prompts are in flight.
   * Beyond that the send waits for a slot; beyond the queue limit it is
   * rejected with a retry hint rather than piling up unbounded work.
   */
  async #withDeliverySlot(task) {
    const max = Math.max(1, this.config.maxConcurrentDeliveries)
    if (this.deliveryActive >= max) {
      if (this.deliveryQueue.length >= this.config.deliveryQueueLimit) {
        throw new GroupError('rate-limited', 'Too many deliveries are already in flight; wait before sending.', {
          retryAfterMs: 5000,
          detail: `${this.deliveryQueue.length} queued`,
        })
      }
      await new Promise((resolve) => this.deliveryQueue.push(resolve))
    }
    this.deliveryActive += 1
    try {
      return await task()
    } finally {
      this.deliveryActive = Math.max(0, this.deliveryActive - 1)
      const next = this.deliveryQueue.shift()
      if (next) next()
    }
  }

  /**
   * Record one audited note or decision.
   *
   * A note is a log row, never a chat instruction. `kind: 'decision'` marks a
   * conclusion the room agreed on, so the panel can show a durable "what we
   * decided" list instead of a wall of messages (#61).
   */
  async note(callerSessionId, reference, text, { kind = 'note' } = {}) {
    const group = this.resolveFor(callerSessionId, reference)
    const member = requireMember(group, callerSessionId)
    if (!this.config.allowAgentNote) {
      throw new GroupError('note-disabled', 'Audited notes are disabled for model tools in this profile.')
    }
    if (!hasRole(member, NOTE_ROLE_IDS)) {
      throw new GroupError('role-required', 'Only a secretary, organizer or the human operator can record a group note.')
    }
    const body = typeof text === 'string' ? text.replace(/\u0000/gu, '').trim().slice(0, MAX_NOTE) : ''
    if (!body) throw new GroupError('empty-note', 'Note text is required.')
    const action = kind === 'decision' ? 'decision' : 'note'
    this.noteWrite(callerSessionId)
    const now = this.now()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      if (!current) throw new GroupError('group-not-found', 'The group no longer exists.')
      const currentMember = requireMember(current, callerSessionId)
      if (!hasRole(currentMember, NOTE_ROLE_IDS)) {
        throw new GroupError('role-required', 'Only a secretary, organizer or the human operator can record a group note.')
      }
      const today = current.audit.filter((row) => (
        row.kind === 'control'
        && row.action === action
        && row.fromSessionId === callerSessionId
        && row.at >= dayStart.getTime()
      )).length
      if (this.config.maxNotesPerAgentPerDay <= 0 || today >= this.config.maxNotesPerAgentPerDay) {
        throw new GroupError('quota-exceeded', `Daily ${action} budget reached (${this.config.maxNotesPerAgentPerDay}).`, {
          params: { max: this.config.maxNotesPerAgentPerDay },
        })
      }
      appendControl(current, currentMember.alias, {
        fromSessionId: callerSessionId,
        action,
        outcome: action === 'decision' ? 'agreed' : 'recorded',
        text: body,
      }, this.config.historyLimit, now)
    })
    return viewOfGroup(this.store.get(group.id), callerSessionId, { messageLimit: 8 })
  }

  /**
   * Run one bounded, audited subagent delegation under an organizer/owner
   * member Agent. The child is never a group member, gets no group tools, is
   * depth-limited to zero, has a timeout, and its start/result becomes a
   * control entry that the human can audit.
   */
  async delegate(parentAgent, callerSessionId, reference, request = {}) {
    const group = this.resolveFor(callerSessionId, reference)
    const member = requireMember(group, callerSessionId)
    if (!this.config.allowAgentDelegate) {
      throw new GroupError('delegate-disabled', 'Subagent delegation is disabled for model tools in this profile.')
    }
    if (!hasRole(member, DELEGATE_ROLE_IDS)) {
      throw new GroupError('role-required', 'Only an organizer, owner or the human operator can delegate a subagent.')
    }
    if (group.sensitivity === 'secret') {
      throw new GroupError('sensitivity-human-only', 'A secret group cannot delegate to a subagent.', { params: { sensitivity: 'secret' } })
    }
    if (!parentAgent || typeof parentAgent !== 'object' || typeof parentAgent.id !== 'string') {
      throw new GroupError('delegation-unavailable', 'Delegation requires a live calling Agent.')
    }
    const task = typeof request.task === 'string' ? request.task.replace(/\u0000/gu, '').trim() : ''
    if (!task) throw new GroupError('task-required', 'A delegation task is required.')
    if (task.length > this.config.maxDelegationChars) {
      throw new GroupError('task-too-long', `Delegation tasks are limited to ${this.config.maxDelegationChars} characters.`)
    }
    const dayStart = new Date(this.now())
    dayStart.setHours(0, 0, 0, 0)
    const today = (group.audit ?? group.messages).filter((message) => (
      message.kind === 'control'
      && message.action === 'delegate'
      && message.outcome === 'started'
      && message.fromSessionId === callerSessionId
      && message.at >= dayStart.getTime()
    )).length
    if (this.config.maxDelegationsPerDay <= 0 || today >= this.config.maxDelegationsPerDay) {
      throw new GroupError('delegation-quota', `Daily delegation budget reached (${this.config.maxDelegationsPerDay}).`)
    }

    if (this.adapter.capabilities().subagents !== true) {
      throw new GroupError('delegation-unavailable', 'Subagent delegation is unavailable in this profile.')
    }
    const available = this.adapter.listSubagentProviders()
    const provider = this.config.delegationProvider || available[0]
    if (!provider || !available.includes(provider)) {
      throw new GroupError('delegation-unavailable', 'The configured subagent provider is not available.')
    }

    const taskId = newMessageId().replace(/^msg_/u, 'task_')
    const label = typeof request.label === 'string' && request.label.trim() ? request.label.trim().slice(0, 60) : task.slice(0, 60)
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      if (!current) throw new GroupError('group-not-found', 'The group no longer exists.')
      appendControl(current, member.alias, {
        fromSessionId: callerSessionId,
        action: 'delegate',
        taskId,
        target: 'subagent',
        outcome: 'started',
        reason: provider,
        text: `Delegated to ${provider} subagent: ${label}`,
      }, this.config.historyLimit, this.now())
    })

    const controller = new AbortController()
    let run
    try {
      // A delegated child is a capability amplifier: it never joins the room,
      // never gets group tools, and in the default read-only profile loses
      // mutating/network tools as well (S7).
      const deny = this.config.delegationReadOnly ? [...DELEGATION_DENY, ...DELEGATION_WRITE_TOOLS] : DELEGATION_DENY
      run = await this.adapter.startSubagent({
        provider,
        label,
        task,
        parent: parentAgent,
        signal: controller.signal,
        maxDepth: 0,
        toolFilter: { deny },
      })
    } catch (error) {
      this.log('could not start delegated subagent', error)
      await this.#delegationRecord(group.id, callerSessionId, member.alias, {
        taskId,
        outcome: 'failed',
        reason: 'start-failed',
        text: `Delegation ${taskId} could not start.`,
      })
      throw new GroupError('delegation-failed', 'The delegated subagent could not start; see the Host log.')
    }

    let timer
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error('delegation-timeout'))
        }, this.config.delegationTimeoutMs)
      })
      const result = await Promise.race([run.result, timeout])
      const output = delegationText(result).slice(0, this.config.maxDelegationChars)
      const outcome = result?.stopReason === 'completed' ? 'completed' : 'failed'
      await this.#delegationRecord(group.id, callerSessionId, member.alias, {
        taskId,
        outcome,
        reason: outcome === 'failed' ? String(result?.stopReason ?? 'failed').slice(0, 40) : undefined,
        text: output ? `Delegation ${taskId} ${outcome}: ${output}` : `Delegation ${taskId} ${outcome}.`,
      })
      return { taskId, provider, outcome, output: output || undefined, stopReason: result?.stopReason }
    } catch (error) {
      this.log('delegated subagent failed', error)
      await this.#delegationRecord(group.id, callerSessionId, member.alias, {
        taskId,
        outcome: 'failed',
        reason: error instanceof Error && error.message === 'delegation-timeout' ? 'timeout' : 'run-failed',
        text: `Delegation ${taskId} failed or timed out; the room has the audit record.`,
      })
      throw new GroupError('delegation-failed', 'The delegated subagent failed or timed out; the room has the audit record.')
    } finally {
      clearTimeout(timer)
      try {
        await run.dispose()
      } catch (error) {
        this.log('could not dispose delegated subagent', error)
      }
    }
  }

  /** Best-effort control row for a delegation; a deleted room is a no-op. */
  async #delegationRecord(groupId, callerSessionId, actorAlias, entry) {
    try {
      await this.store.write((draft) => {
        const current = draft.groups[groupId]
        if (!current) return
        appendControl(current, actorAlias, {
          fromSessionId: callerSessionId,
          action: 'delegate',
          ...entry,
        }, this.config.historyLimit, this.now())
      })
    } catch (error) {
      this.log('could not record delegation audit', error)
    }
  }

  /**
   * Model-tool send gate: the organizer/owner/human may send any group
   * message; every other member must declare one of the review purposes.
   */
  sendPurposeRequired(sessionId, reference) {
    if (sessionId === HUMAN_SESSION) return false
    const group = this.resolveFor(sessionId, reference)
    const member = group.members.find((entry) => entry.sessionId === sessionId)
    if (!member) return true
    return !isOrganizer(member, group)
  }

  /** Compact recap used by a newly installed scoped tool set. */
  membershipCount(sessionId) {
    return this.activeGroupsFor(sessionId).length
  }
}
