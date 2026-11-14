import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { GroupStore, appendControl } from '../lib/store.js'
import { GroupService } from '../lib/service.js'
import { buildDeliveryEnvelope } from '../lib/policy.js'
import { DEFAULTS } from '../lib/config.js'

async function harness(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-sec2-'))
  const promptCalls = []
  const started = []
  const disposed = []
  let result = Promise.resolve({ output: [{ type: 'text', text: 'subagent result' }], stopReason: 'completed' })
  const subagents = {
    list: () => ['in-process'],
    async start(name, request) {
      started.push({ name, request })
      return {
        id: 'sub-session',
        localAgent: undefined,
        result,
        async dispose() { disposed.push(name) },
      }
    },
  }
  const ctx = {
    get(name) {
      if (name === 'subagents') return subagents
      if (name !== 'sessionController') return undefined
      return {
        async list() {
          return { items: ['session-a', 'session-b', 'session-c', 'session-org', 'session-secretary'].map((sessionId) => ({ sessionId })) }
        },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal')
          promptCalls.push(request)
          return { accepted: true }
        },
      }
    },
  }
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 60 })
  const service = new GroupService({
    store,
    ctx,
    config: {
      ...DEFAULTS,
      historyLimit: 60,
      maxMembersPerGroup: 16,
      maxRecipientsPerSend: 16,
      sendCooldownMs: 0,
      dedupeWindowMs: 0,
      dailyMessagesPerSender: 1000,
      dailyDeliveriesPerSender: 10000,
      dailyMessagesPerGroup: 1000,
      dailyDeliveriesPerGroup: 10000,
      dailyDeliveriesPerTarget: 1000,
      dailyEstimatedTokensPerSender: 100000000,
      dailyEstimatedTokensPerGroup: 100000000,
      dailyEstimatedTokensPerTarget: 100000000,
      ...overrides,
    },
    log: () => {},
  })
  await service.ready()
  return { service, store, promptCalls, started, disposed, subagents, setResult: (value) => { result = value } }
}

test('human messages bypass target cooldown and target daily caps', async () => {
  const { service, promptCalls } = await harness({ sendCooldownMs: 600000, dailyDeliveriesPerTarget: 1 })
  const group = await service.create('human', {
    name: 'Human priority',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Designer' }],
  })
  await service.send('human', { group: group.id, target: '@bob', message: 'first' })
  await service.send('human', { group: group.id, target: '@bob', message: 'second' })
  assert.equal(promptCalls.length, 2)

  const agentGroup = await service.create('session-a', {
    name: 'Agent cap',
    members: [{ sessionId: 'session-c', alias: 'carol', role: 'Designer' }],
  })
  await service.send('session-a', { group: agentGroup.id, target: '@carol', message: 'one' })
  await assert.rejects(
    () => service.send('session-a', { group: agentGroup.id, target: '@carol', message: 'two' }),
    /cooldown|rate-limited/i,
  )
})

test('secretary notes are audited control entries and role-gated', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'Minutes',
    members: [
      { sessionId: 'session-org', alias: 'org', role: 'Organizer' },
      { sessionId: 'session-secretary', alias: 'sec', role: 'Secretary' },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer' },
    ],
  })
  await service.note('session-secretary', group.id, 'Decision: ship after the audit.')
  const view = service.listFor('human').find((entry) => entry.id === group.id)
  const control = view.messages.find((message) => message.kind === 'control')
  assert.equal(control.action, 'note')
  assert.equal(control.outcome, 'recorded')
  assert.match(control.text, /Decision/)
  assert.ok(Array.isArray(view.audit))
  assert.ok(view.audit.some((entry) => entry.action === 'note'))
  await assert.rejects(
    () => service.note('session-b', group.id, 'not allowed'),
    /secretary|organizer|role-required/i,
  )
})

