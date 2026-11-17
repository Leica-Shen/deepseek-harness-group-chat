/**
 * Durable state for session groups.
 *
 * One JSON document owns every group, its membership and its bounded
 * transcript. It lives under `$DSH_HOME` (never in a session workspace), is
 * read once when the Host plugin mounts, and is replaced atomically after each
 * accepted mutation. A corrupt document is moved aside instead of being
 * silently overwritten, so a bad write can always be inspected.
 *
 * The store is deliberately transport-free and Cordis-free: it is the part of
 * the plugin that can be tested with plain Node.
 */
import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { roleIdOf } from './roles.js'

/** 2 adds sensitivity/pause/read receipts/taint/relay-aware deliveries. */
export const STATE_VERSION = 2

/** Reserved sender id for the human operator. Session ids never look like this. */
export const HUMAN_SESSION = 'human'
export const ALIAS_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u
export const MAX_NAME = 64
export const MAX_TOPIC = 240
export const MAX_ROLE = 48
export const MAX_DUTIES = 400
/**
 * Storage tolerance for legacy rows. The *send* limit is
 * `config.maxMessageChars` (default 2000); older stores may hold up to this.
 */
export const MAX_MESSAGE = 8000
/** A note is deliberately shorter than a chat message. */
export const MAX_NOTE = 1000
/** Control rows (notes, delegation receipts) are kept shorter than a message. */
export const MAX_CONTROL = 4000
/** How many control rows may compete with chat rows inside the live transcript. */
export const CONTROL_TRANSCRIPT_LIMIT = 20
/** Purposes that can justify a non-organizer group message. */
export const MESSAGE_PURPOSES = ['verify', 'correct', 'review', 'anomaly', 'question', 'blocked', 'handoff']
/** Taint labels (S6): who authored the bytes, not who relayed them. */
export const TAINT_LABELS = ['human-typed', 'human-pasted', 'peer', 'tool', 'system']
/** Group sensitivity (S15). */
export const SENSITIVITIES = ['public', 'internal', 'secret']

/** Stable, typed failure from the group domain. */
export class GroupError extends Error {
  /**
   * @param {string} code stable machine code
   * @param {string} message human-readable English fallback
   * @param {{params?: object, retryAfterMs?: number, detail?: string, labels?: string[], cause?: unknown}} [details]
   *        structured data for the localized wire shape (S13)
   */
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'GroupError'
    this.code = code
    if (details.params) this.params = details.params
    if (Number.isFinite(details.retryAfterMs)) this.retryAfterMs = details.retryAfterMs
    if (typeof details.detail === 'string') this.detail = details.detail
    if (Array.isArray(details.labels)) this.labels = details.labels
  }
}

/** Resolve the default data file under the active DSH home. */
export function resolveDataFile(explicit = '') {
  const value = typeof explicit === 'string' ? explicit.trim() : ''
  if (value) return resolve(value)
  const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'group-talk-l', 'groups.json')
}

/** One empty, valid state document. */
export function emptyState() {
  return { version: STATE_VERSION, groups: {}, usage: emptyUsage(), relays: {}, gate: emptyGate() }
}

/** Host-wide emergency stop state (S12). */
export function emptyGate() {
  return { paused: false, pausedAt: 0, pausedBy: '', reason: '', relayPaused: false }
}

/** One empty daily usage ledger. `day` is a local `YYYY-MM-DD` key. */
export function emptyUsage(day = '') {
  return {
    day,
    senders: Object.create(null),
    groups: Object.create(null),
    targets: Object.create(null),
    broadcasts: Object.create(null),
    lastSend: Object.create(null),
    actualTokens: 0,
  }
}

/** Normalize one `{messages,deliveries,tokens}` counter. */
function normalizeCounter(raw) {
  if (!isRecord(raw)) return { messages: 0, deliveries: 0, tokens: 0 }
  const value = (candidate) => (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? Math.trunc(candidate) : 0)
  return {
    messages: value(raw.messages),
    deliveries: value(raw.deliveries),
    tokens: value(raw.tokens),
    ...(Number.isFinite(raw.actualTokens) && raw.actualTokens > 0 ? { actualTokens: Math.trunc(raw.actualTokens) } : {}),
  }
}

/** Normalize a map of counters without trusting persisted keys. */
function normalizeCounters(raw) {
  if (!isRecord(raw)) return {}
  const result = Object.create(null)
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 200) continue
    result[key] = normalizeCounter(value)
  }
  return result
}

