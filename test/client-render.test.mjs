import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

/** Load the client bundle and execute its `apply` against a tiny slot harness. */
function loadClientModule(React, primitives) {
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
  return { component: context.component, internals: exported.__internals }
}

function loadClient(React, primitives) {
  return loadClientModule(React, primitives).component
}

function fakeReact({ initiallyOpen = false } = {}) {
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
      // `initiallyOpen` only stands in for the header action's boolean `open`
      // state; other components keep their real initial values.
      return [index === 0 && initial === false ? initiallyOpen : initial, () => {}]
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

function detailGroup(overrides = {}) {
  return {
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
      { id: 'msg_2', kind: 'message', at: 2, fromAlias: 'bob', fromSessionId: 'session-b', target: '@owner', text: 'Ready for review.', deliveries: [{ sessionId: 'session-a', alias: 'owner', status: 'delivered' }] },
    ],
    messageTotal: 2,
    ...overrides,
  }
}

test('the embedded panel renders its initial empty state without a store', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const useSessions = (selector) => selector({ ids: [], byId: {}, phase: "ready" })
  const tree = render(React.createElement(internals.GroupCenter, {
    embedded: true,
    open: true,
    onClose: () => {},
    sessionId: 'human',
    useSessions,
    openSession: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes("emptyTitle"))
  assert.ok(strings.includes("emptyText"))
  assert.ok(strings.includes("title"))
})

test('the full-area panel renders inside its page shell', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const list = {
    getSnapshot: () => ({ ids: [], byId: {}, phase: 'ready' }),
    subscribe: () => () => {},
  }
  const tree = render(React.createElement(internals.GroupTalkLPanel, {
    sessionList: list,
    closePanel: () => {},
    openSession: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('panelSubtitle'))
  assert.ok(strings.includes('backToChat'))
  assert.ok(strings.includes('emptyTitle'))
})

test('the group detail renders members, messages, version and owner controls', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const group = detailGroup()
  const tree = render(React.createElement(internals.GroupDetail, {
    group,
    sessionId: 'session-a',
    busy: '',
    notice: null,
    error: null,
    limits: { replyNudgeAfterMs: 120000 },
    usage: null,
    onSend: () => {},
    onEditRole: () => {},
    onRemoveMember: () => {},
    onOpen: () => {},
    onDissolve: () => {},
    onDelete: () => {},
    onAddMember: () => {},
    onLeave: () => {},
    onNudge: () => {},
    version: '1.5.0',
    t: (key) => key,
    useSessions: (selector) => selector({ byId: {} }),
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('Release review'))
  assert.ok(strings.includes('@bob'))
  assert.ok(strings.includes('Ready for review.'))
  assert.ok(strings.includes('dissolve'))
  assert.ok(strings.includes('send'))
  assert.ok(strings.some((value) => value.includes('Host 1.5.0')))
})

test('the create screen renders its session picker and owner fields', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const useSessions = (selector) => selector({
    ids: ['session-b'],
    byId: { 'session-b': { sessionId: 'session-b', id: 'session-b', title: 'Other task', updatedAt: 1 } },
    phase: 'ready',
  })
  const tree = render(React.createElement(internals.CreateForm, {
    sessionId: 'session-a',
    useSessions,
    onCreate: () => {},
    onCancel: () => {},
    busy: '',
    error: null,
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('name'))
  assert.ok(strings.includes('selectParticipants'))
  assert.ok(strings.includes('createAction'))
  assert.ok(!strings.includes('currentSession'))
})

test('waiting survives system rows, covers #role, and clears on a reply', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  const base = {
    status: 'active',
    messages: [
      { id: 's1', kind: 'system', at: 1, text: 'created' },
      { id: 'm1', kind: 'message', at: 10, fromSessionId: 'a', target: '#Reviewer', deliveries: [{ sessionId: 'b', alias: 'bob', status: 'delivered' }] },
      { id: 's2', kind: 'system', at: 20, text: 'bob joined' },
    ],
  }
  const waiting = internals.deriveWaiting(base, 'a')
  assert.equal(waiting.target, '#Reviewer')
  assert.equal(waiting.since, 10)
  assert.equal(waiting.nudgeable, false)

  const replied = {
    ...base,
    messages: [...base.messages, { id: 'm2', kind: 'message', at: 30, fromSessionId: 'b', target: '@a', deliveries: [] }],
  }
  assert.equal(internals.deriveWaiting(replied, 'a'), null)

  const failed = {
    ...base,
    messages: [{ id: 'm1', kind: 'message', at: 10, fromSessionId: 'a', target: '@bob', deliveries: [{ sessionId: 'b', alias: 'bob', status: 'failed' }] }],
  }
  assert.equal(internals.deriveWaiting(failed, 'a'), null)

  const alias = {
    ...base,
    messages: [{ id: 'm1', kind: 'message', at: 10, fromSessionId: 'a', target: '@bob', deliveries: [{ sessionId: 'b', alias: 'bob', status: 'delivered' }] }],
  }
  assert.equal(internals.deriveWaiting(alias, 'a').nudgeable, true)
})

test('waiting ignores an in-room message to the human operator', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  const group = {
    status: 'active',
    members: [
      { sessionId: 'human', alias: 'owner', role: 'owner' },
      { sessionId: 'b', alias: 'B', role: 'Designer' },
    ],
    messages: [{
      id: 'm1',
      kind: 'message',
      at: 10,
      fromSessionId: 'b',
      target: '@owner',
      deliveries: [{ sessionId: 'human', alias: 'owner', status: 'in-room' }],
    }],
  }
  assert.equal(internals.deriveWaiting(group, 'b'), null)
})

test('unread counts only other members after the watermark, ignoring system rows', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  const group = {
    id: 'g1',
    status: 'active',
    me: { sessionId: 'a', alias: 'owner' },
    messages: [
      { kind: 'message', at: 9, fromSessionId: 'b' },
      { kind: 'message', at: 11, fromSessionId: 'a' },
      { kind: 'message', at: 12, fromSessionId: 'b' },
      { kind: 'message', at: 13, fromSessionId: 'a' },
      { kind: 'message', at: 14, fromSessionId: 'b' },
      { kind: 'system', at: 15, fromSessionId: 'b' },
    ],
  }
  assert.equal(internals.unreadFor(group, { g1: 10 }), 2)
  assert.equal(internals.unreadFor(group, { g1: 14 }), 0)
  assert.equal(internals.unreadFor(group, {}), 0)
  assert.equal(internals.unreadFor({ ...group, status: 'dissolved' }, { g1: 10 }), 0)
})

test('first sight seeds the watermark so history is not unread', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  const seen = {}
  const groups = [{ id: 'g1', status: 'active', updatedAt: 99, messages: [{ kind: 'message', at: 50, fromSessionId: 'b' }] }]
  assert.equal(internals.seedSeen(groups, seen), true)
  assert.equal(seen.g1, 99)
  assert.equal(internals.seedSeen(groups, seen), false)
  assert.equal(internals.markSeen(groups[0], seen), false)
  groups[0].messages.push({ kind: 'message', at: 120, fromSessionId: 'b' })
  assert.equal(internals.markSeen(groups[0], seen), true)
  assert.equal(seen.g1, 120)
})

