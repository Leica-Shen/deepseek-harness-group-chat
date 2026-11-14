import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { GroupStore } from '../lib/store.js'
import { GroupService } from '../lib/service.js'

const SESSIONS = ['session-a', 'session-b', 'session-c']

async function harness() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-service-'))
  const calls = []
  const synced = []
  const ctx = {
    get(name) {
      if (name !== 'sessionController') return undefined
      return {
        async list() {
          return { items: SESSIONS.map((sessionId) => ({ sessionId })) }
        },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal')
          calls.push(request)
          return { accepted: true }
        },
      }
    },
  }
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 50 })
  const service = new GroupService({
    store,
    ctx,
    config: {
      historyLimit: 50,
      maxGroupsPerSession: 12,
      maxMembersPerGroup: 16,
      maxGroupsTotal: 100,
      maxRecipientsPerSend: 16,
      deliveryMode: 'queue',
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
    },
    log: () => {},
    onMembershipChanged: (sessionIds) => synced.push(sessionIds),
  })
  return { service, store, calls, synced, dir, ctx }
}

test('creates a group, sends to aliases, roles and everyone else', async () => {
  const { service, calls } = await harness()
  const group = await service.create('session-a', {
    name: 'Release review',
    topic: 'Ship it',
    members: [
      { sessionId: 'session-b', alias: 'bob', role: 'Reviewer', duties: 'Inspect the diff' },
      { sessionId: 'session-c', alias: 'carol', role: 'Reviewer' },
    ],
  })
  assert.equal(group.name, 'Release review')
  assert.equal(group.members.length, 3)
  assert.equal(group.me.isOwner, true)
  assert.equal(group.members.find((member) => member.alias === 'bob').duties, 'Inspect the diff')

  const direct = await service.send('session-a', { group: group.id, target: '@bob', message: 'Please check.' })
  assert.equal(direct.deliveries.length, 1)
  assert.equal(direct.deliveries[0].alias, 'bob')
  assert.equal(direct.deliveries[0].status, 'delivered')
  assert.equal(calls.length, 1)
  assert.match(calls[0].content[0].text, /"from":\{"alias":"owner","role":"owner"\}/)
  assert.match(calls[0].content[0].text, /Please check\./)
  assert.equal(calls[0].sessionId, 'session-b')
  assert.equal(calls[0].mode, 'queue')

  const byRole = await service.send('session-a', { group: group.id, target: '#Reviewer', message: 'Team check.' })
  assert.deepEqual(byRole.deliveries.map((delivery) => delivery.alias).sort(), ['bob', 'carol'])
  assert.equal(calls.length, 3)

  const broadcast = await service.send('session-a', { group: group.id, target: '*', message: 'Everyone.' })
  assert.equal(broadcast.deliveries.length, 2)
  assert.equal(calls.length, 5)

  const reply = await service.send('session-b', { group: group.id, target: '@owner', message: 'On it.' })
  assert.equal(reply.deliveries[0].alias, 'owner')
  assert.equal(calls.length, 6)

  const view = service.listFor('session-b')[0]
  assert.equal(view.messages.length, 5) // one create line plus four routed messages
  assert.equal(view.messages.at(-1).text, 'On it.')
  assert.equal(view.messageTotal, view.messages.length)
})

