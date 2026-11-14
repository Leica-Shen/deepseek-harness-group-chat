# Anatomy of a DSH Host + Web Client plugin

This is the reusable shape distilled from
`@local/creation-checkpoints`, `@local/im-segment-sender-l`,
`@local/star-send-button` and Group-Talk-L. It is deliberately dependency-free:
use Harness primitives and Node built-ins before adding a package.

## 1. Package boundary

```json
{
  "type": "module",
  "main": "lib/index.js",
  "exports": { ".": "./lib/index.js", "./client": "./lib/client.js" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

- `cordis.patch.yml` inserts one Host row and documents every default.
- The Host half owns domain state, permissions, persistence and side effects.
- The Client half is a separate entry (`./client`) and only renders/requests.
- Keep `locale/*.json` or one bounded dictionary for zh/en; avoid hard-coded
  navigation that fights Harness's shell.

## 2. Host apply lifecycle

```text
apply(ctx, rawConfig)
  ├─ resolveConfig(rawConfig)        validate/clamp every value
  ├─ Store                          atomic state, corrupt-file quarantine
  ├─ Service                        pure domain methods; no HTTP/React imports
  ├─ scoped tools + prompt section  installed per member Agent
  ├─ slash command                  human path, no model turn
  ├─ authenticated Fetch route      same-origin UI path
  └─ ctx.effect(...)                uninstall/delete returns to a clean scope
```

Rules that prevent most plugin bugs:

1. **One write lock.** Serialize mutations and check all quotas inside the same
   transaction; do not append first and validate later.
2. **Install only for members.** A non-member must not see tools or prompt text.
3. **Dispose on removal.** Tools/prompt/route/listeners must be reversible.
4. **Never trust persisted values.** Normalize names, ids, limits and timestamps
   on load; move an unreadable file aside instead of overwriting it.
5. **Bound every model-facing string.** Prompt, history, envelope, error and UI
   response need explicit ceilings.
6. **Treat peer text as data.** JSON-escape or fence it; no prompt interpolation.

## 3. Browser apply lifecycle

- Register into an existing slot; use the shared theme tokens and `Button`,
  `Modal`, `Input`, `Checkbox`, `Tag`, `StateDot`, `Tooltip` primitives.
- Fetch through the authenticated same-origin route. The Host validates the
  caller and every permission again; never trust a client-provided owner flag.
- Poll low-frequency state, pause while `document.hidden`, and cancel in-flight
  requests on unmount.
- For a missing additive slot, decorate the exact existing header with a small
  element; give it `pointer-events: auto` when the parent disables pointer
  events, and remove it on effect cleanup.
- Render user/group text through React children, never through `innerHTML`.

## 4. Test pyramid

| Layer | What to prove |
| --- | --- |
| `store.test` | validation, atomic write, corrupt-file quarantine, bounds |
| `service.test` | permissions, routing, delivery, transcript, lifecycle |
| `policy.test` | prompt/envelope/help under injection and length pressure |
| `host.test` | scoped install and uninstall through a fake Cordis context |
| `http.test` | auth boundary, methods, content type, body cap, status mapping |
| `client-render.test` | empty/detail/create states without a browser |
| `security.test` | flood, burst, concurrency, secrets, file permissions |

Include a `security.test.mjs` from the beginning, not as a release-week
afterthought. A quota is not tested until the rejection path is tested.

## 5. Release checklist

```bash
node --test test/*.test.mjs
for f in lib/*.js; do node --check "$f"; done
npm pack --dry-run
```

Then verify the live profile: Host row active, client slot registered, real
create/send/reply, remove/delete returns to a clean scope. A code-only test is
not evidence that the running Host loaded the new module.