/** Normalize the persisted daily ledger. */
export function normalizeUsage(raw) {
  if (!isRecord(raw)) return emptyUsage()
  const lastSend = Object.create(null)
  if (isRecord(raw.lastSend)) {
    for (const [key, value] of Object.entries(raw.lastSend)) {
      if (typeof key === 'string' && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        lastSend[key] = Math.trunc(value)
      }
    }
  }
  return {
    day: typeof raw.day === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(raw.day) ? raw.day : '',
    senders: normalizeCounters(raw.senders),
    groups: normalizeCounters(raw.groups),
    targets: normalizeCounters(raw.targets),
    broadcasts: normalizeCounters(raw.broadcasts),
    lastSend,
    actualTokens: typeof raw.actualTokens === 'number' && Number.isFinite(raw.actualTokens) && raw.actualTokens >= 0
      ? Math.trunc(raw.actualTokens)
      : 0,
  }
}

/** Normalize one persisted relay record, returning undefined when unusable. */
function normalizeRelay(raw) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.startsWith('relay_')) return undefined
  const fromSessionId = typeof raw.fromSessionId === 'string' ? raw.fromSessionId : ''
  const toSessionId = typeof raw.toSessionId === 'string' ? raw.toSessionId : ''
  if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) return undefined
  const status = ['created', 'delivered', 'replied', 'declined', 'timeout', 'failed', 'cancelled'].includes(raw.status)
    ? raw.status
    : 'created'
  const intent = ['confirm', 'ask', 'handoff'].includes(raw.intent) ? raw.intent : 'confirm'
  const maxRounds = Number.isInteger(raw.maxRounds) ? Math.min(3, Math.max(1, raw.maxRounds)) : 1
  const messages = Array.isArray(raw.messages)
    ? raw.messages
      .filter((entry) => isRecord(entry) && typeof entry.text === 'string')
      .slice(-8)
      .map((entry) => ({
        round: Number.isInteger(entry.round) ? Math.max(1, Math.min(maxRounds, entry.round)) : 1,
        from: entry.from === 'to' ? 'to' : 'from',
        at: timeOf(entry.at),
        text: entry.text.slice(0, 2000),
      }))
    : []
  return {
    id: raw.id,
    fromSessionId,
    fromAlias: typeof raw.fromAlias === 'string' ? raw.fromAlias.slice(0, 64) : 'unknown',
    toSessionId,
    toAlias: typeof raw.toAlias === 'string' ? raw.toAlias.slice(0, 64) : 'unknown',
    intent,
    status,
    round: Number.isInteger(raw.round) ? Math.min(maxRounds, Math.max(1, raw.round)) : 1,
    maxRounds,
    createdAt: timeOf(raw.createdAt),
    updatedAt: timeOf(raw.updatedAt, timeOf(raw.createdAt)),
    expiresAt: timeOf(raw.expiresAt, Date.now() + 600000),
    ...(typeof raw.groupId === 'string' && raw.groupId.startsWith('grp_') ? { groupId: raw.groupId } : {}),
    ...(typeof raw.purpose === 'string' ? { purpose: raw.purpose.slice(0, 40) } : {}),
    ...(Number.isFinite(raw.estimatedTokens) && raw.estimatedTokens >= 0 ? { estimatedTokens: Math.trunc(raw.estimatedTokens) } : {}),
    messages,
  }
}

/** Normalize the host-wide emergency gate. */
function normalizeGate(raw) {
  if (!isRecord(raw)) return emptyGate()
  return {
    paused: raw.paused === true,
    pausedAt: timeOf(raw.pausedAt, 0),
    pausedBy: typeof raw.pausedBy === 'string' ? raw.pausedBy.slice(0, 64) : '',
    reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 240) : '',
    relayPaused: raw.relayPaused === true,
  }
}

/** Deep copy of the lossless-JSON state or any sub-value. */
function copy(value) {
  return value === undefined ? undefined : structuredClone(value)
}

/** Case-fold a label for alias/role matching. */
function fold(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US')
}

/** Whether a value is a lossless plain record (state came from disk). */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Finite non-negative timestamp, or a safe fallback. */
function timeOf(value, fallback = Date.now()) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

/** One-line, bounded, display-safe name. */
export function normalizeName(value) {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').trim() : ''
  if (text.length === 0) throw new GroupError('invalid-name', 'Group name is required.')
  if (text.length > MAX_NAME) throw new GroupError('invalid-name', `Group name must be at most ${MAX_NAME} characters.`)
  return text
}

/** Optional topic/description. */
export function normalizeTopic(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new GroupError('invalid-topic', 'Group topic must be text.')
  const text = value.replace(/\u0000/gu, '').trim()
  if (text.length > MAX_TOPIC) throw new GroupError('invalid-topic', `Group topic must be at most ${MAX_TOPIC} characters.`)
  return text
}

