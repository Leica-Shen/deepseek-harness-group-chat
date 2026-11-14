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
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const STATE_VERSION = 1

/** Reserved sender id for the human operator. Session ids never look like this. */
export const HUMAN_SESSION = 'human'
export const ALIAS_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u
export const MAX_NAME = 64
export const MAX_TOPIC = 240
export const MAX_ROLE = 48
export const MAX_DUTIES = 400
export const MAX_MESSAGE = 4000

/** Stable, typed failure from the group domain. */
export class GroupError extends Error {
  /**
   * @param {string} code stable machine code
   * @param {string} message human-readable, already safe to show
   */
  constructor(code, message) {
    super(message)
    this.name = 'GroupError'
    this.code = code
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
  return { version: STATE_VERSION, groups: {}, usage: emptyUsage() }
}

/** One empty daily usage ledger. `day` is `YYYY-MM-DD` in UTC. */
export function emptyUsage(day = '') {
  return {
    day,
    senders: Object.create(null),
    groups: Object.create(null),
    targets: Object.create(null),
    lastSend: Object.create(null),
  }
}

/** Normalize one `{messages,deliveries,tokens}` counter. */
function normalizeCounter(raw) {
  if (!isRecord(raw)) return { messages: 0, deliveries: 0, tokens: 0 }
  const value = (candidate) => (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? Math.trunc(candidate) : 0)
  return { messages: value(raw.messages), deliveries: value(raw.deliveries), tokens: value(raw.tokens) }
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
    lastSend,
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
    return {
      sessionId: normalizeSessionId(raw.sessionId),
      alias: normalizeAlias(raw.alias),
      role: normalizeRole(raw.role),
      duties: normalizeDuties(raw.duties),
      joinedAt: timeOf(raw.joinedAt),
    }
  } catch {
    return undefined
  }
}

/** Normalize one persisted delivery record. */
function normalizeDelivery(raw) {
  if (!isRecord(raw) || typeof raw.sessionId !== 'string') return undefined
  const status = raw.status === 'delivered' || raw.status === 'failed' || raw.status === 'unknown' || raw.status === 'in-room' ? raw.status : 'pending'
  return {
    sessionId: raw.sessionId,
    alias: typeof raw.alias === 'string' ? raw.alias : '',
    status,
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
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newMessageId(),
    kind,
    at: timeOf(raw.at),
    text,
    ...(typeof raw.fromSessionId === 'string' ? { fromSessionId: raw.fromSessionId } : {}),
    ...(typeof raw.fromAlias === 'string' ? { fromAlias: raw.fromAlias } : {}),
    ...(typeof raw.target === 'string' ? { target: raw.target } : {}),
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
    deliveries,
  }
}

/** Normalize one persisted group. Invalid groups are skipped, never guessed at. */
function normalizeGroup(raw, historyLimit) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.startsWith('grp_')) return undefined
  let name
  let topic
  try {
    name = normalizeName(raw.name)
    topic = normalizeTopic(raw.topic)
  } catch {
    return undefined
  }
  const ownerSessionId = typeof raw.ownerSessionId === 'string' ? raw.ownerSessionId.trim() : ''
  if (!ownerSessionId) return undefined
  const members = Array.isArray(raw.members) ? raw.members.map(normalizeMember).filter(Boolean) : []
  const aliases = new Set()
  const sessionIds = new Set()
  const uniqueMembers = []
  for (const member of members) {
    const alias = fold(member.alias)
    if (aliases.has(alias) || sessionIds.has(member.sessionId)) continue
    aliases.add(alias)
    sessionIds.add(member.sessionId)
    uniqueMembers.push(member)
  }
  if (uniqueMembers.length === 0 || !sessionIds.has(ownerSessionId)) return undefined
  const messages = Array.isArray(raw.messages) ? raw.messages.map(normalizeTranscriptMessage).filter(Boolean) : []
  const status = raw.status === 'dissolved' ? 'dissolved' : 'active'
  return {
    id: raw.id,
    name,
    topic,
    ownerSessionId,
    status,
    createdAt: timeOf(raw.createdAt),
    updatedAt: timeOf(raw.updatedAt, timeOf(raw.createdAt)),
    ...(status === 'dissolved' ? { dissolvedAt: timeOf(raw.dissolvedAt, Date.now()) } : {}),
    members: uniqueMembers,
    messages: messages.slice(-historyLimit),
  }
}

