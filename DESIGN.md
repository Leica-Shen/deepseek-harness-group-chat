# 设计：Group-Talk-L

## 1. 问题

Harness 的 Session 是天然隔离的：每个会话有自己的日志、模型选择、工作区和上下文。用户已经有多个正在进行的会话，却缺少一种“把它们组织起来”的方式：

- 不想把多个工作流合并进同一个 Session（会污染上下文、模型和上下文窗口）；
- 想让 A 会话把问题发给 B 会话，B 在自己的工作区里处理，再把结论发回 A；
- 想在群组层面安排角色（负责人、执行者、审阅者），而不是在每个会话里重复自然语言约定；
- 想在不重启、不重写 Harness 的前提下拥有这套能力。

Agent Teams 解决的是“从 Lead 派生 teammate”的问题；Session References 解决的是“把另一个会话的快照带进当前 prompt”的问题。两者都不是“让已有独立会话组成一个可持续对话的群组”。本插件补的就是这一层。

## 2. 设计选择

### 2.1 群组不是新的会话

没有创建一个“群聊 Session”，也没有复制成员消息到新上下文。群组是一个 **成员关系 + 共享 transcript + 路由规则** 的领域对象：

- 成员继续在自己的 Session 里推理、使用自己的工具和工作区；
- 消息以普通用户消息投递到目标 Session，目标仍然是同一个 Agent；
- 群组只保存“谁在群里、角色是什么、发过什么、投递结果”，不保存成员的完整对话；
- 因此不同成员的模型、上下文窗口、权限、工作区互不干扰。

这比“群聊机器人把所有人的回复汇总到一个新会话”更贴近 Harness 的 Session 模型，也避免了二次模型调用和上下文复制。

### 2.2 触发协议

统一使用 `/group` 命名空间，避免和已有 `@` 文件/会话引用、`#` Markdown 标题冲突：

| 写法 | 语义 |
| --- | --- |
| `/group @bob <消息>` | 发给别名 `bob` 的成员 |
| `/group #Reviewer <消息>` | 发给所有角色为 `Reviewer` 的其他成员 |
| `/group * <消息>` | 发给所有其他成员 |
| `/group send <群> @bob <消息>` | 多群场景显式指定群 |

`/group` 是 Human command，不消耗模型 turn；模型侧对应 `group_talk_send`，语义完全一致。`@`/`#`/`*` 是目标选择器，不是普通文本 mention；这样不会误触文件引用或 Session 引用。

### 2.3 成员如何知道协议

这是需求里最容易被忽略、但决定插件是否可用的部分。三种告知方式叠加：

1. **Scoped system prompt**：只在该成员 Agent 的 scope 注册 `group-talk-l:policy`，不污染非成员；
2. **Scoped tools**：只在该成员 scope 注册分级的 group tools（默认 5 个；create/manage/delegate 按配置追加），工具不可用时模型不会误以为能发；
3. **投递 envelope**：每条消息以「【群聊 / Group chat】群名」开头，带 `@发送者（角色）→ @收件人（角色）`、机器可读 JSON 和一行回复提示。首两行给人看，JSON 给模型解析；即使成员没有读过 policy，也能从当下这条消息知道怎么回。

prompt section 的动态函数在每次模型请求时重新渲染，所以角色修改、成员变化、解散/删除后，下一次请求立即反映；撤销成员时 scoped 注册立即 dispose。

`interpolate: false` 是安全细节：群消息正文可能包含 `{{...}}`，如果走 system-prompt 变量插值，会让一次消息投递导致整个模型请求失败，甚至读取未预期变量。群消息是 peer content，禁止插值。

### 2.4 权限

- 人类操作者以保留 id `human` 出现在成员列表里，是唯一的管理者；没有会话级 owner。
- 参与者（已有会话）只能读/发；角色是**收件人选择器**与职责说明，不是权限位。
- 新群 `ownerSessionId` 记为 `human`；legacy 群的旧 owner 仍可管理，人类也可以管理任何群。
- `origin: subagent` 的委派子代理不允许入群，因为普通 Session controller 对子代理的投递路径不同；普通 fork/child 会话（有 `parentSession` 但 `origin` 不是 `subagent`）可以加入，明确拒绝委派子代理比“显示成功但无人处理”好。

### 2.5 投递与记账语义

`send` 的持久化顺序是：

1. 先做重复抑制；
2. 在同一个 store 事务中检查 fan-out、冷却、发送者/群/目标每日预算与估算 Token，并记账；
3. append 消息（`deliveries: pending`）并原子落盘；
4. 对每个目标调用 Session controller，并向其 `prompt(request, signal)` 传入 30 秒 `AbortSignal.timeout`；
5. 将结果写回 `deliveries`；`ambient` 默认 `queue`（完成当前回合后），`urgent` 默认 `steer`（下一个 step 边界）。

