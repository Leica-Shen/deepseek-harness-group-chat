/**
 * Human-facing `/group` command.
 *
 * This is the low-friction path and the discoverable spelling of the trigger
 * protocol: `/group @alias <message>`, `/group #role <message>` and
 * `/group * <message>`. The Web header action offers the same operations with
 * session checkboxes; both paths call the same domain service.
 *
 * Output is localized with a tiny local catalog: the panel is the main surface,
 * but a person typing `/group` should not get an English-only answer. Errors
 * reuse the shared Host catalog in `i18n.js`.
 */
import { GroupError, HUMAN_SESSION } from './store.js'
import { buildHelp, memberLabel, renderHistory, renderRoster } from './policy.js'
import { localizeError } from './i18n.js'

/** Success/output strings for the two supported languages. */
const TEXT = {
  en: {
    created: 'Created group "{name}" ({id}).',
    createdHint: 'Add participants with /group add @<alias> <sessionId> [role], or use the Group chat panel to pick them.\nTalk to a member with /group @<alias> <message>.',
    renamed: 'Renamed group to "{name}".',
    added: 'Added {alias} to "{name}".',
    removed: 'Removed {member} from "{name}".',
    roleUpdated: 'Updated {member} in "{name}".',
    left: 'Left {alias} from "{name}".',
    dissolved: 'Dissolved group "{name}". Membership and transcript are frozen; the owner can delete it later.',
    deleted: 'Deleted group "{name}" ({id}) and its transcript.',
    deleteConfirm: 'Deleting "{name}" permanently removes the group and transcript. Repeat as /group delete {group}confirm',
    noGroups: 'There are no group chats yet.',
    sent: 'Sent to {target} in "{group}" ({id}).',
    duplicate: 'Duplicate suppressed; an identical message to {target} is still inside the dedupe window ({id}).',
    delivered: 'Delivered: {names}',
    deliveredNone: 'Delivered: none',
    failed: 'Failed: {names}',
    estimated: 'Estimated prompt allowance charged: {tokens} tokens.',
    dissolvedNote: 'This group is dissolved and read-only.',
    paused: 'Paused "{name}". Messages are recorded but no session is woken until /group resume.',
    resumed: 'Resumed "{name}".',
    pausedHost: 'Paused every group. Nothing wakes a session until /group resume *.',
    resumedHost: 'Resumed every group.',
    topicSet: 'Topic of "{name}" is now: {topic}',
    topicCleared: 'Topic of "{name}" cleared.',
    exported: 'Redacted export of "{name}" follows.',
    exportedSaved: 'Redacted export of "{name}" ({chars} characters; credentials and absolute paths removed).',
    cleaned: 'Removed missing session(s): {names}',
    cleanedNone: 'Every member session still exists.',
    relayed: 'Relay {id} ({intent}) sent to @{to}; the answer returns to this conversation, not the group.',
    relayPaused: 'Relay traffic is paused.',
    relayResumed: 'Relay traffic resumed.',
    noted: 'Recorded a {kind} in "{name}".',
    stats: 'Groups: {active} active / {total} total · messages: {messages} · estimated tokens: {estimated} · actual tokens: {actual} · rejections: {rejected}',
    relayUsage: 'Usage: /group relay @<alias> <message> · /group relay pause|resume',
  },
  zh: {
    created: '已创建群聊「{name}」（{id}）。',
    createdHint: '用 /group add @<别名> <会话ID> [角色] 添加参与者，或在群聊面板里勾选。\n用 /group @<别名> <消息> 和成员说话。',
    renamed: '群聊已改名为「{name}」。',
    added: '已把 {alias} 加入「{name}」。',
    removed: '已把 {member} 移出「{name}」。',
    roleUpdated: '已更新「{name}」中的 {member}。',
    left: '{alias} 已退出「{name}」。',
    dissolved: '已解散「{name}」。成员与记录转入只读，之后仍可删除。',
    deleted: '已删除群聊「{name}」（{id}）及其全部记录。',
    deleteConfirm: '删除「{name}」会永久移除群聊和全部记录。请再执行一次：/group delete {group}confirm',
    noGroups: '还没有群聊。',
    sent: '已发送到「{group}」的 {target}（{id}）。',
    duplicate: '已抑制重复消息：相同内容仍在去重窗口内（{id}）。',
    delivered: '已送达：{names}',
    deliveredNone: '已送达：无',
    failed: '失败：{names}',
    estimated: '已计入估算 prompt 额度：{tokens} tokens。',
    dissolvedNote: '该群聊已解散，只能查看。',
    paused: '已暂停「{name}」。消息仍会记录，但 /group resume 之前不会唤醒任何会话。',
    resumed: '已恢复「{name}」。',
    pausedHost: '已暂停全部群聊。/group resume * 之前不会唤醒任何会话。',
    resumedHost: '已恢复全部群聊。',
    topicSet: '「{name}」的主题已设为：{topic}',
    topicCleared: '已清除「{name}」的主题。',
    exported: '以下是「{name}」的脱敏导出。',
    exportedSaved: '已生成「{name}」的脱敏导出（{chars} 字符；凭据与绝对路径已移除）。',
    cleaned: '已移除不存在的会话：{names}',
    cleanedNone: '所有成员会话仍然存在。',
    relayed: '传话 {id}（{intent}）已发给 @{to}；答案会回到本会话，不进入群聊。',
    relayPaused: '传话筒已暂停。',
    relayResumed: '传话筒已恢复。',
    noted: '已在「{name}」记录一条{kind}。',
    stats: '群聊：{active} 进行中 / 共 {total} · 消息 {messages} · 估算 tokens {estimated} · 实际 tokens {actual} · 拒绝 {rejected}',
    relayUsage: '用法：/group relay @<别名> <消息> · /group relay pause|resume',
  },
}

