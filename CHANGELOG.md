# Changelog

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
