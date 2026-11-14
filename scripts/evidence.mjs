#!/usr/bin/env node
/**
 * Write one UI-acceptance evidence.json next to a screenshot.
 *
 * Usage:
 *   node scripts/evidence.mjs \
 *     --dir 评审证据/ui-2.1 \
 *     --screenshot 980-100-host2.1.0-client2.1.0.png \
 *     --host 2.1.0 \
 *     --window 980 \
 *     --zoom 1.0 \
 *     --capabilities '{"inRoom":true,"priority":true,"control":true,"delegate":true}' \
 *     --notes "long message collapsed"
 *
 * For 2.0.3 pass --capabilities none (the GET response has no capabilities).
 * The client version comes from package.json; the commit defaults to git HEAD.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const help = process.argv.includes('--help') || process.argv.includes('-h')
if (help) {
  console.log('node scripts/evidence.mjs --dir <dir> --screenshot <file> --host <version> --window <px> --zoom <ratio> [--capabilities <json|none>] [--commit <hash>] [--notes <text>]')
  process.exit(0)
}

const dir = resolve(arg('dir', ''))
if (!dir) throw new Error('--dir is required')
const screenshot = arg('screenshot', '')
if (!screenshot) throw new Error('--screenshot is required')
const hostVersion = arg('host', '')
if (!hostVersion) throw new Error('--host is required')
const windowWidth = Number(arg('window', ''))
if (!Number.isFinite(windowWidth) || windowWidth <= 0) throw new Error('--window must be a positive number')
const zoom = Number(arg('zoom', '1'))
if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('--zoom must be a positive number')
const clientVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
const commit = arg('commit', '') || execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
const rawCapabilities = arg('capabilities', 'none')
let capabilities = null
if (rawCapabilities !== 'none') {
  try { capabilities = JSON.parse(rawCapabilities) } catch { throw new Error('--capabilities must be JSON or none') }
}

const target = join(dir, 'evidence.json')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
if (!existsSync(join(dir, screenshot))) throw new Error(`screenshot not found: ${join(dir, screenshot)}`)

const record = {
  commit,
  hostVersion,
  clientVersion,
  capabilities,
  windowWidth,
  zoom,
  timestamp: new Date().toISOString(),
  screenshot: basename(screenshot),
  ...(arg('notes', '') ? { notes: arg('notes', '') } : {}),
}
writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`)
console.log(JSON.stringify(record, null, 2))