test('the group list shows unread badges only when a group has unread messages', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const groups = [
    { id: 'g1', name: 'Alpha', status: 'active', members: [1, 2], me: { alias: 'owner' } },
    { id: 'g2', name: 'Beta', status: 'active', members: [1], me: { alias: 'owner' } },
  ]
  const tree = render(React.createElement(internals.GroupList, {
    groups,
    selectedId: 'g1',
    unreadById: { g1: 3, g2: 0 },
    loading: false,
    error: null,
    onSelect: () => {},
    onCreate: () => {},
    onRetry: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('3'))
  assert.ok(!strings.includes('99+'))
})

test('the detail shows the timeout hint, nudge and open-target controls', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const group = detailGroup({
    messages: [{
      id: 'msg_1',
      kind: 'message',
      at: 10,
      fromAlias: 'owner',
      fromSessionId: 'session-a',
      target: '@bob',
      text: 'Please review.',
      deliveries: [{ sessionId: 'session-b', alias: 'bob', status: 'delivered' }],
    }],
    messageTotal: 1,
  })
  const tree = render(React.createElement(internals.GroupDetail, {
    group,
    sessionId: 'session-a',
    busy: '',
    notice: null,
    error: null,
    limits: { replyNudgeAfterMs: 120000 },
    usage: null,
    onSend: () => {},
    onEditRole: () => {},
    onRemoveMember: () => {},
    onOpen: () => {},
    onDissolve: () => {},
    onDelete: () => {},
    onAddMember: () => {},
    onLeave: () => {},
    onNudge: () => {},
    version: '1.5.0',
    t: (key) => key,
    useSessions: (selector) => selector({ byId: {} }),
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('waitingLong'))
  assert.ok(strings.includes('nudge'))
  assert.ok(strings.includes('openTarget'))
})

test('the host gate is 2.0.1, not just major 2', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  assert.equal(internals.versionAtLeast('1.5.0', [2, 0, 1]), false)
  assert.equal(internals.versionAtLeast('2.0.0', [2, 0, 1]), false)
  assert.equal(internals.versionAtLeast('2.0.1', [2, 0, 1]), true)
  assert.equal(internals.versionAtLeast('2.1.0', [2, 0, 1]), true)
})

test('secretary and organizer presets are available to the role UI', () => {
  const { internals } = loadClientModule(fakeReact(), fakePrimitives())
  const ids = internals.ROLE_PRESETS.map((preset) => preset.id)
  assert.ok(ids.includes('secretary'))
  assert.ok(ids.includes('organizer'))
  assert.match(internals.ROLE_PRESETS.find((preset) => preset.id === 'secretary').dutiesZh, /日志|回退/)
  assert.match(internals.ROLE_PRESETS.find((preset) => preset.id === 'organizer').dutiesZh, /调度|冲突/)
})

test('control entries render in the transcript and the audit view', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const group = detailGroup({
    messages: [{
      id: 'ctl_1',
      kind: 'control',
      at: 10,
      action: 'delegate',
      outcome: 'completed',
      fromAlias: 'org',
      text: 'Delegation task_1 completed: done.',
      deliveries: [],
    }],
    messageTotal: 1,
  })
  const tree = render(React.createElement(internals.AuditView, {
    group,
    onBack: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.some((value) => value.includes('controlDelegate')))
  assert.ok(strings.includes('Delegation task_1 completed: done.'))
  assert.ok(strings.includes('auditTitle'))
})

test('the delegation form renders its task, label and warning', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const tree = render(React.createElement(internals.DelegateModal, {
    onStart: () => {},
    onClose: () => {},
    busy: '',
    error: null,
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.includes('delegateTask'))
  assert.ok(strings.includes('delegateHint'))
})

test('the group list shows a flat preview and a collapse control', () => {
  const React = fakeReact()
  const { internals } = loadClientModule(React, fakePrimitives())
  const groups = [{
    id: 'g1',
    name: 'Alpha',
    status: 'active',
    members: [{ sessionId: 'human' }],
    me: { sessionId: 'human', alias: 'human' },
    messages: [{ kind: 'message', fromAlias: 'bob', text: 'Latest preview text', at: 1 }],
  }]
  const tree = render(React.createElement(internals.GroupList, {
    groups,
    selectedId: 'g1',
    unreadById: {},
    loading: false,
    error: null,
    onSelect: () => {},
    onCreate: () => {},
    onRetry: () => {},
    t: (key) => key,
  }), React.Fragment)
  const strings = stringsIn(tree)
  assert.ok(strings.some((value) => value.includes('Latest preview text')))
  assert.ok(strings.includes('collapseGroups') || strings.includes('▾'))
})
