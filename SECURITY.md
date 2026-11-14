# Group-Talk-L 安全与滥用防护报告

> 版本：1.4.2  
> 范围：跨会话消息、目标会话唤醒、prompt 注入、Web 面板、持久化账本。  
> 结论：在默认配置下，已消除“单次广播无限制唤醒全体成员”“重复调用无限重复投递”“prompt 随群数无限增长”“Web 无限拉取 transcript”等高危路径；残余风险主要是 **估算 Token 与真实账单的偏差**、**peer content 提示注入** 和 **同 Host 多进程竞争**。未发现必须阻止上线的风险，但不能承诺零风险。

## 1. 调查目标

Group-Talk-L 的每个群消息都可能：

1. 被 fan-out 到多个目标会话；
2. 为每个目标启动或续接一次模型 turn；
3. 进入目标会话的历史，增加后续每一步的上下文；
4. 写入共享 transcript，并被 Web/工具反复读取；
5. 被成员再次发送，形成 A→B→A 的循环。

因此“消息数量”不是合适的成本单位；真正的放大链路是：

```text
1 次 send
  × 收件人数
  × (目标上下文 + 群 envelope)
  + 后续每步的群 prompt section
  + Web/history 读取
```

调查围绕四个问题：

- 单条消息最多能放大成多少次模型 turn？
- 重复/循环发送能否被抑制？
- 群数量与最近记录会让每步 prompt 增长多少？
- UI/工具读取会不会把 transcript 变成第二条成本洪流？

## 2. 实验方法

- 使用真实 `GroupService`、`GroupStore`、`guard.js`、`policy.js`；
- 用 fake `sessionController` 记录每次 `prompt` 调用，不调用真实模型；
- 时钟可注入，用于测试冷却、去重窗口、UTC 日切；
- 不依赖网络或账号；
- Token 估算公式：
  ```text
  perTarget = ceil(envelopeChars / 4) + assumedTokensPerDelivery
  total     = perTarget × recipients
  ```
  这是保守上限假设，不是账单。

覆盖实验脚本：`test/protection.test.mjs`。

## 3. 基线：无保护配置的放大

配置所有限制到“事实上无限制”（fan-out 64、每日预算 100000、冷却 0、去重 0）：

| 动作 | 结果 |
| --- | --- |
| 1 个群，8 个其他成员 | — |
| 10 次 `*` 广播 | **80 次目标 prompt 调用** |
| 每次正文 500 字符 | — |
| 估算 Token | **83,680** |
| 目标会话被唤醒 | 每个目标 10 次 |

这说明一个普通成员或一个循环工具调用就能把一条消息放大为 8 个模型 turn；如果 A/B 互相回复，成本会继续叠加。

## 4. 默认配置下的防护结果

### 4.1 fan-out

- 默认 `maxRecipientsPerSend = 6`；
- 对 8 个其他成员执行 `*`：**在写入前被拒绝**，`code = fanout-exceeded`，0 次 prompt；
- 对单个 `@alias` 发送：1 次 prompt，估算 1,047 token（500 字正文），成功记账。

### 4.2 冷却

- 默认 `sendCooldownMs = 3000`，同一发送者跨群共享；
- 第一次发送成功；
- 1 秒内第二次发送：`rate-limited`，0 次新 prompt；
- 等待 5 秒后发送成功。

### 4.3 重复抑制

- 默认 `dedupeWindowMs = 30000`；
- 相同发送者 + 目标 + 正文，第二次调用返回 `deduplicated: true`；
- 只产生 1 次 prompt；
- 超过窗口后再次发送会正常投递。

去重条件是“上一条已被接纳（delivered）或仍在 pending”；如果上一条**全部投递失败**，允许重试，避免一次临时故障把消息锁死 30 秒。

### 4.4 每日账本

在同一个 store 事务内检查并记账：

