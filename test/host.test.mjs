import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply, buildTools } from '../lib/index.js'

test('Host mount registers /group, installs member tools, and uninstalls on dissolve', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-host-'))
  const tools = new Map()
  const sections = []
  const disposals = []
  const commands = []
  const prompts = []
  const events = new Map()
  const effects = []

  const makeAgent = (id) => ({
    id,
    ctx: {
      systemPrompt: {
        section(definition) {
          sections.push({ id, definition })
          return () => { disposals.push(`section:${id}`) }
        },
        getSectionOrder(name) {
          assert.equal(name, 'TEAM_POLICY')
          return 600
        },
      },
      tools: {
        register(definition) {
          const key = `${id}:${definition.name}`
          tools.set(key, definition)
          return () => {
            tools.delete(key)
            disposals.push(`tool:${id}:${definition.name}`)
          }
        },
      },
    },
  })

  const agentA = makeAgent('session-a')
  const agentB = makeAgent('session-b')
  const agents = new Map([['session-a', agentA], ['session-b', agentB]])
  const ctx = {
    agents: {
      list: () => [...agents.values()],
      get: (id) => agents.get(id),
    },
    commands: {
      register: (definition) => {
        commands.push(definition)
        return () => {}
      },
    },
    effect: (factory) => {
      const dispose = factory()
      effects.push(dispose)
      return dispose
    },
    on: (event, listener) => {
      events.set(event, listener)
      return () => {}
    },
    get: (name) => {
      if (name !== 'sessionController') return undefined
      return {
        async list() {
          return { items: [{ sessionId: 'session-a' }, { sessionId: 'session-b' }] }
        },
        async prompt(request, signal) {
          if (!signal) throw new Error('prompt requires a signal')
          prompts.push(request)
          return { accepted: true }
        },
      }
    },
  }

  const dispose = apply(ctx, {
    dataFile: join(dir, 'groups.json'),
    historyLimit: 50,
    sendCooldownMs: 0,
    dedupeWindowMs: 0,
  })
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(commands.length, 1)
  assert.equal(commands[0].name, 'group')
  assert.equal(tools.size, 0)

  const handler = commands[0].handler
  const created = await handler({ agent: agentA, rawInput: ' new Review' })
  assert.equal(created.kind, 'success')
  // A human-created room starts empty; adding session-a installs its tools.
  assert.equal(tools.size, 0)
  await handler({ agent: agentA, rawInput: ' add @alice session-a Lead' })
  assert.deepEqual([...tools.keys()].sort(), [
    'session-a:group_talk_history',
    'session-a:group_talk_leave',
    'session-a:group_talk_list',
    'session-a:group_talk_send',
  ])
  // Disabled model management is not advertised at all: no schema cost.
  assert.equal(tools.has('session-a:group_talk_create'), false)
  assert.equal(tools.has('session-a:group_talk_manage'), false)
  const policy = sections.find((entry) => entry.id === 'session-a').definition
  assert.match(policy.text(), /"Review"/)
  assert.equal(policy.order, 600)
  assert.equal(policy.interpolate, false)

  const added = await handler({ agent: agentA, rawInput: ' add @bob session-b Reviewer' })
  assert.equal(added.kind, 'success')
  assert.ok(tools.has('session-b:group_talk_send'))
  const policyA = sections.find((entry) => entry.id === 'session-a').definition
  const policyB = sections.find((entry) => entry.id === 'session-b').definition
  assert.match(policyA.text(), /@bob \(Reviewer\)/)
  assert.match(policyB.text(), /You: @bob — Reviewer/)

  const sendTool = tools.get('session-a:group_talk_send')
  const sent = await sendTool.execute(
    { target: '@bob', message: 'Please review the diff.' },
    { agent: agentA },
  )
  assert.equal(sent.deliveries[0].status, 'delivered')
  assert.equal(prompts.length, 1)
  assert.equal(prompts[0].sessionId, 'session-b')
  assert.match(prompts[0].content[0].text, /Please review the diff\./)

  const dissolved = await handler({ agent: agentA, rawInput: ' dissolve' })
  assert.equal(dissolved.kind, 'success')
  assert.equal(tools.has('session-a:group_talk_send'), false)
  assert.equal(tools.has('session-b:group_talk_send'), false)
  assert.ok(disposals.includes('section:session-a'))
  assert.ok(disposals.includes('section:session-b'))
  assert.ok(disposals.includes('tool:session-a:group_talk_send'))
  assert.ok(disposals.includes('tool:session-b:group_talk_send'))

  dispose()
  for (const effect of effects) {
    if (typeof effect === 'function') effect()
  }
})

test('model tool schemas follow allowAgentCreate and allowAgentManage', () => {
  const names = (flags) => buildTools({
    config: { allowAgentCreate: false, allowAgentManage: false, ...flags },
  }).map((tool) => tool.name).sort()
  const base = ['group_talk_history', 'group_talk_leave', 'group_talk_list', 'group_talk_send']
  assert.deepEqual(names({}), base)
  assert.deepEqual(names({ allowAgentCreate: true }), [...base, 'group_talk_create'].sort())
  assert.deepEqual(names({ allowAgentManage: true }), [...base, 'group_talk_manage'].sort())
  assert.equal(names({ allowAgentCreate: true, allowAgentManage: true }).length, 6)
})
