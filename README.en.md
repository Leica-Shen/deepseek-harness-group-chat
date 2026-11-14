# Group-Talk-L · Cross-session group chat

[中文](README.md) · [GitHub](https://github.com/Leica-Shen/dsh-group-talk-l) · MIT · **79 tests** · DeepSeek Harness Host + Web Client plugin

Group-Talk-L lets the person talk to **existing agent sessions** as a group without merging their contexts. Each participant keeps its own conversation, model, and workspace; the group is a membership + shared transcript + routing layer, not a new Session.

## What is new in 2.1

- **Human priority.** Human messages are delivered as user instructions (`priority: "human"`), not untrusted peer content. They bypass a target's cooldown and target daily caps (group/Host budgets remain), and the panel shows every failure and audit entry.
- **Audit view.** Machine-readable `kind: "control"` rows record delegation, secretary notes and failed deliveries. The human sees the control plane directly, without asking a model to summarize it.
- **Secretary / Organizer roles.** Secretary writes audited notes and rollback minutes (`group_talk_note`); Organizer can dispatch a bounded subagent task (`group_talk_delegate`). Roles remain advisory; the Host enforces who may write or delegate.
- **Audited subagent delegation.** A child is started only under a live organizer/owner Agent. It gets `maxDepth: 0`, all `group_talk_*` tools are denied, it has a timeout and a daily quota, its result is capped, and its `started/completed/failed` state is written to the room as a control row. `allowAgentDelegate` is **off by default**.
- **Queue or steer.** The panel defaults to `queue` (wait for the target's turn to end) so a group message does not routinely interrupt another session; choose `steer` only when you want the next-step insertion. `group_talk_send` accepts the same per-message `mode`; neither aborts a running tool.
- **Panel stability.** The group list is a flat, expandable conversation list with last-message previews. "Keep open" restores the room after a new message auto-switches the shell, while an explicit click or "Back to chat" clears the pin. A panel-level error boundary prevents a render failure from dropping the person into a conversation. Drafts and the selected room are restored.
- **Visual cleanup.** Flat list rows instead of cards, clearer role/member rows, audit/delegation actions, control rows, empty-room creation, a proper composer placeholder, and theme-token-based colors.

## Explicit non-goals in 2.1

- No automatic relay of ordinary assistant answers.
- No silent interrupt/cancel yet: delivery is still `steer` at the next step boundary. Per-message `queue/steer`, `interrupt`, `ack/supersede` are the 2.2 control-layer candidates.
- No cross-process group-delete guarantee.
- A subagent never joins the group, never reads the group transcript, and cannot delegate further.

## Install

```bash
git clone https://github.com/Leica-Shen/dsh-group-talk-l.git
cd dsh-group-talk-l
dsh plugin --profile desktop add link:"$PWD"
```

Add `@local/group-talk-l` to the profile's `dsh.profile.bundles`, then **restart Harness once**. Host modules are cached in-process; refreshing the page only reloads the client half.

## Use

1. Click **Group chat** in the left sidebar (or the header shortcut). The room opens in the main area.
2. Create a room: name, optional topic, participants (existing sessions), aliases and roles. You can create an empty room and add participants later.
3. Pick a target: all participants (`*`), `@alias`, or `#role`; or type `@` in the composer.
4. The participant receives a `【群聊 / Group chat】…` message at its next step boundary. A normal assistant answer stays local; the participant replies with `group_talk_send`.
5. The footer shows the plugin version, limits and usage. The **Audit** view shows control rows and failed deliveries. **Keep open** protects the room from automatic shell switching.

Roles: Designer, Judge, Researcher, Experimenter, **Secretary**, **Organizer**, or a custom label. Roles are routing/duty labels, not authority.

## Human priority and subagent delegation

Human messages:

- are marked `priority: "human"` and `from.kind: "human"`;
- bypass target cooldown/target caps (`humanBypassTargetCaps`, default true);
- still count against group/Host/sender budgets;
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

The organizer/host uses `group_talk_delegate`; the Host starts the child under the live organizer Agent, denies all group tools, caps depth at 0, times out, disposes the run, and writes audit rows. The human panel can start the same flow through **Delegate subagent** only when a live organizer exists. See [SECURITY.md](SECURITY.md) §9.5.

## Safety

- All sends go through `GroupService.send`; fan-out, cooldown, dedupe, burst and daily message/delivery/token budgets are checked and charged in one store transaction.
- Human-target messages are `in-room`: recorded in the transcript, visible in the panel, no Session wake, no target/token charge.
- Transcript text and group names are untrusted data; `interpolate: false`; envelopes escape JSON and redact session ids/raw errors from model-facing outputs.
- Store: `$DSH_HOME/group-talk-l/groups.json`, atomic replace, `0700` directory, `0600` file, corrupt document moved aside.
- Subagents: opt-in, organizer/owner only, live parent, no group tools, no recursion, timeout, quota, result cap, audit.

## Tests

```bash
npm test
# 79 tests, 0 failures
```

Coverage includes persistence, corruption, routing, roles, human in-room/priority, secretary notes, delegation role/depth/tool-filter/timeout/quota/dispose, control persistence, client rendering, concurrency and budgets. See [SECURITY.md](SECURITY.md).

## Docs

- [README.md](README.md) · [DESIGN.md](DESIGN.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)
- [PLUGIN-ANATOMY.md](docs/PLUGIN-ANATOMY.md) · [docs/README.md](docs/README.md)

## Status

Source is **2.1.0**. The current live Host may still be 2.0.3 until Harness is restarted; the 2.1 client panel has been opened live, including the "new message does not drop the room" regression. Real-provider delegation still needs one post-restart run by an organizer session.