| 维度 | 默认上限 | 实验 |
| --- | --- | --- |
| 发送者消息数 | 30 | 上限设为 2 时，第 3 条被拒绝，前 2 条已投递 |
| 发送者投递数 | 60 | 长 fan-out 会先耗尽此额度 |
| 群消息数 | 60 | 单群整体活跃度 |
| 群投递数 | 120 | 单群总唤醒次数 |
| 目标投递数 | 20 | 上限设为 2 时，第 3 次广播被拒绝，目标只收到 2 次 |
| 估算 Token/发送者 | 60,000 | 发送者总预算 |
| 估算 Token/群 | 120,000 | 实验上限 2,500、每次投递 1,000：一次 2 目标消息约 2,100，第二次被拒绝 |
| 估算 Token/目标 | 30,000 | 防止单个目标被多群围猎 |

账本存于 `groups.json` 的 `usage`，**Host 重启后继续生效**，按 UTC 日期重置。测试验证了 sender/group/target 三个计数器在重新加载后保持不变。

### 4.5 prompt 体积

构造 5 个群、每群 10 条 2,000 字记录：

| 版本 | 字符数 |
| --- | --- |
| 无 `maxChars`（注入 3 条最近记录） | 8,493 |
| 默认 `policyMaxChars = 3500` | **852**（自动切换短版） |
| 极端 `maxChars = 700` | ≤ 700，且带 `policy truncated` 标记 |

`interpolate: false` 已设置，群正文中的 `{{...}}` 不会触发 system-prompt 变量插值。

### 4.6 UI / history 输出

- Web 列表：`uiMessageLimit = 20`，每群最多返回 20 条；
- 工具历史：`maxHistoryToolChars = 12000`，按最新优先裁剪，超长正文标记 `truncated`；
- 2000 字正文的 JSON envelope 约 2,487 字符；正文受 `maxMessageChars = 2000` 限制；
- Web 轮询 8 秒一次，`document.hidden` 时暂停。

### 4.7 群膨胀

- 每个成员最多 5 个活跃群，Host 最多 32 个群记录；
- 每群最多 16 位成员；
- 这些上限在创建/加入群时检查，并持久化。

### 4.8 滑动窗口与 Host 级预算

日预算只能在“当天总量”上兜底，无法阻止 10 秒内 20 条并行群消息同时叫醒同一会话。新增第二层滑动窗口：

| 限制 | 默认值 |
| --- | --- |
| 窗口长度 | 60s |
| 单发送者消息 | 8 |
| 单群消息 | 12 |
| 全 Host 消息 | 20 |
| 单目标被投递 | 6 |
| 单发送者估算 Token | 12,000 |
| 单群估算 Token | 24,000 |
| 全 Host 估算 Token | 60,000 |

另有 Host 级日预算：300 条消息、500 次投递、300,000 估算 Token。突发检查在 `chargeSend` 的同一个 store 事务里完成；超限时消息不写入 transcript、不投递、不扣日额度。`burstWindowMs: 0` 可显式关闭突发保护，适合只依赖日预算的部署。

### 4.9 文件与输出面

- 持久化时强制数据文件 `0600`、数据目录 `0700`；旧 live 进程未重启前，目录可能仍是旧的 `0755`，下一次写入/重启后生效；
- 模型侧 `summarize` 不再返回原始 `sessionId`，只返回别名/角色；Owner 用别名表示；
- envelope 不含 session id、凭据、系统提示；peer 文本保留为 JSON 字符串（不执行、不插值）；
- Web 路由仍是同一 operator 认证边界，不新增未认证端口；请求体 ≤256 KiB，错误只返回稳定 code + 净化 message。

## 5. 防护映射

