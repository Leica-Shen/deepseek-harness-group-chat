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
  GroupError,
  HUMAN_SESSION,
  newGroupId,
  newMessageId,
  normalizeAlias,
  normalizeDuties,
  normalizeMessage,
  normalizeName,
  normalizeRole,
  normalizeSessionId,
  normalizeTopic,
  resolveGroupReference,
  viewOfGroup,
} from './store.js'
import { DEFAULTS } from './config.js'
import { buildDeliveryEnvelope } from './policy.js'
import { chargeSend, usageView } from './guard.js'

const DEFAULT_ROLE = 'member'
const OWNER_ROLE = 'owner'
/** Roles allowed to write an audited note / delegate a subagent. */
const NOTE_ROLES = new Set(['secretary', '秘书', 'organizer', '组织者', 'owner'])
const DELEGATE_ROLES = new Set(['organizer', '组织者', 'owner'])
/** Group tools a delegated subagent must never acquire. */
const DELEGATION_DENY = [
  'group_talk_list', 'group_talk_send', 'group_talk_history', 'group_talk_leave',
  'group_talk_manage', 'group_talk_create', 'group_talk_note', 'group_talk_delegate',
]
/** Synthetic member used when the human operator addresses a legacy group. */
const HUMAN_MEMBER = Object.freeze({ sessionId: HUMAN_SESSION, alias: 'human', role: 'human', duties: '' })

/** Case-fold an alias or role. */
function fold(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('en-US')
}

