/**
 * Human-facing `/group` command.
 *
 * This is the low-friction path and the discoverable spelling of the trigger
 * protocol: `/group @alias <message>`, `/group #role <message>` and
 * `/group * <message>`. The Web header action offers the same operations with
 * session checkboxes; both paths call the same domain service.
 */
import { GroupError, HUMAN_SESSION } from './store.js'
import { buildHelp, memberLabel, renderHistory, renderRoster } from './policy.js'

/** Parse the command's own grammar. Unknown shapes fall back to help. */
export function parseGroupCommand(rawInput) {
  const input = typeof rawInput === 'string' ? rawInput.trim() : ''
  if (input.length === 0) return { kind: 'help' }
  if (input.startsWith('@') || input.startsWith('#') || input === '*' || input.startsWith('* ')) {
    const match = /^(\S+)\s+([\s\S]+)$/u.exec(input)
    if (!match) return { kind: 'invalid', text: 'A group message needs a target and text: /group @alias <message>.' }
    return { kind: 'send', target: match[1], message: match[2].trim(), group: undefined }
  }

  const space = input.search(/\s/u)
  const head = (space === -1 ? input : input.slice(0, space)).toLowerCase()
  const rest = space === -1 ? '' : input.slice(space + 1).trim()

  switch (head) {
    case 'help':
      return { kind: 'help' }
    case 'list':
      return { kind: 'list' }
    case 'show':
      return { kind: 'show', group: rest || undefined }
    case 'new':
    case 'create':
      return rest ? { kind: 'new', name: rest } : { kind: 'invalid', text: 'Usage: /group new <name>' }
    case 'rename':
      return rest ? { kind: 'rename', rest } : { kind: 'invalid', text: 'Usage: /group rename [<group> to] <name>' }
    case 'add': {
      const match = /^(@\S+)\s+(\S+)(?:\s+([\s\S]+))?$/u.exec(rest)
      if (!match) return { kind: 'invalid', text: 'Usage: /group add @<alias> <sessionId> [role]' }
      return { kind: 'add', alias: match[1], sessionId: match[2], role: match[3] }
    }
    case 'remove':
    case 'kick': {
      if (!rest) return { kind: 'invalid', text: 'Usage: /group remove @<alias>' }
      return { kind: 'remove', member: rest }
    }
    case 'role': {
      const match = /^(@\S+)\s+([\s\S]+)$/u.exec(rest)
      if (!match) return { kind: 'invalid', text: 'Usage: /group role @<alias> <role>' }
      return { kind: 'role', member: match[1], role: match[2].trim() }
    }
    case 'history': {
      const tokens = rest ? rest.split(/\s+/u) : []
      const maybeLimit = tokens.length > 0 ? Number(tokens.at(-1)) : NaN
      if (Number.isInteger(maybeLimit) && maybeLimit > 0) tokens.pop()
      return { kind: 'history', group: tokens.length > 0 ? tokens.join(' ') : undefined, limit: Number.isInteger(maybeLimit) && maybeLimit > 0 ? maybeLimit : 20 }
    }
    case 'leave':
      return { kind: 'leave', group: rest || undefined }
    case 'dissolve':
      return { kind: 'dissolve', group: rest || undefined }
    case 'delete': {
      const trimmed = rest.trim()
      const confirmed = /(?:^|\s+)confirm$/iu.test(trimmed)
      const group = (confirmed ? trimmed.replace(/(?:^|\s+)confirm$/iu, '') : trimmed).trim() || undefined
      return { kind: 'delete', group, confirmed }
    }
    case 'send': {
      const match = /^(\S+)\s+(\S+)\s+([\s\S]+)$/u.exec(rest)
      if (!match) return { kind: 'invalid', text: 'Usage: /group send <group> <@alias|#role|*> <message>' }
      return { kind: 'send', group: match[1], target: match[2], message: match[3].trim() }
    }
    default:
      return { kind: 'help' }
  }
}

/** Render one group's detail block. */
function renderGroup(group, viewerSessionId) {
  const me = group.members.find((member) => member.sessionId === viewerSessionId)
    ?? (viewerSessionId === HUMAN_SESSION
      ? { sessionId: HUMAN_SESSION, alias: 'human', role: 'human' }
      : undefined)
  const lines = [
    `Group "${group.name}" · ${group.id} · ${group.status}`,
    group.topic ? `Topic: ${group.topic}` : undefined,
    me?.sessionId === HUMAN_SESSION
      ? 'You: the human operator'
      : `You: ${me ? memberLabel(me) : 'not a member'}${me?.sessionId === group.ownerSessionId ? ' · owner' : ''}`,
    'Members:',
    renderRoster(group),
    '',
    renderHistory(group, 10),
  ]
  return lines.filter((line) => line !== undefined).join('\n')
}

/** Deliver a compact send receipt without hiding partial failures. */
function renderSend(result) {
  const delivered = result.deliveries.filter((delivery) => delivery.status === 'delivered')
  const failed = result.failures
  const lines = [
    result.deduplicated
      ? `Duplicate suppressed; an identical message to ${result.target} is still within the dedupe window (${result.messageId}).`
      : `Sent to ${result.target} in "${result.group.name}" (${result.messageId}).`,
    delivered.length > 0 ? `Delivered: ${delivered.map((item) => `@${item.alias}`).join(', ')}` : 'Delivered: none',
  ]
  if (result.estimatedTokens > 0) lines.push(`Estimated prompt allowance charged: ${result.estimatedTokens} tokens.`)
  if (failed.length > 0) {
    lines.push(`Failed: ${failed.map((item) => `@${item.alias} (${item.error ?? 'delivery failed'})`).join('; ')}`)
  }
  if (result.group.status !== 'active') lines.push('This group is dissolved and read-only.')
  return lines.join('\n')
}