| 攻击/故障 | 防护 | 失败时行为 |
| --- | --- | --- |
| 一次广播唤醒全体 | `maxRecipientsPerSend` | 拒绝，0 投递 |
| 短时间刷消息 | `sendCooldownMs` + 每日 sender 额度 | 拒绝，0 投递 |
| 重复工具调用/重试 | `dedupeWindowMs` | 返回 `deduplicated`，0 新投递 |
| A↔B 反复循环 | 冷却、去重、每日目标投递/Token 预算 | 达到任一上限即拒绝 |
| 单群刷屏 | 每日 group 消息/投递/Token 预算 | 拒绝 |
| 一个目标被多群围猎 | 每日 target 投递/Token 预算 | 拒绝 |
| prompt 随群数膨胀 | `maxGroupsPerSession`、`policyMaxChars`、最近记录条数 | 短版/截断 |
| Web 拉取大 transcript | `uiMessageLimit`、`historyLimit` | 只返回最近窗口 |
| 工具输出过大 | `maxHistoryToolChars` | 裁剪并标记 |
| 群记录无限增长 | `maxGroupsTotal`、`historyLimit` | 创建失败/最旧记录裁掉 |
| system-prompt 变量注入 | `interpolate: false` | 群正文不参与插值 |
| 群消息冒充 Host/用户 | envelope + policy 明确 untrusted；不自动执行工具 | 模型层面仍需遵循安全策略 |

## 6. 残余风险

1. **估算不等于账单**  
   目标会话可能带着很长的历史上下文；固定 `assumedTokensPerDelivery` 无法精确覆盖。默认预算因此偏保守。真实成本监控仍应在 Harness/模型层进行。

2. **提示注入**  
   envelope 和 prompt 已明确群消息是 untrusted peer content，但模型仍可能被复杂文本影响。插件不做内容审核，也不会自动执行群消息中的工具调用；目标模型仍以正常 agent 规则运行。

3. **同 Host 多进程**  
   `GroupStore` 只有进程内写队列；两个 Host 进程写同一个 `dataFile` 可能互相覆盖。当前部署默认单 Host；不要把 `dataFile` 指向共享网络盘。

4. **失败投递已记账**  
   投递失败也消耗了尝试成本，账本不退款。这避免“故意失败刷配额”，但可能让发送者在临时故障后提前撞上限。

5. **跨时区**  
   每日账本按 UTC 重置。对 UTC+8 用户，重置发生在本地 08:00；这是为了确定性和跨进程一致。

6. **群内文本没有内容审核**  
   群成员是同一操作者可见的会话；插件不提供跨用户隔离，也不做敏感信息扫描。不要在群消息中发送凭据。

7. **模型自动回复**  
   普通 assistant 回答不会自动中继，必须显式调用 `group_talk_send`。这是有意设计：自动转发 assistant 内容可能泄露工具输出、私有上下文或推理结果，并形成循环；面板会显示「等待回复」。

8. **UI 轮询**  
   8 秒间隔不是实时；牺牲时效换取更低的读取频率。

9. **侧栏快捷图标是 DOM 装饰**  
   上游侧栏没有 additive slot，图标通过 `sectionLabel` / `sectionHeader` 类名和「工作区」文本定位。若 DSH 改版这些 DOM 约定，图标会安全消失（不会报错），核心入口与 `/group` 命令仍可用。

## 7. 运维建议

- **先使用默认值**，观察 `usage` 与真实模型消费，再逐项提高；
- 若团队需要更大广播，优先提高 `maxRecipientsPerSend`，但同时降低 `dailyDeliveriesPerGroup`/Token 预算；
- 若目标会话上下文很长，降低 `assumedTokensPerDelivery` 没有意义，应降低 `dailyDeliveriesPerTarget`；
- 定期检查 `$DSH_HOME/group-talk-l/groups.json` 的 `usage`；
- 对高价值群使用更小成员数，减少 fan-out；
- 不要把 `dataFile` 放在多 Host 共享目录；
- 升级版本前运行完整测试；
- 若出现异常刷屏，先将 `enabled` 置 false，或降低每日预算，再删除/解散相关群。

## 8. 测试矩阵

当前 54 个测试：