test('delegation is organizer-only, bounded, audited and disposes the run', async () => {
  const { service, started, disposed } = await harness({
    allowAgentDelegate: true,
    maxDelegationsPerDay: 1,
    delegationTimeoutMs: 5000,
  })
  const group = await service.create('human', {
    name: 'Delegation',
    members: [
      { sessionId: 'session-org', alias: 'org', role: 'Organizer' },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer' },
    ],
  })
  const result = await service.delegate({ id: 'session-org' }, 'session-org', group.id, { task: 'Research the risk' })
  assert.equal(result.outcome, 'completed')
  assert.match(result.output, /subagent result/)
  assert.equal(started.length, 1)
  assert.equal(started[0].request.maxDepth, 0)
  assert.ok(started[0].request.toolFilter.deny.includes('group_talk_delegate'))
  assert.ok(started[0].request.toolFilter.deny.includes('group_talk_send'))
  assert.ok(started[0].request.signal instanceof AbortSignal)
  assert.equal(disposed.length, 1)

  const view = service.listFor('human').find((entry) => entry.id === group.id)
  const controls = view.messages.filter((message) => message.kind === 'control' && message.action === 'delegate')
  assert.deepEqual(controls.map((message) => message.outcome), ['started', 'completed'])

  await assert.rejects(
    () => service.delegate({ id: 'session-org' }, 'session-org', group.id, { task: 'another' }),
    /delegation budget|quota/i,
  )
  await assert.rejects(
    () => service.delegate({ id: 'session-b' }, 'session-b', group.id, { task: 'not allowed' }),
    /organizer|owner|role-required/i,
  )
})

test('delegation is disabled by default and fails closed without a provider', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'Disabled',
    members: [{ sessionId: 'session-org', alias: 'org', role: 'Organizer' }],
  })
  await assert.rejects(
    () => service.delegate({ id: 'session-org' }, 'session-org', group.id, { task: 'x' }),
    /disabled/i,
  )

  const enabled = await harness({ allowAgentDelegate: true })
  const group2 = await enabled.service.create('human', {
    name: 'No provider',
    members: [{ sessionId: 'session-org', alias: 'org', role: 'Organizer' }],
  })
  enabled.subagents.list = () => []
  await assert.rejects(
    () => enabled.service.delegate({ id: 'session-org' }, 'session-org', group2.id, { task: 'x' }),
    /provider|unavailable/i,
  )
})

test('a human envelope carries human priority, an agent envelope stays untrusted peer data', () => {
  const group = {
    id: 'grp_x',
    name: 'Room',
    members: [
      { sessionId: 'human', alias: 'human', role: 'human' },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer' },
    ],
  }
  const human = buildDeliveryEnvelope(group, group.members[0], group.members[1], { text: 'please' })
  assert.match(human, /human operator/)
  assert.match(human, /"priority":"ambient"/)
  assert.match(human, /"kind":"human"/)
  const agent = buildDeliveryEnvelope(group, group.members[1], group.members[0], { text: 'reply' })
  assert.match(agent, /untrusted|不可信/i)
  assert.match(agent, /"priority":"ambient"/)
})

test('control entries survive persistence normalization', async () => {
  const { store } = await harness()
  const group = await store.write((draft) => {
    const now = Date.now()
    draft.groups.grp_c = {
      id: 'grp_c',
      name: 'Audit',
      topic: '',
      ownerSessionId: 'human',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      members: [
        { sessionId: 'human', alias: 'human', role: 'human', duties: '', joinedAt: now },
        { sessionId: 'session-secretary', alias: 'sec', role: 'Secretary', duties: '', joinedAt: now },
      ],
      messages: [],
    }
    appendControl(draft.groups.grp_c, 'sec', {
      fromSessionId: 'session-secretary',
      action: 'note',
      outcome: 'recorded',
      taskId: 'task_1',
      reason: 'minutes',
      text: 'A control entry.',
    }, 60)
    return draft.groups.grp_c
  })
  assert.equal(group.messages[0].kind, 'control')
  assert.equal(group.audit.length, 1)
  const raw = JSON.parse(await (await import('node:fs/promises')).readFile(store.file, 'utf8'))
  assert.equal(raw.groups.grp_c.messages[0].action, 'note')
  assert.equal(raw.groups.grp_c.messages[0].outcome, 'recorded')
  assert.equal(raw.groups.grp_c.audit[0].action, 'note')
  const reloaded = new GroupStore({ file: store.file, historyLimit: 60 })
  await reloaded.ready
  assert.equal(reloaded.state.groups.grp_c.audit[0].action, 'note')
  assert.equal(reloaded.state.groups.grp_c.audit[0].outcome, 'recorded')
})

test('per-message delivery mode overrides the deployment default', async () => {
  const { service, promptCalls } = await harness({ deliveryMode: 'queue' })
  const group = await service.create('human', {
    name: 'Mode',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Designer' }],
  })
  await service.send('human', { group: group.id, target: '@bob', message: 'steer me', mode: 'steer' })
  await service.send('human', { group: group.id, target: '@bob', message: 'queue me', mode: 'queue' })
  assert.equal(promptCalls[0].mode, 'steer')
  assert.equal(promptCalls[1].mode, 'queue')
})

