# Changelog

## 2.4.1

A small hardening patch on top of 2.4.0, found in the post-push review.

- **Relay replies are charged** to the sender/room/Host ledger; they still skip
  the origin's per-target delivery cap so a reply the origin asked for is not
  blocked by its own budget.
- **A malformed relay row no longer turns the whole store read-only.** Relays
  are transient coordination state; dropping one is logged, not treated as a
  lossy room document.
- **Mailbox hosts do not gate membership on mailbox existence.** A not-yet-created
  inbox is a new member, not a missing session.
- **Read-only stores stop the maintenance pass early** instead of logging a failed
  write every 15 seconds.
- **Ambiguous group references name the candidates** in both languages.

Tests: 151/151.

## 2.4.0

The full external-review release: the 2.3.2 release-discipline fixes, the 2.4.0
security/cost/relay work, and the 2.5.0 architecture preparation land together.
Tests: 151/151.

### Release discipline

- **One version source.** `package.json` generates `lib/version.js` and the
  client constant via `scripts/sync-version.mjs`; `npm test` runs
  `--check` first. The panel shows one version unless Host and panel differ.
- **Package identity.** Renamed to `@leica-shen/dsh-group-chat`; five optional
  `peerDependencies` on the official DSH packages; `files` no longer ships
  `.github` or `REVIEW-RESPONSE.md`.
- **Doc checks.** `scripts/check-docs.mjs` compares README numbers with the real
  suite and manifest.
- **Screenshots are labelled** as 2.2 evidence; 2.4 still needs a live UI
  walk-through after restart.

### Behaviour fixes

- Sends no longer block for up to 30 s: optimistic insert, receipt fill-in, and
  a delivery concurrency gate (2 by default, 32 queued).
- `pendingTimeoutMs` is enforced by a 15 s maintenance pass; a restart only
  reconciles rows older than the timeout.
- Member count and rows agree (the human is a row); truncation says
  "Last 20 of 62" and offers "Load earlier"; message limits are documented once.
- Errors persist until dismissed; success notices auto-dismiss after 4.5 s.
- The target menu is fixed-positioned, flips up, and supports arrow keys, Home,
  End and Esc; an over-cap `*` opens a confirmation instead of being disabled.
- Audit no longer pops late for an empty list; the textarea is labelled
  "Message text"; hidden tabs refresh immediately on `visibilitychange`.
- Model `delete` requires `confirm: true`; an optional advisory lock makes a
  second live process read-only.

### Security, cost and privacy

- Real usage feedback when the adapter exposes it; "estimate vs actual" in
  Settings.
- Broadcast preview (recipients + estimated tokens) and a human-confirmed
  broadcast ceiling; per-sender daily broadcast budget.
- Separate human/agent daily message budgets; the human cooldown defaults to 0.
- Compact group policy (`auto`), 1–3 detailed rooms, more rooms one line each.
- Taint labels (`human-typed`, `human-pasted`, `peer`, `tool`); pasted content
  is untrusted in the envelope.
- Credential scan for private keys, AWS/GitHub/Slack/Google/Stripe/provider
  tokens, JWTs and high-entropy blobs; the person can confirm once, a model
  tool cannot.
- Read-only delegation by default; group tools are always denied to children.
- Concurrency gate, per-room pause and a host-wide emergency stop; paused rooms
  record without waking anybody.
- Structured refusals with `retryAfterMs` and a suggestion; rejection counters
  and p50/p95 latency in Settings.
- Group sensitivity (`public | internal | secret`); secret rooms are panel-only.
- Retention (30 days, audit rows kept), single-row redaction, redacted export.
- `memberHistoryScope: own` for stricter member visibility.

### Relay

- `group_talk_relay` / `group_talk_relay_reply`, `/group relay @alias <message>`,
  one bounded question per relay, 10-minute TTL with a real timer, answer returns
  to the origin conversation and never enters a room transcript.
- Hard-coded red lines: no chaining, only confirm/ask/handoff, no imperative or
  authorization payloads, no automatic external action, visible and pausable.

### Language and visual

- Three-state language switch; host errors and `/group` output are bilingual
  (`commandLang`); members store a stable `roleId` and `#role` survives a
  language switch.
