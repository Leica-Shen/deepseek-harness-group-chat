# Changelog

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
