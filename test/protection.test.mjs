import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { GroupStore } from '../lib/store.js'
import { GroupService } from '../lib/service.js'
import { buildGroupPolicy } from '../lib/policy.js'
import { boundedHistoryResult, summarize } from '../lib/index.js'
import { chargeSend } from '../lib/guard.js'
import { emptyState } from '../lib/store.js'
import { DEFAULTS } from '../lib/config.js'

const START = Date.UTC(2026, 0, 1, 12, 0, 0)
const SESSIONS = ['session-a', 'session-b', 'session-c', 'session-d', 'session-e', 'session-f', 'session-g', 'session-h', 'session-i']

const UNLIMITED = {
  sendCooldownMs: 0,
  dedupeWindowMs: 0,
  maxRecipientsPerSend: 64,
  maxGroupsPerSession: 50,
  maxGroupsTotal: 500,
  maxMembersPerGroup: 64,
  dailyMessagesPerSender: 100000,
  dailyDeliveriesPerSender: 100000,
  dailyMessagesPerGroup: 100000,
  dailyDeliveriesPerGroup: 100000,
  dailyDeliveriesPerTarget: 100000,
  dailyEstimatedTokensPerSender: 100000000,
  dailyEstimatedTokensPerGroup: 100000000,
  dailyEstimatedTokensPerTarget: 100000000,
}

async function harness(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-guard-'))
  const calls = []
  let now = START
  const ctx = {
    get(name) {
      if (name !== 'sessionController') return undefined
      return {
        async list() { return { items: SESSIONS.map((sessionId) => ({ sessionId })) } },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal');
          calls.push(request);
          return { accepted: true }
        },
      }
    },
  }
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 1000 })
  const service = new GroupService({
    store,
    ctx,
    config: { ...UNLIMITED, ...overrides },
    now: () => now,
    log: () => {},
  })
  const advance = (ms) => { now += ms }
  return { service, store, calls, advance }
}

function members(count) {
  return SESSIONS.slice(1, count + 1).map((sessionId, index) => ({
    sessionId,
    alias: `m${index + 1}`,
    role: 'Reviewer',
  }))
}

test('experiment: an unbounded broadcast amplifies one message into N model turns', async () => {
  // This experiment measures the pre-burst baseline; disable the new
  // sliding-window guard so it still exercises the fan-out amplification.
  const { service, calls, advance } = await harness({ burstWindowMs: 0 })
  const group = await service.create('session-a', { name: 'Flood baseline', members: members(8) })
  let totalEstimated = 0
  for (let index = 0; index < 5; index += 1) {
    advance(10)
    const result = await service.send('session-a', { group: group.id, target: '*', message: `broadcast ${index} ${'x'.repeat(400)}` })
    totalEstimated += result.estimatedTokens
  }
  assert.equal(calls.length, 40)
  assert.ok(totalEstimated > 30000)
  assert.equal(calls.every((call) => typeof call.content[0].text === 'string'), true)
})

test('fan-out ceiling rejects a broadcast before it wakes any target', async () => {
  const { service, calls } = await harness({ maxRecipientsPerSend: 4 })
  const group = await service.create('session-a', { name: 'Fanout', members: members(8) })
  await assert.rejects(
    service.send('session-a', { group: group.id, target: '*', message: 'too broad' }),
    /fan-out limit is 4/,
  )
  assert.equal(calls.length, 0)
  const direct = await service.send('session-a', { group: group.id, target: '@m1', message: 'one target' })
  assert.equal(direct.deliveries.length, 1)
  assert.equal(calls.length, 1)
})

test('cooldown blocks a burst but accepts after the window', async () => {
  const { service, calls, advance } = await harness({ sendCooldownMs: 5000 })
  const group = await service.create('session-a', { name: 'Cooldown', members: members(1) })
  await service.send('session-a', { group: group.id, target: '@m1', message: 'first' })
  await assert.rejects(
    service.send('session-a', { group: group.id, target: '@m1', message: 'second' }),
    /cooldown/,
  )
  advance(5000)
  await service.send('session-a', { group: group.id, target: '@m1', message: 'third' })
  assert.equal(calls.length, 2)
})

