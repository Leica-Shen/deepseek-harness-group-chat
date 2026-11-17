/**
 * group-talk-l — persistent cross-session groups for DeepSeek Harness.
 *
 * The Host half owns five things:
 *   1. a durable group/transcript store under `$DSH_HOME`,
 *   2. scoped `group_talk_*` tools plus one prompt section in every member
 *      Agent context, so a joined session immediately knows the protocol,
 *   3. the human `/group` command,
 *   4. an authenticated Web Fetch route used by the native-style header panel,
 *   5. delivery through the Session controller, which resumes an inactive
 *      member and admits one ordinary prompt into its own conversation.
 *
 * No external packages are imported: the plugin is installable as a plain
 * local bundle and does not rely on peer resolution outside the profile.
 */
import { createHash } from 'node:crypto'
import { GroupStore, GroupError, HUMAN_SESSION, MESSAGE_PURPOSES, normalizeSessionId, viewOfGroup } from './store.js'
import { GroupService } from './service.js'
import { resolveConfig } from './config.js'
import { buildGroupPolicy, buildHelp, oneLine } from './policy.js'
import { createGroupCommand } from './command.js'
import { errorPayload, normalizeLang } from './i18n.js'
import { VERSION } from './version.js'

export const name = 'group-talk-l'
export { VERSION }

const SEND_PURPOSES = new Set(MESSAGE_PURPOSES)
/** One mounted instance per data file; a duplicate row or hot reload must not create a second store. */
const ACTIVE_DATA_FILES = new Set()

/** The Host services the core cannot work without. */
export const inject = ['agents', 'tools', 'systemPrompt', 'commands']

/** The compact output declaration shared by the model-facing tools. */
const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: true,
    properties: {},
  },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
}

/** Resolve the exact caller supplied by a scoped tool discovery. */
function callingSession(exec, toolName) {
  const id = exec?.agent?.id
  if (typeof id !== 'string' || id.length === 0) throw new Error(`${toolName} requires a calling Agent.`)
  return id
}

/** Small JSON-safe view used in model-facing results. */
export function summarize(view, callerSessionId) {
  const me = view.members?.find((member) => member.sessionId === callerSessionId) ?? view.me
  const you = me === undefined ? undefined : {
    alias: me.alias,
    role: me.role,
    duties: me.duties,
    organizer: me.organizer === true,
    isOwner: me.isOwner ?? me.sessionId === view.ownerSessionId,
  }
  const recent = (view.messages ?? []).slice(-4).map((message) => {
    const text = oneLine(message.text, 240)
    const row = {
      kind: message.kind,
      text,
    }
    if (text !== message.text) row.truncated = true
    if (message.fromAlias !== undefined) row.from = message.fromAlias
    if (message.target !== undefined) row.target = message.target
    return row
  })
  return {
    id: view.id,
    name: view.name,
    ...(view.topic ? { topic: view.topic } : {}),
    status: view.status,
    sensitivity: view.sensitivity ?? 'internal',
    ...(view.paused === true ? { paused: true } : {}),
    owner: view.members?.find((member) => member.sessionId === view.ownerSessionId)?.alias,
    ...(you === undefined ? {} : { you }),
    members: (view.members ?? [])
      .filter((member) => member.sessionId !== HUMAN_SESSION)
      .map((member) => ({
        alias: member.alias,
        role: member.role,
      })),
    recent,
  }
}

/** Redact internal identities and raw failure detail from model-facing rows. */
export function publicDeliveries(deliveries = []) {
  return deliveries.map((delivery) => ({
    alias: delivery.alias,
    status: delivery.status,
    ...(delivery.status === 'in-room' || delivery.sessionId === HUMAN_SESSION ? { room: 'panel' } : {}),
    ...(delivery.error === undefined ? {} : { error: 'Delivery failed; see the Host log.' }),
  }))
}

/** One bounded, privacy-safe transcript entry for model tools. */
export function publicHistoryEntry(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    at: entry.at,
    text: entry.text,
    ...(entry.fromAlias === undefined ? {} : { from: entry.fromAlias }),
    ...(entry.target === undefined ? {} : { target: entry.target }),
    ...(entry.truncated === true ? { truncated: true } : {}),
    ...(Array.isArray(entry.deliveries) && entry.deliveries.length > 0 ? { deliveries: publicDeliveries(entry.deliveries) } : {}),
  }
}

/**
 * Keep a model-facing history result inside a character budget. Newest entries
 * win, long bodies are clipped, and the result records that it was bounded.
 */
