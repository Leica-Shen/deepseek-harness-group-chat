# Group-Talk-L UI acceptance matrix (2.1)

Use this after restarting Harness so the **2.1 Host** (capabilities present) is live. Until then the Host is 2.0.3: priority is capability-disabled and real delegation cannot run.

## Matrix

| # | Window | Zoom | Content |
| --- | --- | --- | --- |
| 1 | 980 px wide | 100% | group panel, capability hint, priority selector disabled |
| 2 | 980 px wide | 125% | long alias member, long message (collapsed), audit |
| 3 | 980 px wide | 150% | long message expanded, copy-full, delegation audit |
| 4 | 980 px wide | 130% | same screen: long alias + collapsed + expanded + delegation record |
| 5 | 1280 px wide | 100% | baseline after restart; capability hint gone, priority enabled |

## Checkpoints

- Header actions wrap or stay inside the panel; no clipping.
- Member list scrolls independently; the last member and the send button stay reachable.
- Message meta wraps; priority badge reads `环境消息 · 本轮后读取` / `下一步优先 · 不中断当前工具`.
- `展开全文` is a native button with visible `:focus-visible` inner outline; toggling keeps `.messages` scrollTop; `复制全文` copies `fullText` (not the truncated 600 chars).
- No horizontal overflow at 980 px / 125% / 150%.
- Audit control rows show `审计记录 · 非指令`; delegation section shows taskId + started/completed/failed.
- 2.0.3: priority selector disabled + `当前 Host 不支持 priority` hint; 2.1: enabled, no hint.
- Long alias does not push role tag/actions out; role tags distinguish Organizer / Security Lead / Secretary.

## Capture

```macos
# window size
osascript -e 'tell application "System Events" to tell process "DeepSeek Harness" to set size of window 1 to {980, 900}'
# zoom in the app: Cmd++ / Cmd+- / Cmd+0 (reset)
# screenshot
screencapture -x /tmp/group-talk-ui-acceptance.png
```

Do not edit `groups.json` to fabricate delegation rows for a screenshot: the audit view must reflect a real organizer run, otherwise the evidence is invalid.
