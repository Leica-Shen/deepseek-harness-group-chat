# Changelog

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
