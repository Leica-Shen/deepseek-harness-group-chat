# Group-Talk-L · Cross-session group chat

[中文](README.md) · [GitHub](https://github.com/Leica-Shen/deepseek-harness-group-chat) · MIT · **102 tests** · DeepSeek Harness Host + Web Client plugin

Group-Talk-L lets the person talk to **existing agent sessions** as a group without merging their contexts. Each participant keeps its own conversation, model, and workspace; the group is a membership + shared transcript + routing layer, not a new Session.

## What is new in 2.3

A security and semantics release; no new chat surface.

**2.3.1 (launch day):** the operator is no longer locked out by the per-sender delivery/token ceilings. A six-recipient broadcast used to charge ~6,500 estimated tokens against the human's own sender budget, so the second broadcast in the same minute hit the sender burst ceiling and about the tenth hit the sender daily delivery ceiling, while the panel still showed "10/30". The per-sender delivery, daily-token and burst-token ceilings now apply to agents only; the human keeps the message count, cooldown, and group/Host budgets. `npm test` is 102/102.

- **Web identity is human-only.** `/api/group-talk-l` ignores the old body/query `sessionId` identity and rejects non-`human` values with `human-only`; cross-site `Origin`/`Sec-Fetch-Site` requests are rejected. The shipped panel already used `human` only, so the UI is unchanged.
- **Priority is a mechanism.** `ambient` now defaults to `queue` (after the target's current turn), `urgent` to `steer` (next step boundary); an explicit `mode` overrides both. The "no interrupt" promise is now real.
- **Purpose gate moved into the domain service.** Non-organizer members need `purpose=verify|correct|review|anomaly|question|blocked|handoff` for peer messages; in-room `@human` replies are exempt. Role matching is exact (`non-organizer` is not an organizer). Envelope/policy/help examples include `purpose`.
- **Human priority no longer starves peers.** Human messages skip target caps but no longer charge the target's daily budget; the sender cooldown applies to everyone.
- **Notes are bounded.** 10/minute and 50/day; control rows keep their own 20-row transcript window and never evict chat; the full history stays in `audit`, which the panel fetches on demand.
- **CJK-aware token estimate.** CJK × 1.5, other ÷ 4. Still a guard, not a bill.
- **Store safety.** A load that drops a member/group turns the store read-only and returns HTTP 503 instead of persisting the loss; duplicate mounts for one `dataFile` are ignored.
- **Smaller fixes.** 8,000-character hard message cap; `group_talk_list` lines capped at 240 characters; policy advertises note/delegate only when enabled; the panel disables an over-cap `*` target, nudges `*`/`#role` rooms, counts the human member, and the in-transcript badge no longer scans the whole DOM.
- Delegation remains `allowAgentDelegate: false` by default and still needs a real-provider verification before it is marketed as stable.

## What is new in 2.2 (history)

- **Collapse the whole group list.** The left group column can be hidden completely; the main information area takes the full width. Reopen it from the main header/page header.
- **Collapse the participant list.** The member section gets a collapse control; hiding it gives the transcript/composer the full height. The member list still scrolls independently when open.
- **Send gate.** Non-organizer/owner members must pass `purpose=verify|correct|review|anomaly` to `group_talk_send`; status, acknowledgements and chatter are rejected by the Host. Organizer/owner/human are exempt. This stops cross-waking and group spam.
- **Version:** 2.2.0.

## What is new in 2.1

- **Human priority.** Human messages are delivered as user instructions (`from.kind: "human"`), not untrusted peer content. They bypass target caps (group/Host/sender budgets remain; 2.3 also keeps the sender cooldown), and the panel shows every failure and audit entry.
- **Audit view.** Machine-readable `kind: "control"` rows record delegation, secretary notes and failed deliveries. The human sees the control plane directly, without asking a model to summarize it.
- **Secretary / Organizer / Security Lead roles.** Secretary writes audited notes and rollback minutes (`group_talk_note`); Organizer dispatches bounded subagent tasks (`group_talk_delegate`); Security Lead reviews delegation, permissions, secrets and prompt-injection risk and records veto/remediation notes. Roles remain advisory; the Host enforces who may write or delegate.
- **Audited subagent delegation.** A child is started only under a live organizer/owner Agent. It gets `maxDepth: 0`, all `group_talk_*` tools are denied, it has a timeout and a daily quota, its result is capped, and its `started/completed/failed` state is written to the room as a control row. `allowAgentDelegate` is **off by default**.
- **Ambient or urgent priority.** Every message carries `ambient` or `urgent`. The panel defaults to `ambient`: the target finishes its current step/turn and does not change its plan; `urgent` asks for priority at the next step boundary. Neither aborts a running tool. `queue` remains an advanced `mode`, no longer recommended in the panel.
- **Panel stability.** The group list is a flat, expandable conversation list with last-message previews. "Keep open" restores the room after a new message auto-switches the shell, while an explicit click or "Back to chat" clears the pin. A panel-level error boundary prevents a render failure from dropping the person into a conversation. Drafts and the selected room are restored.
- **Visual cleanup.** Flat list rows instead of cards, clearer role/member rows, audit/delegation actions, control rows, empty-room creation, a proper composer placeholder, and theme-token-based colors.

## Explicit non-goals in 2.3

- No automatic relay of ordinary assistant answers.
- No silent interrupt/cancel yet: `ambient` is `queue`, `urgent` is `steer`; `interrupt`, `ack` and `supersede` are still not implemented.
- No cross-process group-delete guarantee.
- A subagent never joins the group, never reads the group transcript, and cannot delegate further.

## Install

```bash
git clone https://github.com/Leica-Shen/deepseek-harness-group-chat.git
cd deepseek-harness-group-chat
dsh plugin --profile desktop add link:"$PWD"
```

Add `@local/group-talk-l` to the profile's `dsh.profile.bundles`, then **restart Harness once**. Host modules are cached in-process; refreshing the page only reloads the client half.

## Use

1. Click **Group chat** in the left sidebar (or the header shortcut). The room opens in the main area.
2. Create a room: name, optional topic, participants (existing sessions), aliases and roles. You can create an empty room and add participants later.
3. Pick a target: all participants (`*`), `@alias`, or `#role`; or type `@` in the composer.
4. The participant receives a `【群聊 / Group chat】…` message: `ambient` after its current turn, `urgent` at the next step boundary. A normal assistant answer stays local; the participant replies with `group_talk_send` and a `purpose`.
5. The footer shows the plugin version, limits and usage. The **Audit** view shows control rows and failed deliveries. **Keep open** protects the room from automatic shell switching.

Roles: Designer, Judge, Researcher, Experimenter, **Secretary**, **Organizer**, **Security Lead**, or a custom label. Roles are routing/duty labels, not authority.

## Human priority and subagent delegation

Human messages:

- are marked `from.kind: "human"` (the envelope says they are from the operator);
- bypass target caps/burst (`humanBypassTargetCaps`, default true) but **do** use the sender cooldown;
- still count against group/Host/sender budgets, and no longer charge the target's daily ledger;
- never wake a session when the target is the human (in-room).

Delegation is opt-in:

```yaml
- id: group-talk-l
  config:
    allowAgentDelegate: true
    delegationProvider: ""      # empty = first registered provider
    delegationTimeoutMs: 120000
    maxDelegationsPerDay: 3
    maxDelegationChars: 6000
```

The organizer/host uses `group_talk_delegate`; the Host starts the child under the live organizer Agent, denies all group tools, caps depth at 0, times out, disposes the run, and writes audit rows. The human panel is read-only for delegation; it has no manual delegate form. See [SECURITY.md](SECURITY.md) §9.5.

## Safety

- All sends go through `GroupService.send`; fan-out, cooldown, dedupe, burst and daily message/delivery/token budgets are checked and charged in one store transaction. Non-organizer peer messages carry a purpose; in-room `@human` replies are exempt.
- Human-target messages are `in-room`: recorded in the transcript, visible in the panel, no Session wake, no target/token charge. The Web route acts only for the human operator and rejects cross-site requests.
- Transcript text and group names are untrusted data; `interpolate: false`; envelopes escape JSON and redact session ids/raw errors from model-facing outputs.
- Store: `$DSH_HOME/group-talk-l/groups.json`, atomic replace, `0700` directory, `0600` file, corrupt document moved aside; a lossy load is read-only and returns 503 rather than overwriting the file; duplicate mounts are ignored.
- Notes: 10/minute and 50/day; control rows do not evict chat; audit rows are fetched on demand.
- Token estimate is CJK-aware but still not a bill; target context re-reads are not counted.
- Subagents: opt-in, organizer/owner only, live parent, no group tools, no recursion, timeout, quota, result cap, audit.

## Tests

```bash
npm test
# 102 tests, 0 failures
```

Coverage includes persistence, corruption, routing, roles, human in-room/priority, secretary notes, delegation role/depth/tool-filter/timeout/quota/dispose, control persistence, client rendering, concurrency and budgets, plus 2.3 regressions for human-only HTTP, queue/steer priority, service-level purpose gate, target-ledger accounting, CJK estimation, note quotas, audit-on-demand, bounded list output, lossy-store refusal, the 8,000-character hard cap and duplicate mounts. See [SECURITY.md](SECURITY.md).

## Docs

- [README.md](README.md) · [DESIGN.md](DESIGN.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)
- [PLUGIN-ANATOMY.md](docs/PLUGIN-ANATOMY.md) · [docs/README.md](docs/README.md)

## Status

Source is **2.3.1**. The live Host needs one Harness restart to load the 2.3 Host half; the 2.2 UI evidence (1200-wide baseline/audit/long-message screenshots) remains the latest visual walk-through. Real-provider delegation still needs one post-restart run by an organizer session; it stays opt-in and is not marketed as stable.


## Similar projects (references, not copied code)

- [alexbu512/milancat-bot](https://github.com/alexbu512/milancat-bot) — an AI organization in the DSH sidebar: chief-of-staff, departments, roles and child-agent dispatch. Strong reference for the organizer/sidebar model.
- [Leo-sail/dsh-plugin-agent-collaboration](https://github.com/Leo-sail/dsh-plugin-agent-collaboration) — persistent bots, group rooms, leader triage and durable runs.
- [Agentic-System-Lab/harness-relay](https://github.com/Agentic-System-Lab/harness-relay) — roles and turn-taking across CLI agents.
- [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) — another DSH agent-team shape.

Group-Talk-L differs by keeping the group as membership + transcript + routing (not a new Session), making the human an in-room UI-only principal, and making subagent delegation opt-in, organizer/owner-only, audited and non-member.
