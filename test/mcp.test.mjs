import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { GroupStore } from '../lib/store.js'
import { GroupService } from '../lib/service.js'

async function seed() {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-group-talk-l-mcp-'))
  const dataFile = join(dir, 'groups.json')
  const store = new GroupStore({ file: dataFile })
  const service = new GroupService({
    store,
    ctx: { get: () => undefined },
    adapter: {
      name: 'seed',
      capabilities: () => ({ transport: 'seed', wake: false, steer: false, listSessions: false, subagents: false, identity: 'file', mailbox: true }),
      async listSessions() { return [] },
      async prompt() { return { delivered: true } },
    },
    config: {},
    log: () => {},
  })
  await service.ready()
  await service.create('human', {
    name: 'MCP room',
    members: [
      { sessionId: 'codex-review', alias: 'codex', role: 'Designer' },
      { sessionId: 'dsh-a', alias: 'dsh', role: 'Judge' },
    ],
  })
  await service.dispose()
  return { dir, dataFile }
}

function session(env) {
  const child = spawn(process.execPath, [new URL('../bin/mcp-server.mjs', import.meta.url).pathname], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const lines = []
  let buffer = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    buffer += chunk
    let index = buffer.indexOf('\n')
    while (index >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (line) lines.push(JSON.parse(line))
      index = buffer.indexOf('\n')
    }
  })
  const wait = (count) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${count} responses: ${JSON.stringify(lines)}`)), 8000)
    const tick = () => {
      if (lines.length >= count) {
        clearTimeout(timer)
        resolve(lines)
      } else setTimeout(tick, 10)
    }
    tick()
  })
  return { child, lines, wait, send: (value) => child.stdin.write(`${JSON.stringify(value)}\n`) }
}

test('the MCP adapter speaks initialize, tools/list and group_list', async () => {
  const { dataFile } = await seed()
  const client = session({
    GROUP_TALK_AGENT_ID: 'codex-review',
    GROUP_TALK_DATA_FILE: dataFile,
    GROUP_TALK_MAILBOX: join(dataFile, '..', 'mailbox'),
  })
  client.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
  client.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  client.send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'group_list', arguments: {} } })
  const lines = await client.wait(3)
  assert.equal(lines[0].result.serverInfo.name, 'group-chat')
  const names = lines[1].result.tools.map((tool) => tool.name)
  assert.deepEqual(names.sort(), [
    'group_history', 'group_inbox', 'group_list', 'group_note', 'group_relay', 'group_relay_reply', 'group_send',
  ])
  const groupList = JSON.parse(lines[2].result.content[0].text)
  assert.equal(groupList.groups[0].name, 'MCP room')
  client.child.kill()
})

test('an MCP send lands in the target mailbox and is readable without consuming it', async () => {
  const { dataFile, dir } = await seed()
  const mailbox = join(dir, 'mailbox')
  const sender = session({ GROUP_TALK_AGENT_ID: 'codex-review', GROUP_TALK_DATA_FILE: dataFile, GROUP_TALK_MAILBOX: mailbox })
  sender.send({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'group_send', arguments: { target: '@dsh', message: 'please review', purpose: 'review' } },
  })
  const [sent] = await sender.wait(1)
  const payload = JSON.parse(sent.result.content[0].text)
  assert.equal(payload.deliveries[0].status, 'queued')
  sender.child.kill()

  const reader = session({ GROUP_TALK_AGENT_ID: 'dsh-a', GROUP_TALK_DATA_FILE: dataFile, GROUP_TALK_MAILBOX: mailbox })
  reader.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'group_inbox', arguments: {} } })
  const [inbox] = await reader.wait(1)
  const body = JSON.parse(inbox.result.content[0].text)
  assert.equal(body.pending, 1)
  assert.match(body.messages[0].text, /please review/u)
  reader.child.kill()
})

test('the MCP server refuses to start without an explicit agent identity', async () => {
  const child = spawn(process.execPath, [new URL('../bin/mcp-server.mjs', import.meta.url).pathname], {
    env: { ...process.env, GROUP_TALK_AGENT_ID: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const code = await new Promise((resolve) => child.on('exit', resolve))
  assert.equal(code, 2)
})
