import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

class FakeElement {
  constructor(tag) {
    this.tagName = tag
    this.children = []
    this.parentElement = null
    this.className = ''
    this.dataset = {}
    this.textContent = ''
    this.innerHTML = ''
    this.isConnected = true
    this.listeners = new Map()
  }

  appendChild(child) {
    child.parentElement = this
    this.children.push(child)
    return child
  }

  insertAdjacentElement(position, child) {
    assert.equal(position, 'afterend')
    const parent = this.parentElement
    const index = parent.children.indexOf(this)
    parent.children.splice(index + 1, 0, child)
    child.parentElement = parent
    return child
  }

  querySelector(selector) {
    if (selector === ':scope > .dsh-group-talk-l-workspace-create') {
      return this.children.find((child) => child.className === 'dsh-group-talk-l-workspace-create') ?? null
    }
    return null
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener)
  }

  setAttribute(name, value) {
    this[name] = value
  }

  remove() {
    if (this.parentElement) {
      const index = this.parentElement.children.indexOf(this)
      if (index >= 0) this.parentElement.children.splice(index, 1)
    }
    this.isConnected = false
  }
}

test('sidebar workspace label receives a native-looking create-group icon', () => {
  const header = new FakeElement('div')
  header.className = 'hash_sectionHeader'
  const label = new FakeElement('span')
  label.className = 'hash_sectionLabel'
  label.textContent = '工作区'
  header.appendChild(label)
  const body = new FakeElement('body')

  let clicked = false
  let directClicked = false
  const direct = new FakeElement('button')
  direct.click = () => { directClicked = true }
  const windowListeners = new Map()
  const window = {
    addEventListener: (type, listener) => windowListeners.set(type, listener),
    removeEventListener: (type) => windowListeners.delete(type),
    dispatchEvent: (event) => {
      if (event.type === 'group-talk-l:create') clicked = true
    },
  }
  const document = {
    body,
    head: { appendChild: () => {} },
    createElement: (tag) => new FakeElement(tag),
    querySelectorAll: (selector) => (selector === 'span' ? [label] : []),
    querySelector: (selector) => (selector === '[data-group-talk-l-create]' ? direct : null),
    hidden: false,
  }
  const context = {
    locale: { register: () => {} },
    uiWorkspace: { openSession: () => {} },
    effect: (factory) => factory(),
    slots: {
      inject: () => {},
      register: () => () => {},
    },
  }
  let api
  const sandbox = {
    window: {
      ...window,
      __ModuleLoader__: {
        load: ({ factory }) => {
          api = factory((name) => (name === 'react' ? { createElement: () => null } : {}))
        },
      },
    },
    document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (callback) => { callback(); return 1 },
    cancelAnimationFrame: () => {},
    CustomEvent: class {
      constructor(type) { this.type = type }
    },
    console,
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  api.apply(context)
  const button = header.children.find((child) => child.className === 'dsh-group-talk-l-workspace-create')
  assert.ok(button, 'workspace header icon should be inserted after the label')
  assert.equal(button.title, 'Group-Talk-L · 新建群聊')
  assert.ok(button.innerHTML.includes('<svg'))
  button.listeners.get('click')({ preventDefault() {}, stopPropagation() {} })
  assert.equal(directClicked, true)
  assert.equal(clicked, false)
})