/** Chinese quick reference for `/group help` (the panel is the main surface). */
const HELP_ZH = [
  '群聊让人类直接和已有会话说话，不合并它们的上下文。',
  '',
  '用法：',
  '  /group list',
  '  /group show [<群>]',
  '  /group @<别名> <消息>              发给单个成员',
  '  /group #<角色> <消息>              发给该角色的全部成员',
  '  /group * <消息>                    发给其他所有人',
  '  /group history [<群>] [条数]       最近记录',
  '  /group topic <文本>                设置群主题/当前共识',
  '  /group role @<别名> <角色>         设置角色与职责',
  '  /group add @<别名> <会话ID> [角色]',
  '  /group remove @<别名>',
  '  /group new <名称>                  新建空群',
  '  /group rename <名称>               重命名',
  '  /group pause [<群>|*]              暂停：只记录、不唤醒',
  '  /group resume [<群>|*]             恢复',
  '  /group relay @<别名> <消息>        一对一确认（不写入群记录）',
  '  /group relay pause|resume          暂停/恢复全部传话',
  '  /group note|decision <文本>        写审计记录/决定',
  '  /group export [<群>]               脱敏导出',
  '  /group cleanup                     移除已不存在的成员会话',
  '  /group stats                       运行统计',
  '  /group leave [<群>]                成员会话退出',
  '  /group dissolve [<群>]             解散（只读）',
  '  /group delete [<群>] confirm       永久删除',
  '',
  '目标是 @别名（单个）、#角色（同角色全部）或 *（其他所有人）；@human 是面板里的你。',
  '非组织者成员发消息必须带 purpose（verify/correct/review/anomaly/question/blocked/handoff）。',
  '发送有冷却、去重、凭据扫描、fan-out 与每日额度；广播前会先显示成本。',
  '每日额度按本地零点重置。',
].join('\n')

