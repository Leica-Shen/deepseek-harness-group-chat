# Group-Talk-L UI acceptance matrix (2.2)

Use this after restarting Harness so the **2.2 Host** (capabilities present) is live. Until then the Host is 2.0.3: priority is capability-disabled and real delegation cannot run.

## Scope clarification

- The human panel has **no manual delegation form**. Delegation is started by an organizer/owner session with `group_talk_delegate`.
- The human-facing surface is the **read-only delegation audit record** (taskId + started/completed/failed), not a form.
- An organizer-side delegation UI is a **separate design item**, not part of this acceptance matrix.

## Matrix

| # | Window | Zoom | Content |
| --- | --- | --- | --- |
| 1 | ~980 px wide | 100% | group panel, capability hint, priority selector disabled (2.0.3) |
| 2 | ~980 px wide | 125% | long alias member, long message (collapsed), audit |
| 3 | ~980 px wide | 150% | long message expanded, copy-full, read-only delegation audit record |
| 4 | ~980 px wide | 130% | same screen: long alias + collapsed + expanded + delegation record |
| 5 | ~1280 px wide | 100% | baseline after restart; capability hint gone, priority enabled |

## Checkpoints

- Header actions wrap or stay inside the panel; no clipping.
- Member list scrolls independently; the last member and the send button stay reachable.
- Message meta wraps; priority badge reads `环境消息 · 本轮后读取` / `下一步优先 · 不中断当前工具`.
- `展开全文` is a native button with visible `:focus-visible` inner outline; toggling keeps `.messages` scrollTop; `复制全文` copies `fullText` (not the truncated 600 chars).
- No horizontal overflow at ~980 px / 125% / 150%.
- Audit control rows show `审计记录 · 非指令`; the read-only delegation log shows taskId + started/completed/failed.
- 2.0.3: priority selector disabled + `当前 Host 不支持 priority` hint; 2.2: enabled, no hint.
- Long alias does not push role tag/actions out; role tags distinguish Organizer / Security Lead / Secretary.

## Capture (manual, no AppleScript)

Previous drafts used `osascript ... set size`, which is blocked by System Events permissions on some machines and is not reproducible. Use the UI:

1. Restart Harness so the version line shows `Group-Talk-L 2.2.0` and the Host warning is gone.
2. Open **Group chat** from the sidebar (or the session header).
3. Drag the window's right edge until the content area is about 980 px wide. Exact pixel width is not required; record the approximate width in the filename or note.
4. Zoom with the app's **View** menu or the standard shortcuts:
   - `Cmd +` zoom in,
   - `Cmd -` zoom out,
   - `Cmd 0` reset.
   Take one capture at 100%, 125% and 150%; 130% is covered by the 125/150 pair if the menu has no 130% step.
5. Capture the window:
   - `Cmd Shift 4`, then Space, then click the Harness window, **or**
   - `screencapture -x /tmp/group-talk-ui-acceptance.png` for the full screen.
6. Save under `评审证据/ui-2.2/` with a name that includes host/client version and zoom, e.g. `980-125-host2.2.0-client2.2.0.png`. The 2.0.3 capability-disabled baseline belongs in `评审证据/ui-2.0.3/`, not mixed into `ui-2.2/`.
7. Generate one `<screenshot>.evidence.json` beside each screenshot with the helper (no AppleScript):

```bash
cd /Users/Leica_Shen/Desktop/Create/group-talk-l
node scripts/evidence.mjs \
  --dir ../评审证据/ui-2.2 \
  --screenshot 980-125-host2.2.0-client2.2.0.png \
  --host 2.2.0 \
  --window 980 \
  --zoom 1.25 \
  --capabilities '{"inRoom":true,"priority":true,"control":true,"delegate":true}' \
  --notes "long alias + long message collapsed"
```

For the 2.0.3 baseline use `--dir ../评审证据/ui-2.0.3`, `--host 2.0.3`, and `--capabilities none` (the GET response has no capabilities). The helper reads the client version from `package.json`, the commit from `git rev-parse --short HEAD`, and writes `{commit, hostVersion, clientVersion, capabilities, windowWidth, zoom, timestamp, screenshot, notes}` as `<screenshot>.evidence.json` — one file per screenshot, so a matrix directory cannot overwrite earlier records.
8. Restore zoom with `Cmd 0` and restore the window size by dragging.

The panel version line shows client + host. For the exact `capabilities`, open DevTools → Network → the `GET /api/group-talk-l` response (2.0.3 has no `capabilities` key; 2.2 returns `{inRoom, priority, control, delegate}`). Do not hand-edit values to match a desired result; the evidence file must reflect what the page actually returned.

Do not edit `groups.json` to fabricate delegation rows for a screenshot: the audit view must reflect a real organizer run, otherwise the evidence is invalid. Do not use `osascript` to resize the window or click controls; the acceptance doc must be runnable without System Events permissions.