- 24-hour `HH:mm` with sticky day separators; audit uses full timestamps.
- Messages are the main surface (members collapsed by default), one toolbar,
  overflow menu for destructive actions, avatars, same-sender grouping, copy on
  every message, safe link handling, amber unread, reduced-motion support,
  searchable/mutable/hideable group list and "mark all read".

### Architecture

- `lib/adapters.js` defines the Host boundary and ships a mailbox adapter for
  hosts that cannot inject a turn.
- `bin/mcp-server.mjs` exposes the same store over MCP.
- `COMPATIBILITY.md`, `ADAPTERS.md` and an updated `DESIGN.md`.

### Schema

State version 2 adds `relays`, `gate`, per-group `sensitivity`/`paused`/`breaker`,
member `roleId`/`organizer`, delivery `read`/`at`/`actualTokens` and message
`taint`/`refs`. Version 1 documents are migrated on load; daily ledgers switch
from a UTC day key to a local one (a one-time reset).

## 2.3.1

A one-line-behavior release found while preparing the Market listing.

- **The operator is no longer locked out by per-sender delivery/token caps.**
  A six-recipient broadcast used to charge ~6,500 estimated tokens against the
  human's own sender budget, so the second broadcast inside the same minute was
  rejected by the sender burst ceiling, and roughly the tenth by the sender
  daily delivery ceiling — while the panel still showed "10/30 messages". The
  per-sender delivery, daily-token and burst-token ceilings now apply to agents
  only; the human keeps the sender message count, sender cooldown, and the
  group/Host budgets. Peer sends are unchanged. Regression:
  `test/release-2.3.test.mjs` (102 tests).
- **Token docs call the estimate a lower bound, not a conservative cap.** The
  README now states that a target's context re-read is not counted, that real
  spend can be 5–30× the estimate, and that the always-on member prompt section
  (roughly 900–1,000 tokens per request) is outside the send ledger.

## 2.3.0

A security and semantics release. No new chat surface; the goal is to make the
existing promises true.

- **Web identity is human-only.** `/api/group-talk-l` no longer trusts a
  body/query `sessionId`; a non-human value is rejected with `human-only`.
  The official panel already sent `human` only, so this removes a
  confused-deputy path without changing the UI. Cross-site `Origin` /
  `Sec-Fetch-Site` requests are rejected too.