/** A member alias such as `reviewer` or `审阅者`. */
export function normalizeAlias(value) {
  const alias = typeof value === 'string' ? value.trim().replace(/^@/u, '') : ''
  if (alias.toLocaleLowerCase('en-US') === 'all') {
    throw new GroupError('invalid-alias', 'Alias "all" is reserved for the broadcast target.')
  }
  if (!ALIAS_PATTERN.test(alias)) {
    throw new GroupError(
      'invalid-alias',
      'Alias must start with a letter or digit and contain only letters, digits, "_" or "-" (max 32 characters).',
    )
  }
  return alias
}

/** A free-form role label. Roles are advisory, never authority. */
export function normalizeRole(value, fallback = 'member') {
  const role = typeof value === 'string' ? value.trim() : ''
  if (role.length === 0) return fallback
  if (role.length > MAX_ROLE) throw new GroupError('invalid-role', `Role must be at most ${MAX_ROLE} characters.`)
  return role.replace(/[\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ')
}

/** Optional responsibilities attached to a role. */
export function normalizeDuties(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new GroupError('invalid-duties', 'Role duties must be text.')
  const text = value.replace(/\u0000/gu, '').trim()
  if (text.length > MAX_DUTIES) throw new GroupError('invalid-duties', `Role duties must be at most ${MAX_DUTIES} characters.`)
  return text
}

/** A message body, preserving line breaks but bounded for member prompts. */
export function normalizeMessage(value) {
  const text = typeof value === 'string' ? value.replace(/\u0000/gu, '').trim() : ''
  if (text.length === 0) throw new GroupError('empty-message', 'Message text is required.')
  if (text.length > MAX_MESSAGE) throw new GroupError('message-too-long', `Message must be at most ${MAX_MESSAGE} characters.`)
  return text
}

/** A session identity as stored in one group. */
export function normalizeSessionId(value) {
  if (typeof value !== 'string') throw new GroupError('invalid-session', 'Session id must be text.')
  const id = value.trim()
  if (id.length === 0 || id.length > 200 || /[\s\u0000-\u001f\u007f]/u.test(id)) {
    throw new GroupError('invalid-session', 'Session id is not valid.')
  }
  return id
}

/** New group identity. */
export function newGroupId() {
  return `grp_${randomUUID().replaceAll('-', '').slice(0, 20)}`
}

/** New transcript identity. */
export function newMessageId() {
  return `msg_${randomUUID().replaceAll('-', '').slice(0, 20)}`
}

/** Normalize one persisted member, returning undefined when unusable. */
function normalizeMember(raw) {
  if (!isRecord(raw)) return undefined
  try {
    const role = normalizeRole(raw.role)
    const roleId = typeof raw.roleId === 'string' && /^[a-z][a-z-]{0,31}$/u.test(raw.roleId) ? raw.roleId : roleIdOf(role)
    return {
      sessionId: normalizeSessionId(raw.sessionId),
      alias: normalizeAlias(raw.alias),
      role,
      roleId,
      duties: normalizeDuties(raw.duties),
      joinedAt: timeOf(raw.joinedAt),
      // Organizer is an owner-granted capability, not a magic role string.
      ...(raw.organizer === true ? { organizer: true } : {}),
      ...(typeof raw.note === 'string' && raw.note.trim() ? { note: raw.note.trim().slice(0, 120) } : {}),
    }
  } catch {
    return undefined
  }
}

/** Normalize one persisted delivery record. */
function normalizeDelivery(raw) {
  if (!isRecord(raw) || typeof raw.sessionId !== 'string') return undefined
  const status = ['delivered', 'failed', 'unknown', 'in-room', 'read', 'held', 'queued'].includes(raw.status) ? raw.status : 'pending'
  return {
    sessionId: raw.sessionId,
    alias: typeof raw.alias === 'string' ? raw.alias : '',
    status,
    ...(Number.isFinite(raw.at) ? { at: Math.trunc(raw.at) } : {}),
    ...(Number.isFinite(raw.readAt) ? { readAt: Math.trunc(raw.readAt) } : {}),
    ...(Number.isFinite(raw.actualTokens) && raw.actualTokens > 0 ? { actualTokens: Math.trunc(raw.actualTokens) } : {}),
    ...(typeof raw.error === 'string' && raw.error ? { error: raw.error.slice(0, 500) } : {}),
  }
}

/** Normalize one persisted transcript entry. */
function normalizeTranscriptMessage(raw) {
  if (!isRecord(raw)) return undefined
  const kind = raw.kind === 'system' ? 'system' : raw.kind === 'control' ? 'control' : 'message'
  const text = typeof raw.text === 'string' ? raw.text.slice(0, MAX_MESSAGE) : ''
  if (!text) return undefined
  const deliveries = Array.isArray(raw.deliveries) ? raw.deliveries.map(normalizeDelivery).filter(Boolean) : []
  const short = (value, length) => (typeof value === 'string' && value ? value.slice(0, length) : undefined)
  const refs = Array.isArray(raw.refs)
    ? raw.refs
      .filter((entry) => isRecord(entry) && typeof entry.value === 'string')
      .slice(0, 4)
      .map((entry) => ({
        kind: ['file', 'url', 'session', 'relay', 'message', 'other'].includes(entry.kind) ? entry.kind : 'other',
        value: entry.value.slice(0, 400),
      }))
    : []
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newMessageId(),
    kind,
    at: timeOf(raw.at),
    text,
    ...(typeof raw.fromSessionId === 'string' ? { fromSessionId: raw.fromSessionId } : {}),
    ...(typeof raw.fromAlias === 'string' ? { fromAlias: raw.fromAlias } : {}),
    ...(raw.fromKind === 'human' || raw.fromKind === 'agent' || raw.fromKind === 'system' ? { fromKind: raw.fromKind } : {}),
    ...(typeof raw.target === 'string' ? { target: raw.target } : {}),
    ...(TAINT_LABELS.includes(raw.taint) ? { taint: raw.taint } : {}),
    ...(raw.redacted === true ? { redacted: true } : {}),
    ...(kind === 'message' && (raw.priority === 'urgent' || raw.priority === 'ambient') ? { priority: raw.priority } : {}),
    ...(kind === 'message' && MESSAGE_PURPOSES.includes(raw.purpose) ? { purpose: raw.purpose } : {}),
    ...(refs.length > 0 ? { refs } : {}),
    ...(kind === 'control' ? {
      ...(short(raw.action, 40) ? { action: short(raw.action, 40) } : {}),
      ...(short(raw.taskId, 80) ? { taskId: short(raw.taskId, 80) } : {}),
      ...(short(raw.outcome, 40) ? { outcome: short(raw.outcome, 40) } : {}),
      ...(short(raw.reason, 240) ? { reason: short(raw.reason, 240) } : {}),
      ...(short(raw.parentRequestId, 120) ? { parentRequestId: short(raw.parentRequestId, 120) } : {}),
      ...(short(raw.supersededBy, 120) ? { supersededBy: short(raw.supersededBy, 120) } : {}),
    } : {}),
    ...(typeof raw.estimatedTokens === 'number' && Number.isFinite(raw.estimatedTokens) && raw.estimatedTokens >= 0
      ? { estimatedTokens: Math.trunc(raw.estimatedTokens) }
      : {}),
    ...(typeof raw.actualTokens === 'number' && Number.isFinite(raw.actualTokens) && raw.actualTokens > 0
      ? { actualTokens: Math.trunc(raw.actualTokens) }
      : {}),
    deliveries,
  }
}

/** Normalize one persisted group. Invalid entries are reported, never guessed at. */
function normalizeGroup(raw, historyLimit) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.startsWith('grp_')) {
    return { group: undefined, dropped: ['invalid group record'] }
  }
  let name
  let topic
  try {
    name = normalizeName(raw.name)
    topic = normalizeTopic(raw.topic)
  } catch {
    return { group: undefined, dropped: ['invalid name or topic'] }
  }
  const ownerSessionId = typeof raw.ownerSessionId === 'string' ? raw.ownerSessionId.trim() : ''
  if (!ownerSessionId) return { group: undefined, dropped: ['missing owner'] }

  const dropped = []
  const members = []
  if (!Array.isArray(raw.members)) {
    dropped.push('members is not an array')
  } else {
    for (const entry of raw.members) {
      const member = normalizeMember(entry)
      if (!member) {
        const label = typeof entry?.sessionId === 'string' ? entry.sessionId.slice(0, 40) : '(unknown)'
        dropped.push(`invalid member ${label}`)
        continue
      }
      members.push(member)
    }
  }

  const aliases = new Set()
  const sessionIds = new Set()
  const uniqueMembers = []
  for (const member of members) {
    const alias = fold(member.alias)
    if (aliases.has(alias) || sessionIds.has(member.sessionId)) {
      dropped.push(`duplicate member @${member.alias}`)
      continue
    }
    aliases.add(alias)
    sessionIds.add(member.sessionId)
    uniqueMembers.push(member)
  }
  if (uniqueMembers.length === 0 || !sessionIds.has(ownerSessionId)) {
    return { group: undefined, dropped: [...dropped, 'owner is not a member'] }
  }

  const messages = Array.isArray(raw.messages) ? raw.messages.map(normalizeTranscriptMessage).filter(Boolean) : []
  // Control rows are the human audit trail. Keep them longer than the chat
  // transcript so a secretary/delegation record is not lost when messages trim.
  // An empty audit array on a legacy document must not hide control rows
  // that only exist in the transcript.
  const auditSource = Array.isArray(raw.audit) && raw.audit.length > 0
    ? raw.audit
    : messages.filter((message) => message.kind === 'control')
  const audit = auditSource
    .map((entry) => normalizeTranscriptMessage({ ...entry, kind: 'control' }))
    .filter((entry) => entry && entry.kind === 'control')
    .slice(-Math.max(200, historyLimit))
  const status = raw.status === 'dissolved' ? 'dissolved' : 'active'
  const sensitivity = SENSITIVITIES.includes(raw.sensitivity) ? raw.sensitivity : 'internal'
  const breaker = isRecord(raw.breaker)
    ? {
      windowStart: timeOf(raw.breaker.windowStart, 0),
      broadcasts: typeof raw.breaker.broadcasts === 'number' && raw.breaker.broadcasts >= 0 ? Math.trunc(raw.breaker.broadcasts) : 0,
    }
    : undefined
  const group = {
    id: raw.id,
    name,
    topic,
    ownerSessionId,
    status,
    sensitivity,
    createdAt: timeOf(raw.createdAt),
    updatedAt: timeOf(raw.updatedAt, timeOf(raw.createdAt)),
    ...(status === 'dissolved' ? { dissolvedAt: timeOf(raw.dissolvedAt, Date.now()) } : {}),
    ...(raw.paused === true ? { paused: true } : {}),
    ...(breaker === undefined ? {} : { breaker }),
    members: uniqueMembers,
    messages,
    audit,
  }
  trimTranscript(group, historyLimit)
  return { group, dropped }
}