test('duplicate suppression prevents repeated tool calls from waking a target twice', async () => {
  const { service, calls, advance } = await harness({ dedupeWindowMs: 30000 })
  const group = await service.create('session-a', { name: 'Dedupe', members: members(1) })
  const first = await service.send('session-a', { group: group.id, target: '@m1', message: 'same body' })
  const second = await service.send('session-a', { group: group.id, target: '@m1', message: 'same body' })
  assert.equal(first.deduplicated, false)
  assert.equal(second.deduplicated, true)
  assert.equal(calls.length, 1)
  advance(30001)
  await service.send('session-a', { group: group.id, target: '@m1', message: 'same body' })
  assert.equal(calls.length, 2)
})

test('sender, target and group daily budgets reject before delivery', async () => {
  const senderLimited = await harness({ dailyMessagesPerSender: 2, sendCooldownMs: 0, dedupeWindowMs: 0 })
  const g1 = await senderLimited.service.create('session-a', { name: 'Sender budget', members: members(1) })
  await senderLimited.service.send('session-a', { group: g1.id, target: '@m1', message: 'one' })
  await senderLimited.service.send('session-a', { group: g1.id, target: '@m1', message: 'two' })
  await assert.rejects(
    senderLimited.service.send('session-a', { group: g1.id, target: '@m1', message: 'three' }),
    /Daily message budget reached for this sender/,
  )
  assert.equal(senderLimited.calls.length, 2)

  const targetLimited = await harness({ dailyDeliveriesPerTarget: 2, sendCooldownMs: 0, dedupeWindowMs: 0, maxRecipientsPerSend: 6 })
  const g2 = await targetLimited.service.create('session-a', { name: 'Target budget', members: members(2) })
  await targetLimited.service.send('session-a', { group: g2.id, target: '*', message: 'batch one' })
  await targetLimited.service.send('session-a', { group: g2.id, target: '*', message: 'batch two' })
  await assert.rejects(
    targetLimited.service.send('session-a', { group: g2.id, target: '*', message: 'batch three' }),
    /Daily delivery budget reached for @m1/,
  )
  assert.equal(targetLimited.calls.length, 4)
})

test('estimated token budget is charged per recipient and stops a group', async () => {
  const { service, calls } = await harness({
    dailyEstimatedTokensPerGroup: 4000,
    assumedTokensPerDelivery: 1000,
    maxRecipientsPerSend: 6,
    sendCooldownMs: 0,
    dedupeWindowMs: 0,
  })
  const group = await service.create('session-a', { name: 'Token budget', members: members(2) })
  const first = await service.send('session-a', { group: group.id, target: '*', message: '1234' })
  assert.ok(first.estimatedTokens >= 2000)
  await assert.rejects(
    service.send('session-a', { group: group.id, target: '*', message: 'next' }),
    /Daily estimated token budget reached for this group/,
  )
  assert.equal(calls.length, 2)
})

test('group sprawl is capped per member and per Host', async () => {
  const perMember = await harness({ maxGroupsPerSession: 1, maxGroupsTotal: 10 })
  await perMember.service.create('session-a', { name: 'One', members: members(1) })
  await assert.rejects(
    perMember.service.create('session-a', { name: 'Two', members: members(1) }),
    /already belongs to 1 active groups/,
  )

  const perHost = await harness({ maxGroupsPerSession: 10, maxGroupsTotal: 1 })
  await perHost.service.create('session-a', { name: 'Only', members: members(1) })
  await assert.rejects(
    perHost.service.create('session-b', { name: 'Second', members: [{ sessionId: 'session-c', alias: 'c' }] }),
    /total group limit/,
  )
})