- **Priority is a mechanism, not a sentence.** `ambient` now defaults to the
  DSH `queue` mode (delivered after the target's current turn), `urgent` uses
  `steer` (next step boundary). An explicit `mode` still overrides both.
  This matches the 2.1 promise "do not interrupt".
- **Purpose gate is in the domain service.** Non-organizer members need
  `purpose=verify|correct|review|anomaly|question|blocked|handoff` for peer
  messages; replies that only land in the room (`@human`) are exempt because
  they wake no session. Role matching is exact, so `non-organizer` is not an
  organizer. Envelope/policy/help examples now include `purpose`.
- **Human priority no longer starves peers.** Human messages skip target caps
  but no longer charge the target's daily delivery/token ledger; the sender
  cooldown now applies to everyone. The human can still send when a target cap
  is exhausted, and peers are not blocked for the rest of the day.
- **Notes are bounded.** `maxNotesPerAgentPerMinute` (10) and
  `maxNotesPerAgentPerDay` (50) are enforced. Control rows keep their own
  20-row transcript window and never evict chat rows; the full history stays in
  `audit`. The panel fetches audit rows on demand instead of shipping them in
  the 8-second list poll.
- **Token estimate is CJK-aware.** The fixed `chars / 4` estimate is replaced
  by a CJK-aware estimate (CJK × 1.5, other ÷ 4). It is still a conservative
  guard, not a bill; the docs now say so explicitly.
- **Store safety.** Loading a document that drops a member or group now marks
  the store read-only instead of persisting the loss on the next write; HTTP
  returns 503. A duplicate mount for the same data file is ignored instead of
  creating a second writer.
- **Smaller fixes.** `maxMessageChars` is aligned with the 8,000-character hard
  cap; `group_talk_list` bounds each recent transcript line to 240 characters;
  the policy advertises note/delegation tools only when the profile enables
  them; the panel disables an over-cap `*` target, nudges `*`/`#role` rooms and
  counts the human member in the roster; the in-transcript badge no longer
  scans the whole DOM on every mutation.
- **Docs and tests.** 101 tests (including 2.3 regressions); README/SECURITY/
  DESIGN numbers and data models aligned with the code. Delegation remains
  `allowAgentDelegate: false` by default and still needs a real-provider run
  before it is marketed as stable.

## 2.2.0

- **Collapsible navigation and members.** The whole left group list can be
  hidden (not just its rows), and the participant list has its own collapse
  control. Both free vertical/horizontal space for the transcript and composer.
- **Send gate.** Non-organizer/owner members must send with
  `purpose=verify|correct|review|anomaly`; status, acknowledgement and chatter
  are rejected by the Host. Organizer/owner/human are exempt. This prevents
  routine cross-session wakeups and group spam.
- **Version:** 2.2.0.

## 2.1.0

- **Human priority.** Messages from the human operator are marked as user
  instructions (not untrusted peer content) in the delivery envelope, bypass
  target cooldown/target daily caps, and never wake a Session for an in-room
  target. The human sees every failure and audit entry in the panel.
- **Secretary, Organizer and Security Lead roles.** Secretary records audited
  notes and rollback minutes (`group_talk_note`); Organizer dispatches bounded,
  audited subagent tasks (`group_talk_delegate`); Security Lead reviews
  delegation, permissions, secrets and prompt-injection risk. Roles remain
  advisory; the host enforces who may write/delegate.
- **Audited subagent delegation.** A subagent is spawned under a live
  organizer/owner Agent with `maxDepth: 0`, all `group_talk_*` tools denied,
  a timeout, per-person daily quota, result cap and `delegation start/result`
  control rows. Disabled by default (`allowAgentDelegate: false`).
- **Human oversight.** New audit view (control entries + failed/unknown
  deliveries), durable `group.audit` rows, and a control-entry schema
  (`kind: "control"`) that survives transcript trimming. Delegation is
  organizer-driven; the panel no longer has a manual delegate button.
- **UI.** Flat, expandable group list with message previews; audit action;
  keep-open pin that restores the room after a new message auto-switches the
  shell; panel-level error boundary; long-message collapse; draft/selection
  restoration; empty-room creation; composer placeholder fix; layout hardening
  for overlap/clipping.
- **Priority instead of queue UI.** Messages carry `ambient` (default: finish
  the current step/turn first, do not change the plan) or `urgent` (next step
  boundary). The panel no longer offers `queue`; the advanced `mode` remains.
- **Tests.** 88 tests, including human priority, secretary notes, delegation
  role/quota/depth/tool-filter/disposal, control persistence, client rendering
  and the send-purpose gate.
- `README.en.md` added; SECURITY/DESIGN extended for delegation and human
  priority.

## 2.0.3

- Raise `dailyDeliveriesPerTarget` from 20 to 40. Live evidence: a committee
  target hit 20 and a legitimate reply was rejected; 20 is too tight for an
  active room.
- Documentation cleanup: SECURITY/DESIGN references to the 1.x header button,
  modal, DOM sidebar icon and “owner” permissions now describe the 2.x panel
  and human operator; the 1.4.x self-check table is explicitly historical.
- Note in the config table that `*` fan-out (6) is intentionally smaller than
  `maxMembersPerGroup` (16): `*` is a small-room tool, not a broadcast bus.
- 68 tests.

## 2.0.2

- Human-target wording is consistent everywhere: the policy rule no longer
  says “do not send to @human”, help explains that @human is for participant
  replies and is a self-target for a human sender, and the README matches.
- Model tool schemas are filtered by `allowAgentCreate` / `allowAgentManage`
  instead of registering a tool that throws; disabled management costs no
  schema tokens, and the policy tool paragraph is conditional.
- Startup reconciliation now marks every pending row, so a fast restart no
  longer leaves fresh pending deliveries forever.
- Delivery re-checks that the room still exists after a concurrent delete;
  the cross-process window remains documented as out of scope.
- The client host gate compares against 2.0.1 (semver), not just major 2.
- 68 tests.

## 2.0.1

- In-room delivery: messages addressed to the human operator now use the
  `in-room` status instead of a fake session `delivered`. The panel shows
  “群面板可见”, and model tools see `room: "panel"` instead of a session wakeup.
- In-room deliveries are excluded from target wakeups, target burst and token
  budgets; the message still counts against the sender/group message caps.
- Waiting-for-reply ignores human-only targets: an in-room note never becomes
  “waiting for @owner”.
- `@human` resolves to the stored human member even when a pre-2.0 room kept
  the legacy alias (e.g. `@owner`); the legacy alias itself keeps working.
- The panel warns when the Host is still pre-2.0 and reports a human-target
  send as “recorded in the room” rather than a lost delivery.
- 65 tests.

## 2.0.0

- **Full-area panel.** The group chat now registers a keyed `main` panel and a
  `sidebar.panellist` entry: it occupies the same area as a conversation, the
  app sidebar keeps a “群聊” marker with an unread dot, and the old modal plus
  the sidebar DOM injection are gone.
- **The person is the sender.** Panel and `/group` messages are composed as
  `@human` (“你”), not as whichever session is focused. New groups have no
  session owner: participants are sessions, the human manages the room.
- **Creation is independent of the current conversation.** The create screen
  only picks participants (alias + role); nothing is pre-selected.
- **Role presets + @ picker.** Designer / Judge / Researcher / Experimenter
  with duty text, plus a custom role. The composer target menu opens from
  “发送给” or by typing `@`, listing participants and roles.
- Legacy groups (session-owned) remain readable; the human can manage them.
- 62 tests.

## 1.5.0

- Unread counts: per-group badges in the list and a dot on the header action
  while the panel is closed (60 s poll). Read state is per-session in
  `localStorage`, so the Host never tracks what a human has read.
- Waiting-for-reply is derived from the transcript: `#role` and `*` targets are
  covered, a later system row no longer clears it, and a reply from any member
  clears it. The timeout offers “open the target session” beside “nudge”.
- Delivery status reports `unknown`/`failed` counts instead of a bare
  “delivered”, and a nudge button can no longer fire twice while a send is in
  flight.
- Pending reconciliation is best-effort: a failed write is logged and leaves
  the store intact instead of rejecting `ready()` and taking the panel down.
- A missing `package.json` no longer blocks the Host module; the reported
  version falls back to `0.0.0`.
- 60 tests.

## 1.4.2

- Waiting-for-reply timeout with a one-click nudge.
- Show the running plugin version in the group panel.
- Reconcile stale pending deliveries to `unknown` on startup.
- Report the policy's approximate token overhead when creating a group.
- Correct the 0700 directory claim for the pre-restart live instance.

## 1.4.1

- Fixed the authenticated Web `leave` action: it reassigned a `const` and
  returned HTTP 500. Added an HTTP leave regression test.

## 1.4.0

- Human-readable group envelopes and an in-transcript group badge.
- Default model management is disabled; added member leave and UI exit.
- Count pending deliveries in target burst; concurrent send regression.
- Redact session ids and raw delivery errors from model-facing outputs.
- Show member session titles, add read-loop rate limiting, and document the
  explicit-reply contract (no automatic assistant relay).
- GitHub Actions CI.

## 1.3.0

- Default delivery is now DSH-native `steer`: a running session receives the
  message at its next step boundary instead of after its turn ends.
- Added sliding-window burst limits per sender, group, Host and target, plus
  Host-wide daily message/delivery/token budgets.
- Added explicit pointer events to the sidebar shortcut so it can be clicked
  even when the upstream section header disables pointer events.
- Fixed the ordinary-session `subagent: null` projection hiding the header
  action.
- Made group delivery envelopes human-readable while keeping the JSON body
  explicitly untrusted.
- Group summaries no longer expose raw session ids to models.
- Data directory/file are restricted to `0700`/`0600`.
- 49 tests, including a dedicated security suite.

## 1.0.0

- Initial Host + Web Client implementation: groups, roles, aliases,
  `@alias`/`#role`/`*` routing, durable transcript, limits and `/group`.
