# Group-Talk-L 安全与滥用防护报告

> 版本：2.3.1 · 范围：跨会话消息、目标会话唤醒、prompt 注入、Web 面板与人类身份、持久化账本与 lossy 载入、人类优先、笔记/审计、子代理委派、发送门槛、ambient/urgent 投递。
>
> 结论：2.4.0 在 2.3 的边界修复之上，补齐了审查报告的安全/成本项：凭据扫描与 taint 标签、广播预演与人工确认、并发闸/熔断/急停、群级敏感度、保留期与脱敏导出、结构化拒绝、真实用量回流、点对点传话筒的五条红线，以及可选的单进程锁。残余风险主要是 **估算 Token 与真实账单的偏差**、**peer content 提示注入**、**“已读”只是推导值**、**已安装插件/同源脚本的信任域** 和 **同名群/多进程的运维边界**。未发现必须阻止上线的风险，但不能承诺零风险。

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

去重条件是“上一条已被接纳（delivered）或仍在 pending”；如果上一条**全部投递失败**，允许重试，避免一次临时故障把消息锁死一个窗口。人类面板豁免去重（连续说两次“收到”是正常表达）。

### 4.4 每日账本

在同一个 store 事务内检查并记账：

| 维度 | 默认上限 | 实验 |
| --- | --- | --- |
| 发送者消息数 | 30 | 上限设为 2 时，第 3 条被拒绝，前 2 条已投递 |
| 发送者投递数 | 60 | 长 fan-out 会先耗尽此额度 |
| 群消息数 | 60 | 单群整体活跃度 |
| 群投递数 | 120 | 单群总唤醒次数 |
| 目标投递数 | 40 | 上限设为 2 时，第 3 次广播被拒绝，目标只收到 2 次 |
| 估算 Token/发送者 | 60,000 | 发送者总预算 |
| 估算 Token/群 | 120,000 | 实验上限 2,500、每次投递 1,000：一次 2 目标消息约 2,100，第二次被拒绝 |
| 估算 Token/目标 | 30,000 | 防止单个目标被多群围猎 |

账本存于 `groups.json` 的 `usage`，**Host 重启后继续生效**，按 **本地日历日** 重置（2.4 起；2.3 及以前按 UTC，升级后会有一次重置）。测试验证了 sender/group/target 三个计数器在重新加载后保持不变。

### 4.5 prompt 体积

构造 5 个群、每群 10 条 2,000 字记录：

| 版本 | 字符数 |
| --- | --- |
| 无 `maxChars`（注入 3 条最近记录） | 8,493 |
| 默认 `policyMaxChars = 3500` | **852**（自动切换短版） |
| 极端 `maxChars = 700` | ≤ 700，且带 `policy truncated` 标记 |

`interpolate: false` 已设置，群正文中的 `{{...}}` 不会触发 system-prompt 变量插值。

### 4.6 UI / history 输出

- Web 列表：`uiMessageLimit = 20`，每群最多返回 20 条消息；审计行默认不随列表返回，按需请求；
- 工具历史：`maxHistoryToolChars = 12000`，按最新优先裁剪，超长正文标记 `truncated`；
- 2000 字正文的 JSON envelope 约 2,487 字符；正文受 `maxMessageChars = 2000` 限制；
- Web 面板轮询 8 秒一次，`document.hidden` 时暂停；面板关闭时页头另有一次 60 秒的未读轮询（只读 GET，不产生模型 turn）。

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
- Web 路由只代表人类操作者：`sessionId` 只接受 `human`，非 `human` 返回 `human-only`；跨站 `Origin`/`Sec-Fetch-Site` 返回 403；请求体 ≤256 KiB，错误只返回稳定 code + 净化 message。

### 4.10 2.3.0 的边界修复

