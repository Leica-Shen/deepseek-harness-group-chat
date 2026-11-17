/**
 * Host adapters: the only place Group-Chat touches a specific agent runtime.
 *
 * The domain (store / guard / policy / relay) is host-free. An adapter answers
 * three questions and nothing else:
 *
 *   capabilities()            what can this runtime actually do?
 *   listSessions()            which ordinary sessions exist?
 *   prompt({sessionId,…})     can it admit one text turn (and wake a session)?
 *
 * `startSubagent` is optional. A runtime without tool injection can still be a
 * member in "mailbox mode": messages are written as files and picked up at the
 * start of that agent's next turn. The panel says "收件箱模式" when that is the
 * case, instead of pretending a sleeping session was woken.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Best-effort extraction of provider-reported usage from a prompt result. */
export function usageTokensFrom(result) {
  if (!result || typeof result !== 'object') return undefined
  const direct = [result.totalTokens, result.tokens, result.usage?.totalTokens]
  for (const value of direct) {
    if (Number.isFinite(value) && value > 0) return Math.trunc(value)
  }
  const usage = result.usage
  if (usage && typeof usage === 'object') {
    const input = Number(usage.inputTokens ?? usage.promptTokens ?? usage.input_tokens ?? 0)
    const output = Number(usage.outputTokens ?? usage.completionTokens ?? usage.output_tokens ?? 0)
    if (Number.isFinite(input) && Number.isFinite(output) && input + output > 0) return Math.trunc(input + output)
  }
  return undefined
}

/** The DSH Host adapter: Session controller + subagents. */
export function createDshAdapter(ctx, { log = () => {} } = {}) {
  const controller = () => ctx.get('sessionController')
  const subagents = () => ctx.get('subagents')

  return Object.freeze({
    name: 'dsh',
    capabilities() {
      const session = controller()
      const sub = subagents()
      return {
        transport: 'dsh',
        wake: typeof session?.prompt === 'function',
        steer: typeof session?.prompt === 'function',
        listSessions: typeof session?.list === 'function',
        subagents: typeof sub?.start === 'function' && typeof sub?.list === 'function',
        identity: 'host',
        mailbox: false,
      }
    },
    async listSessions(signal) {
      const session = controller()
      if (typeof session?.list !== 'function') return []
      const value = await session.list({}, signal)
      return Array.isArray(value?.items) ? value.items : []
    },
    /**
     * Admit one text turn into a session.
     * @returns {Promise<{delivered: boolean, tokens?: number}>}
     */
    async prompt({ requestId, sessionId, mode, text, signal }) {
      const session = controller()
      if (typeof session?.prompt !== 'function') {
        const error = new Error('Session delivery is unavailable in this profile.')
        error.code = 'delivery-unavailable'
        throw error
      }
      const result = await session.prompt({
        requestId,
        sessionId,
        mode,
        content: [{ type: 'text', text }],
      }, signal)
      return { delivered: true, tokens: usageTokensFrom(result) }
    },
    listSubagentProviders() {
      const sub = subagents()
      if (typeof sub?.list !== 'function') return []
      try {
        return sub.list()
      } catch (error) {
        log('could not list subagent providers', error)
        return []
      }
    },
    async startSubagent({ provider, label, task, parent, signal, maxDepth = 0, toolFilter }) {
      const sub = subagents()
      if (typeof sub?.start !== 'function') throw new Error('Subagent delegation is unavailable in this profile.')
      return sub.start(provider, {
        label,
        prompt: [{ type: 'text', text: task }],
        parent,
        signal,
        maxDepth,
        ...(toolFilter ? { toolFilter } : {}),
      })
    },
  })
}

/**
 * Filesystem mailbox adapter for hosts without prompt injection (Codex CLI,
 * Aider, a plain MCP client).
 *
 * Layout:
 *   <dir>/<sessionId>/inbox/<timestamp>-<requestId>.json   one envelope
 *   <dir>/<sessionId>/outbox/…                            reserved for replies
 *
 * `listSessions()` treats every directory with an `inbox/` as a session. That
 * makes the adapter usable without a session registry: point it at a shared
 * folder and each agent owns its own mailbox.
 */
export function createMailboxAdapter({ dir, label = 'mailbox', log = () => {} }) {
  const root = String(dir ?? '').trim()
  if (!root) throw new Error('mailbox adapter requires a directory')
  const inboxOf = (sessionId) => join(root, encodeURIComponent(sessionId), 'inbox')

  return Object.freeze({
    name: label,
    capabilities() {
      return {
        transport: 'mailbox',
        wake: false,
        steer: false,
        // It can list existing mailboxes, but a not-yet-created mailbox is not
        // an invalid session. Do not gate membership on it.
        listSessions: false,
        subagents: false,
        identity: 'file',
        mailbox: true,
      }
    },
    async listSessions() {
      const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
      const items = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const sessionId = decodeURIComponent(entry.name)
        items.push({
          sessionId,
          title: sessionId,
          origin: 'ordinary',
          updatedAt: 0,
        })
      }
      return items
    },
    async prompt({ requestId, sessionId, text }) {
      if (sessionId === 'human') return { delivered: true }
      const inbox = inboxOf(sessionId)
      await mkdir(inbox, { recursive: true, mode: 0o700 })
      const file = join(inbox, `${Date.now()}-${String(requestId).replace(/[^\w.-]/gu, '_')}.json`)
      await writeFile(file, `${JSON.stringify({ sessionId, requestId, at: Date.now(), text }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      return { delivered: true }
    },
    /** Read (without consuming) one session's pending envelopes. */
    async readInbox(sessionId) {
      const inbox = inboxOf(sessionId)
      const names = await readdir(inbox).catch(() => [])
      const rows = []
      for (const name of names.sort()) {
        if (!name.endsWith('.json')) continue
        try {
          const parsed = JSON.parse(await readFile(join(inbox, name), 'utf8'))
          if (parsed && typeof parsed.text === 'string') rows.push({ name, ...parsed })
        } catch (error) {
          log(`mailbox: skipped unreadable ${name}`, error)
        }
      }
      return rows
    },
  })
}

/** Required adapter surface, exported for tests and documentation. */
export const ADAPTER_CONTRACT = Object.freeze({
  name: 'string',
  capabilities: '() => {transport, wake, steer, listSessions, subagents, identity, mailbox}',
  listSessions: 'async (signal) => [{sessionId, title, cwd, origin, running}]',
  prompt: 'async ({requestId, sessionId, mode, text, signal}) => {delivered, tokens?}',
  startSubagent: 'optional async ({provider, label, task, parent, signal, maxDepth, toolFilter}) => run',
})
