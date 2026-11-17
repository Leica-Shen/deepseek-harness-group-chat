# Release 2.4.0

## Before tagging

```bash
cd /path/to/deepseek-harness-group-chat
node scripts/sync-version.mjs --check
npm test
node scripts/check-docs.mjs
npm pack --dry-run    # confirm .github / REVIEW-RESPONSE.md are not in the tarball
```

## Re-tag 2.3.1 as annotated (same commit, safe)

```bash
git tag -d v2.3.1
git tag -a v2.3.1 03412dd -m "Group-Chat 2.3.1"
git push --force origin v2.3.1
```

`git cat-file -t v2.3.1` must print `tag`, and `git ls-remote origin` must show a
`v2.3.1^{}` line. The commit content does not change.

## Tag 2.4.0

```bash
git tag -a v2.4.0 -m "Group-Chat 2.4.0"
git push origin main v2.4.0
```

## GitHub Release

There is no `gh` CLI or GitHub token on this machine, so the Release must be
created in the Web UI (Releases → Draft a new release → tag `v2.4.0`). Use the
body below. Do not claim the Release exists until the page returns 200.

```markdown
## Group-Chat 2.4.0

Implements the complete 2026-11-17 external review: release discipline, the
2.3.2 behaviour fixes, the security/cost/relay work, bilingual UI and the
adapter/MCP architecture.

### Highlights
- One version source generated from package.json; CI fails on drift.
- No 30-second blocking send; optimistic insert + concurrency gate.
- Credential scan + taint labels; broadcast preview; pause/emergency stop.
- Relay (one-to-one, 1 round by default, 10-minute TTL, five hard-coded red lines).
- Retention, redaction, per-group sensitivity and redacted export.
- Bilingual panel and host errors; stable roleId routing.
- Messages-first layout, avatars, date separators, search, mute/hide/mark-all-read.
- Host adapter contract + mailbox adapter + MCP server; COMPATIBILITY.md.

### Upgrade
Restart Harness once. State schema v2 migrates on load; the daily ledger switches
from UTC to local midnight (a one-time reset). Package renamed to
`@leica-shen/dsh-group-chat`; plugin id and data directory stay `group-talk-l`.

### Verification
`npm test` 151/151; `node scripts/check-docs.mjs` green. Screenshots are 2.2
evidence (1200×777); a 2.4 post-restart UI walk-through is still pending.
```

## Notes

- npm publication is not part of this release. The package is installable from
  GitHub; the `@leica-shen` scope would need an npm organization first.
- The Market entry's icon points at `main`; keep `assets/icon-180.png` on `main`
  stable.