| 问题 | 2.2 行为 | 2.3 控制 |
| --- | --- | --- |
| Web 身份混淆代理 | `POST/GET` 的 `sessionId` 被当作调用者 | 只接受 `human`；非 `human` 返回 `human-only`；官方面板本来只传 `human` |
| 跨站调用 | 只依赖传输层认证 | 额外检查 `Origin` 与 `Sec-Fetch-Site`；跨站返回 403 |
| purpose 只在工具层 | HTTP/新入口可绕过 | 域服务在解析目标后强制；in-room `@human` 回复豁免；角色精确匹配 |
| 人类消息吃掉 target 账本 | 绕过上限但仍增加 target 计数 | 人类消息不检查也不记 target 账本；sender 冷却对所有人生效 |
| `ambient` 只是文案 | 与 urgent 同为 `steer` | `ambient → queue`，`urgent → steer`；显式 `mode` 覆盖 |
| 笔记无限写 | 可挤掉聊天、放大轮询 | 10/分、50/天；control 独立 20 行窗口；完整历史在 `audit`；成员/角色/改名/解散也写审计事实；审计按需拉取 |
| Token 估算对中文偏低 | 固定 `chars/4` | CJK × 1.5，其他 ÷ 4；明确“不是账单” |
| lossy 载入静默丢数据 | 继续用残缺 state，下次写覆盖 | 标为只读；HTTP 503；保留原文件 |
| 重复挂载 | 两个 store 互相覆盖 | 同一 `dataFile` 只允许一个实例 |

### 4.11 2.4.0 的新增控制

| 问题 | 2.3 行为 | 2.4 控制 |
| --- | --- | --- |
| 凭据粘贴进群 | 无扫描 | 私钥/AWS/GitHub/Slack/Google/Stripe/provider/JWT/高熵串拦截；人类可确认一次，模型不能 |
| 广播成本不可见 | 只有 fan-out 上限 | `preview` 返回收件人与估算 token；人类确认后才允许超过单条 fan-out，且受每日广播额度约束 |
| 并发唤醒过多 | 只有消息条数口径 | `maxConcurrentDeliveries` + 队列上限；超限结构化拒绝 |
| 事故止血 | 改 YAML + 重启 | `/group pause [群|*]`、面板暂停；暂停期只记录不唤醒；`/group relay pause` |
| 拒绝不可行动 | 英文句子 | `{code, retryAfterMs, suggestion}`；面板与命令本地化 |
| 委派能力过宽 | 禁群工具 | `delegationReadOnly` 额外禁用写/网络类工具 |
| 群级别隐私 | 无 | `public/internal/secret`；secret 群仅面板可发、禁止模型建群/委派 |
| 记录永久留存 | `historyLimit` 只裁剪 | `retentionDays`（默认 30，审计事实保留）；单条 redact；导出脱敏 |
| 跨会话传话 | 人类复制粘贴 | relay：默认 1 轮、TTL、禁止链式/授权/祈使句/凭据、可暂停、面板可见 |
| 多进程写同一文件 | 仅进程内队列 | 可选 advisory lock；活进程占用则只读 |

### 4.11 2.3.0 的残余信任边界

- Web 路由的认证主体是“操作者的浏览器”，不是“某个会话”；因此同源脚本仍能以人类身份发消息。这不是插件能单独解决的沙箱问题，市场文案与 SECURITY 应明确“已安装插件/同源脚本同属信任域”。
- 群元数据（名称、角色、职责、主题）仍会进入成员的 system prompt；`interpolate: false` 只阻止 `{{}}` 插值，不阻止语义注入。默认 `allowAgentCreate/Manage=false` 时只有人类能设置这些字段。
- 子代理委派的真实 provider 路径尚未在 2.4 中实跑；默认关闭，市场描述应标实验性。
- “已读”是推导值：目标后来在群里发言即视为读过此前的投递；它不是强一致回执，也不证明模型真的理解了内容。需要明确确认时用 relay。
- relay 的“禁止自动外发”是协议约束：接收方仍可能在自己的会话里使用它原本拥有的工具；插件不能也不应剥夺宿主工具。
- `secretScan` 是启发式：命中的是高信号形态，不能保证覆盖所有凭据；未命中的粘贴内容仍按不可信处理。

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
| 同源脚本冒充任意会话 | 2.3：Web 路由只接受 `human` + Origin 检查 | 403；人类身份仍可被同源脚本代表（见 4.11） |
| 非 organizer 绕过 purpose | 2.3：service 级门禁 + 精确角色 | `purpose-required`，0 投递 |
| 笔记刷屏/审计膨胀 | 10/分、50/天；control 独立窗口；audit 按需 | `rate-limited`/`quota-exceeded`；GET 不含 audit |
| lossy store 覆盖原文件 | 载入即只读；HTTP 503 | 人工修复/移走文件 |
| 中文 Token 低估 | CJK-aware 估算 | 预算更早触发；仍不是账单 |
| 凭据进群 | 2.4：secret 扫描 + 人工确认 | `secret-detected`，0 投递 |
| 广播成本失控 | 2.4：preview + 确认 + 广播额度 + 并发闸 | 超限拒绝/排队，不静默放大 |
| 事故止血 | 2.4：群/全站暂停 | 暂停期只记录不唤醒 |
| 记录无限留存 | 2.4：保留期 + redact | 到期裁剪聊天行；单条可脱敏 |
| 链式传话 | 2.4：relay 红线 | `relay-loop`，0 投递 |

