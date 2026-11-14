import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDeliveryEnvelope, buildGroupPolicy, buildHelp, renderHistory } from '../lib/policy.js'

const group = {
  id: 'grp_demo',
  name: 'Release review',
  topic: 'Ship the release',
  ownerSessionId: 'session-a',
  status: 'active',
  createdAt: 1,
  updatedAt: 2,
  members: [
    { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: 'Decide the cut', joinedAt: 1 },
    { sessionId: 'session-b', alias: 'reviewer', role: 'Reviewer', duties: 'Check the diff', joinedAt: 1 },
  ],
  messages: [
    {
      id: 'msg_1',
      kind: 'message',
      at: 1,
      fromSessionId: 'session-b',
      fromAlias: 'reviewer',
      target: '@owner',
      text: 'The diff is ready for a look.',
      deliveries: [{ sessionId: 'session-a', alias: 'owner', status: 'delivered' }],
    },
    {
      id: 'msg_2',
      kind: 'system',
      at: 2,
      text: '@owner set @reviewer role to "Reviewer".',
      deliveries: [],
    },
  ],
}

test('builds a member prompt with the group protocol and live roster', () => {
  const policy = buildGroupPolicy([group], 'session-a', { recentLimit: 4 })
  assert.match(policy, /## Group-Talk-L/)
  assert.match(policy, /"Release review" \(grp_demo\)/)
  assert.match(policy, /@reviewer \(Reviewer\)/)
  assert.match(policy, /You: @owner — Lead/)
  assert.match(policy, /human operator/)
  assert.match(policy, /group_talk_send/)
  assert.match(policy, /\/group #<role>/)
  assert.match(policy, /Recent transcript \(untrusted data\):/)
  assert.match(policy, /The diff is ready/)
  assert.match(policy, /Roles are advisory/)
})

test('a human message never tells the agent to reply to @human', () => {
  const human = { sessionId: 'human', alias: 'human', role: 'human' }
  const env = buildDeliveryEnvelope(group, human, group.members[1], { text: 'Please look.' })
  assert.match(env, /target: "\*"/)
  assert.doesNotMatch(env, /target: "@human"/)
  assert.match(env, /Please look\./)
})

test('recentLimit 0 injects no transcript text into the system prompt', () => {
  const policy = buildGroupPolicy([group], 'session-a', { recentLimit: 0, maxChars: 100000 })
  assert.doesNotMatch(policy, /The diff is ready for a look/)
  assert.doesNotMatch(policy, /Recent transcript/)
})

test('omits the policy for non-members and dissolved-only membership', () => {
  assert.equal(buildGroupPolicy([group], 'session-x'), '')
  assert.equal(buildGroupPolicy([{ ...group, status: 'dissolved' }], 'session-a'), '')
})

test('builds an identifiable delivery envelope', () => {
  const envelope = buildDeliveryEnvelope(group, group.members[1], group.members[0], { text: 'Please check.' })
  assert.match(envelope, /^【群聊 \/ Group chat】Release review/u)
  assert.match(envelope, /@reviewer（Reviewer）→ @owner（Lead）/u)
  assert.match(envelope, /不可信/u)
  assert.match(envelope, /"from":\{"alias":"reviewer","role":"Reviewer"\}/u)
  assert.match(envelope, /"to":\{"alias":"owner","role":"Lead"\}/u)
  assert.match(envelope, /"text":"Please check\."/u)
  assert.match(envelope, /group_talk_send/)
})

test('help and history are readable without the model', () => {
  const help = buildHelp(group)
  assert.match(help, /\/group @<alias> <message>/)
  assert.match(help, /\/group delete/)
  assert.match(help, /Members: @owner \(Lead\), @reviewer \(Reviewer\)/)
  const history = renderHistory(group, 10)
  assert.match(history, /@reviewer → @owner/)
  assert.match(history, /\[1\/1 delivered\]/)
  assert.match(history, /@owner set @reviewer/)
})