/**
 * Validate a state document read from disk.
 * @returns {{state: object, issues: string[], lossy: boolean}} safe state, diagnostics and whether anything was dropped.
 */
export function normalizeState(raw, { historyLimit = 100 } = {}) {
  const issues = []
  if (!isRecord(raw) || !isRecord(raw.groups)) {
    return { state: emptyState(), issues: ['state document is not an object with a groups map'], lossy: true }
  }
  let lossy = false
  const groups = {}
  for (const [id, value] of Object.entries(raw.groups)) {
    const { group, dropped } = normalizeGroup(value, historyLimit)
    if (!group || group.id !== id) {
      issues.push(`skipped invalid group "${id}"`)
      lossy = true
      continue
    }
    for (const reason of dropped) {
      issues.push(`group "${id}" dropped ${reason}`)
      lossy = true
    }
    groups[id] = group
  }
  const relays = {}
  if (isRecord(raw.relays)) {
    for (const [id, value] of Object.entries(raw.relays)) {
      const relay = normalizeRelay(value)
      if (!relay || relay.id !== id) {
        // A malformed relay is transient coordination state; dropping it must
        // not turn the whole room store read-only.
        issues.push(`skipped invalid relay "${id}"`)
        continue
      }
      relays[id] = relay
    }
  }
  return {
    state: { version: STATE_VERSION, groups, usage: normalizeUsage(raw.usage), relays, gate: normalizeGate(raw.gate) },
    issues,
    lossy,
  }
}