## 6. 残余风险

1. **估算不等于账单，而且是下限**  
   2.3 改为 CJK-aware（CJK × 1.5）并保留 `assumedTokensPerDelivery`，但仍不计目标会话的上下文重读。一个长上下文目标被唤醒 40 次的真实成本可能远高于估算（5–30 倍并不罕见）；常驻成员的 prompt section（约 900–1,000 token/次请求）也不在发送账本内。预算只是限流器，真实成本监控仍应在 Harness/模型层进行。

2. **提示注入**  
   envelope 和 prompt 已明确群消息是 untrusted peer content，但模型仍可能被复杂文本影响。插件不做内容审核，也不会自动执行群消息中的工具调用；目标模型仍以正常 agent 规则运行。

3. **同 Host 多进程**  
   2.4 的 `lockFile` 只是 advisory lock：第二个 live 进程会变成只读并返回 `store-locked`，但它不做分布式协调，也不能阻止外部脚本直接改文件。不要把 `dataFile` 指向共享网络盘。

4. **失败投递已记账**  
   投递失败也消耗了尝试成本，账本不退款。这避免“故意失败刷配额”，但可能让发送者在临时故障后提前撞上限。

5. **跨时区**  
   每日账本按 Host 所在时区的本地零点重置（2.4 起）。跨时区团队看到的是 Host 时区的“今天”，面板文案已明确“本地”；这是为了让“今日已发”与人的直觉一致，代价是不同时区的成员共享同一个边界。

6. **插件信任域**
   已安装的 Host 插件可以用 Node 文件 API 直接读写 `groups.json`；同源 Client 脚本可以调用 Web 路由。0600、`allowAgentManage` 和 purpose 门槛防的是协议内越权，不是恶意插件沙箱。市场安装第三方插件时，这应是明示前提。

7. **“已读”与传话的语义边界**
   面板的“已读”是推导值（目标后来在群里发过言），不是逐条回执；relay 是显式回执，但默认 1 轮、10 分钟，且不能成为授权、付款或删除的依据。把这两者混用，会产生“它已读了所以它同意了”的错误推断。

8. **插件信任域与 lossy store**
   载入时丢失成员/群会让 store 只读并返回 503；这是防止覆盖的保护，但也意味着需要人工修复文件后才能继续写入。不要把 `groups.json` 交给会改写 schema 的外部工具。

8. **委派尚未真实 provider 验收**
   2.3 只在 fake provider 上验证了角色、深度、工具过滤、超时、配额和 `dispose`；默认 `allowAgentDelegate: false`，市场描述不应把它当作稳定能力。

9. **群内文本没有内容审核**
   群成员是同一操作者可见的会话；插件不提供跨用户隔离，也不做敏感信息扫描。不要在群消息中发送凭据。

10. **模型自动回复**
   普通 assistant 回答不会自动中继，必须显式调用 `group_talk_send`。这是有意设计：自动转发 assistant 内容可能泄露工具输出、私有上下文或推理结果，并形成循环；面板会显示「等待回复」。

11. **UI 轮询**
   面板 8 秒、侧栏入口未读 60 秒，都不是实时；牺牲时效换取更低的读取频率。未读水位只存本机，不上报 Host。审计行在打开审计视图时按需拉取，不进入轮询。

12. **in-transcript 徽标是 DOM 装饰。** 群聊入口本身走原生 `sidebar.panellist` / `main` slot，不依赖宿主类名；但会话内「群聊」徽标仍按 `userRow` / `userStack` 类名装饰，上游改版时会安全消失（不会报错），核心入口与 `/group` 命令不受影响。

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

当前 155 个测试：

