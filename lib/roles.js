/**
 * Role presets shared by the Host and the Web client.
 *
 * Roles are advisory labels, never authority. The one thing the old schema got
 * wrong was storing the *localized* label as identity: switching the interface
 * language turned `#Participant` into a different string and `#角色` stopped
 * routing. A member now stores a stable `roleId` next to the display label, and
 * `#role` matches the id, the current label or either preset translation.
 */

export const ROLE_PRESETS = Object.freeze([
  { id: 'participant', en: 'Participant', zh: '参与者', dutiesEn: '', dutiesZh: '' },
  { id: 'designer', en: 'Designer', zh: '设计师', dutiesEn: 'Owns visual direction, layout and interaction detail', dutiesZh: '负责视觉、版式、交互与观感细节' },
  { id: 'judge', en: 'Judge', zh: '评委', dutiesEn: 'Reviews independently, scores the work and names concrete problems', dutiesZh: '独立评审、打分并明确指出问题' },
  { id: 'researcher', en: 'Researcher', zh: '研究员', dutiesEn: 'Thinks through the problem, supplies the theory and an executable plan', dutiesZh: '负责思考，提供理论基础与可执行计划' },
  { id: 'experimenter', en: 'Experimenter', zh: '实验员', dutiesEn: 'Acts as the test subject and reports first-hand results', dutiesZh: '像实验对象一样先试，给出一手反馈' },
  { id: 'secretary', en: 'Secretary', zh: '秘书', dutiesEn: 'Records minutes, logs and rollback notes, and corrects misinformation in the room', dutiesZh: '记录信息、撰写日志与回退记录，纠正群内潜在的错误信息' },
  { id: 'organizer', en: 'Organizer', zh: '组织者', dutiesEn: 'Plans work, keeps information ordered, dispatches tasks and prevents conflicts, floods and mistakes', dutiesZh: '安排工作、维持信息秩序、综合调度任务，防止冲突、洪水和错误' },
  { id: 'security', en: 'Security Lead', zh: '安全主管', dutiesEn: 'Reviews delegation, permissions, secrets and prompt-injection risk; records veto/remediation notes', dutiesZh: '审查委派、权限、密钥与提示注入风险，提出否决/整改建议并记录安全审计' },
])

const BY_ID = new Map(ROLE_PRESETS.map((preset) => [preset.id, preset]))
const BY_LABEL = new Map()
for (const preset of ROLE_PRESETS) {
  BY_LABEL.set(preset.en.toLowerCase(), preset.id)
  BY_LABEL.set(preset.zh.toLowerCase(), preset.id)
}

/** Fold a label for matching (width and case insensitive). */
export function foldRole(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').trim()
}

/** Stable id for a stored role label, or `custom` when it is free text. */
export function roleIdOf(value) {
  const preset = BY_ID.get(String(value ?? '').trim())
  if (preset) return preset.id
  return BY_LABEL.get(foldRole(value)) ?? 'custom'
}

/** Display label for a preset id in one language; `custom` stays undefined. */
export function roleLabel(id, lang = 'en') {
  const preset = BY_ID.get(String(id ?? ''))
  if (!preset) return undefined
  return String(lang).toLowerCase().startsWith('zh') ? preset.zh : preset.en
}

/** Duties sentence for a preset id in one language. */
export function roleDuties(id, lang = 'en') {
  const preset = BY_ID.get(String(id ?? ''))
  if (!preset) return undefined
  return String(lang).toLowerCase().startsWith('zh') ? preset.dutiesZh : preset.en
}

/**
 * Whether a member matches a `#role` selector.
 * Accepts the stored id, the stored label, or either preset translation, so a
 * room created before the language switch keeps routing.
 */
export function roleMatches(member, query) {
  const needle = foldRole(query)
  if (!needle || !member) return false
  if (foldRole(member.roleId) === needle) return true
  if (foldRole(member.role) === needle) return true
  const id = member.roleId ?? roleIdOf(member.role)
  const preset = BY_ID.get(id)
  if (!preset) return false
  return foldRole(preset.en) === needle || foldRole(preset.zh) === needle || preset.id === needle
}

/** Whether a member holds one of the privileged role ids. */
export function hasPresetRole(member, ids) {
  if (!member) return false
  const id = member.roleId ?? roleIdOf(member.role)
  return ids.has(id)
}

/** Resolved display role for the panel: localized label, falling back to the stored text. */
export function displayRole(member, lang) {
  return roleLabel(member?.roleId, lang) ?? member?.role ?? ''
}