/**
 * Keep the transcript bounded without letting control rows (notes, delegation
 * receipts) evict the actual conversation. Chat/system rows keep the last
 * `historyLimit`; control rows keep the last CONTROL_TRANSCRIPT_LIMIT. The full
 * control history remains in `group.audit`.
 */
export function trimTranscript(group, historyLimit) {
  const limit = Number.isFinite(historyLimit) && historyLimit > 0 ? Math.trunc(historyLimit) : 100
  const controls = new Set(
    group.messages
      .filter((message) => message.kind === 'control')
      .slice(-CONTROL_TRANSCRIPT_LIMIT)
      .map((message) => message.id),
  )
  const kept = []
  let regular = 0
  for (let index = group.messages.length - 1; index >= 0; index -= 1) {
    const message = group.messages[index]
    if (message.kind === 'control') {
      if (controls.has(message.id)) kept.push(message)
      continue
    }
    regular += 1
    if (regular <= limit) kept.push(message)
  }
  group.messages = kept.reverse()
}

/** Append one system transcript line and keep the transcript bounded. */
export function appendSystem(group, actorAlias, text, historyLimit, at = Date.now()) {
  group.messages.push({
    id: newMessageId(),
    kind: 'system',
    at,
    text,
    ...(actorAlias ? { fromAlias: actorAlias } : {}),
    deliveries: [],
  })
  trimTranscript(group, historyLimit)
  group.updatedAt = at
}

/**
 * Append one machine-readable control entry: delegation, note, supersede or
 * another audit event. The human panel renders these in the audit view; model
 * tools can read them as transcript rows. They are deliberately separate from
 * chat messages so a log line can never be mistaken for a peer instruction.
 */
