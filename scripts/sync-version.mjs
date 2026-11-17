#!/usr/bin/env node
/**
 * Propagate the one version in package.json to the generated modules.
 *
 * Usage:
 *   node scripts/sync-version.mjs           # rewrite lib/version.js + client constant
 *   node scripts/sync-version.mjs --check   # exit 1 when anything drifted (CI)
 *
 * The client is loaded by the Harness module loader, not by a bundler, so a
 * literal constant is the only portable injection point. Generating it keeps a
 * single editable source while making drift a hard test failure.
 */
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const version = manifest.version
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`package.json version "${String(version)}" is not a semver string`)
  process.exit(1)
}

const versionFile = new URL('lib/version.js', root)
const clientFile = new URL('lib/client.js', root)
const versionBody = `/**
 * Single source of truth for the package version.
 *
 * This file is generated from \`package.json\` by \`scripts/sync-version.mjs\`.
 * It exists because the Web client is not bundled by a compiler: it needs the
 * version as a plain JSON value at module scope, and the Host cannot read
 * \`package.json\` safely once the package is installed from a git archive.
 * Never edit it by hand; \`npm test\` fails when it drifts from package.json.
 */
export const VERSION = '${version}'
`
const clientBody = await readFile(clientFile, 'utf8')
const pattern = /const CLIENT_VERSION = "[^"]*"/
if (!pattern.test(clientBody)) {
  console.error('lib/client.js no longer contains a CLIENT_VERSION literal')
  process.exit(1)
}
const nextClient = clientBody.replace(pattern, `const CLIENT_VERSION = "${version}"`)

const check = process.argv.includes('--check')
if (check) {
  const currentVersion = await readFile(versionFile, 'utf8').catch(() => '')
  const problems = []
  if (currentVersion !== versionBody) problems.push(`lib/version.js is not ${version}`)
  if (nextClient !== clientBody) problems.push(`lib/client.js CLIENT_VERSION is not ${version}`)
  if (problems.length > 0) {
    console.error(`version drift:\n- ${problems.join('\n- ')}\nRun: node scripts/sync-version.mjs`)
    process.exit(1)
  }
  console.log(`version ${version} is in sync`)
  process.exit(0)
}

await writeFile(versionFile, versionBody, 'utf8')
if (nextClient !== clientBody) await writeFile(clientFile, nextClient, 'utf8')
console.log(`synced version ${version} to lib/version.js and lib/client.js`)
