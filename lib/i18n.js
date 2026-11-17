/**
 * Host-side message catalog.
 *
 * The model-facing tools and the audit log stay in English on purpose: model
 * prompts and grep-able audit rows are more useful that way. Everything a
 * *person* can see in the Web panel is localized here from a stable error code,
 * so the panel never has to pattern-match English prose.
 *
 * Codes are the contract; `GroupError.message` remains the English fallback for
 * logs and for older clients.
 */

/** Normalize a requested language tag to the two catalogs we ship. */
export function normalizeLang(value) {
  const tag = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return tag.startsWith('zh') ? 'zh' : 'en'
}

/** Message templates. Keys mirror the codes thrown by store/service/index. */
const MESSAGES = {
  // Validation
  'invalid-name': ['Group name is required and must be at most {max} characters.', '群名不能为空，且最多 {max} 个字符。'],
  'invalid-topic': ['Group topic must be text of at most {max} characters.', '群主题必须是文本，且最多 {max} 个字符。'],
  'invalid-alias': ['Alias must start with a letter or digit and use only letters, digits, "_" or "-" (max 32).', '别名需以字母或数字开头，只能包含字母、数字、下划线或连字符，最多 32 个字符。'],
  'invalid-role': ['Role must be at most {max} characters.', '角色最多 {max} 个字符。'],
  'invalid-duties': ['Role duties must be at most {max} characters.', '角色职责最多 {max} 个字符。'],
  'empty-message': ['Message text is required.', '消息内容不能为空。'],
  'message-too-long': ['Messages are limited to {max} characters.', '单条消息最多 {max} 个字符。'],
  'invalid-session': ['That session id is not valid.', '会话 ID 无效。'],
  'empty-note': ['Note text is required.', '记录内容不能为空。'],
  'task-required': ['A delegation task is required.', '委派任务说明不能为空。'],
  'task-too-long': ['Delegation tasks are limited to {max} characters.', '委派任务最多 {max} 个字符。'],
  'bad-request': ['The request is not valid.', '请求无效。'],
  'body-too-large': ['The request body is too large.', '请求内容过大。'],
  'unsupported-action': ['That action is not supported by this Host.', '当前 Host 不支持该操作。'],

  // Lookup / access
  'group-not-found': ['That group was not found for this session.', '当前会话找不到这个群聊。'],
  'group-required': ['This session belongs to more than one group; specify the group name or id.', '当前会话在多个群聊里，请指定群名或群 ID。'],
  'ambiguous-group': ['More than one group matches "{ref}"; candidates: {candidates}.', '有多个群聊匹配「{ref}」，候选：{candidates}。'],
  'ambiguous-alias': ['More than one group has a member @{alias}; name the group first.', '多个群聊都有成员 @{alias}，请先指定群聊。'],
  'alias-not-found': ['No member has alias @{alias} in this group.', '这个群聊里没有别名 @{alias} 的成员。'],
  'role-not-found': ['No other member has role "{role}" in this group.', '这个群聊里没有其他成员使用角色「{role}」。'],
  'member-not-found': ['That member is not part of this group.', '该成员不在这个群聊里。'],
  'not-a-member': ['This session is not a member of that group.', '当前会话不是该群聊的成员。'],
  'owner-only': ['Only the group owner (or the human operator) can change this group.', '只有群主或人类操作者可以修改这个群聊。'],
  'human-only': ['The Web route acts only for the human operator.', '网页接口只代表人类操作者。'],
  'self-target': ['Choose another member: a group message is not sent back to its sender.', '请选择其他成员：群消息不会发回给发送者。'],
  'target-required': ['Choose a target: @alias, #role, or *.', '请选择发送目标：@别名、#角色 或 *。'],
  'no-recipients': ['That target would deliver to no other member.', '该目标没有其他成员可投递。'],
  'role-required': ['Only a secretary, organizer or the human operator can do that.', '只有秘书、组织者或人类操作者可以执行该操作。'],
  'session-not-found': ['Session "{session}" is not a visible session in this Host.', '会话「{session}」在当前 Host 中不可见。'],
  'session-not-ordinary': ['Session "{session}" is a subagent; groups address ordinary sessions only.', '会话「{session}」是子代理，群聊只接受普通会话。'],
  'duplicate-alias': ['Alias @{alias} is already used in this group.', '别名 @{alias} 已被本群使用。'],
  'duplicate-session': ['That session is already a member of this group.', '该会话已经是本群成员。'],
  'group-exists': ['A group with that name already exists; pick another name.', '已有同名群聊，请换一个名字。'],
  'too-many-members': ['A group can have at most {max} members (the human operator included).', '一个群聊最多 {max} 位成员（含人类操作者）。'],
  'too-many-groups': ['This Host has reached its group ceiling; delete a group before creating another.', '群聊数量已达上限，请先删除旧群。'],
  'cannot-remove-owner': ['The owner cannot be removed from its own group.', '群主不能被移出自己的群聊。'],
  'owner-cannot-leave': ['The owner cannot leave; dissolve or delete the group instead.', '群主不能退出，请解散或删除群聊。'],
  'human-cannot-leave': ['The human operator is not a member session; dissolve, archive or mute the group instead.', '人类操作者不是会话成员，请解散、归档或静音该群聊。'],
  'group-dissolved': ['This group is dissolved and read-only.', '该群聊已解散，只能查看。'],
  'sensitivity-human-only': ['This action needs the human operator; a secret room is panel-only.', '该操作只能由人类操作者执行；secret 群聊仅限面板。'],

  // Sending
  'fanout-exceeded': ['That target resolves to {count} recipients; the per-message fan-out limit is {max}. Send to an alias or role in batches.', '该目标有 {count} 位接收者，单次上限 {max} 位。请按 @别名 或角色分批发送。'],
  'purpose-required': ['Messages from non-organizer members need a purpose (verify, correct, review, anomaly, question, blocked, handoff).', '非组织者成员发消息必须声明目的（verify、correct、review、anomaly、question、blocked、handoff）。'],
  'rate-limited': ['Slow down: {detail}', '发送过于频繁：{detail}'],
  'quota-exceeded': ['Daily budget reached: {detail}', '今日额度已用完：{detail}'],
  'paused': ['Group chat is paused. Nothing is waking sessions until it is resumed.', '群聊已暂停：恢复前不会唤醒任何会话。'],
  'circuit-open': ['This room sent too many broadcasts in one hour and was paused for safety.', '本群一小时内广播过多，已自动暂停以确保安全。'],
  'secret-detected': ['That message looks like it contains a credential ({labels}). Group history is plain text; send a reference instead, or confirm explicitly in the panel.', '这条消息看起来包含凭据（{labels}）。群记录是明文；请改用引用，或在面板中明确确认后再发。'],
  'message-empty': ['Message text is required.', '消息内容不能为空。'],

  // Notes / delegation / relay
  'note-disabled': ['Audited notes are disabled for model tools in this profile.', '当前配置禁止模型写入审计记录。'],
  'delegate-disabled': ['Subagent delegation is disabled for model tools in this profile.', '当前配置禁止模型委派子代理。'],
  'delegation-unavailable': ['Subagent delegation is unavailable in this profile.', '当前 Host 不支持子代理委派。'],
  'delegation-quota': ['Daily delegation budget reached ({max}).', '今日委派额度已用完（{max}）。'],
  'delegation-failed': ['The delegated subagent failed or timed out; the audit log has the record.', '子代理失败或超时，审计记录已保留。'],
  'relay-disabled': ['Relay is disabled in this profile.', '当前配置已禁用传话筒。'],
  'relay-not-found': ['That relay was not found or has expired.', '该传话不存在或已过期。'],
  'relay-not-recipient': ['Only the addressed session can answer this relay.', '只有被指定的会话可以回复这条传话。'],
  'relay-closed': ['This relay is already {status}.', '该传话的状态已是「{status}」。'],
  'relay-rounds-exceeded': ['Relay round limit reached ({max}); ask the human to decide.', '传话轮次已达上限（{max}），请交给人类决定。'],
  'relay-loop': ['Chained relays are not allowed (A→B→C→…). Ask the human to coordinate.', '不允许链式传话（A→B→C…），请让人类协调。'],
  'relay-intent': ['Relay intent must be confirm, ask or handoff.', '传话意图只能是 confirm、ask 或 handoff。'],
  'relay-imperative': ['Relay messages may not carry instructions to ignore rules or call tools; use a reference plus human confirmation.', '传话内容不能包含"忽略规则/调用工具"这类指令；请改用引用并请人类确认。'],
  'relay-rate': ['Too many relays between these sessions; wait before trying again.', '这两个会话之间的传话太频繁，请稍后再试。'],
  'relay-paused': ['Relay is paused. Resume it before sending another message.', '传话筒已暂停，请恢复后再发。'],
  'relay-failed': ['The relay could not be delivered; see the Host log.', '传话未能送达，请查看 Host 日志。'],

  // Store / transport
  'store-unavailable': ['The group store is not safe to write; fix or move the data file.', '群聊数据文件不可安全写入；请修复或移走该文件。'],
  'store-locked': ['Another Harness process owns the group store; this window is read-only.', '另一个 Harness 进程正在使用群聊数据；当前窗口为只读。'],
  'cross-origin': ['Cross-origin requests are not allowed.', '不允许跨源请求。'],
  'internal': ['The group service hit an internal error.', '群聊服务内部错误。'],
  'unsupported': ['That operation is not supported by this Host version.', '当前 Host 版本不支持该操作。'],
  'unsupported-media-type': ['The request must be application/json.', '请求必须是 application/json。'],
  'audit-too-large': ['Too many audit rows requested.', '请求的审计条数过多。'],
}

