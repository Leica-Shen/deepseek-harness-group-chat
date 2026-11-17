#!/usr/bin/env node
/**
 * Fail when the documentation quotes numbers the code no longer produces.
 *
 * The review found three mutually inconsistent numbers in one README. Running
 * the suite here (rather than grepping for `test(` occurrences) is the only
 * honest source of truth.
 */
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const files = (await readdir(new URL('test/', root))).filter((name) => name.endsWith('.test.mjs')).map((name) => `test/${name}`)

let output = ''
try {
  output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', ...files], {
    cwd: new URL('.', root).pathname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (error) {
  // A failing suite is the test command's business; use its summary anyway so
  // the documentation check reports the real count.
  output = `${error.stdout ?? ''}`
}

const pass = Number(/# pass (\d+)/u.exec(output)?.[1] ?? NaN)
const fail = Number(/# fail (\d+)/u.exec(output)?.[1] ?? NaN)
if (!Number.isFinite(pass)) {
  console.error('check-docs: could not read the test summary')
  process.exit(1)
}

const problems = []
const expect = (file, text) => {
  if (!text.includes(String(pass))) problems.push(`${file} does not mention the current test count (${pass})`)
}

const readme = await readFile(new URL('README.md', root), 'utf8')
const readmeEn = await readFile(new URL('README.en.md', root), 'utf8')
const security = await readFile(new URL('SECURITY.md', root), 'utf8')
expect('README.md', readme)
expect('README.en.md', readmeEn)
expect('SECURITY.md', security)
if (!readme.includes(`${pass}/${pass}`)) problems.push(`README.md does not say ${pass}/${pass}`)
if (!readmeEn.includes(`${pass} tests`)) problems.push(`README.en.md does not say "${pass} tests"`)
if (!security.includes(`${pass}/${pass}`)) problems.push(`SECURITY.md does not say ${pass}/${pass}`)
if (!readme.includes(manifest.version)) problems.push(`README.md does not mention version ${manifest.version}`)
if (!readmeEn.includes(manifest.version)) problems.push(`README.en.md does not mention version ${manifest.version}`)
if (fail !== 0) problems.push(`the suite reports ${fail} failing test(s)`)
if (problems.length > 0) {
  console.error(`check-docs:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`docs match ${pass} tests and version ${manifest.version}`)