| 文件 | 覆盖 |
| --- | --- |
| `store.test.mjs` | 校验、原子持久化、损坏旁置、视图裁剪 |
| `service.test.mjs` | 建群、发送、角色、权限、解散/删除、持久化 |
| `policy.test.mjs` | prompt/envelope/help/history |
| `command.test.mjs` | `/group` 语法与 service 驱动 |
| `host.test.mjs` | Host 挂载、scoped 安装/卸载 |
| `http.test.mjs` | 认证 Fetch 路由、429、limits/usage |
| `client.test.mjs` | bundle 装载与 slot |
| `client-render.test.mjs` | 空态/详情/创建页渲染 |
| `sidebar.test.mjs` | 「工作区」右侧快捷图标的 DOM 注入与点击意图 |
| `protection.test.mjs` | 基线放大、fan-out、冷却、去重、sender/target/group/token 预算、群膨胀、prompt/历史/UI 上限、账本持久化 |
| `security.test.mjs` | 目标/发送者/群/Host 突发、Host 日预算、并发竞态、envelope 无 session id、0600/0700 |
| `config.test.mjs` | 默认值、steer、burst/host 限值与非法值回退 |

正式启用前检查：

- [x] `node --test test/*.test.mjs`：54/54 通过；
- [x] `test/security.test.mjs`：目标/发送者/群/Host 突发、Host 日预算、并发竞态、envelope 无 session id、数据文件权限 0600/目录 0700；
- [x] `node --check` 全部 Host/Client 文件；
- [x] Host row `active`；认证 HTTP `GET /api/group-talk-l` 返回 200；
- [x] Client slot `conversation.session.header.actions` 已注册；
- [x] 通过认证路由创建/删除自检群成功；数据落盘并已清理；
- [x] 加入群后 6 个 `group_talk_*` 与 prompt section 出现；删除群后撤销；
- [x] 用普通会话完成真实 `@alias` 投递与双向回复；目标在 owner 运行中收到 steer 消息；
- [ ] 新建空群的 `group_talk_list` 旧 tool 定义需要下一次重启刷新；
- [ ] 确认 `computer-use` fiber 在重启后恢复。

## 9. 上线自检记录

2026-11-14，在真实 desktop profile 上完成以下检查：

| 检查 | 结果 |
| --- | --- |
| bundle 安装 | `link:<repo path>`，bundle 列表已包含 |
| Host row | `active` |
| Client slot | `conversation.session.header.actions` 出现 registrant `group-talk-l` |
| 页头按钮 | 可见；真实鼠标点击打开群组弹层 |
| 侧栏快捷入口 | 可见；真实鼠标点击打开「新建 Group-Talk-L 群组」表单 |
| 认证 HTTP | `GET /api/group-talk-l` 返回 200；`create`/`delete` 成功 |
| 成员 scoped 工具 | 加入群后 6 个 `group_talk_*` 出现；退出/删除后撤销 |
| 成员 prompt | 加入后出现 `group-talk-l:policy`；退出/删除后消失 |
| 真实投递 | **成功**：目标会话回复两轮，所有 `deliveries` 为 `delivered` |
| 对话上下文 | 目标能引用当前群名与上一条消息 |
| 实时投递 | 目标在 owner 运行中发来回复，owner 在当前回合内收到（steer 生效） |
| 数据 | `$DSH_HOME/group-talk-l/groups.json` 原子落盘；当前群保留，临时 probe 删除 |

### 发现与修复

