import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

function rule(selector) {
  const start = source.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `${selector} CSS rule is missing`)
  const end = source.indexOf('}', start)
  return source.slice(start, end)
}

test('message rows cannot shrink inside the scrolling transcript', () => {
  // Regression: 62 messages were squeezed to 1px by flex-shrink. The transcript
  // must scroll, not compress its children.
  assert.match(source, /\.dsh-group-talk-l-message \{[^}]*flex:\s*none/u)
  assert.match(rule('.dsh-group-talk-l-members'), /overflow-y:\s*auto/u)
  assert.match(rule('.dsh-group-talk-l-messages'), /min-height:\s*0/u)
})

test('collapsed panes and in-room audit keep dedicated layout hooks', () => {
  assert.match(source, /\.dsh-group-talk-l-shell-list-collapsed/u)
  assert.match(source, /\.dsh-group-talk-l-audit-modal/u)
  assert.match(source, /flex-wrap:\s*wrap/u)
})
