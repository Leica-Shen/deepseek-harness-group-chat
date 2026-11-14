import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

test('client half loads as a module-loader bundle and registers its slot', () => {
  let exported
  const styles = []
  const locale = []
  let slot
  const context = {
    locale: { register: (namespace, dictionaries) => locale.push({ namespace, dictionaries }) },
    effect: (factory) => factory(),
    uiWorkspace: { openSession: () => {} },
    slots: {
      inject: (name, install) => {
        slot = { name }
        install()
      },
      register: (definition, component) => {
        slot = { ...slot, definition, component }
        return () => {}
      },
    },
  }
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
            if (name === "react") return { createElement: () => null }
            return {}
          })
        },
      },
    },
    document,
    console,
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  assert.equal(exported.name, 'group-talk-l')
  assert.equal(exported.inject.join(','), 'sessions,uiWorkspace,slots,locale')

  exported.apply(context)
  assert.equal(locale.length, 1)
  assert.equal(locale[0].namespace, 'group-talk-l')
  assert.deepEqual(Object.keys(locale[0].dictionaries).sort(), ['en', 'zh'])
  assert.equal(slot.name, 'conversation.session.header.actions')
  assert.equal(slot.definition.id, 'group-talk-l')
  assert.equal(typeof slot.component, 'function')
  assert.equal(styles.length, 1)
})
