# Compatibility

Group-Chat has two halves: a **portable core** (store, guard, policy, relay,
audit) and a thin **Host adapter**. DSH is the reference implementation; other
hosts can reuse the core through MCP and a mailbox.

> The "wake" column is an inference from each host's public extension points as
> of 2026-11. Re-check the host's current documentation and run a one-message PoC
> before claiming a mode. "No wake" is a supported mode, not a failure.

## Modes

| Mode | What happens | Panel label |
| --- | --- | --- |
| `wake` | The adapter admits a prompt into a session and can resume it | normal (no label) |
| `mailbox` | The envelope is written to `<mailbox>/<sessionId>/inbox`; that agent reads it at the start of its next turn | Settings shows "Mailbox mode (not instant)" |
| `read-only` | No delivery transport; the room is a human-readable log | Settings shows "Can wake sessions: no" |

A group message is **durable once accepted**, whether or not the target is awake.
"Delivered" means "admitted", never "the model read and understood it".

## Matrix

| Host | Integration | Wake | Mode | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| **DeepSeek Harness** | Host + Web Client plugin | yes (`sessionController.prompt`, `queue`/`steer`) | wake | reference, tested | The full panel, pause, relay, sensitivity, stats |
| **Codex CLI** | MCP + `AGENTS.md` + mailbox | no (TUI cannot be injected) | mailbox | adapter + docs; needs a PoC per Codex release | Use `group-chat-mcp`; read `group_inbox` at turn start |
| **Claude Code** | MCP + hooks + `CLAUDE.md` | hooks can act near a turn boundary | mailbox (near-real-time with a hook) | adapter + docs; community-tested | Hook can call `group_inbox` and inject the result |
| **Gemini CLI** | MCP | no public mid-turn injection | mailbox | MCP only | Same pattern as Codex |
| **OpenCode** | MCP | at turn boundary | mailbox | MCP only | |
| **Cline** | MCP | IDE session; a person continues the turn | mailbox (semi-automatic) | MCP only | Label "not instant" |
| **Cursor** | MCP | none | read-only + mailbox | MCP only | A person copies answers; do not market as live |
| **Aider** | no MCP | none | mailbox (files) | mailbox only | Start-of-run inbox read |

## What stays portable

- `lib/store.js` — JSON state, schema 2, retention, redaction, advisory lock.
- `lib/guard.js` — fan-out, cooldown, dedupe, burst and daily budgets (local day).
- `lib/policy.js` — member prompt, envelope, help, history.
- `lib/relay.js` — one-to-one relay state machine and its five red lines.
- `lib/secrets.js` — credential scan and redacted export.
- `lib/i18n.js`, `lib/roles.js`, `lib/metrics.js`.

No DSH import appears in those files. The adapter is the only place that knows
how to list sessions, wake one, or start a subagent.

## Capability contract

`capabilities()` must answer honestly:

```js
{
  transport: 'dsh' | 'mailbox' | string,
  wake: boolean,        // can admit a prompt into a session
  steer: boolean,       // can inject at a step boundary (wake implies maybe)
  listSessions: boolean,// can enumerate ordinary sessions
  subagents: boolean,   // can start a bounded child agent
  identity: 'host' | 'file',
  mailbox: boolean
}
```

The panel and the HTTP `capabilities` payload surface these fields. A host that
cannot wake must not be described as "real-time".

## Testing a new host

1. Create a room with two of its sessions and send one `@alias` message.
2. Confirm the envelope is durable (reload the store) and appears in the target.
3. Confirm the target's ordinary answer does **not** return automatically.
4. Confirm a reply only returns when the member calls `group_talk_send`.
5. Confirm the mode label in Settings matches reality.
6. Run the guard tests (`npm test`) against the same store; they are host-free.

## Migration notes

- Package renamed to `@leica-shen/dsh-group-chat` in 2.4.0. Plugin id, data
  directory and CSS class names remain `group-talk-l` for continuity.
- State version 2 migrates version 1 on load; the daily ledger day key changed
  from UTC to local (one-time reset).
- Old panels pinned the group panel automatically; 2.4 only keeps it open when
  the person chose "Keep open".
