import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  ALIAS_PATTERN,
  GroupStore,
  normalizeAlias,
  normalizeMessage,
  normalizeName,
  normalizeState,
  resolveDataFile,
  resolveGroupReference,
  viewOfGroup,
} from '../lib/store.js'

async function workspace() {
  return mkdtemp(join(tmpdir(), 'dsh-group-talk-l-store-'))
}

function group(id, name = 'Review') {
  return {
    id,
    name,
    topic: '',
    ownerSessionId: 'A',
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    members: [
      { sessionId: 'A', alias: 'owner', role: 'owner', duties: '', joinedAt: 1 },
      { sessionId: 'B', alias: 'bob', role: 'Reviewer', duties: '', joinedAt: 1 },
    ],
    messages: [],
  }
}

test('normalizes names, aliases and messages', () => {
  assert.equal(normalizeName('  Release   review  '), 'Release review')
  assert.equal(normalizeAlias('@审阅者'), '审阅者')
  assert.equal(normalizeAlias(' reviewer_1 '), 'reviewer_1')
  assert.ok(ALIAS_PATTERN.test('组员-2'))
  assert.throws(() => normalizeAlias('two words'), /Alias must start/)
  assert.throws(() => normalizeAlias('all'), /reserved/)
  assert.throws(() => normalizeName('   '), /required/)
  assert.equal(normalizeMessage('  hello\nworld  '), 'hello\nworld')
  assert.throws(() => normalizeMessage(' '), /required/)
})

test('resolves a group reference by id, exact name, then unique prefix', () => {
  const groups = [group('grp_a', 'Release'), group('grp_b', 'Research')]
  assert.equal(resolveGroupReference(groups, 'grp_b').id, 'grp_b')
  assert.equal(resolveGroupReference(groups, 'Release').id, 'grp_a')
  assert.equal(resolveGroupReference(groups, 'Rese').id, 'grp_b')
  assert.throws(() => resolveGroupReference(groups, 'R'), /more than one/)
  assert.throws(() => resolveGroupReference(groups, 'Missing'), /not found/)
  assert.equal(resolveGroupReference([groups[0]], undefined).id, 'grp_a')
  assert.throws(() => resolveGroupReference(groups, undefined), /specify/)
})

test('persists and reloads a group atomically', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  const store = new GroupStore({ file, historyLimit: 20 })
  await store.ready
  await store.write((draft) => {
    draft.groups.grp_a = group('grp_a')
  })
  const disk = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(disk.version, 1)
  assert.equal(disk.groups.grp_a.name, 'Review')

  const reloaded = new GroupStore({ file, historyLimit: 20 })
  await reloaded.ready
  assert.equal(reloaded.get('grp_a').members[1].alias, 'bob')
  assert.equal(reloaded.groupsFor('B').length, 1)
  assert.equal(reloaded.groupsFor('A')[0].members.length, 2)
})

test('moves a corrupt document aside instead of overwriting it', async () => {
  const dir = await workspace()
  const file = join(dir, 'groups.json')
  await writeFile(file, '{not json', 'utf8')
  const messages = []
  const store = new GroupStore({ file, historyLimit: 20, log: (message) => messages.push(message) })
  await store.ready
  assert.deepEqual(store.groupsFor('A'), [])
  const files = await readdir(dir)
  assert.ok(files.some((name) => name.startsWith('groups.json.corrupt-')))
  assert.ok(messages.some((message) => message.includes('moved unreadable')))
})

test('drops invalid persisted groups without dropping valid ones', () => {
  const raw = {
    version: 1,
    groups: {
      grp_ok: group('grp_ok'),
      grp_bad: { ...group('grp_bad'), members: [] },
      grp_alias: {
        ...group('grp_alias'),
        members: [
          { sessionId: 'A', alias: 'same', role: 'owner', joinedAt: 1 },
          { sessionId: 'B', alias: 'SAME', role: 'Reviewer', joinedAt: 1 },
        ],
      },
    },
  }
  const { state, issues } = normalizeState(raw, { historyLimit: 20 })
  assert.ok(state.groups.grp_ok)
  assert.equal(state.groups.grp_bad, undefined)
  assert.equal(state.groups.grp_alias.members.length, 1)
  assert.ok(issues.length >= 1)
})

test('bounds transcripts and view messages', async () => {
  const dir = await workspace()
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 3 })
  await store.ready
  await store.write((draft) => {
    const value = group('grp_a')
    value.messages = Array.from({ length: 6 }, (_, index) => ({
      id: `msg_${index}`,
      kind: 'message',
      at: index,
      fromAlias: 'owner',
      target: '@bob',
      text: `m${index}`,
      deliveries: [],
    }))
    draft.groups.grp_a = value
  })
  const view = viewOfGroup(store.get('grp_a'), 'A', { messageLimit: 2 })
  assert.equal(view.messageTotal, 6)
  assert.deepEqual(view.messages.map((message) => message.text), ['m4', 'm5'])
})

test('resolves the data file under DSH_HOME', () => {
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = '/tmp/dsh-test-home'
  try {
    assert.equal(resolveDataFile(''), '/tmp/dsh-test-home/group-talk-l/groups.json')
    assert.equal(resolveDataFile('/tmp/custom.json'), '/tmp/custom.json')
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  }
})
