import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULTS, resolveConfig } from '../lib/config.js'

test('conservative guard defaults and explicit overrides resolve', () => {
  process.env.DSH_HOME = '/tmp/group-talk-l-config-home'
  try {
    const defaults = resolveConfig({})
    assert.equal(defaults.maxRecipientsPerSend, DEFAULTS.maxRecipientsPerSend)
    assert.equal(defaults.maxMessageChars, 2000)
    assert.equal(defaults.sendCooldownMs, 3000)
    assert.equal(defaults.dailyEstimatedTokensPerGroup, 120000)
    assert.equal(defaults.policyMaxChars, 3500)
    assert.equal(defaults.deliveryMode, 'steer')
    assert.equal(defaults.burstWindowMs, 60000)
    assert.equal(defaults.maxDeliveriesPerTargetPerBurst, 6)
    assert.equal(defaults.dailyMessagesPerHost, 300)
    assert.equal(defaults.allowAgentCreate, false)
    assert.equal(defaults.allowAgentManage, false)
    assert.equal(defaults.maxReadsPerAgentPerMinute, 20)
    assert.equal(defaults.replyNudgeAfterMs, 120000)
    assert.equal(defaults.pendingTimeoutMs, 120000)
    assert.equal(defaults.dataFile, '/tmp/group-talk-l-config-home/group-talk-l/groups.json')
    const raised = resolveConfig({ maxRecipientsPerSend: 9, maxMessageChars: 5000, sendCooldownMs: 0, deliveryMode: 'queue' })
    assert.equal(raised.maxRecipientsPerSend, 9)
    assert.equal(raised.maxMessageChars, 5000)
    assert.equal(raised.sendCooldownMs, 0)
    assert.equal(raised.deliveryMode, 'queue')
  } finally {
    delete process.env.DSH_HOME
  }
})

test('invalid limits fall back and are reported', () => {
  const warnings = []
  const config = resolveConfig({ maxRecipientsPerSend: 0, historyLimit: 'many', dailyMessagesPerSender: -1 }, (message) => warnings.push(message))
  assert.equal(config.maxRecipientsPerSend, DEFAULTS.maxRecipientsPerSend)
  assert.equal(config.historyLimit, DEFAULTS.historyLimit)
  assert.equal(config.dailyMessagesPerSender, DEFAULTS.dailyMessagesPerSender)
  assert.equal(warnings.length, 3)
})