/** Interpolate a local template. */
function t(lang, key, values = {}) {
  const pair = TEXT[lang] ?? TEXT.en
  const template = pair[key] ?? TEXT.en[key] ?? key
  return String(template).replace(/\{(\w+)\}/gu, (_, name) => String(values[name] ?? `{${name}}`))
}

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
    case 'stats':
      return { kind: 'stats' }
    case 'show':
      return { kind: 'show', group: rest || undefined }
    case 'new':
    case 'create':
      return rest ? { kind: 'new', name: rest } : { kind: 'invalid', text: 'Usage: /group new <name>' }
    case 'rename':
      return rest ? { kind: 'rename', rest } : { kind: 'invalid', text: 'Usage: /group rename [<group> to] <name>' }
    case 'topic': {
      if (!rest) return { kind: 'invalid', text: 'Usage: /group topic <text>' }
      return { kind: 'topic', topic: rest }
    }
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
    case 'pause':
      return { kind: 'pause', group: rest === '*' ? '*' : (rest || undefined) }
    case 'resume':
      return { kind: 'resume', group: rest === '*' ? '*' : (rest || undefined) }
    case 'cleanup':
      return { kind: 'cleanup', group: rest || undefined }
    case 'export':
      return { kind: 'export', group: rest || undefined }
    case 'relay': {
      if (!rest) return { kind: 'invalid', text: '/group relay @<alias> <message> · /group relay pause|resume' }
      if (rest === 'pause' || rest === 'resume') return { kind: 'relayPause', paused: rest === 'pause' }
      const match = /^(@?\S+)\s+([\s\S]+)$/u.exec(rest)
      if (!match) return { kind: 'invalid', text: 'Usage: /group relay @<alias> <message>' }
      return { kind: 'relay', to: match[1], message: match[2].trim() }
    }
    case 'note':
    case 'decision':
      return rest ? { kind: 'note', noteKind: head, text: rest } : { kind: 'invalid', text: 'Usage: /group note|decision <text>' }
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
    `Group "${group.name}" · ${group.id} · ${group.status}${group.paused ? ' · paused' : ''}`,
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
function renderSend(result, lang) {
  const delivered = result.deliveries.filter((delivery) => delivery.status === 'delivered' || delivery.status === 'read')
  const failed = result.failures
  const lines = [
    result.deduplicated
      ? t(lang, 'duplicate', { target: result.target, id: result.messageId })
      : t(lang, 'sent', { target: result.target, group: result.group.name, id: result.messageId }),
    delivered.length > 0 ? t(lang, 'delivered', { names: delivered.map((item) => `@${item.alias}`).join(', ') }) : t(lang, 'deliveredNone'),
  ]
  if (result.held) lines.push(lang === 'zh' ? '群聊已暂停：消息已记录，未唤醒任何会话。' : 'The group is paused: the message was recorded without waking anyone.')
  if (result.estimatedTokens > 0) lines.push(t(lang, 'estimated', { tokens: result.estimatedTokens }))
  if (failed.length > 0) {
    lines.push(t(lang, 'failed', { names: failed.map((item) => `@${item.alias} (${item.error ?? 'delivery failed'})`).join('; ') }))
  }
  if (result.group.status !== 'active') lines.push(t(lang, 'dissolvedNote'))
  return lines.join('\n')
}