任意预算检查失败都会让整个事务不提交：消息不出现、不投递、也不消耗额度。重复抑制返回上一条已接纳消息，避免重试循环。

这带来两个性质：

- **不会出现“消息只存在于内存”**：即使 Host 在投递中途崩溃，重启后 transcript 仍能看到这条消息（状态 pending）；
- **不假装送达**：`delivered` 只代表目标 inbox 接纳；目标模型是否运行、是否回复是另一回事。

`requestId` 固定为消息 id + 目标 session id，复用了 Session controller 的 inbox 去重；重试同一消息不会产生重复用户消息。

`ambient` 默认使用 `queue`：对运行中的目标，消息在它完成当前回合并进入下一轮后才被读取，兑现“不打断”；`urgent` 使用 `steer`，等价于 DSH 输入框的「插话」，在**下一个 step 边界**投递，不中断当前工具执行。显式 `mode` 仍可覆盖两者；`deliveryMode` 控制 ambient 的默认模式。

每个消息还会经过滑动窗口 burst 限制（发送者/群/Host/目标）与 Host 级日预算；这些限制在写入 transcript 前原子检查，避免多个群并行时把同一会话淹没。

### 2.6 解散与删除

- **解散**：`status: dissolved`，成员和 transcript 保留，append 一条系统记录，撤销所有成员的 scoped tools/policy。UI 变为只读，可继续查看，可删除。
- **删除**：永久移除 state 中的群及其 transcript；撤销成员注册。UI 有二次确认，命令要求 `confirm`。

这是两种不同的用户意图：解散是“停止协作但保留审计”，删除是“彻底清除”。分开实现而不是只做软删除，避免 `groups.json` 无限积累用户以为已经删掉的数据。

### 2.7 Web 与 Host 的边界

- **Host** 拥有全部领域逻辑、持久化、权限和投递；Client 没有写权限旁路。
- Browser 通过同源 `/api/group-talk-l` 访问，使用 Connection 服务的认证 Fetch 路由，不新增 token 或未认证 HTTP 端口。
- 路由使用 JSON、`no-store`、`nosniff`、请求体大小上限；错误只返回稳定的 code + 已净化的 message。
- Client 只做选择、展示和发起操作；2.x 的 panel 以人类操作者 `human` 发起，participant 工具仍带 `sessionId`，Host 每次都重新校验成员身份与管理边界。

### 2.8 为什么轮询而不是 WebSocket

选择「面板 8 秒 + 侧栏入口 60 秒未读」轮询，原因：

- 群组变更频率低，8 秒延迟可接受，同时降低读取频率；
- 页面隐藏时暂停轮询；
- 不需要新增 stream、重连、背压、事件权限等一整套协议；
- 群组 transcript 是低频数据，轮询成本远低于维护一个实时通道；
- 后续可在 Connection 上加流，而不改领域层。

### 2.9 人类优先与审计（2.1）

- 人类消息按“用户指令”而不是不可信 peer content 处理；agent 互发仍然是 untrusted data。`ambient` 默认排队到目标完成当前回合，`urgent` 在下一个 step 边界；两者都不中止运行中的工具。
- 人类发送绕过 target burst/日投递/Token 上限（`humanBypassTargetCaps`），且不消耗 target 日账本；但仍计入 group/Host/sender 预算，并受 sender 冷却约束。理由：人的一句纠正不能被某个成员的日额度挡住，也不能让同伴当天再也收不到消息。
- `kind: "control"` 的 transcript 行保存 `action/taskId/outcome/reason/parentRequestId/supersededBy`。成员加入/离开/角色/改名/解散也会写入只读审计事实。审计视图只读展示这些行与失败/未确认投递；人类不需要依赖模型转述。
- 面板的「保持打开」只保护“自动切换”场景：面板打开期间写入 pin；用户在面板外的 pointerdown 或「返回对话」会清除 pin，因此显式导航不会被弹回。

### 2.10 子代理委派（2.1）

- 只在 organizer/owner 成员的 live Agent 下 `subagents.start`；`maxDepth: 0`，deny 全部 `group_talk_*`，结果截断，超时 `AbortController`，运行结束 `dispose()`。
- 子代理不是群成员，不注入 group policy，不进入成员列表；它的 start/complete/fail 只作为 control 行进入群记录。
- `allowAgentDelegate` 默认 false；开启后还需要 organizer 角色、live parent、每日配额。委派只由 organizer/owner 的工具发起；人类面板**不提供**手动委派按钮，人类给组织者发任务即可。live parent 找不到就 fail closed，不假装成功。
- 委派不是 task/ack 控制层的替代：2.3 有 `ambient→queue` / `urgent→steer` 与 service 级 purpose 门禁，但仍没有 `interrupt`、`ack`、`supersede`；这些留待后续控制层。

## 3. 组件

