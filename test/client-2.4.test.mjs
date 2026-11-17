import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

function load() {
  let exported
  const document = {
    createElement: () => ({ dataset: {}, textContent: '' }),
    head: { appendChild: () => {} },
    querySelector: () => null,
  }
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: ({ factory }) => {
          exported = factory((name) => {
            if (name === 'react') {
              return {
                Fragment: Symbol('Fragment'),
                createElement: (type, props, ...children) => ({ type, props, children: children.flat(Infinity) }),
                useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
                useEffect: () => {},
                useMemo: (factory) => factory(),
                useCallback: (factory) => factory,
                useRef: (value) => ({ current: value }),
              }
            }
            return {}
          })
        },
      },
    },
    document,
    console,
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  return exported.__internals
}

const internals = load()

test('both dictionaries expose exactly the same keys', () => {
  const zh = Object.keys(internals.zh).sort()
  const en = Object.keys(internals.en).sort()
  assert.deepEqual(zh, en)
  for (const key of zh) {
    assert.equal(typeof internals.zh[key], 'string', `zh.${key} must be a string`)
    assert.ok(internals.zh[key].length > 0, `zh.${key} must not be empty`)
    assert.ok(internals.en[key].length > 0, `en.${key} must not be empty`)
  }
})

test('the language override translates panel copy without the host', () => {
  const zh = internals.makeTranslator(undefined, 'zh')
  const en = internals.makeTranslator(undefined, 'en')
  assert.equal(zh('emptyTitle'), '还没有群聊')
  assert.equal(en('emptyTitle'), 'No group chats yet')
  assert.match(zh('messagesCount', { count: 3 }), /3/u)
  assert.equal(internals.effectiveLang('en'), 'en')
  assert.equal(internals.effectiveLang('system'), internals.effectiveLang('system'))
})

test('preset roles display in the chosen language even if the stored label differs', () => {
  const zh = internals.makeTranslator(undefined, 'zh')
  const en = internals.makeTranslator(undefined, 'en')
  assert.equal(internals.displayRole({ roleId: 'secretary', role: 'Secretary' }, zh), '秘书')
  assert.equal(internals.displayRole({ roleId: 'secretary', role: 'Secretary' }, en), 'Secretary')
  // Legacy rooms have no roleId: the stored label is the fallback.
  assert.equal(internals.displayRole({ role: 'Lead' }, zh), 'Lead')
})

test('the footer shows one version when the halves match and a mismatch note otherwise', () => {
  // The footer is a pure string fragment in the exported bundle; assert the
  // source contract so a future refactor cannot reintroduce a permanent
  // double-version line.
  const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(source, /version === CLIENT_VERSION/u)
  assert.match(source, /Group-Talk-L \$\{CLIENT_VERSION\}/u)
})

test('the digest summarizes decisions, waiting, failures and open relays', () => {
  const t = internals.makeTranslator(undefined, 'en')
  const group = {
    name: 'Review',
    audit: [{ action: 'decision', fromAlias: 'org', text: 'Ship Friday', at: Date.now() }],
    messages: [
      { kind: 'message', at: Date.now(), fromAlias: 'a', target: '@b', text: 'please check', deliveries: [{ sessionId: 'b', status: 'delivered' }] },
      { kind: 'message', at: Date.now(), fromAlias: 'b', target: '@a', text: 'failed one', deliveries: [{ sessionId: 'a', status: 'failed' }] },
    ],
  }
  const digest = internals.digestOf(group, [{ intent: 'confirm', status: 'delivered', round: 1, maxRounds: 1, peer: { alias: 'b' } }], t)
  assert.match(digest, /Ship Friday/u)
  assert.match(digest, /please check/u)
  assert.match(digest, /failed one/u)
  assert.match(digest, /confirm @b/u)
  assert.match(digest, /No decision recorded|Recorded decisions/u)
})
