import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

function load(context) {
  let exported
  const styles = []
  const document = {
    createElement: () => ({ dataset: {}, textContent: "" }),
    head: { appendChild: (node) => styles.push(node) },
    querySelector: () => null,
  }
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: ({ factory }) => {
          exported = factory((name) => {
            if (name === "react") return { createElement: () => null, useState: (value) => [value, () => {}], useEffect: () => {}, useRef: (value) => ({ current: value }) }
            return {}
          })
        },
      },
    },
    document,
    console,
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  return { exported, styles }
}

test('client half loads as a module-loader bundle and registers its slots', () => {
  const registered = []
  const locale = []
  const slots = {
    inject: (name, install) => install(),
    register: (definition, component) => {
      registered.push({ name: definition.name, definition, component })
      return () => {}
    },
  }
  const context = {
    locale: { register: (namespace, dictionaries) => locale.push({ namespace, dictionaries }), bind: () => () => 'label' },
    effect: (factory) => factory(),
    uiWorkspace: { openSession: () => {} },
    sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => () => {} } },
    slots,
    inject: (deps, callback) => callback({
      slots,
      locale: context.locale,
      sessions: context.sessions,
      layout: { selectPanel: () => {}, toggleSidebar: () => {} },
    }),
  }
  const { exported, styles } = load(context)

  assert.equal(exported.name, 'group-talk-l')
  assert.equal(exported.inject.join(','), 'sessions,uiWorkspace,slots,locale,layout')

  exported.apply(context)
  assert.equal(locale.length, 1)
  assert.equal(locale[0].namespace, 'group-talk-l')
  assert.deepEqual(Object.keys(locale[0].dictionaries).sort(), ['en', 'zh'])

  const names = registered.map((entry) => entry.name)
  assert.ok(names.includes('conversation.session.header.actions'))
  assert.ok(names.includes('main'))
  assert.ok(names.includes('sidebar.panellist'))

  const header = registered.find((entry) => entry.name === 'conversation.session.header.actions')
  assert.equal(header.definition.id, 'group-talk-l')
  assert.equal(typeof header.component, 'function')

  const panel = registered.find((entry) => entry.name === 'main')
  assert.equal(panel.definition.key, 'group-talk-l')

  const entry = registered.find((entry) => entry.name === 'sidebar.panellist')
  assert.equal(entry.definition.id, 'group-talk-l')
  assert.equal(entry.definition.order, 20)
  assert.equal(typeof entry.component, 'function')

  assert.equal(styles.length, 1)
})