/** Build the `/group` handler bound to the domain service. */
export function createGroupCommand(service) {
  return async (invocation) => {
    // `/group` is typed by the person, so it acts for the human operator, not
    // for whichever session happens to be focused.
    const sessionId = HUMAN_SESSION
    try {
      await service.ready()
      const parsed = parseGroupCommand(invocation.rawInput)
      switch (parsed.kind) {
        case 'help':
          return { kind: 'success', text: buildHelp() }
        case 'invalid':
          return { kind: 'error', text: parsed.text }
        case 'list': {
          const groups = service.listFor(sessionId)
          if (groups.length === 0) return { kind: 'success', text: `There are no group chats yet.\n\n${buildHelp()}` }
          return {
            kind: 'success',
            text: groups
              .map((group) => {
                const participants = group.members.filter((member) => member.sessionId !== HUMAN_SESSION).length
                return `- "${group.name}" (${group.id}) · ${group.status} · ${participants} participants`
              })
              .join('\n'),
          }
        }
        case 'show': {
          const groups = service.listFor(sessionId)
          if (!parsed.group && groups.length === 0) return { kind: 'success', text: `There are no group chats yet.\n\n${buildHelp()}` }
          const group = parsed.group
            ? service.resolveFor(sessionId, parsed.group, { activeOnly: false })
            : service.resolveFor(sessionId, undefined, { activeOnly: false })
          return { kind: 'success', text: renderGroup(group, sessionId) }
        }
        case 'new': {
          const group = await service.create(sessionId, { name: parsed.name })
          return {
            kind: 'success',
            text: [
              `Created group "${group.name}" (${group.id}).`,
              renderRoster(group),
              '',
              'Add participants with /group add @<alias> <sessionId> [role], or use the Group chat panel to pick them.',
              'Talk to a member with /group @<alias> <message>.',
            ].join('\n'),
          }
        }
        case 'rename': {
          let groupRef
          let name
          const to = /\s+to\s+/iu.exec(parsed.rest)
          if (to) {
            groupRef = parsed.rest.slice(0, to.index).trim()
            name = parsed.rest.slice(to.index + to[0].length).trim()
          } else {
            name = parsed.rest
          }
          const group = await service.rename(sessionId, groupRef, name)
          return { kind: 'success', text: `Renamed group to "${group.name}".` }
        }
        case 'add': {
          const group = await service.addMember(sessionId, undefined, {
            sessionId: parsed.sessionId,
            alias: parsed.alias,
            role: parsed.role,
          })
          return { kind: 'success', text: `Added ${parsed.alias} to "${group.name}".\n${renderRoster(group)}` }
        }
        case 'remove': {
          const group = await service.removeMember(sessionId, undefined, parsed.member)
          return { kind: 'success', text: `Removed ${parsed.member} from "${group.name}".\n${renderRoster(group)}` }
        }
        case 'role': {
          const group = await service.setRole(sessionId, undefined, parsed.member, parsed.role)
          return { kind: 'success', text: `Updated @${parsed.member.replace(/^@/u, '')} in "${group.name}".\n${renderRoster(group)}` }
        }
        case 'history': {
          const group = service.resolveFor(sessionId, parsed.group, { activeOnly: false })
          const history = service.history(sessionId, group.id, parsed.limit)
          return {
            kind: 'success',
            text: [
              `Group "${group.name}" · ${group.status} · last ${history.messages.length} of ${history.total}`,
              ...history.messages.map((message) => message.kind === 'system'
                ? `· ${message.text}`
                : `@${message.fromAlias ?? '?'} → ${message.target ?? '*'}: ${message.text}`),
            ].join('\n'),
          }
        }
        case 'send': {
          const result = await service.send(sessionId, {
            group: parsed.group,
            target: parsed.target,
            message: parsed.message,
          })
          return { kind: 'success', text: renderSend(result) }
        }
        case 'leave': {
          // Leaving is about the session the human is typing in, not the panel.
          const caller = invocation.agent?.id
          if (!caller) return { kind: 'error', text: 'Leaving needs a calling session.' }
          const result = await service.leave(caller, parsed.group)
          return { kind: 'success', text: `Left @${result.alias} from "${result.group.name}".` }
        }
        case 'dissolve': {
          const group = await service.dissolve(sessionId, parsed.group)
          return { kind: 'success', text: `Dissolved group "${group.name}". Membership and transcript are frozen; the owner can delete it later.` }
        }
        case 'delete': {
          if (!parsed.confirmed) {
            const group = service.resolveFor(sessionId, parsed.group, { activeOnly: false })
            return {
              kind: 'error',
              text: `Deleting "${group.name}" permanently removes the group and transcript. Repeat as /group delete ${parsed.group ? `${parsed.group} ` : ''}confirm`,
            }
          }
          const group = await service.delete(sessionId, parsed.group)
          return { kind: 'success', text: `Deleted group "${group.name}" (${group.id}) and its transcript.` }
        }
        default:
          return { kind: 'success', text: buildHelp() }
      }
    } catch (error) {
      if (error instanceof GroupError) return { kind: 'error', text: error.message }
      throw error
    }
  }
}
