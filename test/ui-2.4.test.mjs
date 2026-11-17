import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

function rule(selector) {
  const start = source.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `${selector} is missing`)
  return source.slice(start, source.indexOf('}', start))
}

test('the transcript is the main surface and messages cannot be squeezed', () => {
  assert.match(rule('.dsh-group-talk-l-message'), /flex:\s*none/u)
  assert.match(rule('.dsh-group-talk-l-message'), /max-width:\s*86%/u)
  assert.match(rule('.dsh-group-talk-l-message-self'), /max-width:\s*78%/u)
  assert.match(rule('.dsh-group-talk-l-messages'), /min-height:\s*0/u)
  assert.match(rule('.dsh-group-talk-l-messages'), /overflow-y:\s*auto/u)
  // The 2.3 bug: a later rule reset the bubble to 100% and made the list ragged.
  assert.doesNotMatch(source, /\.dsh-group-talk-l-message \{[^}]*max-width:\s*100%/u)
})

test('metadata is readable and the day separator is sticky', () => {
  assert.match(rule('.dsh-group-talk-l-message-meta'), /font-size:\s*12px/u)
  assert.match(rule('.dsh-group-talk-l-message-body'), /font-size:\s*13px/u)
  assert.match(rule('.dsh-group-talk-l-day'), /position:\s*sticky/u)
  assert.match(source, /prefers-reduced-motion/u)
})

test('menus are viewport-anchored and the old duplicated header control is gone', () => {
  assert.match(rule('.dsh-group-talk-l-target-menu'), /position:\s*fixed/u)
  assert.match(rule('.dsh-group-talk-l-menu'), /position:\s*absolute/u)
  // The page head no longer renders a "hide group list" button; the only one
  // lives in the overflow menu (single control).
  const pageHead = source.slice(source.indexOf('dsh-group-talk-l-page-head"'), source.indexOf('dsh-group-talk-l-page-body"'))
  assert.doesNotMatch(pageHead, /hideGroupList/u)
})

test('the composer has honest semantics and a compact hint', () => {
  assert.match(source, /"aria-label":\s*t\("messageField"\)/u)
  assert.match(rule('.dsh-group-talk-l-composer-hint-text'), /text-overflow:\s*ellipsis/u)
  assert.match(source, /ComposerHelp|composerHelpTitle/u)
  assert.match(source, /onPaste/u)
})

test('unread uses a warning/red token, not the business accent', () => {
  assert.match(source, /dsh-group-talk-l-unread-dot[^}]*state-warning/u)
  assert.match(source, /dsh-group-talk-l-row-unread[^}]*state-warning/u)
})