/**
 * Validate a state document read from disk.
 * @returns {{state: object, issues: string[]}} a safe state and human diagnostics.
 */
export function normalizeState(raw, { historyLimit = 100 } = {}) {
  const issues = []
  if (!isRecord(raw) || !isRecord(raw.groups)) {
    return { state: emptyState(), issues: ['state document is not an object with a groups map'] }
  }
  const groups = {}
  for (const [id, value] of Object.entries(raw.groups)) {
    const group = normalizeGroup(value, historyLimit)
    if (!group || group.id !== id) {
      issues.push(`skipped invalid group "${id}"`)
      continue
    }
    groups[id] = group
  }
  return { state: { version: STATE_VERSION, groups, usage: normalizeUsage(raw.usage) }, issues }
}

/** Append one system transcript line and keep the transcript bounded. */
export function appendSystem(group, actorAlias, text, historyLimit) {
  group.messages.push({
    id: newMessageId(),
    kind: 'system',
    at: Date.now(),
    text,
    ...(actorAlias ? { fromAlias: actorAlias } : {}),
    deliveries: [],
  })
  if (group.messages.length > historyLimit) group.messages.splice(0, group.messages.length - historyLimit)
  group.updatedAt = Date.now()
}

/**
 * Append one machine-readable control entry: delegation, note, supersede or
 * another audit event. The human panel renders these in the audit view; model
 * tools can read them as transcript rows. They are deliberately separate from
 * chat messages so a log line can never be mistaken for a peer instruction.
 */
export function appendControl(group, actorAlias, entry, historyLimit) {
  const text = typeof entry.text === 'string' && entry.text.trim() ? entry.text.trim().slice(0, MAX_MESSAGE) : ''
  if (!text) throw new GroupError('empty-control', 'Control entry text is required.')
  group.messages.push({
    id: newMessageId(),
    kind: 'control',
    at: Date.now(),
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
  })
  if (group.messages.length > historyLimit) group.messages.splice(0, group.messages.length - historyLimit)
  group.updatedAt = Date.now()
}

/** Compact view for prompt/tool/UI consumers. */
export function viewOfGroup(group, viewerSessionId, { messageLimit = Number.POSITIVE_INFINITY } = {}) {
  const stored = group.members.find((member) => member.sessionId === viewerSessionId)
  // Legacy groups predate the human operator; the panel still needs a `me`.
  const me = stored ?? (viewerSessionId === HUMAN_SESSION
    ? { sessionId: HUMAN_SESSION, alias: 'human', role: 'human', duties: '' }
    : undefined)
  const bounded = Number.isFinite(messageLimit) && messageLimit >= 0 ? group.messages.slice(-messageLimit) : group.messages
  return {
    id: group.id,
    name: group.name,
    topic: group.topic,
    status: group.status,
    ownerSessionId: group.ownerSessionId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    ...(group.dissolvedAt === undefined ? {} : { dissolvedAt: group.dissolvedAt }),
    members: copy(group.members),
    messages: copy(bounded),
    messageTotal: group.messages.length,
    ...(me === undefined ? {} : {
      me: {
        sessionId: me.sessionId,
        alias: me.alias,
        role: me.role,
        duties: me.duties,
        isOwner: me.sessionId === group.ownerSessionId || me.sessionId === HUMAN_SESSION,
      },
    }),
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
      throw new GroupError('ambiguous-group', `More than one group is named "${ref}"; use the group id.`)
    }
    const prefix = groups.filter((group) => fold(group.name).startsWith(folded) || group.id.startsWith(ref))
    if (prefix.length === 1) return prefix[0]
    if (prefix.length > 1) {
      throw new GroupError('ambiguous-group', `Group reference "${ref}" matches more than one group; use the exact name or id.`)
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
  constructor({ file, historyLimit = 100, log = () => {} }) {
    this.file = file
    this.historyLimit = historyLimit
    this.log = log
    this.state = emptyState()
    this.chain = Promise.resolve()
    this.loaded = false
    this.loadFailure = undefined
    this.ready = this.#load()
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
    const { state, issues } = normalizeState(parsed, { historyLimit: this.historyLimit })
    if (issues.some((issue) => issue.startsWith('state document'))) {
      await this.#preserveCorrupt(new Error(issues.join('; ')))
      this.loaded = true
      return this.state
    }
    this.state = state
    for (const issue of issues) this.log(`state: ${issue}`)
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
      throw new GroupError('store-unavailable', 'The Group-Talk-L store could not be read; refusing to overwrite it.')
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
