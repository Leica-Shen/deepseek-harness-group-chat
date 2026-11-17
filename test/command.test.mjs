import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createGroupCommand, parseGroupCommand } from '../lib/command.js'
import { GroupError, GroupStore } from '../lib/store.js'
import { GroupService } from '../lib/service.js'

test('parses target shorthand and management forms', () => {
  assert.deepEqual(parseGroupCommand(' @bob please look'), {
    kind: 'send',
    group: undefined,
    target: '@bob',
    message: 'please look',
  })
  assert.deepEqual(parseGroupCommand(' #reviewer check'), {
    kind: 'send',
    group: undefined,
    target: '#reviewer',
    message: 'check',
  })
  assert.deepEqual(parseGroupCommand(' * shipped'), {
    kind: 'send',
    group: undefined,
    target: '*',
    message: 'shipped',
  })
  assert.equal(parseGroupCommand('').kind, 'help')
  assert.deepEqual(parseGroupCommand(' new Release review'), { kind: 'new', name: 'Release review' })
  assert.deepEqual(parseGroupCommand(' add @bob session-b Reviewer'), {
    kind: 'add',
    alias: '@bob',
    sessionId: 'session-b',
    role: 'Reviewer',
  })
  assert.deepEqual(parseGroupCommand(' role @bob Lead reviewer'), {
    kind: 'role',
    member: '@bob',
    role: 'Lead reviewer',
  })
  assert.deepEqual(parseGroupCommand(' leave'), { kind: 'leave', group: undefined })
  assert.deepEqual(parseGroupCommand(' delete Research confirm'), {
    kind: 'delete',
    group: 'Research',
    confirmed: true,
  })
  assert.deepEqual(parseGroupCommand(' delete'), { kind: 'delete', group: undefined, confirmed: false })
  assert.deepEqual(parseGroupCommand(' history Research 5'), { kind: 'history', group: 'Research', limit: 5 })
  assert.deepEqual(parseGroupCommand(' send Research @bob hello there'), {
    kind: 'send',
    group: 'Research',
    target: '@bob',
    message: 'hello there',
  })
  assert.equal(parseGroupCommand('what').kind, 'help')
})

test('the command drives the same durable service as the panel', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-command-'))
  const calls = []
  const ctx = {
    get(name) {
      if (name !== 'sessionController') return undefined
      return {
        async list() { return { items: [{ sessionId: 'session-a' }, { sessionId: 'session-b' }] } },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal');
          calls.push(request);
          return { accepted: true }
        },
      }
    },
  }
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 50 })
  const service = new GroupService({
    store,
    ctx,
    config: { historyLimit: 50, maxGroupsPerSession: 12, maxMembersPerGroup: 16, maxGroupsTotal: 100, deliveryMode: 'queue', sendCooldownMs: 0, dedupeWindowMs: 0 },
    log: () => {},
  })
  const handler = createGroupCommand(service, { lang: 'en' })
  const invoke = (rawInput) => handler({ agent: { id: 'session-a' }, rawInput })

  const created = await invoke(' new Review')
  assert.equal(created.kind, 'success')
  assert.match(created.text, /Created group "Review"/)

  const added = await invoke(' add @bob session-b Reviewer')
  assert.equal(added.kind, 'success')
  assert.match(added.text, /@bob/)

  const listed = await invoke(' list')
  assert.match(listed.text, /Review/)

  const sent = await invoke(' @bob please review')
  assert.equal(sent.kind, 'success')
  assert.match(sent.text, /Sent to @bob/)
  assert.equal(calls.length, 1)

  const left = await handler({ agent: { id: 'session-b' }, rawInput: ' leave' })
  assert.equal(left.kind, 'success')
  assert.match(left.text, /Left @bob/)
  const ownerLeave = await invoke(' leave')
  assert.equal(ownerLeave.kind, 'error')
  assert.match(ownerLeave.text, /does not belong|not a member|dissolve|not found/i)

  const bad = await invoke(' delete')
  assert.equal(bad.kind, 'error')
  assert.match(bad.text, /Repeat as \/group delete confirm|permanently removes/)

  const dissolved = await invoke(' dissolve')
  assert.match(dissolved.text, /Dissolved group/)
  const deleted = await invoke(' delete confirm')
  assert.match(deleted.text, /Deleted group/)
})

test('the 2.4 command grammar parses pause, relay, topic, export and notes', () => {
  assert.deepEqual(parseGroupCommand('pause'), { kind: 'pause', group: undefined })
  assert.deepEqual(parseGroupCommand('pause *'), { kind: 'pause', group: '*' })
  assert.deepEqual(parseGroupCommand('resume Review'), { kind: 'resume', group: 'Review' })
  assert.deepEqual(parseGroupCommand('relay @bob Is Friday ok?'), { kind: 'relay', to: '@bob', message: 'Is Friday ok?' })
  assert.deepEqual(parseGroupCommand('relay pause'), { kind: 'relayPause', paused: true })
  assert.deepEqual(parseGroupCommand('relay resume'), { kind: 'relayPause', paused: false })
  assert.deepEqual(parseGroupCommand('topic Ship on Friday'), { kind: 'topic', topic: 'Ship on Friday' })
  assert.deepEqual(parseGroupCommand('export Review'), { kind: 'export', group: 'Review' })
  assert.deepEqual(parseGroupCommand('decision We ship Friday'), { kind: 'note', noteKind: 'decision', text: 'We ship Friday' })
  assert.deepEqual(parseGroupCommand('cleanup'), { kind: 'cleanup', group: undefined })
  assert.deepEqual(parseGroupCommand('stats'), { kind: 'stats' })
})

test('command output is localized and structured failures keep their advice', async () => {
  const calls = []
  const service = {
    ready: async () => {},
    config: { allowRelay: true },
    listFor: () => [],
    statsFor: () => ({ groups: { active: [], total: 0 }, counters: { sends: 0, rejected: 0 }, estimatedTokens: 0, actualTokens: 0 }),
    pauseHost: async (sessionId, paused) => { calls.push(['pauseHost', sessionId, paused]); return { paused } },
    pauseGroup: async () => { calls.push(['pauseGroup']); return { name: 'Review' } },
    resolveFor: () => { throw new GroupError('group-not-found', 'not found') },
    delete: async () => { throw new GroupError('group-not-found', 'not found') },
  }
  const handler = createGroupCommand(service, { lang: 'zh' })
  const empty = await handler({ rawInput: 'list' })
  assert.match(empty.text, /还没有群聊/u)
  const paused = await handler({ rawInput: 'pause *' })
  assert.match(paused.text, /已暂停全部群聊/u)
  assert.deepEqual(calls[0], ['pauseHost', 'human', true])
  const missing = await handler({ rawInput: 'show Missing' })
  assert.equal(missing.kind, 'error')
  assert.match(missing.text, /找不到/u)
})
