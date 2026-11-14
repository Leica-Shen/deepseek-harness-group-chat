import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(new URL('../scripts/evidence.mjs', import.meta.url))

test('evidence helper writes one record per screenshot instead of overwriting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-gt-evidence-'))
  for (const name of ['a.png', 'b.png']) await writeFile(join(dir, name), 'x')
  for (const name of ['a.png', 'b.png']) {
    execFileSync(process.execPath, [
      script,
      '--dir', dir,
      '--screenshot', name,
      '--host', '2.1.0',
      '--window', '980',
      '--zoom', '1.25',
      '--capabilities', '{"inRoom":true,"priority":true}',
      '--commit', 'deadbeef',
      '--notes', name,
    ], { encoding: 'utf8' })
  }
  const a = JSON.parse(await readFile(join(dir, 'a.png.evidence.json'), 'utf8'))
  const b = JSON.parse(await readFile(join(dir, 'b.png.evidence.json'), 'utf8'))
  assert.equal(a.screenshot, 'a.png')
  assert.equal(b.screenshot, 'b.png')
  assert.equal(a.commit, 'deadbeef')
  assert.equal(b.zoom, 1.25)
  assert.equal(a.capabilities.priority, true)
})