```text
Browser
  GroupTalkLAction (header action slot)
    └─ GroupCenter
        ├─ GroupList / GroupDetail
        ├─ CreateForm / AddMemberModal / RoleModal / ConfirmModal / TargetPicker
        └─ fetch /api/group-talk-l

Host
  apply()
    ├─ GroupStore ............ atomic JSON + usage ledger under $DSH_HOME
    ├─ GroupService .......... membership, permissions, delivery, transcript
    ├─ guard.js .............. dedupe, cooldown, fan-out, daily quotas
    ├─ scoped tools .......... 5 group_talk_* per member Agent
    ├─ scoped prompt section . dynamic roster/roles/recent transcript
    ├─ /group command ........ create, list, send, role, dissolve, delete...
    └─ connection.fetch ...... GET/POST /api/group-talk-l
```

### 关键不变量

1. 一个群至少有一个成员（人类操作者），参与者是已有会话；
2. 群内 alias 忽略大小写唯一；同一 session 只能出现一次；
3. 只有人类操作者能改变群结构或删除群；参与者只能读/发；
4. 只有 active 群能 send；已解散群只读；
5. 消息正文、角色、名称、别名都有长度上限与控制字符清理；
6. 群数据只落在 `$DSH_HOME`，不写工作区；
7. scoped 注册的生命周期与成员关系绑定，成员被移除后不残留工具；
8. 群消息正文永不参与 system-prompt 变量插值；
9. 每条消息在写入前必须通过并记账统一的 budget；重复消息不产生第二次投递；
10. 群/成员/prompt/展示都受硬上限约束，不能由单个会话无限扩张。

## 4. 数据模型

```ts
interface GroupState {
  version: 1
  groups: Record<string, Group>
  usage: UsageLedger
}

interface UsageLedger {
  day: string // YYYY-MM-DD UTC
  senders: Record<string, Counter>
  groups: Record<string, Counter>
  targets: Record<string, Counter>
  lastSend: Record<string, number>
}

interface Counter {
  messages: number
  deliveries: number
  tokens: number
}

interface Group {
  id: string
  name: string
  topic: string
  /** `human` for new rooms; a legacy session id remains readable. */
  ownerSessionId: string
  status: 'active' | 'dissolved'
  createdAt: number
  updatedAt: number
  dissolvedAt?: number
  members: Member[]
  messages: TranscriptEntry[]   // last historyLimit chat/system + last 20 control rows
  audit: TranscriptEntry[]      // control rows, retained up to max(200, historyLimit)
}

interface Member {
  sessionId: string
  alias: string
  role: string
  duties: string
  joinedAt: number
}

type TranscriptEntry = {
  id: string
  kind: 'message' | 'system' | 'control'
  at: number
  fromSessionId?: string
  fromAlias?: string
  target?: string
  text: string
  priority?: 'ambient' | 'urgent'
  purpose?: 'verify' | 'correct' | 'review' | 'anomaly' | 'question' | 'blocked' | 'handoff'
  estimatedTokens?: number
  deliveries: Delivery[]
  // control rows only
  action?: string
  taskId?: string
  outcome?: string
  reason?: string
  parentRequestId?: string
  supersededBy?: string
}

interface Delivery {
  sessionId: string
  alias: string
  status: 'pending' | 'delivered' | 'failed' | 'unknown' | 'in-room'
  error?: string
}
```

`messageTotal` / `auditTotal` 只在访问视图中出现；`historyLimit` 裁剪聊天/系统行，control 行另有 20 行窗口，完整 control 历史在 `audit`。Web 列表只取 `uiMessageLimit` 条消息且默认不带 audit；审计视图按需请求。工具历史再受 `maxHistoryToolChars` 限制。

## 5. UI 风格

- 主入口是 `sidebar.panellist` 的一行（`id: group-talk-l`、`order: 20`），点开后由 keyed `main` slot（`key: group-talk-l`）占满主区域，与普通对话同一层级；侧栏一行同时承载未读红点；
- 会话页头保留一个 `conversation.session.header.actions` 快捷按钮（`Button variant="ghost" size="sm"` + `IconUsersOutlineRegular`），点击等价于侧栏入口，不再自己渲染弹层；
- 面板内部两栏（群列表 / 对话），顶栏提供「返回对话」；高度撑满 `main`，窄屏日志自然压缩；
- 颜色全部走 `--dsw-alias-*` / `--dsw-elevation-*` / `--dsw-radius-*`，不引入硬编码品牌色；
- 危险操作使用 `--dsw-alias-state-error-primary`，但仅用于删除/失败；
- zh/en 字典通过 `ctx.locale.register`，所有文案走 `t()`；
- 空态、加载态、错误态均使用 `StateDot` / 原生文字，不用自绘 spinner 或 toast 系统；
- 操作失败留在当前面板，不关闭用户正在填写的表单。

