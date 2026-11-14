import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply } from '../lib/index.js'

test('the authenticated Fetch route serves the panel and rejects invalid writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-http-'))
  const prompts = []
  const registered = []
  const agents = new Map()
  const makeAgent = (id) => {
    const agent = {
      id,
      ctx: {
        systemPrompt: {
          section: () => () => {},
          getSectionOrder: () => 600,
        },
        tools: { register: () => () => {} },
      },
    }
    agents.set(id, agent)
    return agent
  }
  const agentA = makeAgent('session-a')
  const agentB = makeAgent('session-b')
  const commands = []
  const ctx = {
    agents: { list: () => [...agents.values()], get: (id) => agents.get(id) },
    commands: { register: (definition) => commands.push(definition) },
    effect: (factory) => {
      const dispose = factory()
      return dispose
    },
    inject: (deps, callback) => {
      callback({
        connection: {
          fetch: {
            register: (route) => {
              registered.push(route)
              return () => {}
            },
          },
        },
        effect: (factory) => factory(),
      })
    },
    on: () => () => {},
    get: (name) => {
      if (name !== 'sessionController') return undefined
      return {
        async list() { return { items: [{ sessionId: 'session-a' }, { sessionId: 'session-b' }] } },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal');
          prompts.push(request);
          return { accepted: true }
        },
      }
    },
  }

  const dispose = apply(ctx, { dataFile: join(dir, 'groups.json'), historyLimit: 50, sendCooldownMs: 0, dedupeWindowMs: 0, dailyMessagesPerSender: 1 })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(registered.length, 1)
  assert.equal(registered[0].path, '/api/group-talk-l')
  const route = registered[0]
  const handler = commands[0].handler

  const missing = await route.fetch(new Request('http://localhost/api/group-talk-l', { method: 'GET' }))
  assert.equal(missing.status, 400)

  const empty = await route.fetch(new Request('http://localhost/api/group-talk-l?sessionId=session-a', { method: 'GET' }))
  assert.equal(empty.status, 200)
  assert.deepEqual((await empty.json()).groups, [])

  const created = await handler({ agent: agentA, rawInput: ' new Panel' })
  assert.equal(created.kind, 'success')
  await handler({ agent: agentA, rawInput: ' add @bob session-b Reviewer' })

  const listed = await route.fetch(new Request('http://localhost/api/group-talk-l?sessionId=session-a', { method: 'GET' }))
  const listBody = await listed.json()
  assert.equal(listBody.groups.length, 1)
  assert.equal(listBody.groups[0].members.length, 2)
  assert.equal(typeof listBody.limits.maxMessageChars, 'number')
  assert.equal(typeof listBody.usage.sender.messages, 'number')
  assert.equal(typeof listBody.help, 'string')

  const sent = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'session-a',
      action: 'send',
      group: listBody.groups[0].id,
      target: '@bob',
      message: 'from the panel',
    }),
  }))
  assert.equal(sent.status, 200)
  const sentBody = await sent.json()
  assert.equal(sentBody.deliveries[0].status, 'delivered')
  assert.equal(sentBody.deduplicated, false)
  assert.equal(prompts.length, 1)

  const limited = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'session-a',
      action: 'send',
      group: listBody.groups[0].id,
      target: '@bob',
      message: 'another',
    }),
  }))
  assert.equal(limited.status, 429)
  assert.equal((await limited.json()).error.code, 'quota-exceeded')

  const denied = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'session-b', action: 'delete', group: listBody.groups[0].id }),
  }))
  assert.equal(denied.status, 403)
  assert.equal((await denied.json()).error.code, 'owner-only')

  const leave = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'session-b', action: 'leave', group: listBody.groups[0].id }),
  }))
  assert.equal(leave.status, 200)
  assert.equal((await leave.json()).group.status, 'active')
  const afterLeave = await route.fetch(new Request('http://localhost/api/group-talk-l?sessionId=session-b', { method: 'GET' }))
  assert.deepEqual((await afterLeave.json()).groups, [])

  const wrongType = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: '{}',
  }))
  assert.equal(wrongType.status, 415)

  dispose()
})
