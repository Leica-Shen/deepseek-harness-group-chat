# Release 2.4.4

## Body addition

```markdown
## Group-Chat 2.4.4

- Relay accepts `refs` (file/url/session/…); references travel in the envelope
  and are credential-scanned, so a peer can inspect an artefact instead of
  receiving a copy.
- In-panel round digest (deterministic, no model call): today's activity,
  recorded decisions, waiting deliveries, recent failures, open relays and the
  latest messages; copyable.
- The sidebar stops polling after two empty snapshots; GET halves the per-room
  window until the JSON body is under 1.2 MB.
- The member ceiling says it includes the human; composer help states the
  1,000-character note/decision cap.

Tests: 154/154. Schema 2 unchanged.
```

## Commands

```bash
node scripts/sync-version.mjs --check
npm test
node scripts/check-docs.mjs
git tag -a v2.4.4 -m "Group-Chat 2.4.4"
git push origin main v2.4.4
```

No GitHub Release exists yet (no `gh`/token); create it in the Web UI for
`v2.4.4` using the 2.4.0 feature body plus the 2.4.1–2.4.4 patch sections.
