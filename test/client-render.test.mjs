import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

/** A tiny renderer is enough to execute the initial header-panel branch. */
function loadClient(React, primitives) {
  let exported
  const context = {
    locale: { register: () => {} },
    effect: (factory) => factory(),
    uiWorkspace: { openSession: () => {} },
    slots: {
      inject: (name, install) => install(),
      register: (_definition, component) => {
        context.component = component
        return () => {}
      },
    },
  }
  const document = {
    createElement: () => ({ dataset: {}, textContent: "" }),
    head: { appendChild: () => {} },
    querySelector: () => null,
  }
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: ({ factory }) => {
          exported = factory((name) => (name === "react" ? React : primitives))
        },
      },
    },
    document,
    console,
  }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  exported.apply(context)
  return context.component
}

function fakeReact({ initiallyOpen = false, stateOverrides = {} } = {}) {
  let stateIndex = 0
  const Fragment = Symbol("Fragment")
  const createElement = (type, props, ...children) => {
    const flat = children.flat(Infinity)
    return {
      type,
      props: { ...(props ?? {}), ...(flat.length === 0 ? {} : { children: flat.length === 1 ? flat[0] : flat }) },
      children: flat,
    }
  }
  return {
    Fragment,
    createElement,
    useState(initial) {
      const index = stateIndex++
      const value = Object.hasOwn(stateOverrides, index) ? stateOverrides[index] : index === 0 ? initiallyOpen : initial
      return [value, () => {}]
    },
    useEffect() {},
    useMemo(factory) { return factory() },
    useCallback(factory) { return factory },
    useRef(value) { return { current: value } },
  }
}

function fakePrimitives() {
  const passthrough = ({ children }) => children ?? null
  const noop = () => null
  return {
    Button: passthrough,
    Checkbox: noop,
    Input: noop,
    Modal: ({ open, children }) => (open ? children : null),
    StateDot: noop,
    Tag: passthrough,
    Tooltip: passthrough,
    IconChevronLeftOutlineRegular: noop,
    IconEditOutlineRegular: noop,
    IconPaperPlaneOutlineRegular: noop,
    IconPlusOutlineRegular: noop,
    IconRefreshOutlineRegular: noop,
    IconRightUpOutlineRegular: noop,
    IconTrashOutlineRegular: noop,
    IconUserOutlineRegular: noop,
    IconUsersOutlineRegular: noop,
  }
}

function render(node, Fragment) {
  if (node === null || node === undefined || typeof node !== "object") return node
  if (Array.isArray(node)) return node.map((child) => render(child, Fragment))
  if (node.type === Fragment) return node.children.map((child) => render(child, Fragment))
  if (typeof node.type === "function") return render(node.type(node.props), Fragment)
  return { ...node, children: node.children.map((child) => render(child, Fragment)) }
}

function stringsIn(value, found = []) {
  if (typeof value === "string") found.push(value)
  else if (Array.isArray(value)) for (const item of value) stringsIn(item, found)
  else if (value && typeof value === "object") {
    for (const child of value.children ?? []) stringsIn(child, found)
  }
  return found
}

test('the header panel renders its initial empty state without a store', () => {
  const React = fakeReact({ initiallyOpen: true })
  const Component = loadClient(React, fakePrimitives())
  assert.equal(typeof Component, "function")
  const useSessions = (selector) => selector({ ids: [], byId: {}, phase: "ready" })
  const useSession = (selector) => selector({ subagent: null })
  const tree = render(React.createElement(Component, {
    sessionId: "session-a",
    useSessions,
    useSession,
    openSession: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes("emptyTitle"))
  assert.ok(strings.includes("emptyText"))
  assert.ok(strings.includes("title"))
})

test('the selected group detail renders members, messages and owner controls', () => {
  const group = {
    id: 'grp_demo',
    name: 'Release review',
    topic: 'Ship it',
    status: 'active',
    ownerSessionId: 'session-a',
    members: [
      { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: '' },
      { sessionId: 'session-b', alias: 'bob', role: 'Reviewer', duties: 'Check the diff' },
    ],
    me: { sessionId: 'session-a', alias: 'owner', role: 'Lead', duties: '', isOwner: true },
    messages: [
      { id: 'msg_1', kind: 'system', at: 1, text: 'Group created.', deliveries: [] },
      { id: 'msg_2', kind: 'message', at: 2, fromAlias: 'bob', target: '@owner', text: 'Ready for review.', deliveries: [{ sessionId: 'session-a', alias: 'owner', status: 'delivered' }] },
    ],
    messageTotal: 2,
  }
  const React = fakeReact({
    initiallyOpen: true,
    stateOverrides: { 2: [group], 8: group.id, 9: 'groups' },
  })
  const Component = loadClient(React, fakePrimitives())
  const useSessions = (selector) => selector({ ids: ['session-a', 'session-b'], byId: {}, phase: 'ready' })
  const useSession = (selector) => selector({ subagent: null })
  const tree = render(React.createElement(Component, {
    sessionId: 'session-a',
    useSessions,
    useSession,
    openSession: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('Release review'))
  assert.ok(strings.includes('@bob'))
  assert.ok(strings.includes('Ready for review.'))
  assert.ok(strings.includes('dissolve'))
  assert.ok(strings.includes('send'))
})

test('the create screen renders its session picker and owner fields', () => {
  const React = fakeReact({ initiallyOpen: true, stateOverrides: { 0: true, 9: 'create' } })
  const Component = loadClient(React, fakePrimitives())
  const useSessions = (selector) => selector({
    ids: ['session-b'],
    byId: { 'session-b': { sessionId: 'session-b', id: 'session-b', title: 'Other task', updatedAt: 1 } },
    phase: 'ready',
  })
  const useSession = (selector) => selector({ subagent: null })
  const tree = render(React.createElement(Component, {
    sessionId: 'session-a',
    useSessions,
    useSession,
    openSession: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('name'))
  assert.ok(strings.includes('name'))
  assert.ok(strings.includes('currentSession'))
  assert.ok(strings.includes('selectSessions'))
  assert.ok(strings.includes('createAction'))
})