export function appendControl(group, actorAlias, entry, historyLimit, at = Date.now(), { transcript = true } = {}) {
  const text = typeof entry.text === 'string' && entry.text.trim() ? entry.text.trim().slice(0, MAX_CONTROL) : ''
  if (!text) throw new GroupError('empty-control', 'Control entry text is required.')
  const row = {
    id: newMessageId(),
    kind: 'control',
    at,
    text,
    ...(actorAlias ? { fromAlias: actorAlias } : {}),
    ...(entry.fromSessionId ? { fromSessionId: String(entry.fromSessionId).slice(0, 200) } : {}),
    ...(entry.action ? { action: String(entry.action).slice(0, 40) } : {}),
    ...(entry.taskId ? { taskId: String(entry.taskId).slice(0, 80) } : {}),
    ...(entry.outcome ? { outcome: String(entry.outcome).slice(0, 40) } : {}),
    ...(entry.reason ? { reason: String(entry.reason).slice(0, 240) } : {}),
    ...(entry.target ? { target: String(entry.target).slice(0, 80) } : {}),
    ...(entry.parentRequestId ? { parentRequestId: String(entry.parentRequestId).slice(0, 120) } : {}),
    ...(entry.supersededBy ? { supersededBy: String(entry.supersededBy).slice(0, 120) } : {}),
    deliveries: [],
  }
  if (transcript) {
    group.messages.push(row)
    trimTranscript(group, historyLimit)
  }
  if (!Array.isArray(group.audit)) group.audit = []
  group.audit.push(row)
  const auditLimit = Math.max(200, historyLimit)
  if (group.audit.length > auditLimit) group.audit.splice(0, group.audit.length - auditLimit)
  group.updatedAt = at
}

/** Compact view for prompt/tool/UI consumers. */
export function viewOfGroup(group, viewerSessionId, { messageLimit = Number.POSITIVE_INFINITY, auditLimit = 0 } = {}) {
  const stored = group.members.find((member) => member.sessionId === viewerSessionId)
  // Legacy groups predate the human operator; the panel still needs a `me`.
  const me = stored ?? (viewerSessionId === HUMAN_SESSION
    ? { sessionId: HUMAN_SESSION, alias: 'human', role: 'human', duties: '' }
    : undefined)
  const bounded = Number.isFinite(messageLimit) && messageLimit >= 0 ? group.messages.slice(-messageLimit) : group.messages
  const audit = Array.isArray(group.audit) ? group.audit : []
  const auditRows = Number.isFinite(auditLimit) && auditLimit > 0 ? audit.slice(-Math.trunc(auditLimit)) : []
  return {
    id: group.id,
    name: group.name,
    topic: group.topic,
    status: group.status,
    sensitivity: group.sensitivity ?? 'internal',
    paused: group.paused === true,
    ownerSessionId: group.ownerSessionId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    ...(group.dissolvedAt === undefined ? {} : { dissolvedAt: group.dissolvedAt }),
    members: copy(group.members),
    messages: copy(bounded),
    audit: copy(auditRows),
    auditTotal: audit.length,
    messageTotal: group.messages.length,
    messagesShown: bounded.length,
    hasOlder: bounded.length < group.messages.length,
    ...(me === undefined ? {} : {
      me: {
        sessionId: me.sessionId,
        alias: me.alias,
        role: me.role,
        duties: me.duties,
        organizer: me.organizer === true,
        isOwner: me.sessionId === group.ownerSessionId || me.sessionId === HUMAN_SESSION,
      },
    }),
  }
}

/** Dedicated, paginated audit view. The panel asks for this instead of every poll. */
export function auditViewOfGroup(group, limit = 80) {
  const bounded = Number.isFinite(limit) ? Math.min(Math.max(1, Math.trunc(limit)), 200) : 80
  const audit = Array.isArray(group.audit) ? group.audit : []
  return {
    group: { id: group.id, name: group.name, status: group.status },
    audit: copy(audit.slice(-bounded)),
    total: audit.length,
  }
}

/** Whether another group already uses this name (case/width folded). */
export function nameTaken(groups, name, excludeId = '') {
  const folded = fold(name)
  return groups.some((group) => group.id !== excludeId && fold(group.name) === folded)
}

/**
 * Retention (S16): drop chat rows older than `retentionDays` from every group's
 * live transcript. The compact audit trail is kept, so "who decided what" does
 * not silently disappear with the conversation.
 */
export function pruneRetention(state, { now = Date.now(), retentionDays = 0 } = {}) {
  const days = Number.isFinite(retentionDays) ? Math.trunc(retentionDays) : 0
  if (days <= 0) return { removed: 0, groups: 0 }
  const cutoff = now - days * 24 * 60 * 60 * 1000
  let removed = 0
  let groups = 0
  for (const group of Object.values(state.groups ?? {})) {
    const before = group.messages.length
    group.messages = group.messages.filter((message) => !(message.kind !== 'control' && message.at < cutoff))
    const lost = before - group.messages.length
    if (lost > 0) {
      groups += 1
      removed += lost
    }
    // Audit rows are compact and are the durable "what happened" record; the
    // retention window trims the conversation, not the accountability trail.
  }
  return { removed, groups }
}

