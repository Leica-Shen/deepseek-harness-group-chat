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
import { GroupStore, GroupError, normalizeSessionId, viewOfGroup } from './store.js'
import { GroupService } from './service.js'
import { resolveConfig } from './config.js'
import { buildGroupPolicy, buildHelp, memberLabel } from './policy.js'
import { createGroupCommand } from './command.js'

export const name = 'group-talk-l'

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
    isOwner: me.isOwner ?? me.sessionId === view.ownerSessionId,
  }
  const recent = (view.messages ?? []).slice(-4).map((message) => {
    const row = {
      kind: message.kind,
      text: message.text,
    }
    if (message.fromAlias !== undefined) row.from = message.fromAlias
    if (message.target !== undefined) row.target = message.target
    return row
  })
  return {
    id: view.id,
    name: view.name,
    ...(view.topic ? { topic: view.topic } : {}),
    status: view.status,
    owner: view.members?.find((member) => member.sessionId === view.ownerSessionId)?.alias,
    ...(you === undefined ? {} : { you }),
    members: (view.members ?? []).map((member) => ({
      alias: member.alias,
      role: member.role,
      isOwner: member.sessionId === view.ownerSessionId,
    })),
    recent,
  }
}

/** Redact internal identities and raw failure detail from model-facing rows. */
export function publicDeliveries(deliveries = []) {
  return deliveries.map((delivery) => ({
    alias: delivery.alias,
    status: delivery.status,
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
function buildTools(service) {
  const tools = []
  const commonGroup = {
    type: 'string',
    description: 'Group name or id. Omit it when this session belongs to exactly one active group.',
  }

  tools.push({
    name: 'group_talk_list',
    description: 'List every session group this session belongs to, with its role, roster and a short recent transcript. Use this before sending when the group name is not known.',
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
      },
      required: ['target', 'message'],
    },
    output: OUTPUT,
    timeoutMs: 60000,
    async execute(args, exec) {
      const caller = callingSession(exec, 'group_talk_send')
      const result = await service.send(caller, {
        group: typeof args.group === 'string' ? args.group : undefined,
        target: String(args.target),
        message: String(args.message),
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

  tools.push({
    name: 'group_talk_manage',
    description: 'Owner-only group management: add_member, remove_member, set_role, rename, dissolve, or delete. Disabled for model tools by default; the human can manage from the Group chat panel or /group commands.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          description: 'One of add_member, remove_member, set_role, rename, dissolve, delete.',
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
        case 'rename': {
          if (typeof args.name !== 'string' || !args.name.trim()) throw new Error('rename requires name.')
          const result = await service.rename(caller, group, args.name)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'dissolve': {
          const result = await service.dissolve(caller, group)
          return { action: args.action, group: summarize(result, caller) }
        }
        case 'delete': {
          const result = await service.delete(caller, group)
          return { action: args.action, deleted: true, group: summarize(result, caller) }
        }
        default:
          throw new Error(`Unknown group_talk_manage action "${String(args.action)}".`)
      }
    },
  })

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
        usage: 'Members can send with group_talk_send; only the owner can use group_talk_manage.',
      }
    },
  })

  return tools
}

/** JSON response helper for the authenticated route. */
function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

/** Map a domain failure to an HTTP status. */
function statusOf(error) {
  switch (error?.code) {
    case 'owner-only':
    case 'not-a-member':
      return 403
    case 'group-not-found':
    case 'member-not-found':
      return 404
    case 'rate-limited':
    case 'quota-exceeded':
    case 'fanout-exceeded':
      return 429
    case 'group-dissolved':
    case 'duplicate-alias':
    case 'duplicate-session':
    case 'session-not-found':
    case 'session-not-ordinary':
      return 409
    default:
      return 400
  }
}

/** One authenticated Fetch route for the Web panel. */
function registerHttp(ctx, service, log) {
  const maxBodyBytes = 256 * 1024

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

  const handle = async (request) => {
    try {
      await service.ready()
      if (request.method === 'GET') {
        const sessionId = normalizeSessionId(new URL(request.url).searchParams.get('sessionId') ?? '')
        return jsonResponse({
          groups: service.listFor(sessionId, { messageLimit: service.config.uiMessageLimit }),
          limits: service.limitsForClient(),
          usage: service.usageFor(sessionId),
          help: buildHelp(),
        })
      }
      if (request.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)
      const type = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
      if (type !== 'application/json') return jsonResponse({ error: 'content type must be application/json' }, 415)
      const body = await readJson(request)
      const sessionId = normalizeSessionId(body.sessionId)
      let result
      switch (body.action) {
        case 'create': {
          const group = await service.create(sessionId, {
            name: body.name,
            topic: body.topic,
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
          })
          result = {
            group: { id: sent.group.id, name: sent.group.name, status: sent.group.status },
            messageId: sent.messageId,
            target: sent.target,
            deliveries: sent.deliveries,
            deduplicated: sent.deduplicated === true,
            estimatedTokens: sent.estimatedTokens,
          }
          break
        }
        case 'setRole': {
          const group = await service.setRole(sessionId, body.group, body.member, body.role, body.duties)
          result = { group: viewOfGroup(service.store.get(group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
          break
        }
        case 'addMember': {
          const group = await service.addMember(sessionId, body.group, {
            sessionId: body.memberSessionId,
            alias: body.alias,
            role: body.role,
            duties: body.duties,
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
        case 'leave': {
          const result = await service.leave(sessionId, body.group)
          result = { group: viewOfGroup(service.store.get(result.group.id), sessionId, { messageLimit: service.config.uiMessageLimit }) }
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
        default:
          throw new GroupError('bad-request', `Unknown action "${String(body.action)}".`)
      }
      return jsonResponse(result)
    } catch (error) {
      if (error instanceof GroupError) {
        return jsonResponse({ error: { code: error.code, message: error.message } }, statusOf(error))
      }
      log('HTTP request failed', error)
      return jsonResponse({ error: { code: 'internal', message: 'Internal group-talk-l failure.' } }, 500)
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

  const store = new GroupStore({
    file: options.dataFile,
    historyLimit: options.historyLimit,
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
    handler: createGroupCommand(service),
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
  }
}
