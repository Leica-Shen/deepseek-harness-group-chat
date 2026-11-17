# Release 2.4.2 (security patch)

No GitHub Release has been created for 2.4.0/2.4.1 (no `gh` CLI or token on this
machine). When creating one in the Web UI, use the 2.4.0 feature notes plus the
patch sections for 2.4.1 and 2.4.2. Do not claim it exists before the page
returns 200.

## Body addition

```markdown
## Group-Chat 2.4.2

Security tightening found in the post-push pass.

- Credential scanning now covers audited notes/decisions and `refs` values, not
  only the message body.
- Authorization-shaped payloads are rejected for every relay intent, not only
  `confirm`; routing "may we approve/pay/delete" through `ask` was a loophole in
  red line 2.

Tests: 152/152. Schema 2 and the daily ledger are unchanged.
```

## Commands

```bash
node scripts/sync-version.mjs --check
npm test
node scripts/check-docs.mjs
git tag -a v2.4.2 -m "Group-Chat 2.4.2"
git push origin main v2.4.2
```

`v2.4.0` and `v2.4.1` stay annotated and untouched.
