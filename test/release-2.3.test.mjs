import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { DEFAULTS } from '../lib/config.js'
import { estimateTextTokens } from '../lib/guard.js'
import { summarize } from '../lib/index.js'
import { buildGroupPolicy } from '../lib/policy.js'
import { GroupService } from '../lib/service.js'
import { GroupStore, normalizeState } from '../lib/store.js'

const PERMISSIVE = {
  sendCooldownMs: 0,
  dedupeWindowMs: 0,
  maxRecipientsPerSend: 16,
  maxMembersPerGroup: 16,
  maxGroupsPerSession: 20,
  maxGroupsTotal: 100,
  dailyMessagesPerSender: 1000,
  dailyDeliveriesPerSender: 1000,
  dailyMessagesPerGroup: 1000,
  dailyDeliveriesPerGroup: 1000,
  dailyMessagesPerHost: 10000,
  dailyDeliveriesPerHost: 10000,
  dailyDeliveriesPerTarget: 1000,
  dailyEstimatedTokensPerSender: 1e9,
  dailyEstimatedTokensPerGroup: 1e9,
  dailyEstimatedTokensPerTarget: 1e9,
  dailyEstimatedTokensPerHost: 1e9,
  maxMessagesPerSenderPerBurst: 1000,
  maxMessagesPerGroupPerBurst: 1000,
  maxMessagesPerHostPerBurst: 1000,
  maxDeliveriesPerTargetPerBurst: 1000,
  maxEstimatedTokensPerSenderPerBurst: 1e9,
  maxEstimatedTokensPerGroupPerBurst: 1e9,
  maxEstimatedTokensPerHostPerBurst: 1e9,
}

const MEMBERS = [
  { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
  { sessionId: 'session-b', alias: 'bob', role: 'Reviewer' },
  { sessionId: 'session-c', alias: 'carol', role: 'Designer' },
]

async function harness(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-gt-23-'))
  const prompts = []
  let now = Date.UTC(2026, 0, 1, 12, 0, 0)
  const ctx = {
    get(name) {
      if (name !== 'sessionController') return undefined
      return {
        async list() {
          return { items: ['session-a', 'session-b', 'session-c', 'session-org'].map((sessionId) => ({ sessionId })) }
        },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal')
          prompts.push(request)
          return { accepted: true }
        },
      }
    },
  }
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 100, log: () => {} })
  const service = new GroupService({
    store,
    ctx,
    config: { ...DEFAULTS, ...PERMISSIVE, ...overrides },
    now: () => now,
    log: () => {},
  })
  await service.ready()
  return { dir, store, service, prompts, advance: (ms) => { now += ms } }
}

test('ambient defaults to queue, urgent to steer, explicit mode still wins', async () => {
  const { service, prompts } = await harness()
  const group = await service.create('human', { name: 'Priority', members: MEMBERS.slice(0, 2) })
  prompts.length = 0
  await service.send('human', { group: group.id, target: '@alice', message: 'ambient', priority: 'ambient' })
  await service.send('human', { group: group.id, target: '@alice', message: 'urgent', priority: 'urgent' })
  await service.send('human', { group: group.id, target: '@alice', message: 'override', priority: 'ambient', mode: 'steer' })
  assert.deepEqual(prompts.map((prompt) => prompt.mode), ['queue', 'steer', 'steer'])
})

test('the purpose gate is enforced by the domain service, exact-role and target aware', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'Gate',
    members: [
      ...MEMBERS,
      { sessionId: 'session-org', alias: 'org', role: 'Organizer' },
    ],
  })
  await assert.rejects(
    service.send('session-b', { group: group.id, target: '@alice', message: 'status ping' }),
    (error) => error.code === 'purpose-required',
  )
  const reviewed = await service.send('session-b', { group: group.id, target: '@alice', message: 'review', purpose: 'review' })
  assert.equal(reviewed.deliveries[0].status, 'delivered')
  // In-room only: no session is woken, so no purpose is needed.
  const inRoom = await service.send('session-b', { group: group.id, target: '@human', message: 'for the person' })
  assert.equal(inRoom.deliveries[0].status, 'in-room')
  // Substring roles must not be treated as organizers.
  const nonOrganizer = await service.create('human', {
    name: 'Non organizer',
    members: [
      { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
      { sessionId: 'session-c', alias: 'carol', role: 'non-organizer' },
    ],
  })
  await assert.rejects(
    service.send('session-c', { group: nonOrganizer.id, target: '@alice', message: 'still a peer message' }),
    (error) => error.code === 'purpose-required',
  )
  // Exact organizer role is exempt.
  const organizer = await service.send('session-org', { group: group.id, target: '@alice', message: 'dispatch' })
  assert.equal(organizer.deliveries[0].status, 'delivered')
})

