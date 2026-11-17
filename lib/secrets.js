/**
 * Conservative credential scanner for group messages.
 *
 * Group transcripts are plain text on disk and every member can read them, so a
 * pasted key is a lasting disclosure. The scanner is intentionally biased
 * towards a small number of high-signal shapes: a false positive costs one
 * confirmation click, a false negative costs a rotation.
 *
 * This is a gate, not a sandbox: callers can still send a credential when a
 * person explicitly confirms in the panel. The model-facing tools never can.
 */

const RULES = [
  {
    label: 'private key',
    // A PEM header is enough; do not require the whole block (it may be split).
    pattern: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/u,
  },
  { label: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/u },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { label: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u },
  { label: 'Slack token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/u },
  { label: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
  { label: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/u },
  { label: 'provider API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/u },
  { label: 'JSON Web Token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u },
  { label: 'bearer token', pattern: /\bBearer\s+[A-Za-z0-9._-]{24,}\b/u },
  {
    label: 'key assignment',
    pattern: /\b(?:api[_-]?key|secret|password|passwd|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"]?[A-Za-z0-9+/_.-]{16,}/iu,
  },
]

/** Long, mixed-class blobs that look like a generated secret rather than prose. */
function looksRandom(text) {
  const matches = text.match(/\b[A-Za-z0-9+/_-]{40,}={0,2}\b/gu)
  if (!matches) return false
  for (const value of matches) {
    const classes = [/[a-z]/u.test(value), /[A-Z]/u.test(value), /\d/u.test(value), /[+/_=-]/u.test(value)]
    const distinct = new Set(value).size
    if (classes.filter(Boolean).length >= 3 && distinct >= 18) return true
  }
  return false
}

/**
 * Scan one message body.
 *
 * @param {string} text
 * @returns {{hit: boolean, labels: string[]}}
 */
export function scanSecrets(text) {
  const value = typeof text === 'string' ? text : ''
  if (value.length === 0) return { hit: false, labels: [] }
  const labels = []
  for (const rule of RULES) {
    if (rule.pattern.test(value)) labels.push(rule.label)
  }
  // A placeholder is how a careful person talks *about* a credential.
  const placeholder = /(?:<[^>]{2,}>|\$\{[A-Z_]+\}|\b(?:REDACTED|PLACEHOLDER|EXAMPLE|your[-_ ]key)\b)/iu.test(value)
  if (!placeholder && looksRandom(value)) labels.push('high-entropy string')
  return { hit: labels.length > 0, labels: [...new Set(labels)] }
}

/** Redact known secret shapes from a text that is going to be exported or logged. */
export function redactSecrets(text) {
  let value = String(text ?? '')
  for (const rule of RULES) {
    value = value.replace(new RegExp(rule.pattern.source, `${rule.pattern.flags.replace('g', '')}g`), `[redacted ${rule.label}]`)
  }
  return value
}

/**
 * Redact person-identifying and machine-identifying fragments for export.
 * Deliberately lossy: an export is a shareable artefact, not a backup.
 */
export function redactForExport(text) {
  return redactSecrets(String(text ?? ''))
    .replace(/\/(?:Users|home)\/[^/\s"']+/gu, '/<home>')
    .replace(/\b[A-Za-z]:\\Users\\[^\\\s"']+/gu, '<home>')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu, '<email>')
}