/**
 * Redact one transcript row without losing the fact that it existed.
 * Returns the row, or undefined when it is gone.
 */
export function redactMessage(group, messageId, now = Date.now()) {
  const message = group.messages.find((entry) => entry.id === messageId)
  if (!message || message.redacted === true) return undefined
  const digest = createHash('sha256').update(String(message.text ?? '')).digest('hex').slice(0, 12)
  message.redacted = true
  message.text = `[redacted sha256:${digest}]`
  message.deliveries = []
  if (Array.isArray(group.audit)) {
    group.audit.push({
      id: newMessageId(),
      kind: 'control',
      at: now,
      text: `Message ${message.id} was redacted (sha256:${digest}).`,
      action: 'redact',
      outcome: 'redacted',
      deliveries: [],
    })
    if (group.audit.length > 400) group.audit.splice(0, group.audit.length - 400)
  }
  group.updatedAt = now
  return message
}

/** Small, privacy-safe counters used by the panel header and the digest. */
export function groupActivity(group, now = Date.now()) {
  const messages = group.messages.filter((message) => message.kind === 'message')
  const cutoff = now - 24 * 60 * 60 * 1000
  const today = messages.filter((message) => message.at >= cutoff)
  const waiting = messages.filter((message) => (message.deliveries ?? []).some((delivery) => delivery.status === 'pending' || delivery.status === 'delivered'))
  return {
    messages: messages.length,
    today: today.length,
    control: (group.audit ?? []).length,
    waiting: waiting.length,
    lastAt: messages.at(-1)?.at ?? group.updatedAt,
  }
}

/** Resolve a human/UI group reference by id, exact name, then unique name prefix. */
export function resolveGroupReference(groups, reference) {
  const ref = typeof reference === 'string' ? reference.trim() : ''
  if (ref) {
    const byId = groups.find((group) => group.id === ref)
    if (byId) return byId
    const folded = fold(ref)
    const exact = groups.filter((group) => fold(group.name) === folded)
    if (exact.length === 1) return exact[0]
    if (exact.length > 1) {
      throw new GroupError(
        'ambiguous-group',
        `More than one group is named "${ref}"; use the group id (${exact.map((group) => group.id).join(', ')}).`,
        { params: { ref } },
      )
    }
    const prefix = groups.filter((group) => fold(group.name).startsWith(folded) || group.id.startsWith(ref))
    if (prefix.length === 1) return prefix[0]
    if (prefix.length > 1) {
      throw new GroupError(
        'ambiguous-group',
        `Group reference "${ref}" matches more than one group (${prefix.map((group) => `${group.name} ${group.id}`).join('; ')}); use the exact name or id.`,
        { params: { ref } },
      )
    }
    throw new GroupError('group-not-found', `Group "${ref}" was not found for this session.`)
  }
  if (groups.length === 1) return groups[0]
  if (groups.length === 0) throw new GroupError('group-not-found', 'This session does not belong to any group.')
  throw new GroupError('group-required', 'This session belongs to more than one group; specify the group name or id.')
}

/**
 * Serialized, atomic JSON store.
 *
 * Every mutation receives a deep draft, and only a settled write replaces the
 * in-memory state. Concurrent callers queue instead of overwriting each other.
 */
export class GroupStore {
  /**
   * @param {object} options
   * @param {string} options.file absolute JSON path
   * @param {number} [options.historyLimit]
   * @param {(message: string) => void} [options.log]
   */
  constructor({ file, historyLimit = 100, log = () => {}, lock = false }) {
    this.file = file
    this.historyLimit = historyLimit
    this.log = log
    this.state = emptyState()
    this.chain = Promise.resolve()
    this.loaded = false
    this.loadFailure = undefined
    this.lock = lock === true
    this.lockFile = `${file}.lock`
    this.ownsLock = false
    this.ready = this.#load()
  }