/** One suggestion per failure family: what the person (or model) should do next. */
const SUGGESTIONS = {
  'rate-limited': ['Wait for the cooldown, then retry once. Do not resend in a loop.', '等冷却结束后再发一次；不要循环重试。'],
  'quota-exceeded': ['Use a direct @alias or wait for the next day; the ledger resets at local midnight.', '改用 @别名 单发，或等到本地零点额度重置。'],
  'fanout-exceeded': ['Send to @alias or #role instead of *.', '改用 @别名 或 #角色 分批发送。'],
  'purpose-required': ['Add purpose=review (or verify/correct/anomaly/question/blocked/handoff).', '补充 purpose=review（或 verify/correct/anomaly/question/blocked/handoff）。'],
  'secret-detected': ['Replace the credential with a file path or an environment variable name.', '把凭据替换成文件路径或环境变量名。'],
  'relay-rounds-exceeded': ['Ask the human operator to confirm the decision.', '请人类操作者确认该决定。'],
  'relay-loop': ['Return the answer to the original session instead of relaying again.', '把答案直接回给原会话，不要再次转述。'],
  'paused': ['Resume the group from the panel or /group resume.', '在面板或 /group resume 恢复群聊。'],
  'circuit-open': ['Ask the human to review the room and resume it from the panel.', '请人类检查该群后从面板恢复。'],
  'group-not-found': ['Check the group name, or open the panel to list groups.', '检查群名，或在面板里查看群列表。'],
  'owner-only': ['Ask the owner to make the change, or use the human panel.', '请群主操作，或使用人类面板。'],
  'store-unavailable': ['Fix or move $DSH_HOME/group-talk-l/groups.json, then restart Harness.', '修复或移走 $DSH_HOME/group-talk-l/groups.json 后重启 Harness。'],
}

