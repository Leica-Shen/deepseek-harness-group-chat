/**
 * Single source of truth for the package version.
 *
 * This file is generated from `package.json` by `scripts/sync-version.mjs`.
 * It exists because the Web client is not bundled by a compiler: it needs the
 * version as a plain JSON value at module scope, and the Host cannot read
 * `package.json` safely once the package is installed from a git archive.
 * Never edit it by hand; `npm test` fails when it drifts from package.json.
 */
export const VERSION = '2.4.5'