/** True when a member holds one of the allowed roles. */
function hasRole(member, roles) {
  if (member?.sessionId === HUMAN_SESSION) return true
  return roles.has(fold(member?.role ?? ''))
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
 */
function assertGroupCapacity(draft, memberIds, config) {
  if (Object.keys(draft.groups).length >= config.maxGroupsTotal) {
    throw new GroupError('too-many-groups', `This Host has reached the total group limit (${config.maxGroupsTotal}). Delete a group before creating another.`)
  }
  for (const sessionId of new Set(memberIds)) {
    if (sessionId === HUMAN_SESSION) continue
    if (activeGroupCount(draft, sessionId) >= config.maxGroupsPerSession) {
      throw new GroupError('too-many-groups', `Session "${sessionId}" already belongs to ${config.maxGroupsPerSession} active groups.`)
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
  return {
    sessionId,
    alias: normalizeAlias(raw.alias || fallbackAlias),
    role: normalizeRole(raw.role, fallbackRole),
    duties: normalizeDuties(raw.duties),
    joinedAt: Date.now(),
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
    const role = fold(selector.value)
    members = group.members.filter((member) => member.sessionId !== senderSessionId && fold(member.role) === role)
    if (members.length === 0) {
      const roles = [...new Set(group.members.map((member) => member.role))].join(', ')
      throw new GroupError('role-not-found', `No other member in "${group.name}" has role "${selector.value}". Roles: ${roles}.`)
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
  return { sessionId: member.sessionId, alias: member.alias, status: 'pending' }
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
  constructor({ store, ctx, config, log = () => {}, onMembershipChanged = () => {}, now = () => Date.now() }) {
    this.store = store
    this.ctx = ctx
    this.config = { ...DEFAULTS, ...config }
    this.log = log
    this.onMembershipChanged = onMembershipChanged
    this.now = now
    this.readHistory = new Map()
    // Reconciliation is best-effort: a store write failure must not take the
    // whole plugin down, because `ready()` gates the HTTP route and the tools.
    this.readyPromise = store.ready.then(() => this.#reconcilePending().catch((error) => {
      this.log('could not reconcile stale pending deliveries', error)
    }))
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

  /** Wait for the durable state to be read. */
  ready() {
    return this.readyPromise
  }

  /** Mark deliveries stranded by a process exit as unknown, never pending forever. */
  async #reconcilePending() {
    // This process has just loaded the store: no delivery can still be in
    // flight here, so every pending row is stranded by a previous process.
    // Age does not matter — a fast restart used to leave fresh rows pending
    // forever. Multi-process hosts are out of scope (documented).
    const mark = []
    for (const group of Object.values(this.store.state.groups)) {
      for (const message of group.messages) {
        for (const delivery of message.deliveries) {
          if (delivery.status !== 'pending') continue
          mark.push({ group, message, delivery })
        }
      }
    }
    if (mark.length === 0) return
    await this.store.write((draft) => {
      for (const { group, message, delivery } of mark) {
        const current = draft.groups[group.id]?.messages?.find((entry) => entry.id === message.id)
        const row = current?.deliveries?.find((entry) => entry.sessionId === delivery.sessionId)
        if (row && row.status === 'pending') row.status = 'unknown'
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

  /** Non-secret limits shown beside the composer. */
  limitsForClient() {
    return {
      maxMessageChars: this.config.maxMessageChars,
      maxRecipientsPerSend: this.config.maxRecipientsPerSend,
      sendCooldownMs: this.config.sendCooldownMs,
      dedupeWindowMs: this.config.dedupeWindowMs,
      dailyMessagesPerSender: this.config.dailyMessagesPerSender,
      dailyEstimatedTokensPerSender: this.config.dailyEstimatedTokensPerSender,
      assumedTokensPerDelivery: this.config.assumedTokensPerDelivery,
      replyNudgeAfterMs: this.config.replyNudgeAfterMs,
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
    const controller = this.ctx.get('sessionController')
    if (typeof controller?.list !== 'function') return
    try {
      const value = await controller.list({}, AbortSignal.timeout(5000))
      const items = new Map((value?.items ?? []).map((item) => [String(item.sessionId), item]))
      const missing = unique.filter((id) => !items.has(id))
      if (missing.length > 0) {
        throw new GroupError('session-not-found', `Session "${missing[0]}" is not a visible session in this Host.`)
      }
      const subagent = unique.find((id) => {
        const item = items.get(id)
        return item?.origin === 'subagent'
      })
      if (subagent !== undefined) {
        throw new GroupError('session-not-ordinary', `Session "${subagent}" is a subagent session; groups address ordinary sessions only.`)
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
      throw new GroupError('too-many-members', `A group can have at most ${this.config.maxMembersPerGroup} members.`)
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
      push(memberInput(ownerInput ?? { sessionId: owner, alias: 'owner' }, 'owner', OWNER_ROLE))
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
      assertGroupCapacity(draft, members.map((member) => member.sessionId), this.config)
      const group = {
        id,
        name,
        topic,
        ownerSessionId: human ? HUMAN_SESSION : owner,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        members,
        messages: [],
      }
      appendSystem(group, members[0].alias, `Group "${name}" created by @${members[0].alias}.`, this.config.historyLimit)
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
      { sessionId, alias: request.alias, role: request.role, duties: request.duties },
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
      appendSystem(current, requireOwner(current, callerSessionId).alias, `@${member.alias} joined with role "${member.role}".`, this.config.historyLimit)
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
      appendSystem(current, actor?.alias, `@${member.alias} left the group.`, this.config.historyLimit)
    })
    this.onMembershipChanged([...group.members.map((entry) => entry.sessionId)])
    return viewOfGroup(this.store.get(group.id), callerSessionId)
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
      appendSystem(current, member.alias, `@${member.alias} left the group.`, this.config.historyLimit)
    })
    this.onMembershipChanged([...group.members.map((entry) => entry.sessionId)])
    return { group: viewOfGroup(this.store.get(group.id), callerSessionId), alias: member.alias }
  }

  /** Assign a role (and optional duties) to one member. Owner only. */
  async setRole(callerSessionId, reference, memberReference, role, duties) {
    const group = this.resolveFor(callerSessionId, reference)
    requireOwner(group, callerSessionId)
    const member = findMember(group, memberReference)
    if (!member) throw new GroupError('member-not-found', 'That alias does not belong to this group.')
    const nextRole = normalizeRole(role, member.role)
    const nextDuties = duties === undefined ? member.duties : normalizeDuties(duties)
    if (nextRole === member.role && nextDuties === member.duties) {
      return viewOfGroup(group, callerSessionId)
    }
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      const currentOwner = requireOwner(current, callerSessionId)
      const target = current.members.find((entry) => entry.sessionId === member.sessionId)
      if (!target) throw new GroupError('member-not-found', 'That member is no longer in the group.')
      target.role = nextRole
      target.duties = nextDuties
      appendSystem(current, currentOwner.alias, `@${target.alias} is now "${nextRole}".`, this.config.historyLimit)
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
      current.name = nextName
      appendSystem(current, owner.alias, `Group renamed to "${nextName}".`, this.config.historyLimit)
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
      current.dissolvedAt = Date.now()
      appendSystem(current, owner.alias, `Group dissolved by @${owner.alias}. Membership and transcript are now read-only.`, this.config.historyLimit)
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
      delete draft.groups[group.id]
    })
    this.onMembershipChanged(memberIds)
    return deleted
  }

  /** Read a bounded transcript. Any member (active or dissolved) may read. */
  history(callerSessionId, reference, limit = 20) {
    const group = this.resolveFor(callerSessionId, reference, { activeOnly: false })
    const bounded = Math.min(Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : 20), 100)
    return {
      group: {
        id: group.id,
        name: group.name,
        status: group.status,
      },
      messages: group.messages.slice(-bounded),
      total: group.messages.length,
    }
  }

  /**
   * Append and deliver one group message.
   * @param {string} callerSessionId
   * @param {{group?: string, target: string, message: string}} request
   */
  async send(callerSessionId, request = {}) {
    const group = this.resolveFor(callerSessionId, request.group)
    const caller = requireMember(group, callerSessionId)
    const text = normalizeMessage(request.message)
    if (text.length > this.config.maxMessageChars) {
      throw new GroupError('message-too-long', `Group messages are limited to ${this.config.maxMessageChars} characters.`)
    }
    const { selector, members } = resolveTargets(group, callerSessionId, request.target)
    const deliveryMode = request.mode === 'queue' || request.mode === 'steer' ? request.mode : this.config.deliveryMode
    if (members.length > this.config.maxRecipientsPerSend) {
      throw new GroupError(
        'fanout-exceeded',
        `That target resolves to ${members.length} recipients; the per-message fan-out limit is ${this.config.maxRecipientsPerSend}. Use a direct @alias.`,
      )
    }
    const now = this.now()
    const fingerprint = dedupeKey(text)

    const prepared = await this.store.write((draft) => {
      const current = draft.groups[group.id]
      if (current.status !== 'active') throw new GroupError('group-dissolved', 'This group is dissolved and read-only.')
      const sender = requireMember(current, callerSessionId)
      const targets = resolveTargets(current, callerSessionId, selector.label)

      // Duplicate suppression is deliberately scoped to one sender, target and
      // body inside a short window. A repeated tool call therefore does not
      // wake the same sessions twice, while an intentional message after the
      // window still works.
      const duplicate = this.config.dedupeWindowMs > 0
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
        return {
          deduplicated: true,
          messageId: duplicate.id,
          targets: [],
          deliveries: duplicate.deliveries,
        }
      }

      const envelopeChars = Math.max(...targets.members.map((target) => (
        buildDeliveryEnvelope(current, sender, target, { text }).length
      )))
      const charge = chargeSend({
        state: draft,
        now,
        groupId: current.id,
        senderSessionId: callerSessionId,
        targets: targets.members,
        text,
        envelopeChars,
        limits: this.config,
      })
      const message = {
        id: newMessageId(),
        kind: 'message',
        at: now,
        fromSessionId: callerSessionId,
        fromAlias: sender.alias,
        target: selector.label,
        text,
        estimatedTokens: charge.estimatedTokens,
        deliveries: targets.members.map(deliveryRow),
      }
      current.messages.push(message)
      if (current.messages.length > this.config.historyLimit) {
        current.messages.splice(0, current.messages.length - this.config.historyLimit)
      }
      current.updatedAt = message.at
      return {
        deduplicated: false,
        messageId: message.id,
        targets: targets.members.map((member) => ({ ...member })),
        deliveries: undefined,
        estimatedTokens: charge.estimatedTokens,
      }
    })

    if (prepared.deduplicated) {
      const current = this.store.get(group.id)
      const deliveries = prepared.deliveries ?? []
      if (!current) {
        return {
          group: { id: group.id, name: group.name, status: 'deleted' },
          messageId: prepared.messageId,
          target: selector.label,
          deliveries,
          failures: deliveries.filter((delivery) => delivery.status === 'failed'),
          text,
          deduplicated: true,
          estimatedTokens: 0,
        }
      }
      return {
        group: viewOfGroup(current, callerSessionId, { messageLimit: 4 }),
        messageId: prepared.messageId,
        target: selector.label,
        deliveries,
        failures: deliveries.filter((delivery) => delivery.status === 'failed'),
        text,
        deduplicated: true,
        estimatedTokens: 0,
      }
    }

    const deliveries = await this.#deliver(group, prepared.messageId, caller, text, prepared.targets, deliveryMode)
    const latest = this.store.get(group.id)
    if (!latest) {
      // The room was deleted while delivery was in flight. The accepted message
      // is gone with it; report the accepted id instead of throwing a 500.
      return {
        group: { id: group.id, name: group.name, status: 'deleted' },
        messageId: prepared.messageId,
        target: selector.label,
        deliveries,
        failures: deliveries.filter((delivery) => delivery.status === 'failed'),
        text,
        deduplicated: false,
        estimatedTokens: prepared.estimatedTokens ?? 0,
      }
    }
    return {
      group: viewOfGroup(latest, callerSessionId, { messageLimit: 4 }),
      messageId: prepared.messageId,
      target: selector.label,
      deliveries,
      failures: deliveries.filter((delivery) => delivery.status === 'failed'),
      text,
      deduplicated: false,
      estimatedTokens: prepared.estimatedTokens ?? 0,
    }
  }

  /** Deliver one accepted message; delivery failures never roll back the transcript. */
  async #deliver(group, messageId, sender, text, targets, mode = this.config.deliveryMode) {
    const controller = this.ctx.get('sessionController')
    const results = await Promise.all(targets.map(async (target) => {
      if (!this.store.get(group.id)) {
        // A concurrent delete removed the room after the message was accepted.
        return { sessionId: target.sessionId, alias: target.alias, status: 'failed', error: 'Group was deleted before delivery.' }
      }
      if (target.sessionId === HUMAN_SESSION) {
        // No session to wake: the message is recorded in the room for the person.
        return { sessionId: target.sessionId, alias: target.alias, status: 'in-room' }
      }
      if (typeof controller?.prompt !== 'function') {
        return { sessionId: target.sessionId, alias: target.alias, status: 'failed', error: 'Session delivery is unavailable in this profile.' }
      }
      try {
        await controller.prompt({
          requestId: `group-talk-l:${messageId}:${target.sessionId}`,
          sessionId: target.sessionId,
          mode,
          content: [{ type: 'text', text: buildDeliveryEnvelope(group, sender, target, { text }) }],
        }, AbortSignal.timeout(30000))
        return { sessionId: target.sessionId, alias: target.alias, status: 'delivered' }
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

    try {
      await this.store.write((draft) => {
        const current = draft.groups[group.id]
        if (!current) return
        const message = current.messages.find((entry) => entry.id === messageId)
        if (!message) return
        message.deliveries = results.map(({ sessionId, alias, status, error }) => ({
          sessionId,
          alias,
          status,
          ...(error === undefined ? {} : { error }),
        }))
        current.updatedAt = Date.now()
      })
    } catch (error) {
      this.log('could not persist delivery receipts', error)
    }
    return results
  }

  /** Record one audited note (secretary/organizer/human only). */
  async note(callerSessionId, reference, text) {
    const group = this.resolveFor(callerSessionId, reference)
    const member = requireMember(group, callerSessionId)
    if (!this.config.allowAgentNote) {
      throw new GroupError('note-disabled', 'Audited notes are disabled for model tools in this profile.')
    }
    if (!hasRole(member, NOTE_ROLES)) {
      throw new GroupError('role-required', 'Only a secretary, organizer or the human operator can record a group note.')
    }
    const body = typeof text === 'string' ? text.replace(/\u0000/gu, '').trim().slice(0, 1000) : ''
    if (!body) throw new GroupError('empty-note', 'Note text is required.')
    await this.store.write((draft) => {
      const current = draft.groups[group.id]
      if (!current) throw new GroupError('group-not-found', 'The group no longer exists.')
      appendControl(current, member.alias, {
        fromSessionId: callerSessionId,
        action: 'note',
        outcome: 'recorded',
        text: body,
      }, this.config.historyLimit)
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
    if (!hasRole(member, DELEGATE_ROLES)) {
      throw new GroupError('role-required', 'Only an organizer, owner or the human operator can delegate a subagent.')
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
    dayStart.setUTCHours(0, 0, 0, 0)
    const today = group.messages.filter((message) => (
      message.kind === 'control'
      && message.action === 'delegate'
      && message.outcome === 'started'
      && message.fromSessionId === callerSessionId
      && message.at >= dayStart.getTime()
    )).length
    if (this.config.maxDelegationsPerDay <= 0 || today >= this.config.maxDelegationsPerDay) {
      throw new GroupError('delegation-quota', `Daily delegation budget reached (${this.config.maxDelegationsPerDay}).`)
    }

    const subagents = this.ctx.get('subagents')
    if (!subagents || typeof subagents.start !== 'function' || typeof subagents.list !== 'function') {
      throw new GroupError('delegation-unavailable', 'Subagent delegation is unavailable in this profile.')
    }
    const available = subagents.list()
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
      }, this.config.historyLimit)
    })

    const controller = new AbortController()
    let run
    try {
      run = await subagents.start(provider, {
        label,
        prompt: [{ type: 'text', text: task }],
        parent: parentAgent,
        signal: controller.signal,
        maxDepth: 0,
        toolFilter: { deny: DELEGATION_DENY },
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
        }, this.config.historyLimit)
      })
    } catch (error) {
      this.log('could not record delegation audit', error)
    }
  }

  /** Human-only entry point: delegate under the first live organizer. */
  async delegateForHuman(callerSessionId, reference, request = {}) {
    if (callerSessionId !== HUMAN_SESSION) {
      throw new GroupError('human-only', 'Only the human operator can start a panel delegation.')
    }
    const group = this.resolveFor(callerSessionId, reference)
    if (!this.config.allowAgentDelegate) {
      throw new GroupError('delegate-disabled', 'Subagent delegation is disabled in this profile.')
    }
    const organizer = group.members.find((member) => member.sessionId !== HUMAN_SESSION && hasRole(member, DELEGATE_ROLES))
    if (!organizer) {
      throw new GroupError('role-required', 'Add an organizer or owner participant before delegating.')
    }
    const agents = this.ctx.get('agents')
    const agent = typeof agents?.get === 'function' ? agents.get(organizer.sessionId) : undefined
    if (!agent) {
      throw new GroupError('delegation-unavailable', `Organizer @${organizer.alias} is not live; open its session or ask it to delegate.`)
    }
    return this.delegate(agent, callerSessionId, group.id, request)
  }

  /** Compact recap used by a newly installed scoped tool set. */
  membershipCount(sessionId) {
    return this.activeGroupsFor(sessionId).length
  }
}