1. **投递缺少 AbortSignal**：`ctx.sessionController.prompt` 的 Host 包装层要求第二个参数是 `AbortSignal`。修复为 `prompt(request, AbortSignal.timeout(30000))`。
2. **页头按钮被隐藏**：普通会话的 `subagent` 投影是 `null`，原判断 `!== undefined` 把它当成子会话，组件返回 `null`，侧栏事件没有接收者。修复为 `Boolean(snapshot?.subagent)`，并让侧栏图标优先点击一个隐藏的 direct opener。
3. **侧栏按钮不可点击**：上游 section header 存在 `pointer-events: none` 继承，注入按钮的 click/hover 都不触发。显式添加 `pointer-events: auto; position: relative; z-index: 1` 后，真实鼠标点击可打开表单。
4. **回复排队到回合结束**：默认投递模式是 `queue`，运行中的目标只能在本轮结束后看到群消息。改为默认 `steer`，等价于 DSH 的「插话」，在下一个 step 边界送达；`queue` 保留为显式配置。
5. **tool 输出含 undefined**：旧 `summarize` 给 system 消息写了 `from: undefined` / `target: undefined`，Harness 的 lossless-JSON 输出校验拒绝。已按字段存在性构造 JSON，并增加递归 no-undefined 测试。
6. **模型管理权限过宽**：默认 `allowAgentCreate/allowAgentManage=false`，模型工具不能静默建群/加人；人类面板和 `/group` 命令仍可。新增 `group_talk_leave`、`/group leave` 和 UI「退出群聊」。
7. **target burst 竞态**：并发请求在 pending 阶段看不到已占用的 target 配额；现在 pending 也计入，并增加跨群并发回归。
8. **模型输出泄露内部 id/错误**：send 的 deliveries 与 history 改为 alias/status + 通用错误；原始 session id 和错误仅留 UI/Host 日志。
9. **读取工具循环烧 Token**：list/history 每 Agent 每分钟最多 20 次；超限 fail closed。
10. **普通回答误解为群回复**：不做自动回传（可能泄露工具结果/私有上下文并形成循环）；envelope、prompt、面板等待提示均明确要求 `group_talk_send`。

新增测试后 **54 个测试全绿**。

### 真实对话验收

- 创建群「Harness 对话验收」，成员为当前会话与标题「Harness 会话群组插件设计 对话」的会话；
- 当前会话发送两轮，目标两轮均通过 `group_talk_send` 回复，`deliveries` 全部 `delivered`；
- 目标能引用当前群名和上一条消息，证明不是单次写入；
- 目标在 owner 运行中再次发来回复，owner 未结束当前回合就收到，确认 `steer` 生效；
- 页头按钮与侧栏图标均经真实鼠标点击验证。
- 指定对话评委最终复审确认：v1.4.1 无剩余阻断开源使用的 P0/P1；同意显式 `group_talk_send` 边界，不自动回传原始 assistant/tool 内容。

### 剩余风险 / 待重启项

- 当前 Host 进程仍运行安装前的 1.3 模块；源码、测试与 GitHub `v1.4.2` 已包含 burst/Host 预算、成员退出、模型管理门禁、人类可读 envelope、群聊徽标、读取限速与 `group_talk_list` JSON 修复。**下一次 Harness 重启后加载到 live**。新建只有 system 消息的空群时旧 tool 仍可能报 “not lossless JSON”；当前群消息足够，实测列表可用；
- `computer-use` 在热重载期间仍报 duplicate service；这是独立插件的非幂等注册问题，重启后确认；
- 侧栏图标是 DOM 装饰，上游改版时可能安全消失；页头入口和 `/group` 命令不受影响；
- 其余残余风险见第 6 节。

当前结论：**真实双会话投递与双向对话、页头和侧栏入口均已验证；源码、测试与 GitHub v1.4.2 已就绪。live Host 仍运行旧模块，重启后启用 1.4.2 的全部新防护与 UI；在那之前不能宣称 live 已完全升级。**
## 10. 结论

默认配置下：

- 单次广播最多 6 个收件人；
- 单发送者每天最多 30 条消息、60 次投递、估算 60,000 token；
- 单群每天最多 60 条消息、120 次投递、估算 120,000 token；
- 单目标每天最多 20 次群唤醒、估算 30,000 token；
- prompt ≤ 3500 字符，Web 每群 ≤ 20 条，工具历史 ≤ 12,000 字符；
- 所有入口共享同一账本，重启不丢失。

这些是保守上限，不是绝对安全证明；但已覆盖本次调查识别的高危放大路径，可以进入受控试用。