test('policy has a hard character ceiling even with many large transcripts', () => {
  const groups = Array.from({ length: 5 }, (_, index) => ({
    id: `grp_${index}`,
    name: `Group ${index}`,
    topic: 'x'.repeat(200),
    ownerSessionId: 'session-a',
    status: 'active',
    members: [
      { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: 'y'.repeat(200) },
      { sessionId: 'session-b', alias: 'bob', role: 'Reviewer' },
    ],
    messages: Array.from({ length: 10 }, (__, messageIndex) => ({
      id: `msg_${index}_${messageIndex}`,
      kind: 'message',
      at: 1,
      fromAlias: 'bob',
      target: '@owner',
      text: 'z'.repeat(2000),
      deliveries: [],
    })),
  }))
  const policy = buildGroupPolicy(groups, 'session-a', { recentLimit: 3, maxChars: 700 })
  assert.ok(policy.length <= 700, `policy length ${policy.length}`)
  assert.match(policy, /policy truncated/)
})

test('Web list and tool history responses are bounded', async () => {
  const { service } = await harness({ uiMessageLimit: 3, maxHistoryToolChars: 2000 })
  const group = await service.create('session-a', { name: 'Bounded', members: members(1) })
  for (let index = 0; index < 5; index += 1) {
    await service.send('session-a', { group: group.id, target: '@m1', message: `message ${index}` })
  }
  const view = service.listFor('session-a')[0]
  assert.equal(view.messages.length, 3)
  assert.ok(view.messageTotal >= 6)
})

test('model-facing history is clipped to the configured character budget', () => {
  const messages = Array.from({ length: 20 }, (_, index) => ({
    id: `msg_${index}`,
    kind: 'message',
    at: index,
    fromAlias: 'bob',
    target: '@owner',
    text: 'q'.repeat(2000),
    deliveries: [],
  }))
  const result = boundedHistoryResult({ group: { id: 'grp' }, messages, total: 20 }, 3000)
  assert.ok(JSON.stringify(result).length < 6000)
  assert.ok(result.messages.length < 20)
  assert.equal(result.truncated, true)
  assert.ok(result.messages.every((message) => message.text.length <= 2000))
})

test('the daily ledger is durable across a Host restart', async () => {
  const { service, store } = await harness({ dailyMessagesPerSender: 5 })
  const group = await service.create('session-a', { name: 'Durable ledger', members: members(1) })
  await service.send('session-a', { group: group.id, target: '@m1', message: 'recorded' })
  assert.equal(service.usageFor('session-a').sender.messages, 1)
  const reloaded = new GroupStore({ file: store.file, historyLimit: 1000 })
  await reloaded.ready
  assert.equal(reloaded.state.usage.day, '2026-01-01')
  assert.equal(reloaded.state.usage.senders['session-a'].messages, 1)
  assert.equal(reloaded.state.usage.groups[group.id].messages, 1)
  assert.equal(reloaded.state.usage.targets['session-b'].deliveries, 1)
})

test('usage keys cannot prototype-pollute the ledger', () => {
  const state = emptyState()
  assert.throws(() => chargeSend({
    state,
    now: START,
    groupId: 'grp_safe',
    senderSessionId: '__proto__',
    targets: [{ sessionId: 'session-b', alias: 'b' }],
    text: 'x',
    envelopeChars: 100,
    limits: DEFAULTS,
  }), /Unsafe session key/)
  assert.equal(Object.prototype.messages, undefined)
})

test('model-facing summaries contain no undefined JSON values', () => {
  const view = {
    id: 'grp_test',
    name: 'JSON safe',
    status: 'active',
    ownerSessionId: 'session-a',
    members: [
      { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: '' },
      { sessionId: 'session-b', alias: 'bob', role: 'Reviewer', duties: '' },
    ],
    me: { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: '', isOwner: true },
    messages: [
      { id: 'm1', kind: 'system', at: 1, text: 'created', deliveries: [] },
      { id: 'm2', kind: 'message', at: 2, fromAlias: 'bob', target: '@owner', text: 'hi', deliveries: [] },
    ],
  }
  const summary = summarize(view, 'session-a')
  const walk = (value, path) => {
    assert.notEqual(value, undefined, path)
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, path + '[' + index + ']'))
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, path + '.' + key)
    }
    else if (typeof value === 'number') assert.ok(Number.isFinite(value), path)
  }
  walk(summary, 'summary')
  assert.equal(Object.hasOwn(summary.recent[0], 'from'), false)
  assert.equal(JSON.stringify(summary).includes('session-a'), false)
  assert.equal(JSON.stringify(summary).includes('session-b'), false)
})