/** Bilingual template lookup with `{param}` interpolation. */
export function translate(lang, key, params = {}) {
  const pair = MESSAGES[key]
  const template = pair ? pair[normalizeLang(lang) === 'zh' ? 1 : 0] : undefined
  if (template === undefined) return undefined
  return template.replace(/\{(\w+)\}/gu, (_, name) => String(params[name] ?? `{${name}}`))
}

/** Suggestion text for a code, or ''. */
export function suggestionFor(lang, code) {
  const pair = SUGGESTIONS[code]
  if (!pair) return ''
  return pair[normalizeLang(lang) === 'zh' ? 1 : 0]
}

/** Stable error codes the panel can rely on for status mapping. */
export const ERROR_CODES = Object.freeze(Object.keys(MESSAGES))

/**
 * Turn a domain error into the wire shape the panel consumes.
 *
 * @param {Error & {code?: string, retryAfterMs?: number, params?: object, labels?: string[]}} error
 * @param {string} lang requested language
 * @param {(message: string) => void} [log]
 */
export function errorPayload(error, lang = 'en', log = () => {}) {
  const code = typeof error?.code === 'string' && error.code ? error.code : 'internal'
  const params = {
    ...(error?.params ?? {}),
    ...(Array.isArray(error?.labels) && error.labels.length > 0 ? { labels: error.labels.join(', ') } : {}),
  }
  // `rate-limited` messages carry a human detail sentence from the guard; use
  // it when present so the panel can show the exact remaining seconds.
  if (code === 'rate-limited' && typeof error.detail === 'string' && error.detail) {
    params.detail = error.detail
  }
  if (code === 'quota-exceeded' && typeof error.detail === 'string' && error.detail) {
    params.detail = error.detail
  }
  const localized = translate(lang, code, params)
  const payload = {
    code,
    message: localized ?? error?.message ?? 'Group chat request failed.',
    messageEn: error?.message ?? 'Group chat request failed.',
    ...(Number.isFinite(error?.retryAfterMs) ? { retryAfterMs: Math.max(0, Math.trunc(error.retryAfterMs)) } : {}),
    ...(suggestionFor(lang, code) ? { suggestion: suggestionFor(lang, code) } : {}),
  }
  if (localized === undefined) log(`missing localized message for error code ${code}`)
  return payload
}

/** Localized one-liner for commands; falls back to the English message. */
export function localizeError(error, lang = 'zh') {
  const payload = errorPayload(error, lang)
  return payload.suggestion ? `${payload.message}\n${payload.suggestion}` : payload.message
}