| 文件 | 覆盖 |
| --- | --- |
| `store.test.mjs` | 校验、原子持久化、损坏旁置、视图裁剪 |
| `service.test.mjs` | 建群、发送、角色、人类操作者、解散/删除、持久化 |
| `policy.test.mjs` | prompt/envelope/help/history |
| `command.test.mjs` | `/group` 语法与 service 驱动 |
| `host.test.mjs` | Host 挂载、scoped 安装/卸载 |
| `http.test.mjs` | 认证 Fetch 路由、人类面板建群/发送、429、limits/usage |
| `client.test.mjs` | bundle 装载、header slot、`main` 面板与 `sidebar.panellist` 注册 |
| `client-render.test.mjs` | 空态/详情/创建页渲染、等待推导、未读计数与已读水位 |
| `protection.test.mjs` | 基线放大、fan-out、冷却、去重、sender/target/group/token 预算、群膨胀、prompt/历史/UI 上限、账本持久化 |
| `security.test.mjs` | 目标/发送者/群/Host 突发、Host 日预算、并发竞态、envelope 无 session id、0600/0700 |
| `security-2.test.mjs` | 人类优先、秘书/安全主管角色、委派角色/深度/工具过滤/配额/`dispose`、control 持久化、priority |
| `release-2.3.test.mjs` | queue/steer、service 级 purpose、精确角色、target 账本、CJK 估算、笔记配额、audit 按需、list 上限、lossy store、8,000 字上限 |
| `host.test.mjs` | Host 挂载、scoped 安装/卸载、sent-gate 豁免、重复挂载忽略 |
| `config.test.mjs` | 默认值、queue/steer、burst/host 限值与非法值回退 |
| `relay.test.mjs` | 传话闭环、超时、轮次、红线、配对限速、暂停、可见性 |
| `security-3.test.mjs` | 凭据扫描/确认、粘贴 taint、广播确认、暂停/急停、读回执、secret 群、并发闸、保留期、redact、人类去重 |
| `store-2.4.test.mjs` | schema 2、advisory lock、保留期、redact、活跃群上限、歧义候选 |
| `version-i18n.test.mjs` | 单一版本源、双语目录、结构化错误与建议 |
| `client-2.4.test.mjs` | 双语键一致、roleId 显示、单版本契约 |
| `http.test.mjs`（扩展） | ETag/304、分页、CSRF header、pause/relay/export/preview、双语错误 |

正式启用前检查：

- [x] `npm test`：155/155 通过（含版本一致性检查）；
- [x] `test/security.test.mjs` 与 `security-3.test.mjs`：突发/日预算/并发竞态、envelope 无 session id、0600/0700、凭据与 taint、广播确认、暂停、读回执、secret 群；
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

以下为 **1.4.x 历史自检**，仅存档，不描述 2.x 的整屏 panel：

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
4. **回复排队到回合结束**：1.x 默认投递模式是 `queue`，运行中的目标只能在本轮结束后看到群消息。2.1 改为默认 `steer` 以获得更快的边界投递；2.3 把 `ambient` 重新落回 `queue`、`urgent` 使用 `steer`，同时保留显式 `mode` 覆盖。
5. **tool 输出含 undefined**：旧 `summarize` 给 system 消息写了 `from: undefined` / `target: undefined`，Harness 的 lossless-JSON 输出校验拒绝。已按字段存在性构造 JSON，并增加递归 no-undefined 测试。
6. **模型管理权限过宽**：默认 `allowAgentCreate/allowAgentManage=false`，模型工具不能静默建群/加人；人类面板和 `/group` 命令仍可。新增 `group_talk_leave`、`/group leave` 和 UI「退出群聊」。
7. **target burst 竞态**：并发请求在 pending 阶段看不到已占用的 target 配额；现在 pending 也计入，并增加跨群并发回归。
8. **模型输出泄露内部 id/错误**：send 的 deliveries 与 history 改为 alias/status + 通用错误；原始 session id 和错误仅留 UI/Host 日志。
9. **读取工具循环烧 Token**：list/history 每 Agent 每分钟最多 20 次；超限 fail closed。
10. **普通回答误解为群回复**：不做自动回传（可能泄露工具结果/私有上下文并形成循环）；envelope、prompt、面板等待提示均明确要求 `group_talk_send`。

新增测试后 **102 个测试全绿**（含 2.1 的人类优先、秘书/组织者、委派、control 持久化，以及 2.3 的 HTTP human-only、purpose 域门禁、queue/steer、target 账本、CJK 估算、笔记配额、audit 按需、lossy store、重复挂载）。

### 真实对话验收

- 创建群「Harness 对话验收」，成员为当前会话与标题「Harness 会话群组插件设计 对话」的会话；
- 当前会话发送两轮，目标两轮均通过 `group_talk_send` 回复，`deliveries` 全部 `delivered`；
- 目标能引用当前群名和上一条消息，证明不是单次写入；
- 目标在 owner 运行中再次发来回复，owner 未结束当前回合就收到，确认 `steer` 生效；
- 页头按钮与侧栏图标均经真实鼠标点击验证。
- 指定对话评委最终复审确认：v1.4.1 无剩余阻断开源使用的 P0/P1；同意显式 `group_talk_send` 边界，不自动回传原始 assistant/tool 内容。

