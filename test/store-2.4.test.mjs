import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { GroupStore, GroupError, pruneRetention, redactMessage, emptyState } from '../lib/store.js'

async function workspace() {
  return mkdtemp(join(tmpdir(), 'dsh-group-talk-l-store24-'))
}

function group(id, name = 'Room') {
  return {
    id,
    name,
    topic: '',
    ownerSessionId: 'human',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    members: [
      { sessionId: 'human', alias: 'human', role: 'human', roleId: 'custom', duties: '', joinedAt: 1 },
      { sessionId: 's-a', alias: 'alice', role: 'Designer', roleId: 'designer', duties: '', joinedAt: 1 },
    ],
    messages: [{
      id: `msg_${id}`,
      kind: 'message',
      at: Date.now(),
      fromSessionId: 'human',
      fromAlias: 'human',
      target: '@alice',
      text: 'hello',
      deliveries: [{ sessionId: 's-a', alias: 'alice', status: 'delivered' }],
    }],
    audit: [],
  }
}

test('an advisory lock keeps a second live process read-only', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  // Simulation: a live foreign owner. pid 1 exists on POSIX and is not us.
  await writeFile(`${file}.lock`, `${JSON.stringify({ pid: 1, startedAt: Date.now() })}\n`)
  const blocked = new GroupStore({ file, lock: true })
  await blocked.ready
  assert.ok(blocked.loadFailure)
  assert.equal(blocked.loadFailure.code, 'store-locked')
  await assert.rejects(blocked.write((draft) => { draft.groups.grp_x = group('grp_x') }), (error) => error.code === 'store-locked')
})

test('a stale lock is reclaimed and released on dispose', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  await writeFile(`${file}.lock`, `${JSON.stringify({ pid: 999999, startedAt: 1 })}\n`)
  const store = new GroupStore({ file, lock: true })
  await store.ready
  assert.equal(store.loadFailure, undefined)
  await store.write((draft) => { draft.groups.grp_x = group('grp_x') })
  await store.write((draft) => { draft.groups.grp_x.name = 'Renamed' })
  await store.dispose()
  const reloaded = new GroupStore({ file, lock: true })
  await reloaded.ready
  assert.equal(reloaded.loadFailure, undefined)
  assert.equal(reloaded.get('grp_x').name, 'Renamed')
  await reloaded.dispose()
})

test('persisted state carries schema 2 and the new ledgers', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  const store = new GroupStore({ file })
  await store.write((draft) => { draft.groups.grp_x = group('grp_x') })
  const disk = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(disk.version, 2)
  assert.deepEqual(disk.relays, {})
  assert.equal(disk.gate.paused, false)
  assert.equal(disk.gate.relayPaused, false)
})

test('retention trims chat rows and keeps control rows', () => {
  const state = emptyState()
  const target = group('grp_r')
  target.messages.push({
    id: 'msg_old',
    kind: 'message',
    at: Date.now() - 40 * 86400000,
    fromAlias: 'alice',
    text: 'forty days old',
    deliveries: [],
  })
  target.audit.push({ id: 'ctl_1', kind: 'control', at: Date.now() - 40 * 86400000, action: 'note', text: 'kept' })
  state.groups[target.id] = target
  const result = pruneRetention(state, { now: Date.now(), retentionDays: 30 })
  assert.equal(result.removed, 1)
  assert.equal(state.groups.grp_r.messages.some((row) => row.id === 'msg_old'), false)
  assert.equal(state.groups.grp_r.audit.length, 1)
})

test('redaction replaces the text, drops receipts and appends an audit fact', () => {
  const target = group('grp_d')
  const row = target.messages[0]
  const redacted = redactMessage(target, row.id, 5)
  assert.equal(redacted.redacted, true)
  assert.match(redacted.text, /\[redacted sha256:[0-9a-f]{12}\]/u)
  assert.equal(redacted.deliveries.length, 0)
  assert.equal(target.audit.at(-1).action, 'redact')
  assert.equal(redactMessage(target, row.id), undefined)
})

test('a group name is unique while active, and dissolved rooms do not consume the active ceiling', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  const store = new GroupStore({ file })
  const { GroupService } = await import('../lib/service.js')
  const service = new GroupService({
    store,
    ctx: { get: () => undefined },
    adapter: {
      name: 'fake',
      capabilities: () => ({ transport: 'fake', wake: false, listSessions: false, subagents: false, mailbox: true }),
      async listSessions() { return [] },
      async prompt() { return { delivered: true } },
    },
    config: { maxGroupsTotal: 2, maxGroupsPerSession: 12, maxMembersPerGroup: 16, sendCooldownMs: 0 },
    log: () => {},
  })
  await service.ready()
  const first = await service.create('human', { name: 'Same name' })
  await assert.rejects(service.create('human', { name: 'same NAME' }), (error) => error.code === 'group-exists')
  await service.dissolve('human', first.id)
  const second = await service.create('human', { name: 'Another room' })
  assert.equal(second.status, 'active')
  await service.dispose()
})

test('the reference resolver names the candidates instead of a bare ambiguity error', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  const store = new GroupStore({ file })
  await store.write((draft) => {
    draft.groups.grp_1 = group('grp_1', 'Review')
    draft.groups.grp_2 = group('grp_2', 'Review')
  })
  const { GroupService } = await import('../lib/service.js')
  const service = new GroupService({
    store,
    ctx: { get: () => undefined },
    adapter: { name: 'fake', capabilities: () => ({ transport: 'fake', wake: false, listSessions: false, mailbox: true }), async listSessions() { return [] }, async prompt() { return { delivered: true } } },
    config: {},
    log: () => {},
  })
  await service.ready()
  await assert.rejects(
    Promise.resolve().then(() => service.resolveFor('human', 'Review')),
    (error) => error instanceof GroupError && /grp_1/u.test(error.message) && /grp_2/u.test(error.message),
  )
  await service.dispose()
})