export function boundedHistoryResult(result, maxChars) {
  const source = result.messages.slice(-40)
  const kept = []
  let remaining = Math.max(1000, maxChars) - 400
  for (let index = source.length - 1; index >= 0; index -= 1) {
    const entry = source[index]
    if (remaining < 160) break
    const room = Math.max(1, remaining - 160)
    const text = entry.text.length > room ? `${entry.text.slice(0, Math.max(0, room - 1))}…` : entry.text
    kept.unshift(publicHistoryEntry({ ...entry, text, ...(text.length < entry.text.length ? { truncated: true } : {}) }))
    remaining -= text.length + 200
  }
  return {
    ...result,
    messages: kept,
    truncated: kept.length < result.messages.length || kept.some((entry) => entry.truncated === true),
  }
}

/** Human-approval gate for model-initiated management. */
function requireAgentPermission(service, key, action) {
  if (service.config[key] === true) return
  throw new Error(`${action} is disabled for model tools in this profile; ask the user to use the Group chat panel or /group commands.`)
}

/** Build the six model-facing tools. They are registered in each member scope. */
export function buildTools(service) {
  const tools = []
  const allowCreate = service.config.allowAgentCreate === true
  const allowManage = service.config.allowAgentManage === true
  const allowNote = service.config.allowAgentNote !== false
  const allowDelegate = service.config.allowAgentDelegate === true
  const allowRelay = service.config.allowRelay !== false
  const commonGroup = {
    type: 'string',
    description: 'Group name or id. Omit it when this session belongs to exactly one active group.',
  }

  tools.push({
    name: 'group_talk_list',
    description: 'List every session group this session belongs to, with its role, roster and a bounded short recent transcript. Use this before sending when the group name is not known.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    output: OUTPUT,
    timeoutMs: 15000,
    async execute(_args, exec) {
      const caller = callingSession(exec, 'group_talk_list')
      service.noteRead(caller)
      const groups = service.listFor(caller, { messageLimit: 4 }).map((group) => summarize(group, caller))
      return {
        groups,
        usage: 'Send with group_talk_send({group, target:"@alias"|"#role"|"*", message}). Roles are advisory; only the owner can manage the group.',
      }
    },
  })

  tools.push({
    name: 'group_talk_send',
    description: 'Send a durable message to another member session in a group. target is @alias for one member, #role for every member with that role, or * for all other members. The target session is resumed if inactive. A normal assistant answer is not delivered to the group; use this tool to reply. Sends are rate-limited, deduplicated and charged against daily group/sender/target budgets.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        group: commonGroup,
        target: {
          type: 'string',
          description: 'Member selector: @alias, #role, or * for everyone else.',
        },
        message: {
          type: 'string',
          description: 'Message text to deliver. The deployment sets a hard character limit (default 2000).',
        },
        mode: {
          type: 'string',
          enum: ['queue', 'steer'],
          description: 'Advanced delivery mode override. queue waits for the target turn to end; steer inserts at the next step boundary. Prefer priority; the panel no longer uses queue.',
        },
        priority: {
          type: 'string',
          enum: ['ambient', 'urgent'],
          description: 'ambient (default) tells the target not to interrupt its current task and to read this after the current step/turn. urgent asks for next-step priority. Neither aborts a running tool.',
        },
        purpose: {
          type: 'string',
          enum: [...MESSAGE_PURPOSES],
          description: 'Required for non-organizer members: why this message needs the group (verify, correct, review, anomaly, question, blocked, handoff). Status/ack/chatter is not allowed. Organizer/owner/human are exempt.',
        },
      },
      required: ['target', 'message'],
    },
    output: OUTPUT,
    timeoutMs: 60000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_send')
      const groupRef = typeof args.group === 'string' ? args.group : undefined
      const purpose = SEND_PURPOSES.has(args.purpose) ? args.purpose : undefined
      // The domain service enforces the gate after resolving targets, so an
      // in-room-only reply to the human does not need a purpose either.
      const result = await service.send(caller, {
        group: groupRef,
        target: String(args.target),
        message: String(args.message),
        mode: args.mode === 'queue' || args.mode === 'steer' ? args.mode : undefined,
        priority: args.priority === 'urgent' ? 'urgent' : args.priority === 'ambient' ? 'ambient' : undefined,
        purpose,
      })
      return {
        group: { id: result.group.id, name: result.group.name, status: result.group.status },
        messageId: result.messageId,
        target: result.target,
        deliveries: publicDeliveries(result.deliveries),
        deduplicated: result.deduplicated === true,
        estimatedTokens: result.estimatedTokens,
      }
    },
  })

  tools.push({
    name: 'group_talk_history',
    description: 'Read the recent shared transcript of one group this session belongs to. The tool output is capped to a character budget; long bodies are marked truncated. Older stored entries may also have been trimmed.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        group: commonGroup,
        limit: {
          type: 'integer',
          description: 'Number of recent entries, 1..40. Defaults to 12.',
        },
      },
    },
    output: OUTPUT,
    timeoutMs: 15000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_history')
      service.noteRead(caller)
      const result = service.history(caller, typeof args.group === 'string' ? args.group : undefined, args.limit ?? 12)
      return boundedHistoryResult(result, service.config.maxHistoryToolChars)
    },
  })

  tools.push({
    name: 'group_talk_leave',
    description: 'Leave one group this session belongs to. The owner cannot leave; the owner must dissolve or delete instead. This removes the scoped group tools and prompt section immediately.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { group: commonGroup },
      required: [],
    },
    output: OUTPUT,
    timeoutMs: 15000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_leave')
      const result = await service.leave(caller, typeof args.group === 'string' ? args.group : undefined)
      return { left: true, group: { id: result.group.id, name: result.group.name, status: result.group.status } }
    },
  })

  if (allowNote) tools.push({
    name: 'group_talk_note',
    description: 'Record one audited note or decision in the group log. Secretaries and organizers use this for minutes, decisions, rollback records and corrections. Notes are visible to the human audit view and every member history; they are never chat instructions.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        group: commonGroup,
        text: { type: 'string', description: 'The note to record (max 1000 characters).' },
        kind: {
          type: 'string',
          enum: ['note', 'decision'],
          description: 'note (default) or decision for a conclusion the room agreed on.',
        },
      },
      required: ['text'],
    },
    output: OUTPUT,
    timeoutMs: 15000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_note')
      const group = await service.note(
        caller,
        typeof args.group === 'string' ? args.group : undefined,
        String(args.text ?? ''),
        { kind: args.kind === 'decision' ? 'decision' : 'note' },
      )
      return { noted: true, group: summarize(group, caller) }
    },
  })

  if (allowRelay) tools.push({
    name: 'group_talk_relay',
    description: 'Ask one peer session a bounded question without posting to a room. intents: confirm | ask | handoff. Default one round; the reply returns to this session. Never an approval channel, never chained, never contains credentials. Use relayId to continue an existing relay for one more round.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        to: { type: 'string', description: 'Peer alias or exact session id from a group you share.' },
        intent: { type: 'string', enum: ['confirm', 'ask', 'handoff'], description: 'confirm | ask | handoff. Approval, payment and deletion are not relay intents.' },
        message: { type: 'string', description: 'The question (max 2000 characters).' },
        maxRounds: { type: 'integer', description: '1..3; the Host clamps it to the intent budget (confirm 2, ask 3, handoff 1).' },
        relayId: { type: 'string', description: 'Continue this relay for one more round instead of starting a new one.' },
        refs: {
          type: 'array',
          description: 'Optional references (file/url/session/message) instead of copying content.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', enum: ['file', 'url', 'session', 'relay', 'message', 'other'] },
              value: { type: 'string' },
            },
            required: ['value'],
          },
        },
      },
      required: ['message'],
    },
    output: OUTPUT,
    timeoutMs: 45000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_relay')
      const relay = await service.relay(caller, {
        to: typeof args.to === 'string' ? args.to : undefined,
        intent: typeof args.intent === 'string' ? args.intent : 'confirm',
        message: String(args.message ?? ''),
        maxRounds: Number.isInteger(args.maxRounds) ? args.maxRounds : undefined,
        relayId: typeof args.relayId === 'string' ? args.relayId : undefined,
        refs: Array.isArray(args.refs) ? args.refs : undefined,
      })
      return { relay }
    },
  })

  if (allowRelay) tools.push({
    name: 'group_talk_relay_reply',
    description: 'Answer an open relay addressed to this session. The reply returns to the origin session, not to any group. Set followup=true to ask for one more round (bounded by the relay intent).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        relayId: { type: 'string', description: 'relay_… id from the relay envelope.' },
        message: { type: 'string', description: 'The answer (max 2000 characters).' },
        followup: { type: 'boolean', description: 'Ask the origin for one more round instead of closing the relay.' },
      },
      required: ['relayId', 'message'],
    },
    output: OUTPUT,
    timeoutMs: 45000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_relay_reply')
      const relay = await service.relayReply(caller, {
        relayId: String(args.relayId ?? ''),
        message: String(args.message ?? ''),
        followup: args.followup === true,
      })
      return { relay }
    },
  })

  if (allowDelegate) tools.push({
    name: 'group_talk_delegate',
    description: 'Organizer/owner only: delegate one bounded task to a subagent. The child never joins the group, receives no group tools, cannot delegate further, has a timeout, and its start/result is recorded as an audited control entry in the room. Disabled by default; the human enables allowAgentDelegate.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        group: commonGroup,
        task: { type: 'string', description: 'Complete task brief for the subagent (bounded by maxDelegationChars).' },
        label: { type: 'string', description: 'Optional short label for the audit log.' },
      },
      required: ['task'],
    },
    output: OUTPUT,
    timeoutMs: service.config.delegationTimeoutMs + 5000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_delegate')
      const result = await service.delegate(exec.agent, caller, typeof args.group === 'string' ? args.group : undefined, {
        task: String(args.task ?? ''),
        label: typeof args.label === 'string' ? args.label : undefined,
      })
      return {
        taskId: result.taskId,
        provider: result.provider,
        outcome: result.outcome,
        stopReason: result.stopReason,
        ...(result.output === undefined ? {} : { output: result.output.slice(0, service.config.maxDelegationChars) }),
      }
    },
  })

  if (allowManage) {
  tools.push({
    name: 'group_talk_manage',
    description: 'Owner-only group management: add_member, remove_member, set_role, set_organizer, rename, set_topic, pause, resume, sensitivity, redact, cleanup_missing, dissolve, or delete. Disabled for model tools by default; the human can manage from the Group chat panel or /group commands. delete requires confirm=true.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          description: 'One of add_member, remove_member, set_role, set_organizer, rename, set_topic, pause, resume, sensitivity, redact, cleanup_missing, dissolve, delete.',
        },
        group: commonGroup,
        sessionId: {
          type: 'string',
          description: 'Session id for add_member.',
        },
        alias: {
          type: 'string',
          description: 'Alias for add_member (defaults to member-N).',
        },
        member: {
          type: 'string',
          description: 'Alias or session id of the target member for remove_member/set_role.',
        },
        role: {
          type: 'string',
          description: 'New role label for set_role or add_member.',
        },
        duties: {
          type: 'string',
          description: 'Optional role responsibilities for set_role or add_member.',
        },
        name: {
          type: 'string',
          description: 'New group name for rename.',
        },
        topic: {
          type: 'string',
          description: 'New topic for set_topic (empty clears it).',
        },
        level: {
          type: 'string',
          description: 'Sensitivity for the sensitivity action: public, internal or secret.',
        },
        granted: {
          type: 'boolean',
          description: 'true grants, false revokes, for set_organizer.',
        },
        messageId: {
          type: 'string',
          description: 'Message id for redact.',
        },
        confirm: {
          type: 'boolean',
          description: 'Required true for delete.',
        },
      },
      required: ['action'],
    },
    output: OUTPUT,
    timeoutMs: 30000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_manage')
      requireAgentPermission(service, 'allowAgentManage', 'group_talk_manage')
      const group = typeof args.group === 'string' ? args.group : undefined
      switch (args.action) {
        case 'add_member': {
          if (typeof args.sessionId !== 'string' || !args.sessionId.trim()) throw new Error('add_member requires sessionId.')
          const result = await service.addMember(caller, group, {
            sessionId: args.sessionId,
            alias: args.alias,
            role: args.role,
            duties: args.duties,
          })
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'remove_member': {
          if (typeof args.member !== 'string' || !args.member.trim()) throw new Error('remove_member requires member.')
          const result = await service.removeMember(caller, group, args.member)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'set_role': {
          if (typeof args.member !== 'string' || !args.member.trim()) throw new Error('set_role requires member.')
          if (typeof args.role !== 'string' || !args.role.trim()) throw new Error('set_role requires role.')
          const result = await service.setRole(caller, group, args.member, args.role, args.duties)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'set_organizer': {
          if (typeof args.member !== 'string' || !args.member.trim()) throw new Error('set_organizer requires member.')
          const result = await service.setOrganizer(caller, group, args.member, args.granted === true)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'rename': {
          if (typeof args.name !== 'string' || !args.name.trim()) throw new Error('rename requires name.')
          const result = await service.rename(caller, group, args.name)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'set_topic': {
          const result = await service.setTopic(caller, group, typeof args.topic === 'string' ? args.topic : '')
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'pause': {
          const result = await service.pauseGroup(caller, group, true, typeof args.reason === 'string' ? args.reason : '')
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'resume': {
          const result = await service.pauseGroup(caller, group, false)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'sensitivity': {
          if (typeof args.level !== 'string') throw new Error('sensitivity requires level.')
          const result = await service.setSensitivity(caller, group, args.level)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'redact': {
          if (typeof args.messageId !== 'string' || !args.messageId.trim()) throw new Error('redact requires messageId.')
          const result = await service.redact(caller, group, args.messageId)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'cleanup_missing': {
          const result = await service.removeMissingMembers(caller, group)
          return { action: args.action, removed: result.removed, group: summarize(result.group, caller) }
        }
        case 'dissolve': {
          const result = await service.dissolve(caller, group)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'delete': {
          // A model deleting a room is irreversible; unlike /group delete the
          // tool has no typed confirmation phrase, so require an explicit flag
          // and keep the audit row (F29).
          if (args.confirm !== true) throw new Error('delete requires confirm=true.')
          const result = await service.delete(caller, group)
          return { action: args.action, deleted: true, group: summarize(result, caller) }
        }
        default:
          throw new Error(`Unknown group_talk_manage action "${String(args.action)}".`)
      }
    },
  })

  }

  if (allowCreate) {
  tools.push({
    name: 'group_talk_create',
    description: 'Create a new cross-session group owned by this session. Members are existing ordinary session ids with unique aliases. Prefer the Web Group-Talk-L panel when a human is choosing sessions; this tool is for explicit requests to create a group from known session ids.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Group name, 1..64 characters.' },
        topic: { type: 'string', description: 'Optional topic shown to members.' },
        members: {
          type: 'array',
          description: 'Other existing sessions to include. The calling session is added automatically as owner.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sessionId: { type: 'string' },
              alias: { type: 'string' },
              role: { type: 'string' },
              duties: { type: 'string' },
            },
            required: ['sessionId'],
          },
        },
      },
      required: ['name'],
    },
    output: OUTPUT,
    timeoutMs: 30000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_create')
      requireAgentPermission(service, 'allowAgentCreate', 'group_talk_create')
      const result = await service.create(caller, {
        name: args.name,
        topic: args.topic,
        members: Array.isArray(args.members) ? args.members : [],
      })
      return {
        group: summarize(result, caller),
        usage: 'Members can send with group_talk_send; the human operator manages the room.',
      }
    },
  })

  }

  return tools
}

