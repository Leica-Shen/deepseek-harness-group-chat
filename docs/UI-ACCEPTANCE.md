# Group-Chat UI acceptance matrix (2.4)

> **Status:** the matrix below is the **2.4 acceptance target**, not a completed
> record. The live Host still needs one Harness restart to load the 2.4 Host half;
> `docs/screenshots/*.jpg` are **2.2 evidence (1200×777)** and remain a layout
> reference only. Do not quote them as 2.4 UI acceptance.

## Scope

- The human panel has **no manual delegation form**. Delegation is started by an
  organizer/owner session with `group_talk_delegate`; the panel shows the audited
  record.
- Relay is started from a member row ("Confirm with @x") or `/group relay`.
- The acceptance run must use a real Host and a real group; do not edit
  `groups.json` or hand-write evidence.

## Matrix

| # | Width / zoom | Scenario |
| --- | --- | --- |
| 1 | ~980 px, 100% | Empty state, group list, one room with 2 members |
| 2 | ~980 px, 125% | 8-member room, long alias, long message collapsed |
| 3 | ~980 px, 150% | Long message expanded, copy, link confirmation |
| 4 | ~1280 px, 100% | Baseline: version line, counts, truncation, date separators |
| 5 | ~1280 px, 130% | Audit modal, export, relay log, settings/stats |
| 6 | ~1280 px, 150% | Pause banner, held message, resume |
| 7 | ~980 px, 100% | Language switch (follow system → 中文 → English) and error copy |
| 8 | ~980 px, 125% | Target menu opened near the bottom of the window (must flip up) |

## Checkpoints (2.4)

### Layout

- Message area occupies **≥60%** of the panel in a 640 px-tall window with the
  member section collapsed.
- Member section is **collapsed by default**; expanding it scrolls independently
  and the last member is reachable without clipping.
- Exactly **one** control hides the group list (the sidebar chevron). No second
  "Hide groups" button in the page head.
- No horizontal overflow at 980 / 125% / 150%.
- The composer hint is one ellipsised line; the `?` popover holds the long copy.
- Dangerous actions (dissolve/delete) live in the "⋯" menu, not under Send.

### Truthfulness

- The footer shows **one** version when Host and panel match; a mismatch shows a
  distinct warning with both versions.
- Header count, list row count and member rows all agree, and the human has its
  own row ("You (panel)").
- A truncated transcript says "Last 20 of 62" and offers "Load earlier"; the
  older page appends without losing scroll position.
- Times read `HH:mm` with sticky day separators (Today / Yesterday / MM-DD).
- Group id is collapsed under a "Group chat ID" disclosure and can be copied.
- Errors stay until dismissed; success notices disappear after ~4.5 s.

### Interaction

- Target menu: arrow keys/Home/End/Esc work; it flips up near the window bottom;
  an over-cap `*` opens the broadcast confirmation (recipients + estimated
  tokens) instead of being disabled.
- Sending inserts the message immediately; a delivery failure marks the row, not
  the transcript.
- An empty room disables Send and says why.
- Enter sends, Shift+Enter adds a line, Cmd/Ctrl+Enter also sends; Esc closes a
  menu, not the panel while typing.
- Switching tabs and back refreshes without waiting for the next poll.
- "Mark all read", mute, hide and "show hidden" behave per browser and are
  reversible from Settings.

### Security and language

- A message containing an obvious key opens the credential confirmation; after
  confirming, the row is delivered and the room shows the taint label.
- Broadcast confirmation shows the cost line; cancelling sends nothing.
- Pause one room: composer still records, rows read "Held", no member wakes.
  Resume delivers again.
- Secret sensitivity hides the model-send path and the panel explains it.
- Language switch changes panel copy, roles and errors; `#角色` still routes
  after switching.
- Relay from a member row shows the relay log with status and rounds; a second
  relay attempt from the addressed session is refused as a chain.

### Evidence

For every screenshot, write `<screenshot>.evidence.json` with the helper (no
AppleScript):

```bash
node scripts/evidence.mjs \
  --dir ../评审证据/ui-2.4 \
  --screenshot 1280-100-host2.4.1-client2.4.1.png \
  --host 2.4.1 \
  --window 1280 \
  --zoom 1 \
  --capabilities '{"audit":true,"pause":true,"relay":true,"secretScan":true}' \
  --notes "baseline: single version, counts, truncation, date separators"
```

The helper reads the client version from `package.json` and the commit from
`git rev-parse --short HEAD`. Record what the page actually returned; never edit
the values to match the desired result. The 2.2 records under
`评审证据/ui-2.2/` remain valid history and must not be reused as 2.4 evidence.

## History: live 2.2.0 results (2026-11-15)

Host restarted to 2.2.0; at 980×799:

- ✅ Message rows no longer shrink to 1px under a long transcript (`flex: none`).
- ✅ Long message expand/copy worked; Electron native clipboard copied the full
  1104-character message.
- ✅ Audit modal was read-only and showed no delegations yet.
- ✅ Group list and member list could be collapsed and persisted.
- ⚠️ 125%/150%/130% zoom was not captured: this Harness build did not change
  page zoom from the keyboard; record what is actually captured.
- Evidence lives in `评审证据/ui-2.2/` with per-image JSON (host/client 2.2.0,
  980 px, commit af4e0d3).

## History: 2.3 delta

`ambient` uses `queue`, `urgent` uses `steer`; audit is fetched on demand; the
member count includes the human; `group_talk_list` lines are capped. These were
verified by tests, not by a fresh live walk-through.