### 剩余风险 / 待重启项

- 面板版本由“单一版本源”生成并只在 Host/面板不一致时提示；**下一次 Harness 重启后才会加载 2.4 Host 半**。2.4 的视觉重走查与真实子代理 provider 仍需在重启后补做。
- `computer-use` 在热重载期间仍报 duplicate service；这是独立插件的非幂等注册问题，重启后确认；
- 群聊入口是原生 `sidebar.panellist` / `main` slot，不依赖宿主类名；仅会话内徽标仍是 DOM 装饰，上游改版时可能安全消失；
- 其余残余风险见第 6 节。

当前结论：**2.4.6 的版本纪律、凭据扫描/taint、广播确认、暂停/急停、并发闸、secret 群、保留期/redact、读回执、传话筒全链路、双语与 ETag/CSRF 均有自动化测试；`docs/screenshots/*.jpg` 仍是 2.2 时代的 1200×777 实机证据，只能作布局参考。源码 2.4.6 需要重启 Harness 才会成为 live Host；真实子代理 provider 仍需由 organizer 实跑一次。**
## 9.5 子代理委派安全（2.1）

委派把“一个群消息”升级成“一个可以调用工具的子 Agent”，因此按高风险能力处理。

| 威胁 | 控制 |
| --- | --- |
| 任意成员随意开子代理、烧 Token | `allowAgentDelegate` 默认 **false**；仅 organizer/owner 可调用；每发送者每日 `maxDelegationsPerDay`（默认 3） |
| 子代理递归再委派、形成森林 | `maxDepth: 0`；子代理工具过滤显式 deny 全部 `group_talk_*`，包括 `group_talk_delegate` |
| 子代理读取群 transcript / 冒充群成员 | 子代理不是群成员；不注入 group policy；`toolFilter.deny` 覆盖群工具；群消息不包含子代理 session id |
| 子代理跑飞、卡死 | `delegationTimeoutMs`（默认 120s）+ `AbortController`；超时写 `failed/timeout` 审计，并 `dispose()` run |
| 结果泄露隐私 / 挤爆 transcript | 结果截断到 `maxDelegationChars`；只写 control 行；模型侧返回同样截断；原始错误只进 Host 日志 |
| 无审计的暗箱委派 | 每次 start/complete/fail 写 `kind: "control"` 行（actor、taskId、provider、outcome、reason），人类审计视图可见 |
| 用委派绕过群预算 | 委派另计每日配额；子代理的模型调用仍受 Host 自身计费/限制；群消息预算不变 |
| 目标会话不在线仍假装委派 | 委派只由 organizer/owner 的工具发起，要求 live parent Agent；人类面板不再提供手动委派按钮 |

已知残余风险：子代理仍可使用它被允许的文件/命令工具，可能在工作区产生副作用；当前没有“逐任务人工批准”对话框，只有人类显式开启 `allowAgentDelegate` + organizer 角色 + 安全主管审计。高价值群建议保持默认关闭，或只在受控组织者会话开启。

测试：`test/security-2.test.mjs` 覆盖角色门禁、默认关闭、provider 缺失、`maxDepth: 0`、群工具 deny、超时/dispose、每日配额、control 行持久化、人类优先 envelope；`test/release-2.3.test.mjs` 覆盖 HTTP human-only、purpose 域门禁、queue/steer、target 账本、CJK 估算、笔记配额、audit 按需、lossy store。

## 10. 结论

默认配置下：

- 单次广播最多 6 个收件人；
- 单发送者每天最多 30 条消息、60 次投递、估算 60,000 token；
- 单群每天最多 60 条消息、120 次投递、估算 120,000 token；
- 单目标每天最多 40 次群唤醒、估算 30,000 token（CJK-aware 估算，不是账单）；
- prompt ≤ 3500 字符，Web 每群 ≤ 20 条消息，审计按需，工具历史 ≤ 12,000 字符；
- 笔记 10/分、50/天；control 独立 20 行窗口，聊天不被笔记挤掉；
- Web 路由只代表人类；跨站 403；lossy store 只读并返回 503；
- 所有入口共享同一账本，重启不丢失。

这些是保守上限，不是绝对安全证明；但已覆盖本次调查识别的高危放大路径，可以进入受控试用。