test('human messages skip target budgets and use their own cooldown while peer budgets stay intact', async () => {
  const { service, store, advance } = await harness({ sendCooldownMs: 1000, humanCooldownMs: 1000, dailyDeliveriesPerTarget: 1 })
  const group = await service.create('human', { name: 'Human priority', members: MEMBERS })
  await service.send('human', { group: group.id, target: '@bob', message: 'one' })
  await assert.rejects(
    service.send('human', { group: group.id, target: '@bob', message: 'two' }),
    /cooldown|rate-limited/u,
  )
  advance(1500)
  await service.send('human', { group: group.id, target: '@bob', message: 'two' })
  advance(1500)
  await service.send('human', { group: group.id, target: '@bob', message: 'three' })
  // Human messages do not consume bob's target budget.
  assert.equal(store.state.usage.targets['session-b']?.deliveries ?? 0, 0)
  // Bob can still send to carol once; the cap is per target and untouched by the human.
  await service.send('session-b', { group: group.id, target: '@carol', message: 'peer one', purpose: 'review' })
  advance(1500)
  await assert.rejects(
    service.send('session-b', { group: group.id, target: '@carol', message: 'peer two', purpose: 'review' }),
    /Daily delivery budget|quota-exceeded/u,
  )
})

test('the operator is not locked out by per-sender delivery/token caps while agents still are', async () => {
  // A multi-recipient broadcast would otherwise exhaust the default per-sender
  // delivery/token ceilings after a handful of messages, which contradicts
  // "human priority" in the one room the operator is driving.
  const operator = await harness({
    dailyDeliveriesPerSender: 2,
    dailyEstimatedTokensPerSender: 1000,
    maxEstimatedTokensPerSenderPerBurst: 1000,
    burstWindowMs: 0,
  })
  const group = await operator.service.create('human', { name: 'Operator budget', members: MEMBERS })
  for (let index = 0; index < 3; index += 1) {
    await operator.service.send('human', { group: group.id, target: '*', message: `operator ${index}` })
  }
  assert.equal(operator.prompts.length, 9)

  // Peer sends still obey the same per-sender ceilings.
  const peer = await harness({ dailyDeliveriesPerSender: 2, dailyEstimatedTokensPerSender: 1e9, burstWindowMs: 0 })
  const peerGroup = await peer.service.create('human', { name: 'Peer budget', members: MEMBERS })
  await peer.service.send('session-a', { group: peerGroup.id, target: '@bob', message: 'peer one', purpose: 'review' })
  await peer.service.send('session-a', { group: peerGroup.id, target: '@bob', message: 'peer two', purpose: 'review' })
  await assert.rejects(
    peer.service.send('session-a', { group: peerGroup.id, target: '@bob', message: 'peer three', purpose: 'review' }),
    /Daily delivery budget|quota-exceeded/u,
  )
})

test('the token estimate is CJK-aware instead of a fixed chars/4', () => {
  assert.equal(estimateTextTokens('a'.repeat(400)), 100)
  assert.ok(estimateTextTokens('中'.repeat(100)) >= 150)
  assert.ok(estimateTextTokens('这是中文消息') > estimateTextTokens('abcdefg'))
})

test('note writes are rate-limited and daily-rationed', async () => {
  const rate = await harness({ maxNotesPerAgentPerMinute: 1, maxNotesPerAgentPerDay: 10 })
  const rateGroup = await rate.service.create('human', {
    name: 'Rate',
    members: [
      { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
      { sessionId: 'session-b', alias: 'sec', role: 'Secretary' },
    ],
  })
  await rate.service.note('session-b', rateGroup.id, 'first')
  await assert.rejects(rate.service.note('session-b', rateGroup.id, 'second'), (error) => error.code === 'rate-limited')

  const daily = await harness({ maxNotesPerAgentPerMinute: 0, maxNotesPerAgentPerDay: 1 })
  const dailyGroup = await daily.service.create('human', {
    name: 'Daily',
    members: [
      { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
      { sessionId: 'session-b', alias: 'sec', role: 'Secretary' },
    ],
  })
  await daily.service.note('session-b', dailyGroup.id, 'first')
  await assert.rejects(daily.service.note('session-b', dailyGroup.id, 'second'), /Daily note budget/u)
})

test('list payload omits audit rows; the dedicated audit action returns them', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'Audit',
    members: [
      { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
      { sessionId: 'session-b', alias: 'sec', role: 'Secretary' },
    ],
  })
  await service.note('session-b', group.id, 'Decision recorded.')
  const view = service.listFor('human').find((entry) => entry.id === group.id)
  assert.deepEqual(view.audit, [])
  assert.equal(view.auditTotal, 2)
  const audit = service.auditFor('human', group.id)
  assert.equal(audit.total, 2)
  assert.equal(audit.audit.length, 2)
  assert.ok(audit.audit.some((entry) => entry.action === 'membership'))
  assert.ok(audit.audit.some((entry) => entry.action === 'note'))
})

