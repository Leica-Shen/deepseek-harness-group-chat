# Release 2.4.1 (patch on 2.4.0)

Use this when creating the GitHub Release: if no 2.4.0 Release was created, base
the body on [RELEASE-2.4.0.md](RELEASE-2.4.0.md) and prepend the 2.4.1 section
below. There is no `gh` CLI or token on this machine; create it in the Web UI and
do not claim it exists until the page returns 200.

## Body

```markdown
## Group-Chat 2.4.1

A small hardening patch on top of 2.4.0, found in the post-push review.

- Relay replies are charged to the sender/room/Host ledger (they still skip the
  origin's per-target delivery cap, so an answer the origin asked for is not
  blocked by its own budget).
- A malformed relay row no longer turns the whole store read-only; relays are
  transient coordination state.
- Mailbox hosts no longer treat a not-yet-created inbox as a missing session.
- A read-only store stops the maintenance pass instead of logging a failed write
  every 15 seconds.
- Ambiguous group references name the candidates in both languages.

Tests: 151/151. State schema 2 and the daily ledger are unchanged from 2.4.0.
```

## Commands

```bash
node scripts/sync-version.mjs --check
npm test
node scripts/check-docs.mjs
git tag -a v2.4.1 -m "Group-Chat 2.4.1"
git push origin main v2.4.1
```

`v2.4.0` stays where it is (annotated); do not rewrite it. `git ls-remote` must
show a `v2.4.1^{}` line.
