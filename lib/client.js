window.__ModuleLoader__.load({
  id: "@local/group-talk-l",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    const React = require("react")
    const P = require("@deepseek-ai/dsh-client-ui-primitives")
    const {
      Button,
      Checkbox,
      Input,
      Modal,
      StateDot,
      Tag,
      Tooltip,
      IconChevronLeftOutlineRegular,
      IconEditOutlineRegular,
      IconPaperPlaneOutlineRegular,
      IconPlusOutlineRegular,
      IconRefreshOutlineRegular,
      IconRightUpOutlineRegular,
      IconTrashOutlineRegular,
      IconUserOutlineRegular,
      IconUsersOutlineRegular,
    } = P

    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React
    const NS = "group-talk-l"

    const CSS = `
.dsh-group-talk-l-root { position: relative; display: inline-flex; }
.dsh-group-talk-l-trigger { color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-trigger:hover, .dsh-group-talk-l-trigger:focus-visible { color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-trigger-label { white-space: nowrap; }
.dsh-group-talk-l-workspace-create { box-sizing: border-box; display: inline-flex; flex: none; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: 2px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; pointer-events: auto; position: relative; z-index: 1; }
.dsh-group-talk-l-workspace-create:hover, .dsh-group-talk-l-workspace-create:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-workspace-create:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
[class*="sectionLabelHidden"] + .dsh-group-talk-l-workspace-create { display: none; }
@container (max-width: 480px) { .dsh-group-talk-l-trigger-label { display: none; } }
.dsh-group-talk-l-modal { width: min(880px, 100%); max-height: 100%; }
.dsh-group-talk-l-shell { display: flex; min-height: 420px; max-height: min(640px, calc(100vh - 220px)); gap: 18px; }
.dsh-group-talk-l-sidebar { width: 224px; flex: none; display: flex; flex-direction: column; gap: 10px; min-height: 0; border-right: .5px solid var(--dsw-alias-border-l2); padding-right: 14px; }
.dsh-group-talk-l-sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px; }
.dsh-group-talk-l-sidebar-title { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-list { display: flex; flex-direction: column; gap: 4px; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; padding-right: 2px; }
.dsh-group-talk-l-list-empty { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 8px 2px; }
.dsh-group-talk-l-row { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); padding: 8px 9px; cursor: pointer; }
.dsh-group-talk-l-row:hover, .dsh-group-talk-l-row:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-row-active { background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); }
.dsh-group-talk-l-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-group-talk-l-row-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; }
.dsh-group-talk-l-row-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-main { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.dsh-group-talk-l-main-head { display: flex; align-items: flex-start; gap: 10px; padding: 0 2px 12px; }
.dsh-group-talk-l-main-headtext { min-width: 0; flex: 1; }
.dsh-group-talk-l-main-title { margin: 0; color: var(--dsw-alias-label-primary); font-size: 15px; line-height: 23px; font-weight: 500; overflow-wrap: anywhere; }
.dsh-group-talk-l-main-sub { margin: 3px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dsh-group-talk-l-head-actions { display: flex; gap: 4px; flex: none; }
.dsh-group-talk-l-section { border-top: .5px solid var(--dsw-alias-border-l2); padding: 12px 2px 0; min-height: 0; }
.dsh-group-talk-l-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.dsh-group-talk-l-section-title { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-members { display: flex; flex-direction: column; gap: 5px; max-height: 188px; overflow-y: auto; padding-right: 2px; }
.dsh-group-talk-l-member { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); }
.dsh-group-talk-l-member-icon { flex: none; color: var(--dsw-alias-label-tertiary); display: inline-flex; }
.dsh-group-talk-l-member-text { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.dsh-group-talk-l-member-name { display: flex; align-items: center; gap: 5px; min-width: 0; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; }
.dsh-group-talk-l-member-alias { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-member-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-member-actions { display: flex; align-items: center; gap: 2px; flex: none; }
.dsh-group-talk-l-iconbutton { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dsh-group-talk-l-iconbutton:hover, .dsh-group-talk-l-iconbutton:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-iconbutton-danger:hover, .dsh-group-talk-l-iconbutton-danger:focus-visible { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-messages { flex: 1; min-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 2px 4px 4px 2px; scrollbar-gutter: stable; }
.dsh-group-talk-l-message { display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); }
.dsh-group-talk-l-message-system { background: transparent; box-shadow: none; padding: 2px 4px; }
.dsh-group-talk-l-message-meta { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-message-author { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dsh-group-talk-l-message-body { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dsh-group-talk-l-message-system .dsh-group-talk-l-message-body { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-delivery-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-composer { border-top: .5px solid var(--dsw-alias-border-l2); margin-top: 10px; padding: 10px 2px 0; display: flex; flex-direction: column; gap: 7px; }
.dsh-group-talk-l-composer-row { display: flex; align-items: center; gap: 8px; }
.dsh-group-talk-l-select { height: 28px; min-width: 128px; max-width: 230px; border: .5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 0 8px; }
.dsh-group-talk-l-textarea { box-sizing: border-box; width: 100%; min-height: 64px; max-height: 150px; resize: vertical; border: .5px solid var(--dsw-alias-border-l3); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 8px 10px; }
.dsh-group-talk-l-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-textarea:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-incoming-row [class*="bubble"] { border-left: 2px solid var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-incoming-badge { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px; color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-bg-layer-2); border: .5px solid var(--dsw-alias-border-l2); border-radius: 999px; padding: 1px 7px; margin-bottom: 2px; font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-version { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; padding: 8px 2px 0; }
.dsh-group-talk-l-waiting { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; padding: 2px 2px 0; }
.dsh-group-talk-l-composer-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-dissolved { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 12px 2px 4px; border-top: .5px solid var(--dsw-alias-border-l2); margin-top: 10px; }
.dsh-group-talk-l-notice { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; line-height: 18px; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-notice-error { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-notice-success { color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-empty { flex: 1; min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-empty-icon { opacity: .55; }
.dsh-group-talk-l-empty-title { color: var(--dsw-alias-label-secondary); font-size: 13px; font-weight: 500; }
.dsh-group-talk-l-empty-text { max-width: 330px; font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-create { display: flex; flex-direction: column; gap: 14px; max-height: min(640px, calc(100vh - 220px)); overflow-y: auto; padding: 0 2px 2px; }
.dsh-group-talk-l-field { display: flex; flex-direction: column; gap: 5px; }
.dsh-group-talk-l-field-label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-field-row { display: flex; gap: 8px; }
.dsh-group-talk-l-field-row > * { flex: 1; min-width: 0; }
.dsh-group-talk-l-card { border: .5px solid var(--dsw-alias-border-l2); border-radius: 9px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-2); display: flex; flex-direction: column; gap: 8px; }
.dsh-group-talk-l-card-title { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-picker { border: .5px solid var(--dsw-alias-border-l2); border-radius: 9px; overflow: hidden; }
.dsh-group-talk-l-picker-head { padding: 8px 10px 6px; border-bottom: .5px solid var(--dsw-alias-border-l2); display: flex; flex-direction: column; gap: 7px; }
.dsh-group-talk-l-picker-list { max-height: 230px; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 2px; }
.dsh-group-talk-l-pick { border-radius: 7px; padding: 4px 6px; }
.dsh-group-talk-l-pick:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-pick-main { display: flex; flex-direction: column; min-width: 0; }
.dsh-group-talk-l-pick-title { color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-pick-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-pick-fields { display: flex; gap: 6px; padding: 2px 0 4px 24px; }
.dsh-group-talk-l-pick-fields > * { flex: 1; min-width: 0; }
.dsh-group-talk-l-form-actions { display: flex; justify-content: flex-end; gap: 8px; border-top: .5px solid var(--dsw-alias-border-l2); padding-top: 12px; }
.dsh-group-talk-l-modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.dsh-group-talk-l-role-fields { display: flex; flex-direction: column; gap: 10px; }
.dsh-group-talk-l-confirm { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dsh-group-talk-l-danger { color: var(--dsw-alias-state-error-primary); }
`

    const zh = {
      trigger: "群聊",
      title: "群聊",
      loading: "正在加载群聊…",
      loadFailed: "无法加载群聊：",
      retry: "重试",
      emptyTitle: "还没有群聊",
      emptyText: "选择几个已有会话，让它们在不合并对话的前提下互相发消息。",
      create: "新建群聊",
      createTitle: "新建群聊",
      name: "群聊名称",
      namePlaceholder: "例如：发布评审",
      topic: "主题（可选）",
      topicPlaceholder: "这组会话要一起完成什么？",
      members: "成员",
      addMember: "添加成员",
      removeMember: "移除成员",
      cancel: "取消",
      createAction: "创建",
      creating: "正在创建…",
      save: "保存",
      saving: "正在保存…",
      back: "返回",
      close: "关闭",
      alias: "别名",
      role: "角色",
      duties: "职责（可选）",
      rolePlaceholder: "例如：审阅者",
      dutiesPlaceholder: "这个角色负责什么？",
      ownerTag: "群主",
      youTag: "你",
      active: "进行中",
      dissolved: "已解散",
      readOnly: "群聊已解散，只能查看记录。",
      openSession: "打开会话",
      noMessages: "还没有群消息。用下方输入框或 /group @别名 发送第一条。",
      messageTo: "发送到",
      allMembers: "全部其他成员",
      send: "发送",
      sending: "发送中…",
      sent: "已发送。",
      sendPartial: "部分送达失败：{names}",
      sendFailed: "发送失败：",
      deduplicated: "已抑制重复消息：相同内容仍在去重窗口内，未再次投递。",
      limitHint: "最多 {chars} 字 · {seconds}s 冷却 · 单次最多 {recipients} 位",
      usageHint: "今日已发 {used}/{limit} 条",
      historyTruncated: "记录已截断",
      ownerOnly: "只有群主可以管理成员与群聊。",
      roleTitle: "编辑角色",
      dissolve: "解散群聊",
      dissolveTitle: "解散群聊？",
      dissolveText: "成员和记录会保留为只读，之后仍可以删除。",
      delete: "删除群聊",
      deleteTitle: "永久删除群聊？",
      deleteText: "群聊和全部记录会被永久删除，无法恢复。",
      confirmDissolve: "解散",
      confirmDelete: "删除",
      searchSessions: "搜索会话",
      currentSession: "当前会话",
      noSessions: "没有可添加的会话。",
      selectSessions: "选择要加入的会话",
      createHint: "当前会话会自动成为群主。选中其他会话后，可分别设置别名和角色。每位成员会让此后每次模型请求多约 800–1200 token 的群聊说明。",
      aliasRequired: "请为每个成员填写唯一别名。",
      nameRequired: "请填写群聊名称。",
      addMemberTitle: "添加成员",
      removeTitle: "移除成员？",
      removeText: "该会话会立即失去这个群聊。",
      confirmRemove: "移除",
      removeFailed: "移除失败：",
      added: "已添加成员。",
      groupId: "群聊 ID",
      membersCount: "{count} 位成员",
      messagesCount: "{count} 条消息",
      noSelection: "从左侧选择一个群聊。",
      loadingGroups: "正在加载群聊…",
      sessionMissing: "会话不可用",
      help: "输入 /group help 查看命令语法。",
      deliveryPending: "待确认",
      delivered: "已送达",
      failed: "失败",
      deliveryUnknown: "未确认",
      roleDefault: "成员",
      roleOwner: "群主",
      justNow: "刚刚",
      pickOne: "选择一个会话",
      add: "添加",
      adding: "正在添加…",
      editRole: "编辑角色",
      remove: "移除",
      groupName: "群聊名称",
      actionFailed: "操作失败：",
      savingRole: "正在保存角色…",
      roleSaved: "角色已保存。",
      memberRemoved: "成员已移除。",
      dissolvedDone: "群聊已解散。",
      deletedDone: "群聊已删除。",
      createdDone: "群聊已创建。",
      noOtherMembers: "暂无其他成员",
      ownerCannotRemove: "群主不能被移除。",
      leave: "退出群聊",
      leaveTitle: "退出这个群聊？",
      leaveText: "你会立即失去成员身份、群聊工具和群消息；群主和其他成员不受影响。",
      confirmLeave: "退出",
      leaveDone: "已退出群聊。",
      waitingReply: "等待 {target} 回复 · 普通回答不会自动回到群聊",
      waitingLong: "已等待 {target} 超过 {minutes} 分钟 · 对方可能不会自动回复",
      nudge: "催一下",
      nudgeMessage: "提醒：群聊「{group}」里有消息还在等待你的回复。请用 group_talk_send 回复 {me}，或说明你暂时无法回复。",
      replyNote: "成员需用群聊工具显式回复",
    }

    const en = {
      trigger: "Group chat",
      title: "Group chat",
      loading: "Loading group chats…",
      loadFailed: "Could not load group chats: ",
      retry: "Retry",
      emptyTitle: "No group chats yet",
      emptyText: "Pick a few existing sessions and let them message each other without merging their conversations.",
      create: "New group chat",
      createTitle: "New group chat",
      name: "Group chat name",
      namePlaceholder: "e.g. Release review",
      topic: "Topic (optional)",
      topicPlaceholder: "What are these sessions working on?",
      members: "Members",
      addMember: "Add member",
      removeMember: "Remove member",
      cancel: "Cancel",
      createAction: "Create",
      creating: "Creating…",
      save: "Save",
      saving: "Saving…",
      back: "Back",
      close: "Close",
      alias: "Alias",
      role: "Role",
      duties: "Duties (optional)",
      rolePlaceholder: "e.g. Reviewer",
      dutiesPlaceholder: "What does this role own?",
      ownerTag: "Owner",
      youTag: "You",
      active: "Active",
      dissolved: "Dissolved",
      readOnly: "This group chat is dissolved and read-only.",
      openSession: "Open session",
      noMessages: "No group messages yet. Send the first one below or with /group @alias.",
      messageTo: "Send to",
      allMembers: "Everyone else",
      send: "Send",
      sending: "Sending…",
      sent: "Sent.",
      sendPartial: "Some deliveries failed: {names}",
      sendFailed: "Send failed: ",
      deduplicated: "Duplicate suppressed: identical content is still inside the dedupe window and was not delivered again.",
      limitHint: "{chars} chars max · {seconds}s cooldown · {recipients} recipients max",
      usageHint: "{used}/{limit} messages today",
      historyTruncated: "History truncated",
      ownerOnly: "Only the group owner can manage members and the group chat.",
      roleTitle: "Edit role",
      dissolve: "Dissolve group chat",
      dissolveTitle: "Dissolve this group chat?",
      dissolveText: "Membership and transcript stay readable, and you can delete it later.",
      delete: "Delete group chat",
      deleteTitle: "Delete this group chat permanently?",
      deleteText: "The group and its entire transcript will be permanently removed. This cannot be undone.",
      confirmDissolve: "Dissolve",
      confirmDelete: "Delete",
      searchSessions: "Search sessions",
      currentSession: "Current session",
      noSessions: "No sessions available.",
      selectSessions: "Select sessions to add",
      createHint: "This session becomes the owner. Set an alias and role for each selected session. Each member adds roughly 800–1200 tokens to every subsequent model request.",
      aliasRequired: "Give every member a unique alias.",
      nameRequired: "Enter a group chat name.",
      addMemberTitle: "Add member",
      removeTitle: "Remove this member?",
      removeText: "This session will immediately leave the group chat.",
      confirmRemove: "Remove",
      removeFailed: "Remove failed: ",
      added: "Member added.",
      groupId: "Group chat ID",
      membersCount: "{count} members",
      messagesCount: "{count} messages",
      noSelection: "Select a group chat on the left.",
      loadingGroups: "Loading group chats…",
      sessionMissing: "Session unavailable",
      help: "Type /group help for command syntax.",
      deliveryPending: "Pending",
      delivered: "Delivered",
      failed: "Failed",
      deliveryUnknown: "Unconfirmed",
      roleDefault: "Member",
      roleOwner: "Owner",
      justNow: "just now",
      pickOne: "Pick a session",
      add: "Add",
      adding: "Adding…",
      editRole: "Edit role",
      remove: "Remove",
      groupName: "Group chat name",
      actionFailed: "Operation failed: ",
      savingRole: "Saving role…",
      roleSaved: "Role saved.",
      memberRemoved: "Member removed.",
      dissolvedDone: "Group chat dissolved.",
      deletedDone: "Group chat deleted.",
      createdDone: "Group chat created.",
      noOtherMembers: "No other members",
      ownerCannotRemove: "The owner cannot be removed.",
      leave: "Leave group chat",
      leaveTitle: "Leave this group chat?",
      leaveText: "You immediately lose membership, group tools and group messages; the owner and other members are unaffected.",
      confirmLeave: "Leave",
      leaveDone: "Left the group chat.",
      waitingReply: "Waiting for {target} · ordinary answers do not return automatically",
      waitingLong: "Waiting for {target} for over {minutes} min · they may not reply automatically",
      nudge: "Nudge",
      nudgeMessage: "Reminder: a message in group chat \"{group}\" is waiting for your reply. Use group_talk_send to reply to {me}, or say you cannot reply right now.",
      replyNote: "members reply explicitly with the group tool",
    }

    /** Same-origin authenticated request to the Host's exact Fetch route. */
    async function api(method, sessionId, payload, signal) {
      const query = `sessionId=${encodeURIComponent(sessionId)}`
      const lifetime = signal ?? AbortSignal.timeout(method === "GET" ? 10000 : 30000)
      const init = method === "GET"
        ? { method: "GET", credentials: "same-origin", cache: "no-store", signal: lifetime }
        : {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId, ...payload }),
            signal: lifetime,
          }
      const response = await fetch(`/api/group-talk-l?${query}`, init)
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok) {
        const message = body?.error?.message ?? `Request failed (${response.status})`
        throw new Error(message)
      }
      return body
    }

    /** Format a localized string even when the slot's t is a simple lookup. */
    function format(t, key, values) {
      let text
      try {
        text = t(key, values)
      } catch {
        text = undefined
      }
      if (typeof text !== "string") text = key
      if (!values) return text
      return text.replace(/\{(\w+)\}/gu, (_, name) => String(values[name] ?? `{${name}}`))
    }

    /** Stable session id from either client summary spelling. */
    function sessionIdOf(summary) {
      return String(summary?.sessionId ?? summary?.id ?? "")
    }

    /** Display title without trusting an absent projection. */
    function titleOf(summary) {
      const title = summary?.title ?? summary?.displayTitle
      if (typeof title === "string" && title.trim()) return title.trim()
      const id = sessionIdOf(summary)
      return id || "session"
    }

    /** Normal client summaries: visible ordinary sessions, children excluded. */
    function useSessionDirectory(useSessions, excludedIds) {
      const ids = useSessions((state) => state.ids)
      const byId = useSessions((state) => state.byId)
      const excluded = excludedIds instanceof Set ? excludedIds : new Set(excludedIds ?? [])
      return useMemo(() => {
        return ids
          .map((id) => byId[id])
          .filter(Boolean)
          .filter((summary) => summary.origin !== "subagent")
          .filter((summary) => !excluded.has(sessionIdOf(summary)))
          .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
      }, [ids, byId, excluded])
    }

    function ErrorNotice({ text, t }) {
      if (!text) return null
      return h("div", { className: "dsh-group-talk-l-notice dsh-group-talk-l-notice-error", role: "alert" },
        h(StateDot, { state: "error" }),
        h("span", null, text))
    }

    function Notice({ kind = "success", text }) {
      if (!text) return null
      return h("div", {
        className: kind === "error"
          ? "dsh-group-talk-l-notice dsh-group-talk-l-notice-error"
          : "dsh-group-talk-l-notice dsh-group-talk-l-notice-success",
        role: kind === "error" ? "alert" : "status",
      },
        kind === "error" ? h(StateDot, { state: "error" }) : h(StateDot, { state: "done" }),
        h("span", null, text))
    }

    function IconButton({ label, onClick, disabled, danger, children }) {
      return h(Tooltip, { label, side: "top", gap: 4, disabled },
        h("button", {
          type: "button",
          className: `dsh-group-talk-l-iconbutton${danger ? " dsh-group-talk-l-iconbutton-danger" : ""}`,
          "aria-label": label,
          onClick,
          disabled,
        }, children))
    }

    function GroupList({ groups, selectedId, loading, error, onSelect, onCreate, onRetry, t }) {
      return h("div", { className: "dsh-group-talk-l-sidebar" },
        h("div", { className: "dsh-group-talk-l-sidebar-head" },
          h("span", { className: "dsh-group-talk-l-sidebar-title" }, t("title")),
          h(IconButton, { label: t("create"), onClick: onCreate },
            h(IconPlusOutlineRegular, { size: 15 }))),
        error ? h(ErrorNotice, { text: `${t("loadFailed")}${error}`, t }) : null,
        h("div", { className: "dsh-group-talk-l-list" },
          loading && groups.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" },
                h("span", { style: { display: "inline-flex", marginRight: 6, verticalAlign: "middle" } }, h(StateDot, { state: "ongoing" })),
                t("loadingGroups"))
            : null,
          !loading && groups.length === 0 && !error
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("emptyTitle"))
            : null,
          groups.map((group) => h("button", {
            type: "button",
            key: group.id,
            className: group.id === selectedId
              ? "dsh-group-talk-l-row dsh-group-talk-l-row-active"
              : "dsh-group-talk-l-row",
            onClick: () => onSelect(group.id),
          },
            h("span", { className: "dsh-group-talk-l-row-top" },
              h("span", { className: "dsh-group-talk-l-row-name" }, group.name),
              h(Tag, { tone: group.status === "active" ? "info" : "outline" },
                group.status === "active" ? t("active") : t("dissolved"))),
            h("span", { className: "dsh-group-talk-l-row-meta" },
              `${format(t, "membersCount", { count: group.members.length })} · ${group.me ? `@${group.me.alias}` : ""}`)))),
        error && groups.length > 0
          ? h("button", {
              type: "button",
              className: "dsh-group-talk-l-row",
              onClick: onRetry,
            }, t("retry"))
          : null)
    }

    function MemberRow({ member, group, sessionId, onEditRole, onRemove, onOpen, editing, t, title }) {
      const isMe = member.sessionId === sessionId
      const isOwner = member.sessionId === group.ownerSessionId
      return h("div", { className: "dsh-group-talk-l-member" },
        h("span", { className: "dsh-group-talk-l-member-icon" }, h(IconUserOutlineRegular, { size: 15 })),
        h("div", { className: "dsh-group-talk-l-member-text" },
          h("div", { className: "dsh-group-talk-l-member-name" },
            h("span", { className: "dsh-group-talk-l-member-alias" }, `@${member.alias}`),
            isOwner ? h(Tag, { tone: "info" }, t("ownerTag")) : null,
            isMe ? h(Tag, { tone: "outline" }, t("youTag")) : null),
          h("div", { className: "dsh-group-talk-l-member-meta" },
            `${member.role}${title ? ` · ${title}` : ""}${member.duties ? ` · ${member.duties}` : ""}`)),
        h("div", { className: "dsh-group-talk-l-member-actions" },
          h(IconButton, { label: t("openSession"), onClick: () => onOpen(member.sessionId) },
            h(IconRightUpOutlineRegular, { size: 14 })),
          group.me?.isOwner && group.status === "active"
            ? h(IconButton, { label: t("editRole"), onClick: () => onEditRole(member) },
                h(IconEditOutlineRegular, { size: 14 }))
            : null,
          group.me?.isOwner && group.status === "active" && !isOwner
            ? h(IconButton, { label: t("removeMember"), onClick: () => onRemove(member), danger: true },
                h(IconTrashOutlineRegular, { size: 14 }))
            : null))
    }

    function MessageRow({ message, t }) {
      if (message.kind === "system") {
        return h("div", { className: "dsh-group-talk-l-message dsh-group-talk-l-message-system" },
          h("div", { className: "dsh-group-talk-l-message-body" }, message.text))
      }
      const failed = message.deliveries.filter((delivery) => delivery.status === "failed")
      const delivered = message.deliveries.filter((delivery) => delivery.status === "delivered").length
      const unknown = message.deliveries.filter((delivery) => delivery.status === "unknown").length
      return h("div", { className: "dsh-group-talk-l-message" },
        h("div", { className: "dsh-group-talk-l-message-meta" },
          h("span", { className: "dsh-group-talk-l-message-author" }, `@${message.fromAlias ?? "?"}`),
          h("span", null, "→"),
          h("span", null, message.target ?? "*"),
          h("span", null, "·"),
          h("span", null, new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
          message.deliveries.length > 0
            ? h("span", { style: { marginLeft: "auto" } },
                failed.length > 0
                  ? `${delivered}/${message.deliveries.length} ${t("delivered")}`
                  : `${t("delivered")}${unknown > 0 ? ` · ${unknown} ${t("deliveryUnknown")}` : ""}`)
            : null),
        h("div", { className: "dsh-group-talk-l-message-body" }, message.text),
        failed.map((delivery) => h("div", { className: "dsh-group-talk-l-delivery-error", key: delivery.sessionId },
          `@${delivery.alias}: ${delivery.error ?? t("failed")}`)))
    }

    function EmptyState({ icon, title, text, action }) {
      return h("div", { className: "dsh-group-talk-l-empty" },
        h("span", { className: "dsh-group-talk-l-empty-icon" }, icon),
        h("div", { className: "dsh-group-talk-l-empty-title" }, title),
        h("div", { className: "dsh-group-talk-l-empty-text" }, text),
        action)
    }

    function GroupDetail({ group, sessionId, busy, notice, error, limits, usage, onSend, onEditRole, onRemoveMember, onOpen, onDissolve, onDelete, onAddMember, onLeave, onNudge, version, t, useSessions }) {
      const sessionsById = useSessions((state) => state.byId)
      const [target, setTarget] = useState("*")
      const [text, setText] = useState("")
      const [composing, setComposing] = useState(false)
      const [clock, setClock] = useState(Date.now())
      const messagesRef = useRef(null)
      const active = group.status === "active"
      const otherMembers = group.members.filter((member) => member.sessionId !== sessionId)
      const lastMessage = group.messages.at(-1)
      const waitingTarget = lastMessage?.kind === "message" && lastMessage.fromSessionId === sessionId && lastMessage.deliveries.some((delivery) => delivery.status === "delivered") && typeof lastMessage.target === "string" && lastMessage.target.startsWith("@")
        ? lastMessage.target
        : null
      const waiting = waitingTarget ?? (lastMessage?.kind === "message" && lastMessage.fromSessionId === sessionId && lastMessage.deliveries.some((delivery) => delivery.status === "delivered") && lastMessage.target === "*" ? t("allMembers") : null)
      useEffect(() => {
        if (!waiting) return undefined
        const timer = setInterval(() => setClock(Date.now()), 15000)
        return () => clearInterval(timer)
      }, [waiting])
      const nudgeAfter = limits?.replyNudgeAfterMs ?? 120000
      const canNudge = Boolean(waitingTarget && active && clock - (lastMessage?.at ?? clock) >= nudgeAfter)
      const roles = [...new Set(otherMembers.map((member) => member.role))]

      useEffect(() => {
        setTarget(otherMembers.length === 1 ? `@${otherMembers[0].alias}` : "*")
      }, [group.id, group.members.length])

      useEffect(() => {
        const node = messagesRef.current
        if (node) node.scrollTop = node.scrollHeight
      }, [group.messages.length])

      const send = () => {
        const value = text.trim()
        if (!value || busy === "send" || !active) return
        void onSend({ target, message: value }).then((ok) => {
          if (ok) setText("")
        })
      }

      const composer = h("div", { className: "dsh-group-talk-l-composer" },
        h("div", { className: "dsh-group-talk-l-composer-row" },
          h("span", { className: "dsh-group-talk-l-section-title" }, t("messageTo")),
          h("select", {
            className: "dsh-group-talk-l-select",
            value: target,
            onChange: (event) => setTarget(event.target.value),
            "aria-label": t("messageTo"),
          },
            h("option", { value: "*" }, t("allMembers")),
            otherMembers.map((member) => h("option", { key: `m-${member.sessionId}`, value: `@${member.alias}` },
              `@${member.alias} · ${member.role}`)),
            roles.map((role) => {
              const count = otherMembers.filter((member) => member.role === role).length
              return h("option", { key: `r-${role}`, value: `#${role}` }, `#${role} · ${count}`)
            })),
          h("span", { style: { flex: 1 } }),
          h(Button, {
            variant: "primary",
            size: "sm",
            icon: h(IconPaperPlaneOutlineRegular, { size: 14 }),
            disabled: !active || busy === "send" || text.trim().length === 0,
            onClick: send,
          }, busy === "send" ? t("sending") : t("send"))),
        h("textarea", {
          className: "dsh-group-talk-l-textarea",
          value: text,
          maxLength: limits?.maxMessageChars ?? 2000,
          placeholder: t("noMessages"),
          onChange: (event) => setText(event.target.value),
          onCompositionStart: () => setComposing(true),
          onCompositionEnd: () => setComposing(false),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent?.isComposing) {
              event.preventDefault()
              send()
            }
          },
          "aria-label": t("send"),
        }),
        h("div", { className: "dsh-group-talk-l-composer-hint" },
          group.me ? `@${group.me.alias} · ${group.me.role}` : "",
          active ? ` · /group @${otherMembers[0]?.alias ?? "alias"} <message>` : "",
          limits ? ` · ${format(t, "limitHint", {
            chars: limits.maxMessageChars,
            seconds: Math.ceil(limits.sendCooldownMs / 1000),
            recipients: limits.maxRecipientsPerSend,
          })}` : "",
          active ? ` · ${t("replyNote")}` : "",
          usage?.sender ? ` · ${format(t, "usageHint", {
            used: usage.sender.messages,
            limit: limits?.dailyMessagesPerSender ?? 0,
          })}` : ""))

      return h("div", { className: "dsh-group-talk-l-main" },
        h("div", { className: "dsh-group-talk-l-main-head" },
          h("div", { className: "dsh-group-talk-l-main-headtext" },
            h("h3", { className: "dsh-group-talk-l-main-title" }, group.name),
            h("p", { className: "dsh-group-talk-l-main-sub" },
              `${group.status === "active" ? t("active") : t("dissolved")} · ${format(t, "membersCount", { count: group.members.length })} · ${group.id}`),
            group.topic ? h("p", { className: "dsh-group-talk-l-main-sub" }, group.topic) : null),
          h("div", { className: "dsh-group-talk-l-head-actions" },
            group.me?.isOwner && active
              ? h(Button, { variant: "ghost", size: "sm", icon: h(IconPlusOutlineRegular, { size: 14 }), onClick: onAddMember }, t("addMember"))
              : null)),
        h(Notice, { kind: notice?.kind, text: notice?.text }),
        h(ErrorNotice, { text: error, t }),
        h("div", { className: "dsh-group-talk-l-section" },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("members")),
            group.me?.isOwner && active ? h("span", { className: "dsh-group-talk-l-field-hint" }, t("ownerOnly")) : null),
          h("div", { className: "dsh-group-talk-l-members" },
            group.members.map((member) => h(MemberRow, {
              key: member.sessionId,
              member,
              group,
              sessionId,
              onEditRole,
              onRemove: onRemoveMember,
              onOpen,
              title: sessionsById?.[member.sessionId]?.title || "",
              t,
            })))),
        h("div", { className: "dsh-group-talk-l-section", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("messagesCount", { count: group.messageTotal ?? group.messages.length }))),
          h("div", { className: "dsh-group-talk-l-messages", ref: messagesRef },
            group.messages.length === 0
              ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noMessages"))
              : group.messages.map((message) => h(MessageRow, { key: message.id, message, t })))),
        waiting ? h("div", { className: "dsh-group-talk-l-waiting" },
          canNudge
            ? format(t, "waitingLong", { target: waiting, minutes: Math.max(1, Math.round(nudgeAfter / 60000)) })
            : format(t, "waitingReply", { target: waiting }),
          canNudge ? h(Button, {
            variant: "outline",
            size: "sm",
            disabled: busy === "nudge",
            onClick: () => onNudge(waitingTarget),
          }, t("nudge")) : null) : null,
        active ? composer : h("div", { className: "dsh-group-talk-l-dissolved" }, t("readOnly")),
        group.me?.isOwner ? h("div", { className: "dsh-group-talk-l-form-actions" },
          h(Button, {
            variant: "outline",
            size: "sm",
            disabled: busy === "dissolve" || group.status !== "active",
            onClick: onDissolve,
          }, t("dissolve")),
          h(Button, {
            variant: "ghost",
            size: "sm",
            className: "dsh-group-talk-l-danger",
            icon: h(IconTrashOutlineRegular, { size: 14 }),
            disabled: busy === "delete",
            onClick: onDelete,
          }, t("delete")))
          : active ? h("div", { className: "dsh-group-talk-l-form-actions" },
            h(Button, {
              variant: "ghost",
              size: "sm",
              onClick: onLeave,
            }, t("leave"))) : null,
        version ? h("div", { className: "dsh-group-talk-l-version" }, `Group-Talk-L v${version}`) : null)
    }

    function SessionPickRow({ summary, checked, onToggle, fields, t, groupName }) {
      const id = sessionIdOf(summary)
      return h("div", { className: "dsh-group-talk-l-pick" },
        h(Checkbox, {
          checked,
          onChange: onToggle,
          label: h("span", { className: "dsh-group-talk-l-pick-main" },
            h("span", { className: "dsh-group-talk-l-pick-title" }, titleOf(summary)),
            h("span", { className: "dsh-group-talk-l-pick-meta" }, summary.cwd || id)),
        }),
        checked && fields ? h("div", { className: "dsh-group-talk-l-pick-fields" }, fields) : null)
    }

    function CreateForm({ sessionId, useSessions, onCreate, onCancel, busy, error, t }) {
      const [name, setName] = useState("")
      const [topic, setTopic] = useState("")
      const [ownerAlias, setOwnerAlias] = useState("owner")
      const [ownerRole, setOwnerRole] = useState(t("roleOwner"))
      const [selected, setSelected] = useState({})
      const [query, setQuery] = useState("")
      const [localError, setLocalError] = useState(null)
      const sessions = useSessionDirectory(useSessions, new Set([sessionId]))

      const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) return sessions
        return sessions.filter((summary) => {
          return `${titleOf(summary)} ${sessionIdOf(summary)} ${summary.cwd ?? ""}`.toLowerCase().includes(needle)
        })
      }, [sessions, query])

      const toggle = (summary) => {
        const id = sessionIdOf(summary)
        setSelected((current) => {
          if (current[id]) {
            const next = { ...current }
            delete next[id]
            return next
          }
          return {
            ...current,
            [id]: {
              alias: `member-${Object.keys(current).length + 1}`,
              role: t("roleDefault"),
            },
          }
        })
      }

      const submit = async () => {
        setLocalError(null)
        if (!name.trim()) {
          setLocalError(t("nameRequired"))
          return
        }
        const members = [
          { sessionId, alias: ownerAlias.trim(), role: ownerRole.trim() || t("roleOwner") },
          ...Object.entries(selected).map(([id, value]) => ({
            sessionId: id,
            alias: value.alias.trim(),
            role: value.role.trim() || t("roleDefault"),
          })),
        ]
        const aliases = new Set()
        for (const member of members) {
          const alias = member.alias.toLowerCase()
          if (!alias || aliases.has(alias)) {
            setLocalError(t("aliasRequired"))
            return
          }
          aliases.add(alias)
        }
        await onCreate({ name: name.trim(), topic: topic.trim(), members })
      }

      return h("div", { className: "dsh-group-talk-l-create" },
        h("div", { className: "dsh-group-talk-l-field" },
          h("span", { className: "dsh-group-talk-l-field-label" }, t("name")),
          h(Input, {
            value: name,
            placeholder: t("namePlaceholder"),
            onChange: (event) => setName(event.target.value),
            autoFocus: true,
            maxLength: 64,
          })),
        h("div", { className: "dsh-group-talk-l-field" },
          h("span", { className: "dsh-group-talk-l-field-label" }, t("topic")),
          h(Input, {
            value: topic,
            placeholder: t("topicPlaceholder"),
            onChange: (event) => setTopic(event.target.value),
            maxLength: 240,
          })),
        h("div", { className: "dsh-group-talk-l-card" },
          h("div", { className: "dsh-group-talk-l-card-title" },
            h(IconUserOutlineRegular, { size: 14 }),
            t("currentSession")),
          h("div", { className: "dsh-group-talk-l-field-row" },
            h(Input, { value: ownerAlias, onChange: (event) => setOwnerAlias(event.target.value), placeholder: t("alias"), "aria-label": t("alias") }),
            h(Input, { value: ownerRole, onChange: (event) => setOwnerRole(event.target.value), placeholder: t("role"), "aria-label": t("role") }))),
        h("div", { className: "dsh-group-talk-l-field" },
          h("span", { className: "dsh-group-talk-l-field-label" }, t("selectSessions")),
          h("span", { className: "dsh-group-talk-l-field-hint" }, t("createHint")),
          h("div", { className: "dsh-group-talk-l-picker" },
            h("div", { className: "dsh-group-talk-l-picker-head" },
              h(Input, {
                value: query,
                placeholder: t("searchSessions"),
                onChange: (event) => setQuery(event.target.value),
                icon: h(IconUsersOutlineRegular, { size: 14 }),
              })),
            h("div", { className: "dsh-group-talk-l-picker-list" },
              filtered.length === 0
                ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noSessions"))
                : filtered.map((summary) => {
                    const id = sessionIdOf(summary)
                    const selectedValue = selected[id]
                    return h(SessionPickRow, {
                      key: id,
                      summary,
                      checked: selectedValue !== undefined,
                      onToggle: () => toggle(summary),
                      t,
                      fields: selectedValue
                        ? [
                            h(Input, {
                              key: "alias",
                              value: selectedValue.alias,
                              placeholder: t("alias"),
                              onChange: (event) => setSelected((current) => ({
                                ...current,
                                [id]: { ...current[id], alias: event.target.value },
                              })),
                              "aria-label": t("alias"),
                            }),
                            h(Input, {
                              key: "role",
                              value: selectedValue.role,
                              placeholder: t("role"),
                              onChange: (event) => setSelected((current) => ({
                                ...current,
                                [id]: { ...current[id], role: event.target.value },
                              })),
                              "aria-label": t("role"),
                            }),
                          ]
                        : null,
                    })
                  })))),
        h(ErrorNotice, { text: localError, t }),
        h(ErrorNotice, { text: error, t }),
        h("div", { className: "dsh-group-talk-l-form-actions" },
          h(Button, { variant: "ghost", size: "sm", onClick: onCancel }, t("back")),
          h(Button, { variant: "primary", size: "sm", disabled: busy === "create", onClick: submit },
            busy === "create" ? t("creating") : t("createAction"))))
    }

    function RoleModal({ member, onSave, onClose, busy, error, t }) {
      const [role, setRole] = useState(member.role)
      const [duties, setDuties] = useState(member.duties ?? "")
      return h(Modal, {
        open: true,
        onClose,
        title: t("roleTitle"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: "primary",
            size: "sm",
            disabled: busy === "role" || !role.trim(),
            onClick: () => onSave({ role: role.trim(), duties: duties.trim() }),
          }, busy === "role" ? t("saving") : t("save"))),
      },
        h("div", { className: "dsh-group-talk-l-role-fields" },
          h(ErrorNotice, { text: error, t }),
          h("div", { className: "dsh-group-talk-l-field" },
            h("span", { className: "dsh-group-talk-l-field-label" }, t("role")),
            h(Input, {
              value: role,
              placeholder: t("rolePlaceholder"),
              onChange: (event) => setRole(event.target.value),
              maxLength: 48,
              autoFocus: true,
            })),
          h("div", { className: "dsh-group-talk-l-field" },
            h("span", { className: "dsh-group-talk-l-field-label" }, t("duties")),
            h("textarea", {
              className: "dsh-group-talk-l-textarea",
              value: duties,
              placeholder: t("dutiesPlaceholder"),
              onChange: (event) => setDuties(event.target.value),
              maxLength: 400,
            }))))
    }

    function ConfirmModal({ title, text, confirmLabel, danger, onConfirm, onClose, busy, error, t }) {
      return h(Modal, {
        open: true,
        onClose,
        title,
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: danger ? "ghost" : "primary",
            size: "sm",
            className: danger ? "dsh-group-talk-l-danger" : undefined,
            disabled: Boolean(busy),
            onClick: onConfirm,
          }, busy ? t("saving") : confirmLabel)),
      },
        h("div", { className: "dsh-group-talk-l-confirm" }, text),
        h(ErrorNotice, { text: error, t }))
    }

    function AddMemberModal({ group, sessionId, useSessions, onAdd, onClose, busy, error, t }) {
      const [query, setQuery] = useState("")
      const [picked, setPicked] = useState(null)
      const [alias, setAlias] = useState("")
      const [role, setRole] = useState(t("roleDefault"))
      const excluded = useMemo(() => new Set(group.members.map((member) => member.sessionId).concat(sessionId)), [group, sessionId])
      const sessions = useSessionDirectory(useSessions, excluded)
      const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) return sessions
        return sessions.filter((summary) => `${titleOf(summary)} ${sessionIdOf(summary)} ${summary.cwd ?? ""}`.toLowerCase().includes(needle))
      }, [sessions, query])

      const choose = (summary) => {
        const id = sessionIdOf(summary)
        setPicked(id)
        if (!alias || alias.startsWith("member-")) setAlias(`member-${group.members.length}`)
      }

      return h(Modal, {
        open: true,
        onClose,
        title: t("addMemberTitle"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: "primary",
            size: "sm",
            disabled: Boolean(busy) || !picked || !alias.trim(),
            onClick: () => onAdd({ sessionId: picked, alias: alias.trim(), role: role.trim() || t("roleDefault") }),
          }, busy ? t("adding") : t("add"))),
      },
        h("div", { className: "dsh-group-talk-l-create", style: { maxHeight: "420px" } },
          h(ErrorNotice, { text: error, t }),
          h("div", { className: "dsh-group-talk-l-field-row" },
            h(Input, {
              value: alias,
              placeholder: t("alias"),
              onChange: (event) => setAlias(event.target.value),
              "aria-label": t("alias"),
            }),
            h(Input, {
              value: role,
              placeholder: t("role"),
              onChange: (event) => setRole(event.target.value),
              "aria-label": t("role"),
            })),
          h("div", { className: "dsh-group-talk-l-picker" },
            h("div", { className: "dsh-group-talk-l-picker-head" },
              h(Input, {
                value: query,
                placeholder: t("searchSessions"),
                onChange: (event) => setQuery(event.target.value),
              })),
            h("div", { className: "dsh-group-talk-l-picker-list" },
              filtered.length === 0
                ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noSessions"))
                : filtered.map((summary) => h("button", {
                    type: "button",
                    key: sessionIdOf(summary),
                    className: picked === sessionIdOf(summary)
                      ? "dsh-group-talk-l-row dsh-group-talk-l-row-active"
                      : "dsh-group-talk-l-row",
                    onClick: () => choose(summary),
                  },
                    h("span", { className: "dsh-group-talk-l-pick-title" }, titleOf(summary)),
                    h("span", { className: "dsh-group-talk-l-pick-meta" }, summary.cwd || sessionIdOf(summary))))))))
    }

    function GroupCenter({ open, onClose, sessionId, launch, useSessions, openSession, t }) {
      const [groups, setGroups] = useState([])
      const [limits, setLimits] = useState(null)
      const [usage, setUsage] = useState(null)
      const [version, setVersion] = useState(null)
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState(null)
      const [notice, setNotice] = useState(null)
      const [selectedId, setSelectedId] = useState(null)
      const [view, setView] = useState("groups")
      const [busy, setBusy] = useState("")
      const [confirm, setConfirm] = useState(null)
      const [roleMember, setRoleMember] = useState(null)
      const [addOpen, setAddOpen] = useState(false)
      const sequence = useRef(0)
      const inflight = useRef(false)

      const load = useCallback(async (silent = false) => {
        if (inflight.current) return
        inflight.current = true
        const id = ++sequence.current
        if (!silent) setLoading(true)
        setError(null)
        try {
          const data = await api("GET", sessionId)
          if (sequence.current !== id) return
          setGroups(Array.isArray(data?.groups) ? data.groups : [])
          setLimits(data?.limits ?? null)
          setUsage(data?.usage ?? null)
          setVersion(typeof data?.version === "string" ? data.version : null)
        } catch (reason) {
          if (sequence.current !== id) return
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          inflight.current = false
          if (sequence.current === id) setLoading(false)
        }
      }, [sessionId])

      useEffect(() => {
        if (!open) return undefined
        void load()
        const timer = setInterval(() => {
          if (!document.hidden) void load(true)
        }, 8000)
        return () => clearInterval(timer)
      }, [open, load])

      useEffect(() => {
        if (!open) return
        setView(launch?.view === "create" ? "create" : "groups")
        setError(null)
        setNotice(null)
      }, [open, sessionId, launch?.token, launch?.view])

      useEffect(() => {
        if (!open || groups.length === 0) {
          if (groups.length === 0) setSelectedId(null)
          return
        }
        if (!selectedId || !groups.some((group) => group.id === selectedId)) {
          setSelectedId(groups[0].id)
        }
      }, [open, groups, selectedId])

      const group = groups.find((entry) => entry.id === selectedId) ?? null

      const run = async (key, operation) => {
        setBusy(key)
        setError(null)
        setNotice(null)
        try {
          return await operation()
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
          return null
        } finally {
          setBusy("")
        }
      }

      const create = async (draft) => {
        return await run("create", async () => {
          const data = await api("POST", sessionId, { action: "create", ...draft })
          setView("groups")
          setNotice({ kind: "success", text: t("createdDone") })
          if (data?.group?.id) setSelectedId(data.group.id)
          await load(true)
          return true
        })
      }

      const send = async ({ target, message }) => {
        if (!group) return false
        return Boolean(await run("send", async () => {
          const data = await api("POST", sessionId, {
            action: "send",
            group: group.id,
            target,
            message,
          })
          if (data?.deduplicated) {
            setNotice({ kind: "success", text: t("deduplicated") })
            await load(true)
            return true
          }
          const failures = (data?.deliveries ?? []).filter((delivery) => delivery.status === "failed")
          if (failures.length > 0) {
            setNotice({
              kind: "error",
              text: format(t, "sendPartial", { names: failures.map((item) => `@${item.alias}`).join(", ") }),
            })
          } else {
            setNotice({ kind: "success", text: t("sent") })
          }
          await load(true)
          return true
        }))
      }

      const nudge = async (target) => {
        if (!group || typeof target !== "string" || !target.startsWith("@")) return false
        const message = format(t, "nudgeMessage", { group: group.name, me: `@${group.me?.alias ?? "owner"}` })
        const ok = await send({ target, message })
        return Boolean(ok)
      }

      const saveRole = async ({ role, duties }) => {
        if (!group || !roleMember) return
        const ok = await run("role", async () => {
          await api("POST", sessionId, {
            action: "setRole",
            group: group.id,
            member: roleMember.sessionId,
            role,
            duties,
          })
          setNotice({ kind: "success", text: t("roleSaved") })
          setRoleMember(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const removeMember = async () => {
        if (!group || !confirm?.member) return
        const member = confirm.member
        const ok = await run("remove", async () => {
          await api("POST", sessionId, { action: "removeMember", group: group.id, member: member.sessionId })
          setNotice({ kind: "success", text: t("memberRemoved") })
          setConfirm(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const dissolve = async () => {
        if (!group) return
        const ok = await run("dissolve", async () => {
          await api("POST", sessionId, { action: "dissolve", group: group.id })
          setNotice({ kind: "success", text: t("dissolvedDone") })
          setConfirm(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const removeGroup = async () => {
        if (!group) return
        const ok = await run("delete", async () => {
          await api("POST", sessionId, { action: "delete", group: group.id })
          setNotice({ kind: "success", text: t("deletedDone") })
          setConfirm(null)
          setSelectedId(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const leaveGroup = async () => {
        if (!group) return
        const ok = await run("leave", async () => {
          await api("POST", sessionId, { action: "leave", group: group.id })
          setNotice({ kind: "success", text: t("leaveDone") })
          setConfirm(null)
          setSelectedId(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const addMember = async ({ sessionId: memberSessionId, alias, role }) => {
        if (!group) return
        const ok = await run("add", async () => {
          await api("POST", sessionId, {
            action: "addMember",
            group: group.id,
            memberSessionId,
            alias,
            role,
          })
          setNotice({ kind: "success", text: t("added") })
          setAddOpen(false)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const close = () => onClose()

      const body = view === "create"
        ? h(CreateForm, {
            sessionId,
            useSessions,
            onCreate: create,
            onCancel: () => setView("groups"),
            busy,
            error,
            t,
          })
        : h("div", { className: "dsh-group-talk-l-shell" },
            h(GroupList, {
              groups,
              selectedId,
              loading,
              error,
              onSelect: (id) => {
                setSelectedId(id)
                setNotice(null)
                setError(null)
              },
              onCreate: () => setView("create"),
              onRetry: () => { void load() },
              t,
            }),
            group
              ? h(GroupDetail, {
                  group,
                  sessionId,
                  busy,
                  notice,
                  error,
                  limits,
                  usage,
                  onSend: send,
                  onEditRole: setRoleMember,
                  onRemoveMember: (member) => setConfirm({ kind: "remove", member }),
                  onOpen: (id) => {
                    try {
                      openSession(id)
                      onClose()
                    } catch (reason) {
                      setError(reason instanceof Error ? reason.message : String(reason))
                    }
                  },
                  onDissolve: () => setConfirm({ kind: "dissolve" }),
                  onDelete: () => setConfirm({ kind: "delete" }),
                  onAddMember: () => setAddOpen(true),
                  onLeave: () => setConfirm({ kind: "leave" }),
                  onNudge: nudge,
                  version,
                  t,
                  useSessions,
                })
              : h("div", { className: "dsh-group-talk-l-main" },
                  h(EmptyState, {
                    icon: h(IconUsersOutlineRegular, { size: 32 }),
                    title: groups.length === 0 ? t("emptyTitle") : t("noSelection"),
                    text: groups.length === 0 ? t("emptyText") : t("help"),
                    action: groups.length === 0
                      ? h(Button, { variant: "primary", size: "sm", icon: h(IconPlusOutlineRegular, { size: 14 }), onClick: () => setView("create") }, t("create"))
                      : null,
                  })))

      return h(React.Fragment, null,
        h(Modal, {
          open,
          onClose: close,
          title: view === "create" ? t("createTitle") : t("title"),
          closeLabel: t("close"),
          className: "dsh-group-talk-l-modal",
        }, body),
        roleMember ? h(RoleModal, {
          member: roleMember,
          onSave: saveRole,
          onClose: () => setRoleMember(null),
          busy,
          error,
          t,
        }) : null,
        confirm ? h(ConfirmModal, {
          title: confirm.kind === "delete" ? t("deleteTitle") : confirm.kind === "dissolve" ? t("dissolveTitle") : confirm.kind === "leave" ? t("leaveTitle") : t("removeTitle"),
          text: confirm.kind === "delete" ? t("deleteText") : confirm.kind === "dissolve" ? t("dissolveText") : confirm.kind === "leave" ? t("leaveText") : t("removeText"),
          confirmLabel: confirm.kind === "delete" ? t("confirmDelete") : confirm.kind === "dissolve" ? t("confirmDissolve") : confirm.kind === "leave" ? t("confirmLeave") : t("confirmRemove"),
          danger: confirm.kind === "delete" || confirm.kind === "remove",
          onConfirm: confirm.kind === "delete" ? removeGroup : confirm.kind === "dissolve" ? dissolve : confirm.kind === "leave" ? leaveGroup : removeMember,
          onClose: () => setConfirm(null),
          busy: confirm.kind === "delete" ? busy === "delete" : confirm.kind === "dissolve" ? busy === "dissolve" : confirm.kind === "leave" ? busy === "leave" : busy === "remove",
          error,
          t,
        }) : null,
        addOpen && group ? h(AddMemberModal, {
          group,
          sessionId,
          useSessions,
          onAdd: addMember,
          onClose: () => setAddOpen(false),
          busy: busy === "add",
          error,
          t,
        }) : null)
    }

    /** Header action: a native sm ghost button that opens the group center. */
    function GroupTalkLAction({ sessionId, useSessions, useSession, openSession, t }) {
      const [open, setOpen] = useState(false)
      const [launch, setLaunch] = useState({ view: "groups", token: 0 })
      // The projection uses `null` for an ordinary session; only a non-null
      // subagent address identifies a delegated conversation.
      const isSubagent = useSession((snapshot) => Boolean(snapshot?.subagent))
      useEffect(() => {
        const createGroup = () => {
          setLaunch((current) => ({ view: "create", token: current.token + 1 }))
          setOpen(true)
        }
        window.addEventListener("group-talk-l:create", createGroup)
        return () => window.removeEventListener("group-talk-l:create", createGroup)
      }, [])
      if (isSubagent) return null
      return h("div", { className: "dsh-group-talk-l-root", "data-group-talk-l": true },
        h("button", {
          type: "button",
          "data-group-talk-l-create": true,
          tabIndex: -1,
          "aria-hidden": "true",
          style: { display: "none" },
          onClick: () => {
            setLaunch((current) => ({ view: "create", token: current.token + 1 }))
            setOpen(true)
          },
        }),
        h(Button, {
          variant: "ghost",
          size: "sm",
          className: "dsh-group-talk-l-trigger",
          icon: h(IconUsersOutlineRegular, { size: 14 }),
          "aria-label": t("trigger"),
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          onClick: () => {
            setLaunch((current) => ({ view: "groups", token: current.token + 1 }))
            setOpen(true)
          },
        }, h("span", { className: "dsh-group-talk-l-trigger-label" }, t("trigger"))),
        h(GroupCenter, {
          open,
          onClose: () => setOpen(false),
          sessionId,
          launch,
          useSessions,
          openSession,
          t,
        }))
    }

    /** Mark delivered group bubbles so a normal chat is visually distinct. */
    function installIncomingGroupMarkers() {
      if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {}
      let frame = 0
      const decorate = () => {
        frame = 0
        const rows = document.querySelectorAll('[class*="userRow"]')
        for (const row of rows) {
          if (!(row.textContent ?? "").trimStart().startsWith("【群聊 / Group chat】")) continue
          row.classList.add("dsh-group-talk-l-incoming-row")
          const stack = row.querySelector('[class*="userStack"]')
          if (!stack || stack.querySelector(".dsh-group-talk-l-incoming-badge")) continue
          const badge = document.createElement("span")
          badge.className = "dsh-group-talk-l-incoming-badge"
          badge.textContent = "群聊 · Group-Talk-L"
          stack.prepend(badge)
        }
      }
      const schedule = () => {
        if (frame !== 0) return
        frame = requestAnimationFrame(decorate)
      }
      const observer = new MutationObserver(schedule)
      observer.observe(document.body, { childList: true, subtree: true })
      schedule()
      return () => {
        observer.disconnect()
        if (frame !== 0) cancelAnimationFrame(frame)
        for (const row of document.querySelectorAll(".dsh-group-talk-l-incoming-row")) {
          row.classList.remove("dsh-group-talk-l-incoming-row")
          row.querySelector(".dsh-group-talk-l-incoming-badge")?.remove()
        }
      }
    }

    /**
     * The sidebar has no additive slot for its "工作区 / Workspaces" label, so
     * this decorates that exact header with one small native-looking button.
     * The button only dispatches an intent; the mounted session header owns the
     * modal and knows the current session id.
     */
    function installWorkspaceCreateButton() {
      if (typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") {
        return () => {}
      }
      const labels = new Set(["工作区", "Workspaces", "会话", "Sessions"])
      let frame = 0
      let button
      const findLabel = () => {
        for (const span of document.querySelectorAll("span")) {
          if (!labels.has((span.textContent ?? "").trim())) continue
          if (!String(span.className).includes("sectionLabel")) continue
          if (!String(span.parentElement?.className ?? "").includes("sectionHeader")) continue
          return span
        }
        return undefined
      }
      const decorate = () => {
        frame = 0
        if (button?.isConnected && labels.has((button.previousElementSibling?.textContent ?? "").trim())) return
        const label = findLabel()
        if (!label) {
          if (button) button.remove()
          button = undefined
          return
        }
        const parent = label.parentElement
        if (!parent) return
        const existing = parent.querySelector(":scope > .dsh-group-talk-l-workspace-create")
        if (existing) {
          button = existing
          return
        }
        if (button) button.remove()
        button = document.createElement("button")
        button.type = "button"
        button.className = "dsh-group-talk-l-workspace-create"
        button.dataset.plugin = "@local/group-talk-l"
        button.setAttribute("aria-label", "Group-Talk-L · 新建群聊")
        button.title = "Group-Talk-L · 新建群聊"
        button.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.25 8.9a2.65 2.65 0 1 0 0-5.3 2.65 2.65 0 0 0 0 5.3Z" stroke="currentColor" stroke-width="1.6"/><path d="M2.8 16.1c0-2.46 2-4.46 4.45-4.46h1.1c.78 0 1.52.2 2.15.55" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.7 10.7v6M11.7 13.7h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
        button.addEventListener("click", (event) => {
          event.preventDefault()
          event.stopPropagation()
          const direct = document.querySelector("[data-group-talk-l-create]")
          if (direct) {
            direct.click()
            return
          }
          window.dispatchEvent(new CustomEvent("group-talk-l:create"))
        })
        label.insertAdjacentElement("afterend", button)
      }
      const schedule = () => {
        if (frame) return
        frame = requestAnimationFrame(decorate)
      }
      const observer = new MutationObserver(schedule)
      observer.observe(document.body, { childList: true, subtree: true })
      schedule()
      return () => {
        observer.disconnect()
        if (frame) cancelAnimationFrame(frame)
        if (button) button.remove()
      }
    }

    const inject = ["sessions", "uiWorkspace", "slots", "locale"]

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "group-talk-l: locale dictionaries")
      ctx.effect(() => {
        const tag = document.createElement("style")
        tag.dataset.plugin = "@local/group-talk-l"
        tag.dataset.pluginCss = "@local/group-talk-l/panel.css"
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => { tag.remove() }
      }, "group-talk-l: panel stylesheet")
      ctx.effect(() => installWorkspaceCreateButton(), "group-talk-l: workspace header shortcut")
      ctx.effect(() => installIncomingGroupMarkers(), "group-talk-l: group message markers")
      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
        name: "conversation.session.header.actions",
        id: "group-talk-l",
        order: -12,
        locale: NS,
        inject: () => ({
          openSession: (id) => ctx.uiWorkspace.openSession(id),
        }),
      }, GroupTalkLAction))
    }

    exports.name = "group-talk-l"
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
