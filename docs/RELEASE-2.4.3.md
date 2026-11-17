# Release 2.4.3 (optimistic send)

Final patch of the 2.4 line. No GitHub Release exists yet (no `gh`/token); use
the 2.4.0 feature body plus the 2.4.1–2.4.3 patch sections in the Web UI.

## Body addition

```markdown
## Group-Chat 2.4.3

- The panel now sends optimistically: the local row appears before the delivery
  round-trip, the composer stays usable during a slow admission, and the receipt
  replaces the local row. Text is only cleared when the person has not typed
  something new in the meantime.
- Documentation states the remaining limits: no turn scheduler, two full JSON
  writes per send, no GET byte cap, derived read receipts, no at-rest
  encryption, no attachments/undo/offline digest.

Tests: 152/152. Schema 2 unchanged.
```

## Commands

```bash
node scripts/sync-version.mjs --check
npm test
node scripts/check-docs.mjs
git tag -a v2.4.3 -m "Group-Chat 2.4.3"
git push origin main v2.4.3
```

Earlier annotated tags stay untouched.