/** Build the `/group` handler bound to the domain service. */
export function createGroupCommand(service, { lang = 'en' } = {}) {
  const resolveLang = (invocation) => {
    const requested = invocation?.lang ?? invocation?.locale ?? lang
    return String(requested).toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return async (invocation) => {
    // `/group` is typed by the person, so it acts for the human operator, not
    // for whichever session happens to be focused.
    const sessionId = HUMAN_SESSION
    const language = resolveLang(invocation)
    try {
      await service.ready()
      const parsed = parseGroupCommand(invocation.rawInput)
      switch (parsed.kind) {
        case 'help':
          return { kind: 'success', text: language === 'zh' ? HELP_ZH : buildHelp() }
        case 'invalid':
          return { kind: 'error', text: parsed.text }
        case 'list': {
          const groups = service.listFor(sessionId)
          if (groups.length === 0) return { kind: 'success', text: `${t(language, 'noGroups')}\n\n${language === 'zh' ? HELP_ZH : buildHelp()}` }
          return {
            kind: 'success',
            text: groups
              .map((group) => {
                const participants = group.members.filter((member) => member.sessionId !== HUMAN_SESSION).length
                return `- "${group.name}" (${group.id}) · ${group.status}${group.paused ? ' · paused' : ''} · ${participants} participants`
              })
              .join('\n'),
          }
        }
        case 'stats': {
          const stats = service.statsFor()
          return {
            kind: 'success',
            text: t(language, 'stats', {
              active: stats.groups.active.length,
              total: stats.groups.total,
              messages: stats.counters.sends,
              estimated: stats.estimatedTokens,
              actual: stats.actualTokens,
              rejected: stats.counters.rejected,
            }),
          }
        }
        case 'show': {
          const groups = service.listFor(sessionId)
          if (!parsed.group && groups.length === 0) return { kind: 'success', text: `${t(language, 'noGroups')}\n\n${language === 'zh' ? HELP_ZH : buildHelp()}` }
          const group = parsed.group
            ? service.resolveFor(sessionId, parsed.group, { activeOnly: false })
            : service.resolveFor(sessionId, undefined, { activeOnly: false })
          return { kind: 'success', text: renderGroup(group, sessionId) }
        }
        case 'new': {
          const group = await service.create(sessionId, { name: parsed.name })
          return {
            kind: 'success',
            text: [t(language, 'created', { name: group.name, id: group.id }), renderRoster(group), '', t(language, 'createdHint')].join('\n'),
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
          return { kind: 'success', text: t(language, 'renamed', { name: group.name }) }
        }
        case 'topic': {
          const group = await service.setTopic(sessionId, undefined, parsed.topic)
          return {
            kind: 'success',
            text: group.topic ? t(language, 'topicSet', { name: group.name, topic: group.topic }) : t(language, 'topicCleared', { name: group.name }),
          }
        }
        case 'add': {
          const group = await service.addMember(sessionId, undefined, {
            sessionId: parsed.sessionId,
            alias: parsed.alias,
            role: parsed.role,
          })
          return { kind: 'success', text: `${t(language, 'added', { alias: parsed.alias, name: group.name })}\n${renderRoster(group)}` }
        }
        case 'remove': {
          const group = await service.removeMember(sessionId, undefined, parsed.member)
          return { kind: 'success', text: `${t(language, 'removed', { member: parsed.member, name: group.name })}\n${renderRoster(group)}` }
        }
        case 'role': {
          const group = await service.setRole(sessionId, undefined, parsed.member, parsed.role)
          return {
            kind: 'success',
            text: `${t(language, 'roleUpdated', { member: `@${parsed.member.replace(/^@/u, '')}`, name: group.name })}\n${renderRoster(group)}`,
          }
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
          return { kind: 'success', text: renderSend(result, language) }
        }
        case 'pause': {
          if (parsed.group === '*') {
            await service.pauseHost(sessionId, true)
            return { kind: 'success', text: t(language, 'pausedHost') }
          }
          const group = await service.pauseGroup(sessionId, parsed.group, true)
          return { kind: 'success', text: t(language, 'paused', { name: group.name }) }
        }
        case 'resume': {
          if (parsed.group === '*') {
            await service.pauseHost(sessionId, false)
            return { kind: 'success', text: t(language, 'resumedHost') }
          }
          const group = await service.pauseGroup(sessionId, parsed.group, false)
          return { kind: 'success', text: t(language, 'resumed', { name: group.name }) }
        }
        case 'relay': {
          if (!service.config.allowRelay) throw new GroupError('relay-disabled', 'Relay is disabled in this profile.')
          const relay = await service.relay(sessionId, { to: parsed.to, message: parsed.message, intent: 'confirm' })
          return { kind: 'success', text: t(language, 'relayed', { id: relay.id, intent: relay.intent, to: relay.peer.alias }) }
        }
        case 'relayPause': {
          await service.pauseRelay(sessionId, parsed.paused)
          return { kind: 'success', text: t(language, parsed.paused ? 'relayPaused' : 'relayResumed') }
        }
        case 'note': {
          const group = await service.note(sessionId, undefined, parsed.text, { kind: parsed.noteKind === 'decision' ? 'decision' : 'note' })
          return { kind: 'success', text: t(language, 'noted', { kind: parsed.noteKind === 'decision' ? (language === 'zh' ? '决定' : 'decision') : (language === 'zh' ? '记录' : 'note'), name: group.name }) }
        }
        case 'export': {
          const exported = service.exportGroup(sessionId, parsed.group)
          return {
            kind: 'success',
            text: `${t(language, 'exported', { name: exported.group.name })}\n\n${exported.text.length > 12000 ? `${exported.text.slice(0, 12000)}\n…` : exported.text}`,
          }
        }
        case 'cleanup': {
          const result = await service.removeMissingMembers(sessionId, parsed.group)
          return {
            kind: 'success',
            text: result.removed.length > 0
              ? t(language, 'cleaned', { names: result.removed.map((alias) => `@${alias}`).join(', ') })
              : t(language, 'cleanedNone'),
          }
        }
        case 'leave': {
          // Leaving is about the session the human is typing in, not the panel.
          const caller = invocation.agent?.id
          if (!caller) return { kind: 'error', text: 'Leaving needs a calling session.' }
          const result = await service.leave(caller, parsed.group)
          return { kind: 'success', text: t(language, 'left', { alias: `@${result.alias}`, name: result.group.name }) }
        }
        case 'dissolve': {
          const group = await service.dissolve(sessionId, parsed.group)
          return { kind: 'success', text: t(language, 'dissolved', { name: group.name }) }
        }
        case 'delete': {
          if (!parsed.confirmed) {
            const group = service.resolveFor(sessionId, parsed.group, { activeOnly: false })
            return {
              kind: 'error',
              text: t(language, 'deleteConfirm', { name: group.name, group: parsed.group ? `${parsed.group} ` : '' }),
            }
          }
          const group = await service.delete(sessionId, parsed.group)
          return { kind: 'success', text: t(language, 'deleted', { name: group.name, id: group.id }) }
        }
        default:
          return { kind: 'success', text: language === 'zh' ? HELP_ZH : buildHelp() }
      }
    } catch (error) {
      if (error instanceof GroupError) return { kind: 'error', text: localizeError(error, language) }
      throw error
    }
  }
}