/** Map a domain failure to an HTTP status. */
function statusOf(error) {
  switch (error?.code) {
    case 'owner-only':
    case 'not-a-member':
    case 'human-only':
    case 'role-required':
    case 'delegate-disabled':
    case 'sensitivity-human-only':
    case 'cross-origin':
      return 403
    case 'group-not-found':
    case 'member-not-found':
    case 'relay-not-found':
      return 404
    case 'rate-limited':
    case 'quota-exceeded':
    case 'fanout-exceeded':
    case 'delegation-quota':
    case 'relay-rate':
    case 'circuit-open':
      return 429
    case 'group-dissolved':
    case 'duplicate-alias':
    case 'duplicate-session':
    case 'session-not-found':
    case 'session-not-ordinary':
    case 'delegation-unavailable':
    case 'relay-closed':
    case 'relay-rounds-exceeded':
    case 'relay-loop':
    case 'relay-paused':
    case 'relay-not-recipient':
    case 'turn-owned':
      return 409
    case 'secret-detected':
      return 422
    case 'body-too-large':
      return 413
    case 'unsupported-media-type':
      return 415
    case 'store-unavailable':
    case 'store-locked':
      return 503
    default:
      return 400
  }
}

/** One authenticated Fetch route for the Web panel. */
function registerHttp(ctx, service, log) {
  const maxBodyBytes = 256 * 1024
  /** Session impersonation is impossible: the route always acts for the person. */
  const callerFrom = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return HUMAN_SESSION
    if (normalizeSessionId(value) !== HUMAN_SESSION) {
      throw new GroupError('human-only', 'The Web route acts only for the human operator; sessions use their scoped group tools.')
    }
    return HUMAN_SESSION
  }

  /** Reject obvious cross-site callers even though the route is same-origin authenticated. */
  const originAllowed = (request) => {
    const origin = request.headers.get('origin')
    if (origin) {
      try {
        if (new URL(origin).origin !== new URL(request.url).origin) return false
      } catch {
        return false
      }
    }
    const site = request.headers.get('sec-fetch-site')
    if (site && site !== 'same-origin' && site !== 'none') return false
    return true
  }

  const readJson = async (request) => {
    const declared = Number(request.headers.get('content-length') ?? '')
    if (Number.isFinite(declared) && declared > maxBodyBytes) {
      throw new GroupError('body-too-large', 'Request body is too large.')
    }
    const text = await request.text()
    if (Buffer.byteLength(text, 'utf8') > maxBodyBytes) {
      throw new GroupError('body-too-large', 'Request body is too large.')
    }
    try {
      const value = JSON.parse(text)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new GroupError('bad-request', 'Request body must be a JSON object.')
      }
      return value
    } catch (error) {
      if (error instanceof GroupError) throw error
      throw new GroupError('bad-request', 'Request body is not valid JSON.')
    }
  }

  const failure = (error, lang) => {
    if (error instanceof GroupError) service.metrics?.reject(error.code)
    const payload = errorPayload(error, lang, (message) => log(message))
    const headers = { 'cache-control': 'no-store' }
    if (Number.isFinite(payload.retryAfterMs)) headers['retry-after'] = String(Math.max(1, Math.ceil(payload.retryAfterMs / 1000)))
    return new Response(JSON.stringify({ error: payload }), {
      status: statusOf(error),
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', ...headers },
    })
  }

  const json = (value, request, lang) => {
    const body = JSON.stringify(value)
    const tag = `"${createHash('sha256').update(body).digest('base64url').slice(0, 24)}"`
    if (request?.headers.get('if-none-match') === tag) {
      return new Response(null, { status: 304, headers: { etag: tag, 'cache-control': 'no-store' } })
    }
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        etag: tag,
        'content-language': lang === 'zh' ? 'zh-CN' : 'en',
      },
    })
  }

  const handle = async (request) => {
    let lang = 'en'
    try {
      const url = new URL(request.url)
      lang = normalizeLang(url.searchParams.get('lang'))
      if (!originAllowed(request)) return failure(new GroupError('cross-origin', 'Cross-origin requests are not allowed.'), lang)
      // A cheap CSRF defence (F14): a browser attaches Origin to a cross-site
      // POST, and a simple form cannot set a custom header. Same-origin panel
      // requests send both; a non-browser test client sends neither.
      if (request.method === 'POST' && request.headers.get('origin') && request.headers.get('x-group-talk-l') !== '1') {
        return failure(new GroupError('cross-origin', 'Missing the Group-Talk-L request header.'), lang)
      }
      await service.ready()
      const health = service.storeStatus()
      if (!health.ok) return failure(new GroupError(health.code, health.message), lang)
      const gate = service.store.state.gate
      if (request.method === 'GET') {
        const sessionId = callerFrom(url.searchParams.get('sessionId'))
        const rawLimit = Number(url.searchParams.get('limit') ?? '')
        const messageLimit = Number.isFinite(rawLimit) && rawLimit > 0
          ? Math.min(100, Math.max(1, Math.trunc(rawLimit)))
          : service.config.uiMessageLimit
        let appliedLimit = messageLimit
        let groups = service.listFor(sessionId, { messageLimit: appliedLimit })
        const payload = () => ({
          version: VERSION,
          capabilities: service.capabilities(),
          groups,
          limits: service.limitsForClient(),
          usage: service.usageFor(sessionId),
          gate,
          relays: service.relaysFor(sessionId, 10),
          ...(url.searchParams.get('stats') === '1' ? { stats: service.statsFor() } : {}),
        })
        // Bound the poll body: a 32-room store at 20 × 2,000-character rows is
        // already close to a megabyte. Halve the per-room window until the JSON
        // is under 1.2 MB; the panel still sees messageTotal/hasOlder.
        let body = payload()
        let encoded = JSON.stringify(body)
        while (encoded.length > 1_200_000 && appliedLimit > 1) {
          appliedLimit = Math.max(1, Math.floor(appliedLimit / 2))
          groups = service.listFor(sessionId, { messageLimit: appliedLimit })
          body = payload()
          encoded = JSON.stringify(body)
        }
        return json(body, request, lang)
      }
      if (request.method !== 'POST') return failure(new GroupError('bad-request', 'Method not allowed.'), lang)
      const type = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
      if (type !== 'application/json') return failure(new GroupError('unsupported-media-type', 'Content type must be application/json.'), lang)
      const body = await readJson(request)
      lang = normalizeLang(body.lang ?? url.searchParams.get('lang') ?? lang)
      const sessionId = callerFrom(body.sessionId)
      let result
      switch (body.action) {
        case 'help': {
          const group = body.group ? service.resolveFor(sessionId, body.group, { activeOnly: false }) : undefined
          result = { text: buildHelp(group) }
          break
        }
        case 'preview': {
          result = service.broadcastPreview(sessionId, {
            group: typeof body.group === 'string' ? body.group : undefined,
            target: String(body.target ?? ''),
            message: String(body.message ?? ''),
          })
          break
        }
        case 'create': {
          const group = await service.create(sessionId, {
            name: body.name,
            topic: body.topic,
            sensitivity: body.sensitivity,
            members: Array.isArray(body.members) ? body.members : [],
          })
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'send': {
          const sent = await service.send(sessionId, {
            group: typeof body.group === 'string' ? body.group : undefined,
            target: String(body.target ?? ''),
            message: String(body.message ?? ''),
            mode: body.mode === 'queue' || body.mode === 'steer' ? body.mode : undefined,
            priority: body.priority === 'urgent' ? 'urgent' : body.priority === 'ambient' ? 'ambient' : undefined,
            purpose: SEND_PURPOSES.has(body.purpose) ? body.purpose : undefined,
            taint: body.taint === 'human-pasted' ? 'human-pasted' : 'human-typed',
            refs: Array.isArray(body.refs) ? body.refs : undefined,
            broadcast: body.broadcast === true,
            confirmSecrets: body.confirmSecrets === true,
            nudge: body.nudge === true,
          })
          result = {
            group: { id: sent.group.id, name: sent.group.name, status: sent.group.status },
            message: sent.message,
            messageId: sent.messageId,
            target: sent.target,
            deliveries: sent.deliveries,
            deduplicated: sent.deduplicated === true,
            held: sent.held === true,
            estimatedTokens: sent.estimatedTokens,
          }
          break
        }
        case 'relay': {
          result = {
            relay: await service.relay(sessionId, {
              to: typeof body.to === 'string' ? body.to : undefined,
              intent: typeof body.intent === 'string' ? body.intent : 'confirm',
              message: String(body.message ?? ''),
              maxRounds: Number.isInteger(body.maxRounds) ? body.maxRounds : undefined,
              relayId: typeof body.relayId === 'string' ? body.relayId : undefined,
              refs: Array.isArray(body.refs) ? body.refs : undefined,
            }),
          }
          break
        }
        case 'relayReply': {
          result = {
            relay: await service.relayReply(sessionId, {
              relayId: String(body.relayId ?? ''),
              message: String(body.message ?? ''),
              followup: body.followup === true,
            }),
          }
          break
        }
        case 'setRole': {
          const group = await service.setRole(sessionId, body.group, body.member, body.role, body.duties, body.roleId)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'setOrganizer': {
          const group = await service.setOrganizer(sessionId, body.group, body.member, body.granted === true)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'addMember': {
          const group = await service.addMember(sessionId, body.group, {
            sessionId: body.memberSessionId,
            alias: body.alias,
            role: body.role,
            roleId: body.roleId,
            duties: body.duties,
            organizer: body.organizer === true,
          })
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'removeMember': {
          const group = await service.removeMember(sessionId, body.group, body.member)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'rename': {
          const group = await service.rename(sessionId, body.group, body.name)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'setTopic': {
          const group = await service.setTopic(sessionId, body.group, body.topic)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'sensitivity': {
          const group = await service.setSensitivity(sessionId, body.group, body.level)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'pause': {
          const group = await service.pauseGroup(sessionId, body.group, true, body.reason)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'resume': {
          const group = await service.pauseGroup(sessionId, body.group, false)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'pauseHost': {
          result = await service.pauseHost(sessionId, body.paused === true, body.reason)
          break
        }
        case 'pauseRelay': {
          result = await service.pauseRelay(sessionId, body.paused === true)
          break
        }
        case 'redact': {
          const group = await service.redact(sessionId, body.group, body.messageId)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'cleanup': {
          const cleaned = await service.removeMissingMembers(sessionId, body.group)
          result = { removed: cleaned.removed, group: viewOfGroup(cleaned.group.id ? service.store.get(cleaned.group.id) : cleaned.group, sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'export': {
          result = service.exportGroup(sessionId, body.group, { format: body.format === 'json' ? 'json' : 'markdown' })
          break
        }
        case 'stats': {
          result = service.statsFor()
          break
        }
        case 'audit': {
          result = service.auditFor(sessionId, body.group, body.limit)
          break
        }
        case 'dissolve': {
          const group = await service.dissolve(sessionId, body.group)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'delete': {
          const group = await service.delete(sessionId, body.group)
          result = { deleted: true, group: { id: group.id, name: group.name } }
          break
        }
        case 'leave': {
          const left = await service.leave(sessionId, body.group)
          result = { group: viewOfGroup(service.store.get(left.group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        default:
          throw new GroupError('bad-request', `Unknown action "${String(body.action)}".`)
      }
      return json(result, request, lang)
    } catch (error) {
      if (error instanceof GroupError) return failure(error, lang)
      log('HTTP request failed', error)
      return failure(new GroupError('internal', 'Internal group-talk-l failure.'), lang)
    }
  }

  const install = (ownerCtx, connection) => {
    if (typeof connection?.fetch?.register !== 'function') return
    ownerCtx.effect(() => connection.fetch.register({
      path: '/api/group-talk-l',
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: handle,
    }), 'group-talk-l: authenticated /api/group-talk-l route')
  }
  if (typeof ctx.inject === 'function') {
    ctx.inject(['connection'], (connectionCtx) => {
      install(connectionCtx, connectionCtx.connection)
    })
    return
  }
  install(ctx, ctx.get('connection'))
}

/**
 * Mount the Host plugin.
 * @param {object} ctx Cordis Host context
 * @param {object} rawConfig Loader row config
 */
export function apply(ctx, rawConfig = {}) {
  const inform = (message) => console.info(`[group-talk-l] ${message}`)
  const warn = (message, error) => {
    const detail = error instanceof Error ? `: ${error.message}` : error === undefined ? '' : `: ${String(error)}`
    console.warn(`[group-talk-l] ${message}${detail}`)
  }
  const options = resolveConfig(rawConfig, (message) => warn(message))
  if (!options.enabled) return
  if (ACTIVE_DATA_FILES.has(options.dataFile)) {
    warn(`another Group-Talk-L instance already owns ${options.dataFile}; ignoring duplicate mount`)
    return () => {}
  }
  ACTIVE_DATA_FILES.add(options.dataFile)
  ctx.effect(() => () => ACTIVE_DATA_FILES.delete(options.dataFile), 'group-talk-l: data file ownership')

  const store = new GroupStore({
    file: options.dataFile,
    historyLimit: options.historyLimit,
    lock: options.lockFile === true,
    log: (message) => inform(message),
  })
  /** @type {Map<string, {disposers: Array<() => void>}>} */
  const installed = new Map()
  let active = true
  /** @type {GroupService | undefined} */
  let service

  const uninstall = (sessionId) => {
    const entry = installed.get(sessionId)
    if (!entry) return
    installed.delete(sessionId)
    for (const dispose of entry.disposers.reverse()) {
      try {
        dispose()
      } catch (error) {
        warn(`cleanup for ${sessionId} failed`, error)
      }
    }
  }

  const install = (agent) => {
    const sessionId = agent?.id
    if (typeof sessionId !== 'string' || installed.has(sessionId)) return
    if (!service || service.activeGroupsFor(sessionId).length === 0) return
    const scoped = agent.ctx
    const disposers = []
    try {
      disposers.push(scoped.systemPrompt.section({
        name: 'group-talk-l:policy',
        order: scoped.systemPrompt.getSectionOrder('TEAM_POLICY'),
        // Transcript text is peer-authored and may contain any braces; it must
        // never be interpreted as system-prompt variable interpolation.
        interpolate: false,
        text: () => buildGroupPolicy(service.activeGroupsFor(sessionId), sessionId, {
          recentLimit: options.policyRecentMessages,
          maxChars: options.policyMaxChars,
          policyCompact: options.policyCompact,
          allowAgentCreate: options.allowAgentCreate,
          allowAgentManage: options.allowAgentManage,
          allowAgentNote: options.allowAgentNote,
          allowAgentDelegate: options.allowAgentDelegate,
          allowRelay: options.allowRelay,
        }),
      }))
      for (const definition of buildTools(service)) {
        disposers.push(scoped.tools.register(definition))
      }
      installed.set(sessionId, { disposers })
      inform(`attached group tools to ${sessionId} (${service.activeGroupsFor(sessionId).length} group(s))`)
    } catch (error) {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch {}
      }
      warn(`could not attach group tools to ${sessionId}`, error)
    }
  }

  const sync = (sessionIds) => {
    for (const sessionId of new Set(sessionIds)) {
      const agent = ctx.agents.get(sessionId)
      if (!agent) continue
      if (!service || service.activeGroupsFor(sessionId).length === 0) uninstall(sessionId)
      else install(agent)
    }
  }

  service = new GroupService({
    store,
    ctx,
    config: options,
    log: (message, error) => warn(message, error),
    onMembershipChanged: (sessionIds) => sync(sessionIds),
  })

  ctx.effect(() => ctx.commands.register({
    name: 'group',
    description: 'Create and talk in cross-session groups',
    input: {
      hint: '[list|show|@alias <message>|#role <message>|* <message>|history|role|add|remove|new|dissolve|delete|help]',
    },
    handler: createGroupCommand(service, { lang: options.commandLang }),
  }), 'group-talk-l: /group command')
  ctx.effect(() => () => {
    for (const sessionId of [...installed.keys()]) uninstall(sessionId)
  }, 'group-talk-l: scoped member registrations')

  registerHttp(ctx, service, warn)

  const ready = store.ready
    .then(() => {
      if (!active) return
      for (const agent of ctx.agents.list()) sync([agent.id])
      inform(`ready (data ${options.dataFile}, delivery ${options.deliveryMode})`)
    })
    .catch((error) => warn('could not read group state', error))
  ctx.on('agent/created', async ({ agent }) => {
    // This event is serial and awaited by the agent factory. Waiting here
    // makes the member prompt/tools visible before the first admitted prompt
    // can assemble a step.
    await ready
    if (active) sync([agent.id])
  })
  ctx.on('agent/disposed', ({ agent }) => {
    // The Agent's own scope already unwound its registrations.
    installed.delete(agent.id)
  })

  return () => {
    active = false
    for (const sessionId of [...installed.keys()]) uninstall(sessionId)
    ACTIVE_DATA_FILES.delete(options.dataFile)
    void service?.dispose?.()
  }
}
