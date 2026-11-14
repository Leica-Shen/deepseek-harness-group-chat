# Response to the 2026-11-14 review

This note maps the review's Group-Talk-L findings to the current code. It is
part of the repository so the status does not live only in a chat.

## P1 — name vs. contract

The product is deliberately a **cross-session group chat that requires an
explicit reply**, not an auto-relay hub. Auto-forwarding an arbitrary assistant
answer would leak tool output/private context and create reply loops. The
review's second option is implemented:

- the transcript envelope is human-readable: `【群聊 / Group chat】…`;
- the panel says “等待 @x 回复 · 普通回答不会自动回到群聊”;
- after `replyNudgeAfterMs` (default 2 min), a **催一下 / Nudge** button appears;
  it sends a normal, rate-limited reminder through the same `send` path;
- the version and approximate per-member prompt cost are visible in the panel.

This keeps the safe explicit-reply boundary while giving the wait an exit.

## P1 — host DOM dependency

The **session header action is a native Harness slot** and remains the reliable
entry point. The sidebar label icon and the in-transcript badge are progressive
enhancements: if upstream classes change, they disappear without breaking the
native entry or `/group`. The envelope header itself is server-generated and
does not depend on DOM. The remaining DOM fragility is tracked as a non-blocking
P2; a real-page snapshot test needs a browser harness that is not part of this
package's pure-Node CI.

## P2 — pending never converges

`GroupService.ready()` now reconciles deliveries stranded by a process exit:
pending rows older than `pendingTimeoutMs` (default 2 min) become `unknown`.
The UI shows `未确认` instead of `待确认` forever. Covered by
`service.test.mjs` “stale pending deliveries reconcile to unknown on startup”.

## P2 — 0700 documentation

Corrected: the code forces `0700`/`0600` on every persist; the currently running
pre-restart instance may still show `0755` until its next write/restart. The
README and SECURITY now say that explicitly.

## P2 — policy token cost

The create form now states that each member adds roughly 800–1200 tokens to
every subsequent request. The prompt section still has the 3500-character hard
cap and `policyRecentMessages: 0` by default.

## P2 — version in the panel

The authenticated GET response includes the package version and the group
detail footer renders `Group-Talk-L v2.0.2`.

## 1.5.0 follow-up

While taking over the code after 1.4.2, three defects in the rushed follow-up
were fixed: `#role`/`*` targets lost their waiting hint, a later system row
cleared waiting, and a failed pending reconciliation rejected `ready()` (which
would take the whole panel down). Unread counts were added on top: per-group
badges, a header dot, and a transcript-derived waiting state.

## 2.0.0 — panel + human operator

The modal and the sidebar DOM injection were removed. The room is now a keyed
`main` panel (same area as a conversation) with a `sidebar.panellist` entry and
an unread dot; messages are composed as `@human` (“你”), not as the focused
session, and new rooms have no session owner. Creation only selects
participants, roles have presets (Designer / Judge / Researcher / Experimenter),
and the composer target menu opens from “发送给” or by typing `@`.

This is a deliberate model change, not a skin: `/group` and the panel act for
the person; participant tools still act for their session.

## Evidence

- `npm test`: **68/68**
- HTTP leave regression test (POST 200, member groups empty)
- concurrent target-burst regression
- stale-pending reconciliation test, and one proving a failed reconcile still resolves `ready()`
- waiting derivation (`#role`, system rows, replies) and unread/watermark tests
- clean clone from GitHub passes the same suite