test('secretary notes are disabled by config and delegation timeout disposes the run', async () => {
  const { service } = await harness({ allowAgentNote: false })
  const group = await service.create('human', {
    name: 'No notes',
    members: [{ sessionId: 'session-secretary', alias: 'sec', role: 'Secretary' }],
  })
  await assert.rejects(
    () => service.note('session-secretary', group.id, 'blocked'),
    /disabled|note/i,
  )

  const slow = await harness({ allowAgentDelegate: true, delegationTimeoutMs: 10 })
  const slowGroup = await slow.service.create('human', {
    name: 'Slow',
    members: [{ sessionId: 'session-org', alias: 'org', role: 'Organizer' }],
  })
  slow.setResult(new Promise(() => {}))
  await assert.rejects(
    () => slow.service.delegate({ id: 'session-org' }, 'session-org', slowGroup.id, { task: 'slow' }),
    /failed|timed out/i,
  )
  assert.equal(slow.disposed.length, 1)
  const view = slow.service.listFor('human').find((entry) => entry.id === slowGroup.id)
  const failure = view.messages.find((message) => message.kind === 'control' && message.outcome === 'failed')
  assert.equal(failure.reason, 'timeout')
})


test('control audit rows survive transcript trimming', async () => {
  const store = new GroupStore({ file: join(await mkdtemp(join(tmpdir(), 'dsh-gt-audit-')), 'groups.json'), historyLimit: 50 })
  const group = await store.write((draft) => {
    const now = Date.now()
    draft.groups.grp_trim = {
      id: 'grp_trim',
      name: 'Trim',
      topic: '',
      ownerSessionId: 'human',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      members: [
        { sessionId: 'human', alias: 'human', role: 'human', duties: '', joinedAt: now },
        { sessionId: 'session-secretary', alias: 'sec', role: 'Secretary', duties: '', joinedAt: now },
      ],
      messages: [],
      audit: [],
    }
    return draft.groups.grp_trim
  })
  for (let index = 0; index < 12; index += 1) {
    await store.write((draft) => {
      appendControl(draft.groups.grp_trim, 'sec', {
        fromSessionId: 'session-secretary',
        action: 'note',
        outcome: 'recorded',
        taskId: `task_${index}`,
        text: `note ${index}`,
      }, 3)
    })
  }
  const state = store.state.groups.grp_trim
  assert.equal(state.messages.length, 3)
  assert.equal(state.audit.length, 12)
})


test('delegation output is capped', async () => {
  const capped = await harness({ allowAgentDelegate: true, maxDelegationChars: 20 })
  const group = await capped.service.create('human', {
    name: 'Capped',
    members: [{ sessionId: 'session-org', alias: 'org', role: 'Organizer' }],
  })
  capped.setResult(Promise.resolve({ output: [{ type: 'text', text: 'x'.repeat(1000) }], stopReason: 'completed' }))
  const result = await capped.service.delegate({ id: 'session-org' }, 'session-org', group.id, { task: 'cap' })
  assert.equal(result.output.length, 20)
})


test('priority is ambient by default and urgent is carried into the envelope', () => {
  const group = {
    id: 'grp_p',
    name: 'Priority',
    members: [
      { sessionId: 'human', alias: 'human', role: 'human' },
      { sessionId: 'session-b', alias: 'bob', role: 'Designer' },
    ],
  }
  const ambient = buildDeliveryEnvelope(group, group.members[0], group.members[1], { text: 'later' })
  assert.match(ambient, /"priority":"ambient"/)
  assert.match(ambient, /不要打断|do not interrupt/)
  const urgent = buildDeliveryEnvelope(group, group.members[0], group.members[1], { text: 'now', priority: 'urgent' })
  assert.match(urgent, /"priority":"urgent"/)
  assert.match(urgent, /step 边界|step boundary/)
})


test('send purpose is required only for non-organizer agents', async () => {
  const h = await harness({ allowAgentDelegate: true })
  const group = await h.service.create('human', {
    name: 'Purpose gate',
    members: [
      { sessionId: 'session-org', alias: 'org', role: 'Organizer' },
      { sessionId: 'session-b', alias: 'reviewer', role: 'Reviewer' },
    ],
  })
  assert.equal(h.service.sendPurposeRequired('human', group.id), false)
  assert.equal(h.service.sendPurposeRequired('session-org', group.id), false)
  assert.equal(h.service.sendPurposeRequired('session-b', group.id), true)

  const ownerGroup = await h.service.create('session-owner', { name: 'Owner gate' })
  assert.equal(h.service.sendPurposeRequired('session-owner', ownerGroup.id), false)
})
