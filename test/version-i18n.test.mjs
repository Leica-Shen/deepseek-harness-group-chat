import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { errorPayload, normalizeLang, translate, suggestionFor } from '../lib/i18n.js'
import { GroupError } from '../lib/store.js'
import { VERSION } from '../lib/version.js'

test('one version source: package.json, lib/version.js and the client constant agree', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(VERSION, manifest.version)
  const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const match = /const CLIENT_VERSION = "([^"]+)"/u.exec(client)
  assert.ok(match, 'CLIENT_VERSION literal is missing')
  assert.equal(match[1], manifest.version)
  // The generated check is also the CI guard.
  const output = execFileSync(process.execPath, [new URL('../scripts/sync-version.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' })
  assert.match(output, /in sync/u)
})

test('unknown and known language tags normalize to the two shipped catalogs', () => {
  assert.equal(normalizeLang('zh-CN'), 'zh')
  assert.equal(normalizeLang('ZH'), 'zh')
  assert.equal(normalizeLang('en-US'), 'en')
  assert.equal(normalizeLang('fr'), 'en')
  assert.equal(normalizeLang(undefined), 'en')
})

test('error payloads carry a localized message, the English fallback, retry advice and a suggestion', () => {
  const quota = new GroupError('quota-exceeded', 'Daily estimated token budget reached for this sender (60000).', {
    params: { max: 60000, scope: 'sender' },
    detail: '12/30',
  })
  const zh = errorPayload(quota, 'zh')
  assert.equal(zh.code, 'quota-exceeded')
  assert.match(zh.message, /额度/u)
  assert.match(zh.message, /12\/30/u)
  assert.equal(zh.messageEn, quota.message)
  assert.match(zh.suggestion, /@别名|零点/u)

  const limited = new GroupError('rate-limited', 'Too many messages', { retryAfterMs: 4200, detail: '8/8' })
  const en = errorPayload(limited, 'en')
  assert.equal(en.retryAfterMs, 4200)
  assert.match(en.message, /Slow down/u)
  assert.match(suggestionFor('zh', 'rate-limited'), /冷却/u)
  assert.equal(translate('zh', 'no-such-key'), undefined)
  assert.match(translate('zh', 'message-too-long', { max: 2000 }), /2000/u)
})

test('secret errors localize the labels into the sentence', () => {
  const error = new GroupError('secret-detected', 'Looks like a key', { labels: ['AWS access key'] })
  const zh = errorPayload(error, 'zh')
  assert.match(zh.message, /AWS access key/u)
  assert.match(zh.message, /凭据/u)
  assert.match(zh.suggestion, /路径|环境变量/u)
})
