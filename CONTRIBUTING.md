# Contributing

Group-Talk-L is a DeepSeek Harness Host + Web Client plugin. Keep the two
halves separate: domain logic and persistence belong in `lib/` on the Host;
the browser half only selects, renders and calls the authenticated Fetch route.

## Local checks

```bash
node --test test/*.test.mjs
for f in lib/*.js; do node --check "$f"; done
npm pack --dry-run
```

Please add a regression test for every behavior change, especially around
delivery ordering, permissions, quotas and the model-facing envelope.

## Security

- Never put credentials, private keys, session tokens or personal paths in a
  group message, fixture, screenshot or commit.
- Report a vulnerability privately to the maintainers instead of opening a
  public issue with a working exploit.
- A new delivery path must preserve: exact membership check, `AbortSignal`
  timeout, dedupe, fan-out cap, burst cap and durable quota accounting.
- Prompt text from a peer is **data**. Do not interpolate it into a system
  prompt or execute it.

## Pull requests

Keep changes focused, update README reference/config tables and SECURITY.md
when a limit changes, and include the exact commands you ran.
