import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply } from '../lib/index.js'

async function mount({ before } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-http-'))
  const file = join(dir, 'groups.json')
  if (before) await writeFile(file, before)
  const prompts = []
  const registered = []
  const commands = []
  const agents = new Map()
  const makeAgent = (id) => {
    const agent = {
      id,
      ctx: {
        systemPrompt: { section: () => () => {}, getSectionOrder: () => 600 },
        tools: { register: () => () => {} },
      },
    }
    agents.set(id, agent)
    return agent
  }
  makeAgent('session-a')
  makeAgent('session-b')
  const ctx = {
    agents: { list: () => [...agents.values()], get: (id) => agents.get(id) },
    commands: { register: (definition) => { commands.push(definition); return () => {} } },
    effect: (factory) => factory(),
    inject: (_deps, callback) => callback({
      connection: { fetch: { register: (route) => { registered.push(route); return () => {} } } },
      effect: (factory) => factory(),
    }),
    on: () => () => {},
    get: (name) => {
      if (name !== 'sessionController') return undefined
      return {
        async list() { return { items: [{ sessionId: 'session-a' }, { sessionId: 'session-b' }] } },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal')
          prompts.push(request)
          return { accepted: true }
        },
      }
    },
  }
  const dispose = apply(ctx, {
    dataFile: file,
    historyLimit: 50,
    sendCooldownMs: 0,
    dedupeWindowMs: 0,
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(registered.length, 1)
  return { route: registered[0], commands, prompts, dispose, file }
}

const post = (route, body, headers = {}) => route.fetch(new Request('http://localhost/api/group-talk-l', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}))

test('the authenticated Fetch route acts only for the human operator', async () => {
  const { route, dispose } = await mount()

  const missing = await route.fetch(new Request('http://localhost/api/group-talk-l', { method: 'GET' }))
  assert.equal(missing.status, 200)
  assert.deepEqual((await missing.json()).groups, [])

  const created = await post(route, {
    action: 'create',
    name: 'Panel room',
    members: [{ sessionId: 'session-b', alias: 'bob', role: 'Designer' }],
  })
  assert.equal(created.status, 200)
  const group = (await created.json()).group
  assert.equal(group.me.alias, 'human')
  assert.equal(group.me.isOwner, true)

  const listed = await route.fetch(new Request('http://localhost/api/group-talk-l', { method: 'GET' }))
  const listBody = await listed.json()
  assert.equal(listBody.groups.length, 1)
  assert.equal(typeof listBody.limits.maxMessageChars, 'number')
  assert.equal(typeof listBody.usage.sender.messages, 'number')
  assert.match(listBody.version, /^\d+\.\d+\.\d+$/u)
  assert.equal(listBody.capabilities.inRoom, true)
  assert.equal(listBody.capabilities.priority, true)

  const sent = await post(route, { action: 'send', group: group.id, target: '@bob', message: 'panel message' })
  assert.equal(sent.status, 200)
  assert.equal((await sent.json()).deliveries[0].status, 'delivered')

  // Body-level identity is not trusted: an agent session cannot use the Web route.
  const impersonate = await post(route, { sessionId: 'session-b', action: 'send', group: group.id, target: '@bob', message: 'spoof' })
  assert.equal(impersonate.status, 403)
  assert.equal((await impersonate.json()).error.code, 'human-only')
  const impersonateGet = await route.fetch(new Request('http://localhost/api/group-talk-l?sessionId=session-b', { method: 'GET' }))
  assert.equal(impersonateGet.status, 403)

  const audit = await post(route, { action: 'audit', group: group.id, limit: 20 })
  assert.equal(audit.status, 200)
  assert.equal((await audit.json()).total, 1)

  const humanLeave = await post(route, { action: 'leave', group: group.id })
  assert.equal(humanLeave.status, 400)
  assert.equal((await humanLeave.json()).error.code, 'human-cannot-leave')

  const crossOrigin = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'GET',
    headers: { origin: 'https://evil.example' },
  }))
  assert.equal(crossOrigin.status, 403)
  const crossSite = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'GET',
    headers: { 'sec-fetch-site': 'cross-site' },
  }))
  assert.equal(crossSite.status, 403)

  const badJson = await post(route, '{not json')
  assert.equal(badJson.status, 400)
  const wrongType = await route.fetch(new Request('http://localhost/api/group-talk-l', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: '{}',
  }))
  assert.equal(wrongType.status, 415)
  const tooLarge = await post(route, JSON.stringify({ action: 'noop', pad: 'x'.repeat(300000) }))
  assert.equal(tooLarge.status, 413)

  const deleted = await post(route, { action: 'delete', group: group.id })
  assert.equal(deleted.status, 200)
  dispose()
})

test('an unusable store fails closed instead of showing an empty panel', async () => {
  const bad = JSON.stringify({
    version: 1,
    groups: {
      grp_bad: {
        id: 'grp_bad',
        name: 'Broken room',
        topic: '',
        ownerSessionId: 'human',
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
        members: [{ sessionId: 'session-b', alias: 'bob', role: 'Reviewer', duties: '', joinedAt: 1 }],
        messages: [],
        audit: [],
      },
    },
    usage: { day: '', senders: {}, groups: {}, targets: {}, lastSend: {} },
  })
  const { route, dispose } = await mount({ before: bad })
  const listed = await route.fetch(new Request('http://localhost/api/group-talk-l', { method: 'GET' }))
  assert.equal(listed.status, 503)
  assert.equal((await listed.json()).error.code, 'store-unavailable')
  const created = await post(route, { action: 'create', name: 'Should not write' })
  assert.equal(created.status, 503)
  dispose()
})