test('group_talk_list recent transcript is bounded and marked truncated', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'List bound',
    members: [
      { sessionId: 'session-a', alias: 'alice', role: 'Designer' },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer' },
    ],
  })
  for (let index = 0; index < 4; index += 1) {
    await service.send('human', { group: group.id, target: '@alice', message: `${index} ${'x'.repeat(1900)}` })
  }
  const view = service.listFor('human').find((entry) => entry.id === group.id)
  const summary = summarize(view, 'human')
  assert.ok(summary.recent.every((entry) => entry.text.length <= 240))
  assert.ok(summary.recent.some((entry) => entry.truncated === true))
  assert.ok(JSON.stringify(summary).length < 5000)
})

test('policy advertises note/delegate only when the profile enables them', () => {
  const group = {
    id: 'grp_policy',
    name: 'Policy',
    topic: '',
    ownerSessionId: 'human',
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    members: [
      { sessionId: 'human', alias: 'human', role: 'human', duties: '', joinedAt: 1 },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer', duties: '', joinedAt: 1 },
    ],
    messages: [],
    audit: [],
  }
  const disabled = buildGroupPolicy([group], 'session-b', {
    allowAgentNote: false,
    allowAgentDelegate: false,
    maxChars: 100000,
  })
  assert.match(disabled, /delegation is disabled/i)
  assert.match(disabled, /notes are disabled/i)
  assert.doesNotMatch(disabled, /may delegate|may record audited notes/i)
  const enabled = buildGroupPolicy([group], 'session-b', {
    allowAgentNote: true,
    allowAgentDelegate: true,
    maxChars: 100000,
  })
  assert.match(enabled, /may delegate/i)
  assert.match(enabled, /may record audited notes/i)
})

test('a lossy store is refused for writes instead of silently persisting the loss', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-gt-23-store-'))
  const file = join(dir, 'groups.json')
  const raw = {
    version: 1,
    groups: {
      grp_loss: {
        id: 'grp_loss',
        name: 'Lossy',
        topic: '',
        ownerSessionId: 'human',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
        members: [{ sessionId: 'session-a', alias: 'a'.repeat(40), role: 'Designer', duties: '', joinedAt: 1 }],
        messages: [],
        audit: [],
      },
    },
    usage: { day: '', senders: {}, groups: {}, targets: {}, lastSend: {} },
  }
  await writeFile(file, JSON.stringify(raw))
  assert.equal(normalizeState(raw, { historyLimit: 100 }).lossy, true)
  const store = new GroupStore({ file, historyLimit: 100, log: () => {} })
  await store.ready
  assert.ok(store.loadFailure)
  await assert.rejects(store.write((draft) => { draft.groups.grp_new = {} }), (error) => error.code === 'store-unavailable')
  assert.match(await readFile(file, 'utf8'), /grp_loss/)
})

test('the human alias is reserved for the operator', async () => {
  const { service } = await harness()
  await assert.rejects(
    service.create('human', { name: 'Reserved', members: [{ sessionId: 'session-a', alias: 'human' }] }),
    (error) => error.code === 'invalid-alias',
  )
})

test('maxMessageChars can be raised up to the 8000-character hard cap', async () => {
  const { service } = await harness({ maxMessageChars: 5000 })
  const group = await service.create('human', {
    name: 'Long',
    members: [{ sessionId: 'session-a', alias: 'alice', role: 'Designer' }],
  })
  const long = await service.send('human', { group: group.id, target: '@alice', message: 'x'.repeat(5000) })
  assert.equal(long.deliveries[0].status, 'delivered')
  await assert.rejects(
    service.send('human', { group: group.id, target: '@alice', message: 'y'.repeat(8001) }),
    /message-too-long|at most 8000/u,
  )
})