## 6. 失败模式

| 失败 | 行为 |
| --- | --- |
| `groups.json` 损坏 | 移动到 `.corrupt-<timestamp>`，空状态启动，日志告警 |
| 读文件失败 | 拒绝写入，避免覆盖；命令/HTTP 返回错误 |
| 载入丢弃成员/群 | store 只读，HTTP 503；原文件保留待修复 |
| 同一 dataFile 重复挂载 | 第二个实例被忽略并告警 |
| 成员会话不可见 | 创建/添加时拒绝；若 list 本身失败，仅记录并放行（list 是额外保护，不是唯一真源） |
| 目标会话已被归档 | Session controller 可能接纳但 turn 被 archived gate 阻止；transcript 记录 delivered，UI 仍可通过成员跳转查看 |
| 预算超限 | 在写入前返回 `rate-limited` / `quota-exceeded` / `fanout-exceeded`；消息不存在、未投递、未记账 |
| 发送太快 | 全局 `sendCooldownMs` 拒绝；等待后重试 |
| 重复重试 | 返回 `deduplicated`，不产生第二次投递 |
| 目标投递失败 | transcript 记录 `failed` + error；发送命令/工具返回失败列表，不回滚已存消息；额度已记账（人类 target 不记账） |
| delivery 回写失败 | 日志告警；消息仍在 transcript 中，状态 pending |
| 进程在投递中途崩溃 | 重启后消息为 pending，不自动重发（避免重复） |
| 群在发送中途被删除 | delivery 回写跳过；send 返回已生成的结果 |
| 角色被改名/移除 | 下一次 prompt assembly 使用最新 state；`#role` 找不到目标时返回可用角色列表 |

## 7. 测试策略

- `store.test.mjs`：名称/别名/消息校验、引用解析、原子持久化、损坏旁置、transcript 裁剪、`$DSH_HOME` 路径；
- `service.test.mjs`：建群、按 alias/role/all 发送、self-target、非成员、owner-only、角色编辑、解散/删除、子代理拒绝、持久化重载；
- `policy.test.mjs`：成员 prompt、非成员空 policy、envelope、help/history；
- `command.test.mjs`：slash grammar、`confirm` 删除、命令驱动真实 service；
- `host.test.mjs`：Host `apply` 注册 `/group`、按成员安装分级的 group tools 和 prompt section、发送、解散后卸载；
- `client.test.mjs`：通过 `window.__ModuleLoader__` 装载 client bundle、注册 locale/stylesheet/header slot；
- `client-render.test.mjs`：初始空态、群详情、创建页的渲染 smoke test；
- `http.test.mjs`：认证 Fetch 路由、limits/usage、429 映射；
- `protection.test.mjs`：无保护放大基线、fan-out、冷却、去重、sender/group/target/Token 预算、群膨胀、prompt/UI/历史上限、账本持久化；
- `config.test.mjs`：默认值与非法值回退；
- `security.test.mjs`：target/sender/group/Host burst、Host 日预算、并发、envelope 脱敏、0600/0700；
- `security-2.test.mjs`：人类优先、秘书/组织者/安全主管、委派、control 持久化、priority；
- `release-2.3.test.mjs`：HTTP human-only、purpose 域门禁、queue/steer、target 账本、CJK 估算、笔记配额、audit 按需、list 上限、lossy store、8,000 字上限。

## 8. 明确不做

- 不做自动回复中继；
- 不做群内文件/图片附件；
- 不做群主转移；
- 不做跨 Host 进程锁；
- 不做会话级 Web API（Web 路由只代表人类；会话用 scoped tools）；
- 不做多租户/多操作者隔离（已安装插件与同源脚本同属信任域）；
- 不做基于真实账单的 token 计量（采用保守估算）；
- 不做群消息内容审核；
- 不做真实“群聊 Session”或消息回溯重放到新上下文；
- 不做角色权限继承；
- 不做跨成员已读回执与在线状态；本机未读计数在客户端实现（`localStorage` 水位），不改存储格式。

这些都可以在领域层之上增量添加，而不需要推翻当前模型。

## 9. 可扩展点

1. `autoRelay`：当一次目标 turn 由群消息触发时，把该 turn 最终 assistant 文本作为一条群消息回给发送者；需要 trip 计数和“仅一层”防循环。
2. 跨设备未读：把本机水位升级为按成员记录的 lastReadSeq；当前实现只在客户端 `localStorage`。
3. 群主转移：owner 只能转给现有成员，并 append 系统记录；与现有 owner-only 检查兼容。
4. 附件：复用 `ctx.attachments` 或仅允许文件路径引用；需要权限和 prompt 预算。
5. 实时：在 Connection 上注册 stream，替代 8 秒轮询。
6. 角色目录：把自由文本角色改为可配置预设，但底层仍存字符串，迁移简单。