  /** Whether another live process currently owns the data file. */
  async #acquireLock() {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 }).catch(() => {})
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await writeFile(this.lockFile, `${JSON.stringify({ pid: process.pid, startedAt: Date.now() })}\n`, {
          encoding: 'utf8',
          mode: 0o600,
          flag: 'wx',
        })
        this.ownsLock = true
        return
      } catch (error) {
        if (error?.code !== 'EEXIST') {
          this.log(`state: could not create lock file: ${error instanceof Error ? error.message : String(error)}`)
          return
        }
        let holder = null
        try {
          holder = JSON.parse(await readFile(this.lockFile, 'utf8'))
        } catch {}
        const pid = Number(holder?.pid)
        let alive = false
        if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
          try {
            process.kill(pid, 0)
            alive = true
          } catch (probe) {
            alive = probe?.code === 'EPERM'
          }
        }
        if (alive) {
          this.loadFailure = new GroupError(
            'store-locked',
            `Another Group-Talk-L process (pid ${pid}) owns ${this.file}; this instance is read-only.`,
          )
          this.log(`state: data file is owned by a live process (pid ${pid}); running read-only`)
          return
        }
        await rm(this.lockFile, { force: true }).catch(() => {})
      }
    }
  }

  /** Release the advisory lock (idempotent). */
  async dispose() {
    if (!this.ownsLock) return
    this.ownsLock = false
    await rm(this.lockFile, { force: true }).catch(() => {})
  }

  /** Move a document that is not usable JSON aside, preserving it for inspection. */
  async #preserveCorrupt(error) {
    const detail = error instanceof Error ? error.message : String(error)
    const backup = `${this.file}.corrupt-${Date.now()}`
    try {
      await rename(this.file, backup)
      this.log(`state: moved unreadable store to ${backup}: ${detail}`)
      this.state = emptyState()
    } catch (renameError) {
      this.loadFailure = renameError
      this.log(`state: unreadable store and backup failed: ${renameError instanceof Error ? renameError.message : String(renameError)}`)
    }
  }

  async #load() {
    if (this.lock) await this.#acquireLock()
    let raw
    try {
      raw = await readFile(this.file, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.loaded = true
        return this.state
      }
      // A read failure is not an empty store: keeping the previous bytes is
      // more important than making the plugin appear ready.
      this.loadFailure = error
      this.log(`state: could not read store: ${error instanceof Error ? error.message : String(error)}`)
      this.loaded = true
      return this.state
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      await this.#preserveCorrupt(error)
      this.loaded = true
      return this.state
    }
    const { state, issues, lossy } = normalizeState(parsed, { historyLimit: this.historyLimit })
    if (issues.some((issue) => issue.startsWith('state document'))) {
      await this.#preserveCorrupt(new Error(issues.join('; ')))
      this.loaded = true
      return this.state
    }
    this.state = state
    for (const issue of issues) this.log(`state: ${issue}`)
    if (lossy) {
      // Never persist a state we know lost members or groups. The file is left
      // untouched so the operator can repair it; reads still show valid rooms.
      this.loadFailure = new GroupError(
        'store-unavailable',
        'The Group-Talk-L store has invalid members or groups; refusing to overwrite it. Fix or move the data file.',
      )
      this.log('state: refusing to write because loading dropped data')
    }
    this.loaded = true
    return this.state
  }

  async #persist(state) {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 })
    await chmod(dirname(this.file), 0o700).catch(() => {})
    const temporary = `${this.file}.tmp-${process.pid}-${randomUUID().slice(0, 8)}`
    try {
      await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      await rename(temporary, this.file)
      await chmod(this.file, 0o600).catch(() => {})
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {})
      throw error
    }
  }

  /**
   * Apply one mutation under the store's write lock.
   * @template T
   * @param {(draft: object) => T | Promise<T>} mutate
   * @returns {Promise<T>} the mutator's result, after the document is durable
   */
  async write(mutate) {
    await this.ready
    if (this.loadFailure !== undefined) {
      if (this.loadFailure instanceof GroupError) throw this.loadFailure
      throw new GroupError('store-unavailable', 'The Group-Talk-L store is not safe to overwrite; fix or move the data file.')
    }
    const run = this.chain.then(async () => {
      const draft = copy(this.state)
      const result = await mutate(draft)
      await this.#persist(draft)
      this.state = draft
      return result
    })
    this.chain = run.then(() => undefined, () => undefined)
    return run
  }

  /** Snapshot of the committed state. */
  snapshot() {
    return copy(this.state)
  }

  /** All groups holding one session, active first, then most recently updated. */
  groupsFor(sessionId) {
    const all = Object.values(this.state.groups)
    // The human operator is a member of every group by definition: the panel
    // and `/group` commands act for the person, not for a session.
    const visible = sessionId === HUMAN_SESSION
      ? all
      : all.filter((group) => group.members.some((member) => member.sessionId === sessionId))
    return visible.sort((left, right) => {
      if (left.status !== right.status) return left.status === 'active' ? -1 : 1
      return right.updatedAt - left.updatedAt
    })
  }

  /** One group by id, without an access decision. */
  get(id) {
    return this.state.groups[id]
  }
}

/** A path is absolute and inside no workspace; tests use this to assert config. */
export function isAbsoluteDataPath(path) {
  return typeof path === 'string' && isAbsolute(path)
}