test('rejects self-targets, unknown aliases and non-member sends', async () => {
  const { service } = await harness()
  const group = await service.create('session-a', {
    name: 'Review',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  await assert.rejects(service.send('session-a', { group: group.id, target: '@owner', message: 'self' }), /not sent back/)
  await assert.rejects(service.send('session-a', { group: group.id, target: '@nobody', message: 'x' }), /No member/)
  await assert.rejects(service.send('session-c', { group: group.id, target: '@bob', message: 'x' }), /does not belong|not a member/i)
})

test('enforces owner-only management and supports role edits', async () => {
  const { service } = await harness()
  const group = await service.create('session-a', {
    name: 'Review',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  const updated = await service.setRole('session-a', group.id, '@bob', 'Lead reviewer', 'Own the final read')
  const bob = updated.members.find((member) => member.alias === 'bob')
  assert.equal(bob.role, 'Lead reviewer')
  assert.equal(bob.duties, 'Own the final read')
  const renamed = await service.setRole('session-a', group.id, '@bob', 'Senior reviewer')
  assert.equal(renamed.members.find((member) => member.alias === 'bob').duties, 'Own the final read')
  await assert.rejects(service.setRole('session-b', group.id, '@bob', 'Boss'), /Only the owner/)
  await assert.rejects(service.removeMember('session-a', group.id, '@owner'), /owner cannot/)
  const after = await service.removeMember('session-a', group.id, '@bob')
  assert.equal(after.members.length, 1)
})

test('dissolve is read-only and delete is permanent', async () => {
  const { service, store } = await harness()
  const group = await service.create('session-a', {
    name: 'Temp',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  const dissolved = await service.dissolve('session-a', group.id)
  assert.equal(dissolved.status, 'dissolved')
  await assert.rejects(service.send('session-a', { group: group.id, target: '@bob', message: 'no' }), /active group/)
  assert.equal(service.listFor('session-a')[0].status, 'dissolved')
  const deleted = await service.delete('session-a', group.id)
  assert.equal(deleted.name, 'Temp')
  assert.equal(store.groupsFor('session-a').length, 0)
})

test('rejects unknown session ids when visibility can be checked', async () => {
  const { service } = await harness()
  await assert.rejects(service.create('session-a', {
    name: 'Missing',
    members: [{ sessionId: 'session-z', alias: 'z', role: 'Member' }],
  }), /not a visible session/)
})

test('persists the transcript and reloads it', async () => {
  const { service, dir } = await harness()
  const group = await service.create('session-a', {
    name: 'Persisted',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  await service.send('session-a', { group: group.id, target: '@bob', message: 'durable' })
  const store = new GroupStore({ file: join(dir, 'groups.json'), historyLimit: 50 })
  await store.ready
  const persisted = store.get(group.id)
  assert.equal(persisted.messages.at(-1).text, 'durable')
  assert.equal(persisted.messages.at(-1).deliveries[0].status, 'delivered')
})

test('steer delivery mode is forwarded so running targets receive at the next step', async () => {
  const { service, calls } = await harness()
  service.config.deliveryMode = 'steer'
  const group = await service.create('session-a', {
    name: 'Realtime review',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  await service.send('session-a', { group: group.id, target: '@bob', message: 'Interrupt politely.' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].mode, 'steer')
})

test('a non-owner can leave; the owner must dissolve or delete', async () => {
  const { service } = await harness()
  const group = await service.create('session-a', {
    name: 'Leave test',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  const left = await service.leave('session-b', group.id)
  assert.equal(left.alias, 'bob')
  assert.equal(service.listFor('session-b').length, 0)
  assert.equal(service.listFor('session-a')[0].members.length, 1)
  await assert.rejects(service.leave('session-a', group.id), /owner cannot leave/u)
})


test('stale pending deliveries reconcile to unknown on startup', async () => {
  const { service, store, ctx } = await harness()
  const group = await service.create('session-a', {
    name: 'Pending reconciliation',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer' }],
  })
  await service.send('session-a', { group: group.id, target: '@bob', message: 'was it delivered?' })
  await store.write((draft) => {
    const message = draft.groups[group.id].messages.at(-1)
    message.at = 0
    message.deliveries[0].status = 'pending'
  })
  const reloaded = new GroupService({
    store,
    ctx,
    config: { ...service.config, pendingTimeoutMs: 1000 },
    log: () => {},
  })
  await reloaded.ready()
  assert.equal(reloaded.listFor('session-a')[0].messages.at(-1).deliveries[0].status, 'unknown')
})

test('a failed pending reconciliation does not block service.ready', async () => {
  const logs = []
  const store = {
    state: {
      version: 1,
      groups: {
        grp_1: {
          id: 'grp_1',
          messages: [{
            id: 'msg_1',
            kind: 'message',
            at: 1,
            deliveries: [{ sessionId: 'session-b', alias: 'bob', status: 'pending' }],
          }],
        },
      },
      usage: {},
    },
    ready: Promise.resolve(),
    async write() { throw new Error('disk full') },
    get(id) { return this.state.groups[id] },
    groupsFor() { return [] },
  }
  const service = new GroupService({
    store,
    ctx: {},
    config: { pendingTimeoutMs: 1000 },
    log: (message) => logs.push(message),
    now: () => 100000,
  })
  await service.ready()
  assert.equal(store.state.groups.grp_1.messages[0].deliveries[0].status, 'pending')
  assert.ok(logs.some((line) => line.includes('reconcile')))
})

test('the human panel creates, sends and manages ownerless groups', async () => {
  const { service } = await harness()
  const group = await service.create('human', {
    name: 'Design room',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Designer' }],
  })
  assert.equal(group.ownerSessionId, 'human')
  assert.equal(group.me.sessionId, 'human')
  assert.equal(group.me.isOwner, true)
  assert.equal(group.members.filter((member) => member.sessionId !== 'human').length, 1)

  const sent = await service.send('human', { group: group.id, target: '@bob', message: 'please design' })
  assert.equal(sent.deliveries[0].status, 'delivered')
  const message = service.listFor('human')[0].messages.at(-1)
  assert.equal(message.fromSessionId, 'human')
  assert.equal(message.fromAlias, 'human')

  // A lone participant can answer into the room: @human is a transcript
  // target, not a session wakeup.
  const reply = await service.send('session-b', { group: group.id, target: '*', message: 'done' })
  assert.equal(reply.deliveries.length, 1)
  assert.equal(reply.deliveries[0].sessionId, 'human')
  assert.equal(reply.deliveries[0].status, 'delivered')
  assert.equal(service.listFor('human')[0].messages.at(-1).fromSessionId, 'session-b')

  await assert.rejects(
    () => service.send('human', { group: group.id, target: '@human', message: 'loop' }),
    /Choose another member|not sent back to its sender/,
  )

  const legacy = await service.create('session-a', { name: 'Legacy room', members: [] })
  assert.ok(service.listFor('human').some((entry) => entry.id === legacy.id))
  const renamed = await service.rename('human', legacy.id, 'Renamed room')
  assert.equal(renamed.name, 'Renamed room')
  await service.dissolve('human', legacy.id)
  assert.equal(service.listFor('human').find((entry) => entry.id === legacy.id).status, 'dissolved')
})
