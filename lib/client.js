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
.dsh-group-talk-l-trigger-wrap { position: relative; display: inline-flex; align-items: center; }
.dsh-group-talk-l-unread-dot { position: absolute; top: 1px; right: -1px; width: 7px; height: 7px; border-radius: 999px; background: var(--dsw-alias-state-business-primary); box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1); pointer-events: none; }
.dsh-group-talk-l-row-unread { flex: none; min-width: 17px; height: 17px; padding: 0 5px; border-radius: 999px; background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-on-business, #fff); font-size: 10px; line-height: 17px; text-align: center; font-variant-numeric: tabular-nums; }
.dsh-group-talk-l-workspace-create { box-sizing: border-box; display: inline-flex; flex: none; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: 2px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; pointer-events: auto; position: relative; z-index: 1; }
.dsh-group-talk-l-workspace-create:hover, .dsh-group-talk-l-workspace-create:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-workspace-create:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
[class*="sectionLabelHidden"] + .dsh-group-talk-l-workspace-create { display: none; }
@container (max-width: 480px) { .dsh-group-talk-l-trigger-label { display: none; } }
.dsh-group-talk-l-page { height: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.dsh-group-talk-l-page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px 10px; border-bottom: .5px solid var(--dsw-alias-border-l2); flex: none; }
.dsh-group-talk-l-page-title { display: flex; flex-direction: column; gap: 2px; color: var(--dsw-alias-label-primary); font-size: 15px; line-height: 20px; font-weight: 500; }
.dsh-group-talk-l-page-sub { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; font-weight: 400; }
.dsh-group-talk-l-page-notice { display: flex; align-items: flex-start; gap: 6px; margin: 10px 18px 0; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-page-body { flex: 1; min-height: 0; display: flex; padding: 14px 18px 18px; }
.dsh-group-talk-l-page-body > .dsh-group-talk-l-shell { flex: 1; max-height: none; min-height: 0; height: 100%; }
.dsh-group-talk-l-page-body > .dsh-group-talk-l-create { flex: 1; max-height: none; }
.dsh-group-talk-l-panel-icon { position: relative; display: inline-flex; align-items: center; justify-content: center; color: inherit; }
.dsh-group-talk-l-panel-icon .dsh-group-talk-l-unread-dot { top: -1px; right: -3px; box-shadow: 0 0 0 2px var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base)); }
.dsh-group-talk-l-message { max-width: 86%; }
.dsh-group-talk-l-message-self { align-self: flex-end; background: var(--dsw-alias-bg-layer-1); border: .5px solid var(--dsw-alias-border-l2); }
.dsh-group-talk-l-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-group-talk-l-chip { border: .5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 3px 10px; font-size: 12px; line-height: 18px; cursor: pointer; }
.dsh-group-talk-l-chip:hover, .dsh-group-talk-l-chip:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-chip-active { border-color: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-pick-duty { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-at { min-width: 26px; padding: 0 6px; font-weight: 600; }
.dsh-group-talk-l-target { position: relative; display: inline-flex; }
.dsh-group-talk-l-target-button { white-space: nowrap; }
.dsh-group-talk-l-caret { margin-left: 4px; color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-pop-overlay { position: fixed; inset: 0; z-index: 40; }
.dsh-group-talk-l-target-menu { position: absolute; z-index: 41; top: calc(100% + 4px); left: 0; min-width: 210px; max-height: 280px; overflow-y: auto; padding: 4px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); box-shadow: 0 10px 30px rgba(0, 0, 0, .18), var(--dsw-elevation-stroke, 0 0 0 .5px var(--dsw-alias-border-l2)); }
.dsh-group-talk-l-target-menu button { display: flex; width: 100%; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; padding: 6px 8px; border-radius: 6px; text-align: left; cursor: pointer; }
.dsh-group-talk-l-target-menu button:hover, .dsh-group-talk-l-target-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-modal { width: min(880px, 100%); max-height: 100%; }
.dsh-group-talk-l-shell { display: flex; min-height: 420px; max-height: min(640px, calc(100vh - 220px)); gap: 18px; }
.dsh-group-talk-l-sidebar { width: 224px; flex: none; display: flex; flex-direction: column; gap: 10px; min-height: 0; border-right: .5px solid var(--dsw-alias-border-l2); padding-right: 14px; }
.dsh-group-talk-l-sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px; }
.dsh-group-talk-l-sidebar-title { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-list { display: flex; flex-direction: column; gap: 4px; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; padding-right: 2px; }
.dsh-group-talk-l-list-empty { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 8px 2px; }
.dsh-group-talk-l-row { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; border: 0; border-left: 2px solid transparent; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); padding: 8px 9px; cursor: pointer; }
.dsh-group-talk-l-row:hover, .dsh-group-talk-l-row:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-row-active { background: var(--dsw-alias-interactive-bg-hover); border-left-color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-group-talk-l-row-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; }
.dsh-group-talk-l-row-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-main { min-width: 0; flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.dsh-group-talk-l-main-head { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px 10px; padding: 0 2px 12px; flex: none; }
.dsh-group-talk-l-main-headtext { min-width: 0; flex: 1; }
.dsh-group-talk-l-main-title { margin: 0; color: var(--dsw-alias-label-primary); font-size: 15px; line-height: 23px; font-weight: 500; overflow-wrap: anywhere; }
.dsh-group-talk-l-main-sub { margin: 3px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dsh-group-talk-l-head-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; flex: none; max-width: 62%; }
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
.dsh-group-talk-l-messages { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 8px; padding: 2px 4px 4px 2px; scrollbar-gutter: stable; }
.dsh-group-talk-l-message { display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); max-width: 100%; overflow: hidden; flex: none; }
.dsh-group-talk-l-message-system { background: transparent; box-shadow: none; padding: 2px 4px; }
.dsh-group-talk-l-message-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-message-author { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dsh-group-talk-l-message-body { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 100%; }
.dsh-group-talk-l-message-toggle { border: 0; background: transparent; color: var(--dsw-alias-state-business-primary); cursor: pointer; padding: 2px 0; font-size: 11px; line-height: 16px; text-align: left; }
.dsh-group-talk-l-message-tools { display: flex; flex-wrap: wrap; gap: 10px; }
.dsh-group-talk-l-message-toggle:focus-visible, .dsh-group-talk-l-collapse:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; border-radius: 3px; }
.dsh-group-talk-l-priority { display: inline-flex; align-items: center; border-radius: 999px; padding: 0 6px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 16px; }
.dsh-group-talk-l-priority-urgent { color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-state-error-primary)); background: var(--dsw-alias-bg-layer-2); }
.dsh-group-talk-l-role { display: inline-flex; align-items: center; border-radius: 999px; padding: 0 6px; font-size: 10px; line-height: 16px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); white-space: nowrap; }
.dsh-group-talk-l-role-organizer { color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-role-security { color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-state-error-primary)); }
.dsh-group-talk-l-role-secretary { color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-audit-mark { font-size: 10px; color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-tertiary)); }
.dsh-group-talk-l-member-alias { overflow-wrap: anywhere; min-width: 0; }
.dsh-group-talk-l-message-system .dsh-group-talk-l-message-body { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-delivery-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-composer { border-top: .5px solid var(--dsw-alias-border-l2); margin-top: 10px; padding: 10px 2px 0; display: flex; flex-direction: column; gap: 7px; flex: none; }
.dsh-group-talk-l-composer-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
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
.dsh-group-talk-l-form-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; border-top: .5px solid var(--dsw-alias-border-l2); padding-top: 12px; flex: none; }
.dsh-group-talk-l-modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.dsh-group-talk-l-role-fields { display: flex; flex-direction: column; gap: 10px; }
.dsh-group-talk-l-confirm { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dsh-group-talk-l-danger { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-collapse { border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; padding: 0; font-size: 14px; line-height: 18px; }
.dsh-group-talk-l-collapse:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-collapse:hover { color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-row-preview { display: block; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.dsh-group-talk-l-message-control { border-left: 2px solid var(--dsw-alias-state-warning-primary, var(--dsw-alias-border-l2)); background: var(--dsw-alias-bg-layer-2); border-radius: 4px; padding: 8px 10px; }
.dsh-group-talk-l-message-control .dsh-group-talk-l-message-author { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dsh-group-talk-l-pinned { color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-mode { max-width: 150px; }
@media (max-width: 760px) {
  .dsh-group-talk-l-shell { flex-direction: column; }
  .dsh-group-talk-l-sidebar { width: 100%; border-right: 0; border-bottom: .5px solid var(--dsw-alias-border-l2); padding: 0 0 10px; }
  .dsh-group-talk-l-list { max-height: 180px; }
  .dsh-group-talk-l-head-actions { max-width: 100%; }
}
.dsh-group-talk-l-pin-mark { position: absolute; top: -6px; right: 1px; width: 6px; height: 6px; border-radius: 99px; background: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-panel-icon { position: relative; }
.dsh-group-talk-l-audit .dsh-group-talk-l-messages { border: .5px solid var(--dsw-alias-border-l2); border-radius: 9px; padding: 10px; }
.dsh-group-talk-l-audit-modal .dsh-group-talk-l-main { min-height: 420px; max-height: min(640px, calc(100vh - 180px)); overflow-y: auto; }
.dsh-group-talk-l-audit-failures { display: flex; flex-direction: column; gap: 6px; }
.dsh-group-talk-l-crash { align-items: center; justify-content: center; }
`

    const zh = {
      trigger: "群聊",
      title: "群聊",
      loading: "正在加载群聊…",
      loadFailed: "无法加载群聊：",
      retry: "重试",
      panelCrashed: "群聊面板遇到错误",
      panelCrashedHint: "面板已保留，不会把你丢回普通对话。可以重试，或返回对话。",
      system: "系统",
      emptyTitle: "还没有群聊",
      emptyText: "选择几个已有会话，让它们在不合并对话的前提下互相发消息。",
      create: "新建群聊",
      createTitle: "新建群聊",
      name: "群聊名称",
      namePlaceholder: "例如：发布评审",
      topic: "主题（可选）",
      topicPlaceholder: "这组会话要一起完成什么？",
      members: "参与者",
      addMember: "添加参与者",
      removeMember: "移除参与者",
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
      ownerOnly: "只有主持人可以管理成员与群聊。",
      hostHint: "你可以管理参与者与群聊。",
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
      aliasRequired: "请为每个成员填写唯一别名。",
      nameRequired: "请填写群聊名称。",
      addMemberTitle: "添加成员",
      removeTitle: "移除参与者？",
      removeText: "该会话会立即离开这个群聊。",
      confirmRemove: "移除",
      removeFailed: "移除失败：",
      added: "已添加参与者。",
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
      roleDefault: "参与者",
      roleOwner: "主持人",
      you: "你",
      participantsCount: "{count} 位参与者",
      panelSubtitle: "像普通对话一样和参与者交流",
      backToChat: "返回对话",
      createHint2: "你是主持人；参与者是已有会话。每位参与者会让此后每次请求多约 800–1200 token 的群聊说明。",
      selectParticipants: "选择参与者",
      roleCustom: "自定义",
      roleLabel: "角色",
      noParticipants: "至少选择一位参与者。",
      sendTo: "发送给",
      allParticipants: "全部参与者",
      role_designer: "设计师",
      role_judge: "评委",
      role_researcher: "研究员",
      role_experimenter: "实验员",
      role_secretary: "秘书",
      role_organizer: "组织者",
      role_security: "安全主管",
      duties_designer: "负责视觉、版式、交互与观感细节",
      duties_judge: "独立评审、打分并明确指出问题",
      duties_researcher: "负责思考，提供理论基础与可执行计划",
      duties_experimenter: "像实验对象一样先试，给出一手反馈",
      duties_secretary: "记录信息、撰写日志与回退记录，纠正群内潜在的错误信息",
      duties_organizer: "安排工作、维持信息秩序、综合调度任务，防止冲突、洪水和错误",
      duties_security: "审查委派、权限、密钥与提示注入风险，提出否决/整改建议并记录安全审计",
      composerPlaceholder: "输入消息，Enter 发送，Shift+Enter 换行",
      audit: "审计",
      hideGroupList: "收起群列表",
      showGroupList: "展开群列表",
      collapseMembers: "收起参与者",
      expandMembers: "展开参与者",
      auditTitle: "群聊审计",
      delegationLog: "子代理委派记录",
      noDelegations: "还没有委派记录。组织者发起后，这里按 taskId 显示 started/completed/failed。",
      auditEmpty: "暂无审计记录。委派、秘书记录和人类操作会显示在这里。",
      controlNote: "记录",
      controlDelegate: "子代理委派",
      controlStarted: "已开始",
      controlCompleted: "已完成",
      controlFailed: "失败",
      keepOpen: "保持打开",
      keepOpenOn: "已保持打开",
      keepOpenOff: "取消保持",
      humanPriority: "人类优先",
      deliveryMode: "发送方式",
      modeQueue: "排队（不打断）",
      modeSteer: "插话（step 边界）",
      modeHint: "排队等对方本轮结束；插话在下一个 step 边界插入，不中止当前工具。",
      priority: "优先级",
      priorityAmbient: "通知（不打断）",
      priorityUrgent: "紧急（step 边界）",
      priorityHint: "通知：不改变当前计划，等当前回合后再读；紧急：下一个 step 边界优先处理。两者都不中止正在运行的工具。",
      priorityUnsupported: "当前 Host 不支持 priority；重启加载 2.1 后启用。",
      priorityAmbientShort: "环境消息 · 本轮后读取",
      priorityUrgentShort: "下一步优先 · 不中断当前工具",
      copyFull: "复制全文",
      copied: "已复制",
      auditRecord: "审计记录 · 非指令",
      expandGroups: "展开群聊",
      collapseGroups: "收起群聊",
      emptyRoomHint: "房间已创建；还没有参与者。点右上角「添加参与者」随时拉人。",
      subagent: "子代理",
      delegationNote: "组织者可委派子代理；子代理不会入群、拿不到群工具，全过程有审计。",
      delegate: "委派子代理",
      delegateTitle: "委派一个子代理任务",
      delegateTask: "任务说明",
      delegateTaskPlaceholder: "写清目标、输入、验收标准和禁止事项；子代理看不到群工具。",
      delegateLabel: "短标签（可选）",
      delegateStart: "开始委派",
      delegating: "委派中…",
      delegatedDone: "子代理任务已完成，结果已记入审计。",
      delegateHint: "只有组织者/主持人能执行；子代理不入群、不能继续委派，有超时和审计。",
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
      memberRemoved: "参与者已移除。",
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
      nudgeMessage: "提醒：群聊「{group}」里有消息还在等待你的回复。请用 group_talk_send 发到群里（target 用 *），或说明你暂时无法回复。",
      openTarget: "打开对方会话",
      unreadCount: "{count} 条未读",
      unreadTrigger: "群聊 · {count} 条未读",
      replyNote: "成员需用群聊工具显式回复",
      busy: "忙碌",
      expandMessage: "展开全文",
      collapseMessage: "收起",
      idle: "空闲",
      roomOnly: "群面板可见",
      humanHost: "人类群主 {alias} · 仅面板可见",
      legacyHostWarning: "Host 版本 v{version} 低于 2.0.1：@human / owner 只写入群记录，不会唤醒会话。请重启 Harness 加载 2.0.1+。",
      hostOutdated: "Host 版本 v{version} 低于 client 2.2.0：委派、control 行和 2.2 人类 envelope 需要重启 Harness 才会加载。",
      recordedToHuman: "已写入群记录：{name} 是 UI-only 操作者，不会唤醒会话（旧 Host 无法投递）。",
    }

    const en = {
      trigger: "Group chat",
      title: "Group chat",
      loading: "Loading group chats…",
      loadFailed: "Could not load group chats: ",
      retry: "Retry",
      panelCrashed: "The group panel hit an error",
      panelCrashedHint: "The panel is kept here instead of dropping you into a conversation. Retry, or go back to chat.",
      system: "System",
      emptyTitle: "No group chats yet",
      emptyText: "Pick a few existing sessions and let them message each other without merging their conversations.",
      create: "New group chat",
      createTitle: "New group chat",
      name: "Group chat name",
      namePlaceholder: "e.g. Release review",
      topic: "Topic (optional)",
      topicPlaceholder: "What are these sessions working on?",
      members: "Participants",
      addMember: "Add participant",
      removeMember: "Remove participant",
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
      ownerOnly: "Only the host can manage members and the group chat.",
      hostHint: "You can manage participants and the room.",
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
      aliasRequired: "Give every member a unique alias.",
      nameRequired: "Enter a group chat name.",
      addMemberTitle: "Add member",
      removeTitle: "Remove this participant?",
      removeText: "This session will immediately leave the group chat.",
      confirmRemove: "Remove",
      removeFailed: "Remove failed: ",
      added: "Participant added.",
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
      roleDefault: "Participant",
      roleOwner: "Host",
      you: "You",
      participantsCount: "{count} participants",
      panelSubtitle: "Talk to participants like an ordinary conversation",
      backToChat: "Back to chat",
      createHint2: "You are the host; participants are existing sessions. Each participant adds roughly 800–1200 tokens to every subsequent request.",
      selectParticipants: "Select participants",
      roleCustom: "Custom",
      roleLabel: "Role",
      noParticipants: "Select at least one participant.",
      sendTo: "Send to",
      allParticipants: "All participants",
      role_designer: "Designer",
      role_judge: "Judge",
      role_researcher: "Researcher",
      role_experimenter: "Experimenter",
      role_secretary: "Secretary",
      role_organizer: "Organizer",
      role_security: "Security Lead",
      duties_designer: "Owns visual direction, layout and interaction detail",
      duties_judge: "Reviews independently, scores the work and names concrete problems",
      duties_researcher: "Thinks through the problem, supplies the theory and an executable plan",
      duties_experimenter: "Acts as the test subject and reports first-hand results",
      duties_secretary: "Records minutes, logs and rollback notes, and corrects misinformation in the room",
      duties_organizer: "Plans work, keeps information ordered, dispatches tasks and prevents conflicts, floods and mistakes",
      duties_security: "Reviews delegation, permissions, secrets and prompt-injection risk; records veto/remediation notes",
      composerPlaceholder: "Type a message; Enter sends, Shift+Enter adds a line",
      audit: "Audit",
      hideGroupList: "Hide groups",
      showGroupList: "Show groups",
      collapseMembers: "Hide members",
      expandMembers: "Show members",
      auditTitle: "Group audit",
      delegationLog: "Subagent delegations",
      noDelegations: "No delegations yet. Organizer runs appear here by taskId with started/completed/failed.",
      auditEmpty: "No audit entries yet. Delegations, secretary notes and human actions appear here.",
      controlNote: "Note",
      controlDelegate: "Subagent delegation",
      controlStarted: "started",
      controlCompleted: "completed",
      controlFailed: "failed",
      keepOpen: "Keep open",
      keepOpenOn: "Kept open",
      keepOpenOff: "Stop keeping open",
      humanPriority: "Human priority",
      deliveryMode: "Delivery",
      modeQueue: "Queue (no interrupt)",
      modeSteer: "Steer (step boundary)",
      modeHint: "Queue waits for the target's current turn; steer inserts at the next step boundary without aborting the running tool.",
      priority: "Priority",
      priorityAmbient: "Notice (no interrupt)",
      priorityUrgent: "Urgent (step boundary)",
      priorityHint: "Notice: do not change the current plan; read after the current turn. Urgent: handle at the next step boundary. Neither aborts a running tool.",
      priorityUnsupported: "This Host does not support priority; restart with 2.1.",
      priorityAmbientShort: "Ambient · read after this turn",
      priorityUrgentShort: "Urgent · next step, no abort",
      copyFull: "Copy full text",
      copied: "Copied",
      auditRecord: "Audit record · not an instruction",
      expandGroups: "Expand groups",
      collapseGroups: "Collapse groups",
      emptyRoomHint: "Room created. No participants yet — use “Add participant” whenever you are ready.",
      subagent: "Subagent",
      delegationNote: "Organizers may delegate to subagents; subagents never join the room, get no group tools, and the whole run is audited.",
      delegate: "Delegate subagent",
      delegateTitle: "Delegate one subagent task",
      delegateTask: "Task brief",
      delegateTaskPlaceholder: "State the goal, inputs, acceptance criteria and prohibitions; the child cannot use group tools.",
      delegateLabel: "Short label (optional)",
      delegateStart: "Start delegation",
      delegating: "Delegating…",
      delegatedDone: "Subagent task completed; the result is in the audit log.",
      delegateHint: "Organizer/host only; the child never joins the room, cannot delegate further, has a timeout and is audited.",
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
      memberRemoved: "Participant removed.",
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
      nudgeMessage: "Reminder: a message in group chat \"{group}\" is waiting for your reply. Use group_talk_send with target * to answer in the group, or say you cannot reply right now.",
      openTarget: "Open their session",
      unreadCount: "{count} unread",
      unreadTrigger: "Group chat · {count} unread",
      replyNote: "members reply explicitly with the group tool",
      busy: "busy",
      expandMessage: "Expand",
      collapseMessage: "Collapse",
      idle: "idle",
      roomOnly: "Room only",
      humanHost: "Human host {alias} · panel only",
      legacyHostWarning: "Host version v{version} is below 2.0.1: @human / owner messages are recorded in the room but cannot be delivered. Restart Harness with 2.0.1+.",
      hostOutdated: "Host v{version} is below client 2.2.0: delegation, control rows and the 2.2 human envelope need a Harness restart.",
      recordedToHuman: "Recorded in the room: {name} is the UI-only operator, so no session is woken (the old Host cannot deliver to it).",
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

    // ---------------------------------------------------------------- 身份与角色

    /** Reserved human actor: the panel composes as the person, not a session. */
    const HUMAN = "human"
    const PANEL_ID = "group-talk-l"
    /** Client half version; keep in sync with package.json. */
    const CLIENT_VERSION = "2.2.0"

    /**
     * Role shelves. A role is a label plus a duty sentence the agent reads in
     * its group prompt; presets keep the common seats one click away.
     */
    const ROLE_PRESETS = [
      { id: "designer", zh: "设计师", en: "Designer", dutiesZh: "负责视觉、版式、交互与观感细节", dutiesEn: "Owns visual direction, layout and interaction detail" },
      { id: "judge", zh: "评委", en: "Judge", dutiesZh: "独立评审、打分并明确指出问题", dutiesEn: "Reviews independently, scores the work and names concrete problems" },
      { id: "researcher", zh: "研究员", en: "Researcher", dutiesZh: "负责思考，提供理论基础与可执行计划", dutiesEn: "Thinks through the problem, supplies the theory and an executable plan" },
      { id: "experimenter", zh: "实验员", en: "Experimenter", dutiesZh: "像实验对象一样先试，给出一手反馈", dutiesEn: "Acts as the test subject and reports first-hand results" },
      { id: "secretary", zh: "秘书", en: "Secretary", dutiesZh: "记录信息、撰写日志与回退记录，纠正群内潜在的错误信息", dutiesEn: "Records minutes, logs and rollback notes, and corrects misinformation in the room" },
      { id: "organizer", zh: "组织者", en: "Organizer", dutiesZh: "安排工作、维持信息秩序、综合调度任务，防止冲突、洪水和错误", dutiesEn: "Plans work, keeps information ordered, dispatches tasks and prevents conflicts, floods and mistakes" },
      { id: "security", zh: "安全主管", en: "Security Lead", dutiesZh: "审查委派、权限、密钥与提示注入风险，提出否决/整改建议并记录安全审计", dutiesEn: "Reviews delegation, permissions, secrets and prompt-injection risk; records veto/remediation notes" },
    ]

    function rolePreset(id) {
      return ROLE_PRESETS.find((preset) => preset.id === id)
    }

    function presetLabel(preset, t) {
      return t(`role_${preset.id}`)
    }

    function presetDuties(preset, t) {
      return t(`duties_${preset.id}`)
    }

    /** True when the value matches a preset label in either language. */
    function presetForRole(role) {
      if (typeof role !== "string") return undefined
      const needle = role.trim().toLocaleLowerCase()
      return ROLE_PRESETS.find((preset) => (
        preset.zh.toLocaleLowerCase() === needle || preset.en.toLocaleLowerCase() === needle
      ))
    }

    // ---------------------------------------------------------------- 已读 / 未读
    //
    // Read state is per browser session and stays client-side: the Host never
    // needs to know what a human has looked at, and no extra request is spent
    // on marking. The header polls slowly while the panel is closed so a reply
    // can surface as a dot without waiting for the user to open the panel.

    const SEEN_PREFIX = "group-talk-l:seen"
    const SEEN_EVENT = "group-talk-l:seen"
    const PIN_KEY = "group-talk-l:pinned"
    const PIN_EVENT = "group-talk-l:pinned"
    /** Last pointer-down outside the group page: an explicit user navigation. */
    let lastExternalPointerAt = 0

    function readPinned() {
      try {
        return window.localStorage?.getItem(PIN_KEY) === "1"
      } catch {
        return false
      }
    }

    function writePinned(value) {
      try {
        window.localStorage?.setItem(PIN_KEY, value ? "1" : "0")
      } catch {
        // A privacy mode may reject storage; the in-memory toggle still works.
      }
      try {
        window.dispatchEvent(new CustomEvent(PIN_EVENT, { detail: { pinned: Boolean(value) } }))
      } catch {
        // Non-browser test harness.
      }
    }

    const FOCUS_KEY = "group-talk-l:focus"
    const DRAFT_PREFIX = "group-talk-l:draft"

    function readFocus() {
      try {
        return window.localStorage?.getItem(FOCUS_KEY) || null
      } catch {
        return null
      }
    }

    function writeFocus(id) {
      try {
        if (id) window.localStorage?.setItem(FOCUS_KEY, id)
      } catch {}
    }

    function readDraft(groupId) {
      try {
        return window.sessionStorage?.getItem(`${DRAFT_PREFIX}:${groupId}`) || ""
      } catch {
        return ""
      }
    }

    function writeDraft(groupId, value) {
      try {
        if (value) window.sessionStorage?.setItem(`${DRAFT_PREFIX}:${groupId}`, value)
        else window.sessionStorage?.removeItem(`${DRAFT_PREFIX}:${groupId}`)
      } catch {}
    }

    async function copyToClipboard(text) {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {}
      // Electron/WebView and some permission policies reject the async
      // clipboard API; fall back to a temporary textarea + execCommand.
      try {
        if (typeof document === "undefined") return false
        const area = document.createElement("textarea")
        area.value = text
        area.setAttribute("readonly", "readonly")
        area.style.position = "fixed"
        area.style.opacity = "0"
        area.style.pointerEvents = "none"
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand("copy")
        area.remove()
        return ok
      } catch {
        return false
      }
    }

    function localStore() {
      try {
        return typeof window !== "undefined" ? window.localStorage : undefined
      } catch {
        return undefined
      }
    }

    function readSeen(sessionId) {
      const store = localStore()
      if (!store) return {}
      try {
        const raw = store.getItem(`${SEEN_PREFIX}:${sessionId}`)
        const parsed = raw ? JSON.parse(raw) : null
        const map = {}
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [id, at] of Object.entries(parsed)) {
            if (typeof id === "string" && id && Number.isFinite(at) && at >= 0) map[id] = at
          }
        }
        return map
      } catch {
        return {}
      }
    }

    function writeSeen(sessionId, map) {
      const store = localStore()
      if (!store) return
      try {
        store.setItem(`${SEEN_PREFIX}:${sessionId}`, JSON.stringify(map))
      } catch {
        // Quota or privacy mode: unread state is a nicety, never a hard failure.
      }
    }

    function announceSeen(sessionId) {
      try {
        window.dispatchEvent(new CustomEvent(SEEN_EVENT, { detail: { sessionId } }))
      } catch {
        // Non-browser test harness: no listeners to notify.
      }
    }

    /** Newest timestamp a group can claim, including receipt-only updates. */
    function latestAt(group) {
      let latest = Number(group?.updatedAt) || 0
      for (const message of group?.messages ?? []) {
        if (Number.isFinite(message?.at) && message.at > latest) latest = message.at
      }
      return latest
    }

    /** Give groups seen for the first time a baseline, so history is not "unread". */
    function seedSeen(groups, seen) {
      let changed = false
      for (const group of Array.isArray(groups) ? groups : []) {
        if (!group?.id || Object.hasOwn(seen, group.id)) continue
        seen[group.id] = latestAt(group)
        changed = true
      }
      return changed
    }

    /** Count messages from other members newer than the read watermark. */
    function unreadFor(group, seen) {
      if (!group || group.status !== "active") return 0
      const after = seen?.[group.id]
      if (!Number.isFinite(after)) return 0
      const me = group.me
      let count = 0
      for (const message of group.messages ?? []) {
        if (message?.kind !== "message" || !Number.isFinite(message.at) || message.at <= after) continue
        if (!me) {
          count += 1
          continue
        }
        if (typeof message.fromSessionId === "string") {
          if (message.fromSessionId !== me.sessionId) count += 1
        } else if (message.fromAlias !== me.alias) {
          count += 1
        }
      }
      return count
    }

    /** Advance the watermark to the newest message; true when it moved. */
    function markSeen(group, seen) {
      if (!group?.id) return false
      const at = latestAt(group)
      if (!Number.isFinite(at) || at <= (seen[group.id] ?? 0)) return false
      seen[group.id] = at
      return true
    }

    /**
     * Waiting is derived from the transcript, not from the last row:
     * a later system row (member added, delivery receipt) must not clear it,
     * and a reply from any other member clears it regardless of target kind.
     */
    function deriveWaiting(group, sessionId) {
      if (!group || group.status !== "active") return null
      const messages = (group.messages ?? []).filter((message) => message?.kind === "message")
      if (messages.length === 0) return null
      const mine = [...messages].reverse().find((message) => message.fromSessionId === sessionId)
      if (!mine) return null
      if (messages.some((message) => message.at > mine.at && message.fromSessionId !== sessionId)) return null
      const deliveries = Array.isArray(mine.deliveries) ? mine.deliveries : []
      // Only session deliveries can produce a reply; an in-room message to the
      // human operator is not "waiting for @owner".
      if (!deliveries.some((delivery) => (delivery.status === "delivered" || delivery.status === "unknown") && delivery.sessionId !== HUMAN)) return null
      const target = typeof mine.target === "string" && mine.target ? mine.target : "*"
      const humanAlias = (group.members ?? []).find((member) => member.sessionId === HUMAN)?.alias
      if (target === "@human" || (humanAlias && target === `@${humanAlias}`)) return null
      return { target, since: mine.at, nudgeable: target.startsWith("@") && target.length > 1 }
    }

    /** Subscribe to the root session-list snapshot without a session slot. */
    function useSessionSnapshot(list) {
      const [snapshot, setSnapshot] = useState(() => list?.getSnapshot?.() ?? { ids: [], byId: {} })
      useEffect(() => {
        if (typeof list?.subscribe !== "function") return undefined
        const update = () => setSnapshot(list.getSnapshot())
        update()
        return list.subscribe(update)
      }, [list])
      return snapshot
    }

    /** Background unread total for the sidebar entry; read-only, no wakeups. */
    function useUnreadCount(sessionId = HUMAN, enabled = true) {
      const [count, setCount] = useState(0)
      useEffect(() => {
        if (!enabled) return undefined
        let alive = true
        const refresh = async () => {
          try {
            const data = await api("GET", sessionId)
            if (!alive) return
            const groups = Array.isArray(data?.groups) ? data.groups : []
            const seen = readSeen(sessionId)
            if (seedSeen(groups, seen)) writeSeen(sessionId, seen)
            setCount(groups.reduce((sum, group) => sum + unreadFor(group, seen), 0))
          } catch {
            // The panel shows load errors; the dot just stays as it was.
          }
        }
        void refresh()
        const timer = setInterval(() => {
          if (!document.hidden) void refresh()
        }, 60000)
        const onSeen = () => { void refresh() }
        window.addEventListener(SEEN_EVENT, onSeen)
        return () => {
          alive = false
          clearInterval(timer)
          window.removeEventListener(SEEN_EVENT, onSeen)
        }
      }, [sessionId, enabled])
      return count
    }

    /** True when `version` is at least `minimum` (dotted numeric compare). */
    function versionAtLeast(version, minimum) {
      const left = String(version).split(".").map((part) => Number.parseInt(part, 10) || 0)
      for (let index = 0; index < minimum.length; index += 1) {
        const value = left[index] ?? 0
        if (value > minimum[index]) return true
        if (value < minimum[index]) return false
      }
      return true
    }

    /** Compact preset selector for a participant row. */
    function RoleSelect({ value, onChange, t }) {
      const preset = presetForRole(value)
      const generic = value === t("roleDefault")
      return h("select", {
        className: "dsh-group-talk-l-select",
        value: preset ? preset.id : generic ? "generic" : "custom",
        "aria-label": t("roleLabel"),
        onChange: (event) => {
          const id = event.target.value
          if (id === "generic") {
            onChange({ role: t("roleDefault"), duties: "" })
            return
          }
          if (id === "custom") {
            onChange({ role: preset || generic ? "" : value, duties: "" })
            return
          }
          const next = rolePreset(id)
          onChange({ role: presetLabel(next, t), duties: presetDuties(next, t) })
        },
      },
        h("option", { value: "generic" }, t("roleDefault")),
        ROLE_PRESETS.map((entry) => h("option", { key: entry.id, value: entry.id }, presetLabel(entry, t))),
        h("option", { value: "custom" }, t("roleCustom")))
    }

    /** Preset chips plus a free-text role; used by the role editor. */
    function RoleChips({ role, onPick, t }) {
      const active = presetForRole(role)
      return h("div", { className: "dsh-group-talk-l-chips" },
        ROLE_PRESETS.map((preset) => h("button", {
          key: preset.id,
          type: "button",
          className: active?.id === preset.id ? "dsh-group-talk-l-chip dsh-group-talk-l-chip-active" : "dsh-group-talk-l-chip",
          onClick: () => onPick(preset),
        }, presetLabel(preset, t))),
        h("button", {
          type: "button",
          className: active ? "dsh-group-talk-l-chip" : "dsh-group-talk-l-chip dsh-group-talk-l-chip-active",
          onClick: () => onPick(null),
        }, t("roleCustom")))
    }

    /** Target menu for the composer: *, one participant, or a whole role. */
    function TargetPicker({ group, sessionId, target, onChange, openSignal = 0, t }) {
      const [open, setOpen] = useState(false)
      useEffect(() => {
        if (openSignal > 0) setOpen(true)
      }, [openSignal])
      const others = group.members.filter((member) => member.sessionId !== sessionId && member.sessionId !== HUMAN)
      const roles = [...new Set(others.map((member) => member.role))]
      const label = target === "*"
        ? t("allParticipants")
        : target.startsWith("#")
          ? target
          : target
      const choose = (value) => {
        onChange(value)
        setOpen(false)
      }
      return h("span", { className: "dsh-group-talk-l-target" },
        h(Button, {
          variant: "ghost",
          size: "sm",
          className: "dsh-group-talk-l-target-button",
          "aria-haspopup": "menu",
          "aria-expanded": open,
          onClick: () => setOpen((value) => !value),
        }, `${t("sendTo")} ${label}`, h("span", { className: "dsh-group-talk-l-caret", "aria-hidden": "true" }, "▾")),
        open ? h(React.Fragment, null,
          h("div", { className: "dsh-group-talk-l-pop-overlay", onClick: () => setOpen(false) }),
          h("div", { className: "dsh-group-talk-l-target-menu", role: "menu" },
            h("button", { type: "button", role: "menuitem", onClick: () => choose("*") }, t("allParticipants")),
            others.map((member) => h("button", {
              type: "button",
              role: "menuitem",
              key: member.sessionId,
              onClick: () => choose(`@${member.alias}`),
            }, `@${member.alias} · ${member.role}`)),
            roles.map((role) => h("button", {
              type: "button",
              role: "menuitem",
              key: `role-${role}`,
              onClick: () => choose(`#${role}`),
            }, `#${role} · ${others.filter((member) => member.role === role).length}`)))) : null)
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

    /** One-line preview for the expandable conversation list. */
    function groupPreview(group, t) {
      const messages = Array.isArray(group?.messages) ? group.messages : []
      const last = [...messages].reverse().find((message) => message?.kind !== "system")
      if (!last) return group?.topic || t("noMessages")
      const who = last.fromAlias ? `@${last.fromAlias}: ` : ""
      return `${who}${String(last.text ?? "").replace(/\s+/gu, " ").slice(0, 64)}`
    }

    function GroupList({ groups, selectedId, unreadById = {}, loading, error, onSelect, onCreate, onRetry, t }) {
      const [collapsed, setCollapsed] = useState(false)
      return h("div", { className: "dsh-group-talk-l-sidebar" },
        h("div", { className: "dsh-group-talk-l-sidebar-head" },
          h("button", {
            type: "button",
            className: "dsh-group-talk-l-collapse",
            "aria-expanded": !collapsed,
            title: collapsed ? t("expandGroups") : t("collapseGroups"),
            onClick: () => setCollapsed((value) => !value),
          }, h("span", { "aria-hidden": "true" }, collapsed ? "▸" : "▾")),
          h("span", { className: "dsh-group-talk-l-sidebar-title" }, t("title")),
          h(IconButton, { label: t("create"), onClick: onCreate },
            h(IconPlusOutlineRegular, { size: 15 }))),
        error ? h(ErrorNotice, { text: `${t("loadFailed")}${error}`, t }) : null,
        collapsed ? null : h("div", { className: "dsh-group-talk-l-list" },
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
              unreadById[group.id] > 0
                ? h("span", {
                    className: "dsh-group-talk-l-row-unread",
                    title: format(t, "unreadCount", { count: unreadById[group.id] }),
                  }, unreadById[group.id] > 99 ? "99+" : String(unreadById[group.id]))
                : null,
              h(Tag, { tone: group.status === "active" ? "info" : "outline" },
                group.status === "active" ? t("active") : t("dissolved"))),
            h("span", { className: "dsh-group-talk-l-row-preview" }, groupPreview(group, t)),
            h("span", { className: "dsh-group-talk-l-row-meta" },
              `${format(t, "participantsCount", { count: (Array.isArray(group.members) ? group.members : []).filter((member) => member.sessionId !== HUMAN).length })}${group.me ? ` · ${group.me.sessionId === HUMAN ? t("you") : `@${group.me.alias}`}` : ""}`)))),
        collapsed ? null : (error && groups.length > 0
          ? h("button", {
              type: "button",
              className: "dsh-group-talk-l-row",
              onClick: onRetry,
            }, t("retry"))
          : null))
    }

    function roleClass(role) {
      const value = String(role ?? "").toLocaleLowerCase()
      if (value.includes("organizer") || value.includes("组织")) return "dsh-group-talk-l-role-organizer"
      if (value.includes("security") || value.includes("安全")) return "dsh-group-talk-l-role-security"
      if (value.includes("secretary") || value.includes("秘书")) return "dsh-group-talk-l-role-secretary"
      return ""
    }

    function MemberRow({ member, group, sessionId, onEditRole, onRemove, onOpen, editing, t, title, running = false }) {
      const isMe = member.sessionId === sessionId
      const isOwner = member.sessionId === group.ownerSessionId
      return h("div", { className: "dsh-group-talk-l-member" },
        h("span", { className: "dsh-group-talk-l-member-icon" }, h(IconUserOutlineRegular, { size: 15 })),
        h("div", { className: "dsh-group-talk-l-member-text" },
          h("div", { className: "dsh-group-talk-l-member-name" },
            h("span", { className: "dsh-group-talk-l-member-alias" }, `@${member.alias}`),
            h("span", { className: `dsh-group-talk-l-role ${roleClass(member.role)}` }, member.role),
            isMe ? h(Tag, { tone: "outline" }, t("youTag")) : null),
          h("div", { className: "dsh-group-talk-l-member-meta" },
            `${running ? `${t("busy")} · ` : ""}${title ? `${title} · ` : ""}${member.duties ? `${member.duties}` : ""}`)),
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
      const [expanded, setExpanded] = useState(false)
      const [copied, setCopied] = useState(false)
      if (message.kind === "system") {
        return h("div", { className: "dsh-group-talk-l-message dsh-group-talk-l-message-system" },
          h("div", { className: "dsh-group-talk-l-message-body" }, message.text))
      }
      if (message.kind === "control") {
        const action = message.action === "delegate" ? t("controlDelegate") : message.action === "note" ? t("controlNote") : (message.action ?? t("audit"))
        const outcome = message.outcome === "started" ? t("controlStarted") : message.outcome === "completed" ? t("controlCompleted") : message.outcome === "failed" ? t("controlFailed") : (message.outcome ?? "")
        return h("div", { className: "dsh-group-talk-l-message dsh-group-talk-l-message-control" },
          h("div", { className: "dsh-group-talk-l-message-meta" },
            h("span", { className: "dsh-group-talk-l-message-author" }, `▣ ${action}`),
            outcome ? h("span", null, outcome) : null,
            h("span", { className: "dsh-group-talk-l-audit-mark" }, t("auditRecord")),
            h("span", null, "·"),
            h("span", null, message.fromAlias ? `@${message.fromAlias}` : t("system")),
            h("span", { style: { marginLeft: "auto" } }, new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))),
          h("div", { className: "dsh-group-talk-l-message-body" }, message.text))
      }
      const deliveries = Array.isArray(message.deliveries) ? message.deliveries : []
      const failed = deliveries.filter((delivery) => delivery.status === "failed")
      const delivered = deliveries.filter((delivery) => delivery.status === "delivered" && delivery.sessionId !== HUMAN).length
      const roomOnly = deliveries.filter((delivery) => delivery.status === "in-room" || (delivery.status === "delivered" && delivery.sessionId === HUMAN)).length
      const unknown = deliveries.filter((delivery) => delivery.status === "unknown").length
      const total = deliveries.length
      const deliveryLabel = (() => {
        const problems = []
        if (unknown > 0) problems.push(`${unknown} ${t("deliveryUnknown")}`)
        if (failed.length > 0) problems.push(`${failed.length} ${t("failed")}`)
        if (problems.length > 0) return `${delivered}/${total} ${t("delivered")} · ${problems.join(" · ")}`
        if (delivered === 0 && roomOnly > 0) return t("roomOnly")
        return roomOnly > 0 ? `${delivered} ${t("delivered")} · ${roomOnly} ${t("roomOnly")}` : t("delivered")
      })()
      const self = message.fromSessionId === HUMAN
      const fullText = String(message.text ?? "")
      const long = fullText.length > 600
      const visibleText = long && !expanded ? `${fullText.slice(0, 600)}…` : fullText
      return h("div", { className: self ? "dsh-group-talk-l-message dsh-group-talk-l-message-self" : "dsh-group-talk-l-message" },
        h("div", { className: "dsh-group-talk-l-message-meta" },
          h("span", { className: "dsh-group-talk-l-message-author" }, self ? t("you") : `@${message.fromAlias ?? "?"}`),
          message.priority ? h("span", {
            className: message.priority === "urgent" ? "dsh-group-talk-l-priority dsh-group-talk-l-priority-urgent" : "dsh-group-talk-l-priority",
          }, message.priority === "urgent" ? t("priorityUrgentShort") : t("priorityAmbientShort")) : null,
          h("span", null, "→"),
          h("span", null, message.target ?? "*"),
          h("span", null, "·"),
          h("span", null, new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
          total > 0
            ? h("span", { style: { marginLeft: "auto" } }, deliveryLabel)
            : null),
        h("div", { className: "dsh-group-talk-l-message-body" }, visibleText),
        long ? h("div", { className: "dsh-group-talk-l-message-tools" },
          h("button", {
            type: "button",
            className: "dsh-group-talk-l-message-toggle",
            "aria-expanded": expanded,
            onClick: (event) => {
              const list = event.currentTarget.closest(".dsh-group-talk-l-messages")
              const top = list?.scrollTop
              setExpanded((value) => !value)
              if (list) requestAnimationFrame(() => { list.scrollTop = top })
            },
          }, expanded ? t("collapseMessage") : t("expandMessage")),
          h("button", {
            type: "button",
            className: "dsh-group-talk-l-message-toggle",
            onClick: () => {
              void copyToClipboard(fullText).then((ok) => {
                if (!ok) return
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            },
          }, copied ? t("copied") : t("copyFull"))) : null,
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

    function GroupDetail({ group, sessionId, busy, notice, error, limits, usage, onSend, onEditRole, onRemoveMember, onOpen, onDissolve, onDelete, onAddMember, onLeave, onNudge, onAudit, onTogglePin, onToggleList, listOpen = true, pinned = false, prioritySupported = false, version, t, useSessions }) {
      const sessionsById = useSessions((state) => state.byId)
      const [target, setTarget] = useState("*")
      const [text, setText] = useState(readDraft(group.id))
      const [priority, setPriority] = useState("ambient")
      const [composing, setComposing] = useState(false)
      const [membersOpen, setMembersOpen] = useState(true)
      const [atSignal, setAtSignal] = useState(0)
      const [clock, setClock] = useState(Date.now())
      const messagesRef = useRef(null)
      const draftOwner = useRef(group.id)
      const active = group.status === "active"
      const members = Array.isArray(group.members) ? group.members : []
      const messages = Array.isArray(group.messages) ? group.messages : []
      const otherMembers = members.filter((member) => member.sessionId !== sessionId && member.sessionId !== HUMAN)
      const waiting = deriveWaiting(group, sessionId)
      const waitingLabel = waiting
        ? waiting.target === "*" ? t("allMembers") : waiting.target
        : null
      const waitingMember = waiting?.nudgeable
        ? otherMembers.find((member) => member.alias.toLowerCase() === waiting.target.slice(1).toLowerCase())
        : undefined
      useEffect(() => {
        if (!waiting) return undefined
        const timer = setInterval(() => setClock(Date.now()), 15000)
        return () => clearInterval(timer)
      }, [Boolean(waiting)])
      const nudgeAfter = limits?.replyNudgeAfterMs ?? 120000
      const waitedMs = waiting ? Math.max(0, clock - waiting.since) : 0
      const canNudge = Boolean(waiting?.nudgeable && waitingMember && active && waitedMs >= nudgeAfter)
      const showingTimeout = Boolean(waiting && waitedMs >= nudgeAfter)
      useEffect(() => {
        setTarget(otherMembers.length === 1 ? `@${otherMembers[0].alias}` : "*")
      }, [group.id, members.length])

      useEffect(() => {
        const node = messagesRef.current
        if (node) node.scrollTop = node.scrollHeight
      }, [messages.length])

      const send = () => {
        const value = text.trim()
        if (!value || busy === "send" || !active) return
        void onSend({ target, message: value, priority }).then((ok) => {
          if (ok) {
            setText("")
            writeDraft(group.id, "")
          }
        })
      }

      useEffect(() => {
        if (draftOwner.current !== group.id) {
          draftOwner.current = group.id
          setText(readDraft(group.id))
          return
        }
        writeDraft(group.id, text)
      }, [group.id, text])

      const composer = h("div", { className: "dsh-group-talk-l-composer" },
        h("div", { className: "dsh-group-talk-l-composer-row" },
          h(TargetPicker, { group, sessionId, target, onChange: setTarget, openSignal: atSignal, t }),
          h(Button, {
            variant: "ghost",
            size: "sm",
            className: "dsh-group-talk-l-at",
            "aria-label": t("sendTo"),
            onClick: () => setAtSignal((value) => value + 1),
          }, "@"),
          h("select", {
            className: "dsh-group-talk-l-select dsh-group-talk-l-mode",
            value: priority,
            "aria-label": t("priority"),
            title: prioritySupported ? t("priorityHint") : t("priorityUnsupported"),
            disabled: !prioritySupported,
            onChange: (event) => setPriority(event.target.value),
          },
            h("option", { value: "ambient" }, t("priorityAmbient")),
            h("option", { value: "urgent" }, t("priorityUrgent"))),
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
          placeholder: t("composerPlaceholder"),
          onChange: (event) => {
            const value = event.target.value
            if (/(^|\s)@$/u.test(value)) {
              setText(value.replace(/@$/u, ""))
              setAtSignal((current) => current + 1)
              return
            }
            setText(value)
          },
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
          group.me ? (group.me.sessionId === HUMAN ? `${t("you")}` : `@${group.me.alias} · ${group.me.role}`) : "",
          active ? ` · /group @${otherMembers[0]?.alias ?? "alias"} <message>` : "",
          limits ? ` · ${format(t, "limitHint", {
            chars: limits.maxMessageChars,
            seconds: Math.ceil(limits.sendCooldownMs / 1000),
            recipients: limits.maxRecipientsPerSend,
          })}` : "",
          active ? ` · ${t("replyNote")}` : "",
          active && !prioritySupported ? ` · ${t("priorityUnsupported")}` : "",
          usage?.sender ? ` · ${format(t, "usageHint", {
            used: usage.sender.messages,
            limit: limits?.dailyMessagesPerSender ?? 0,
          })}` : ""))

      return h("div", { className: "dsh-group-talk-l-main" },
        h("div", { className: "dsh-group-talk-l-main-head" },
          h("div", { className: "dsh-group-talk-l-main-headtext" },
            h("h3", { className: "dsh-group-talk-l-main-title" }, group.name),
            h("p", { className: "dsh-group-talk-l-main-sub" },
              `${group.status === "active" ? t("active") : t("dissolved")} · ${format(t, "participantsCount", { count: members.filter((member) => member.sessionId !== HUMAN).length })} · ${group.id}`),
            group.me?.sessionId === HUMAN
              ? h("p", { className: "dsh-group-talk-l-main-sub" }, format(t, "humanHost", { alias: `@${group.me.alias}` }))
              : null,
            group.topic ? h("p", { className: "dsh-group-talk-l-main-sub" }, group.topic) : null),
          h("div", { className: "dsh-group-talk-l-head-actions" },
            group.me?.sessionId === HUMAN ? h(Tag, { tone: "info" }, t("humanPriority")) : null,
            h(Button, { variant: "ghost", size: "sm", onClick: onToggleList }, listOpen ? t("hideGroupList") : t("showGroupList")),
            h(Button, {
              variant: "ghost",
              size: "sm",
              className: pinned ? "dsh-group-talk-l-pinned" : undefined,
              onClick: onTogglePin,
              title: pinned ? t("keepOpenOff") : t("keepOpen"),
            }, pinned ? t("keepOpenOn") : t("keepOpen")),
            group.me?.isOwner && active
              ? h(Button, { variant: "ghost", size: "sm", icon: h(IconPlusOutlineRegular, { size: 14 }), onClick: onAddMember }, t("addMember"))
              : null)),
        h(Notice, { kind: notice?.kind, text: notice?.text }),
        h(ErrorNotice, { text: error, t }),
        h("div", { className: "dsh-group-talk-l-section" },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("members")),
            h("button", {
              type: "button",
              className: "dsh-group-talk-l-linkish",
              onClick: () => setMembersOpen((value) => !value),
              "aria-expanded": membersOpen,
            }, membersOpen ? t("collapseMembers") : t("expandMembers")),
            group.me?.isOwner && active ? h("span", { className: "dsh-group-talk-l-field-hint" }, t("hostHint")) : null),
          membersOpen ? h("div", { className: "dsh-group-talk-l-members" },
            members.filter((member) => member.sessionId !== HUMAN).map((member) => h(MemberRow, {
              key: member.sessionId,
              member,
              group,
              sessionId,
              onEditRole,
              onRemove: onRemoveMember,
              onOpen,
              title: sessionsById?.[member.sessionId]?.title || "",
              running: Boolean(sessionsById?.[member.sessionId]?.running),
              t,
            }))) : null),
        h("div", { className: "dsh-group-talk-l-section", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("messagesCount", { count: group.messageTotal ?? messages.length }))),
          h("div", { className: "dsh-group-talk-l-messages", ref: messagesRef },
            messages.length === 0
              ? h("div", { className: "dsh-group-talk-l-list-empty" }, members.length <= 1 ? t("emptyRoomHint") : t("noMessages"))
              : messages.map((message) => h(MessageRow, { key: message.id, message, t })))),
        waiting ? h("div", { className: "dsh-group-talk-l-waiting" },
          showingTimeout
            ? format(t, "waitingLong", { target: waitingLabel, minutes: Math.max(1, Math.round(waitedMs / 60000)) })
            : format(t, "waitingReply", { target: waitingLabel }),
          canNudge ? h(Button, {
            variant: "outline",
            size: "sm",
            disabled: busy === "send",
            onClick: () => onNudge(waiting.target),
          }, t("nudge")) : null,
          waitingMember ? h(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => onOpen(waitingMember.sessionId),
          }, t("openTarget")) : null) : null,
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
        version ? h("div", { className: "dsh-group-talk-l-version" }, `Group-Talk-L ${CLIENT_VERSION}${version === CLIENT_VERSION ? "" : ` · Host ${version}`}`) : null)
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

    function CreateForm({ useSessions, onCreate, onCancel, busy, error, t }) {
      const [name, setName] = useState("")
      const [topic, setTopic] = useState("")
      const [selected, setSelected] = useState({})
      const [query, setQuery] = useState("")
      const [localError, setLocalError] = useState(null)
      const sessions = useSessionDirectory(useSessions, new Set())

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
              alias: `agent-${Object.keys(current).length + 1}`,
              role: t("roleDefault"),
              duties: "",
            },
          }
        })
      }

      const patch = (id, values) => {
        setSelected((current) => ({ ...current, [id]: { ...current[id], ...values } }))
      }

      const submit = async () => {
        setLocalError(null)
        if (!name.trim()) {
          setLocalError(t("nameRequired"))
          return
        }
        const members = Object.entries(selected).map(([id, value]) => ({
          sessionId: id,
          alias: value.alias.trim(),
          role: (value.role ?? "").trim() || t("roleDefault"),
          duties: (value.duties ?? "").trim(),
        }))
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
        h("div", { className: "dsh-group-talk-l-field" },
          h("span", { className: "dsh-group-talk-l-field-label" }, t("selectParticipants")),
          h("span", { className: "dsh-group-talk-l-field-hint" }, t("createHint2"))),
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
                  const value = selected[id]
                  const custom = value !== undefined && !presetForRole(value.role) && value.role !== t("roleDefault")
                  return h(SessionPickRow, {
                    key: id,
                    summary,
                    checked: value !== undefined,
                    onToggle: () => toggle(summary),
                    t,
                    fields: value
                      ? [
                          h(Input, {
                            key: "alias",
                            value: value.alias,
                            placeholder: t("alias"),
                            onChange: (event) => patch(id, { alias: event.target.value }),
                            "aria-label": t("alias"),
                          }),
                          h(RoleSelect, {
                            key: "role",
                            value: value.role,
                            t,
                            onChange: (next) => patch(id, next),
                          }),
                          custom
                            ? h(Input, {
                                key: "custom",
                                value: value.role,
                                placeholder: t("rolePlaceholder"),
                                onChange: (event) => patch(id, { role: event.target.value }),
                                "aria-label": t("roleLabel"),
                              })
                            : value.duties
                              ? h("span", { key: "duties", className: "dsh-group-talk-l-pick-duty" }, value.duties)
                              : null,
                        ]
                      : null,
                  })
                }))),
        h(ErrorNotice, { text: localError, t }),
        h(ErrorNotice, { text: error, t }),
        h("div", { className: "dsh-group-talk-l-form-actions" },
          h(Button, { variant: "ghost", size: "sm", onClick: onCancel }, t("back")),
          h(Button, {
            variant: "primary",
            size: "sm",
            disabled: busy === "create",
            onClick: submit,
          }, busy === "create" ? t("creating") : t("createAction"))))
    }

    function RoleModal({ member, onSave, onClose, busy, error, t }) {
      const [role, setRole] = useState(member.role)
      const [duties, setDuties] = useState(member.duties ?? "")
      const pick = (preset) => {
        if (!preset) {
          setRole("")
          setDuties("")
          return
        }
        setRole(presetLabel(preset, t))
        setDuties(presetDuties(preset, t))
      }
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
            h("span", { className: "dsh-group-talk-l-field-label" }, t("roleLabel")),
            h(RoleChips, { role, onPick: pick, t })),
          h("div", { className: "dsh-group-talk-l-field" },
            h(Input, {
              value: role,
              placeholder: t("rolePlaceholder"),
              onChange: (event) => setRole(event.target.value),
              maxLength: 48,
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

    /** Human-only oversight: every control/audit entry and failed delivery. */
    function AuditView({ group, onBack, t }) {
      const messages = Array.isArray(group.messages) ? group.messages : []
      const controls = (Array.isArray(group.audit) ? group.audit : messages.filter((message) => message.kind === "control")).slice(-80).reverse()
      const delegations = controls.filter((message) => message.action === "delegate")
      const failures = messages.filter((message) => (
        message.kind === "message"
        && (Array.isArray(message.deliveries) ? message.deliveries : []).some((delivery) => delivery.status === "failed" || delivery.status === "unknown")
      )).slice(-20).reverse()
      return h("div", { className: "dsh-group-talk-l-main dsh-group-talk-l-audit" },
        h("div", { className: "dsh-group-talk-l-main-head" },
          h("div", { className: "dsh-group-talk-l-main-headtext" },
            h("h3", { className: "dsh-group-talk-l-main-title" }, t("auditTitle")),
            h("p", { className: "dsh-group-talk-l-main-sub" }, `${group.name} · ${group.id}`)),
          h(Button, { variant: "ghost", size: "sm", onClick: onBack }, t("back"))),
        h("div", { className: "dsh-group-talk-l-section" },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("delegationLog"))),
          delegations.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noDelegations"))
            : h("div", { className: "dsh-group-talk-l-audit-failures" }, delegations.map((message) => h(MessageRow, { key: message.id, message, t })))),
        h("div", { className: "dsh-group-talk-l-section", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("controlNote") + " / " + t("controlDelegate"))),
          controls.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("auditEmpty"))
            : h("div", { className: "dsh-group-talk-l-messages" }, controls.map((message) => h(MessageRow, { key: message.id, message, t })))),
        failures.length > 0
          ? h("div", { className: "dsh-group-talk-l-section" },
              h("div", { className: "dsh-group-talk-l-section-head" },
                h("span", { className: "dsh-group-talk-l-section-title" }, t("failed"))),
              h("div", { className: "dsh-group-talk-l-audit-failures" },
                failures.map((message) => h("div", { key: message.id, className: "dsh-group-talk-l-delivery-error" },
                  `${new Date(message.at).toLocaleString()} · ${message.text.slice(0, 120)}`))))
          : null)
    }

    function GroupCenter({ open, onClose, sessionId, launch, useSessions, openSession, embedded = false, t }) {
      const [groups, setGroups] = useState([])
      const [limits, setLimits] = useState(null)
      const [usage, setUsage] = useState(null)
      const [version, setVersion] = useState(null)
      const [capabilities, setCapabilities] = useState(null)
      const [listOpen, setListOpen] = useState(true)
      const [auditOpen, setAuditOpen] = useState(false)
      const [seen, setSeen] = useState(() => readSeen(sessionId))
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState(null)
      const [notice, setNotice] = useState(null)
      const [selectedId, setSelectedId] = useState(readFocus())
      const [view, setView] = useState("groups")
      const [pinned, setPinned] = useState(readPinned())
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
          const nextGroups = Array.isArray(data?.groups) ? data.groups : []
          setGroups(nextGroups)
          setLimits(data?.limits ?? null)
          setUsage(data?.usage ?? null)
          setVersion(typeof data?.version === "string" ? data.version : null)
          setCapabilities(data?.capabilities && typeof data.capabilities === "object" ? data.capabilities : null)
          // First sight of a group seeds its history as read, so an existing
          // chat does not open with a misleading unread count.
          const nextSeen = readSeen(sessionId)
          if (seedSeen(nextGroups, nextSeen)) writeSeen(sessionId, nextSeen)
          setSeen(nextSeen)
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
        setSeen(readSeen(sessionId))
      }, [sessionId])

      useEffect(() => {
        if (!open || groups.length === 0) {
          if (groups.length === 0) setSelectedId(null)
          return
        }
        if (!selectedId || !groups.some((group) => group.id === selectedId)) {
          const remembered = readFocus()
          setSelectedId(groups.some((group) => group.id === remembered) ? remembered : groups[0].id)
        }
      }, [open, groups, selectedId])

      useEffect(() => {
        if (selectedId) writeFocus(selectedId)
      }, [selectedId])

      const group = groups.find((entry) => entry.id === selectedId) ?? null
      const legacyHost = typeof version === "string" && version.length > 0 && !versionAtLeast(version, [2, 0, 1])
      const hostOutdated = typeof version === "string" && version.length > 0 && !versionAtLeast(version, [2, 1, 0])
      const newestAt = group?.messages?.at(-1)?.at ?? 0

      // Reading a group that is on screen clears its badge, including while the
      // panel stays open and new messages keep arriving on the 8s poll. The
      // dependency is the newest timestamp, not the row count: a busy group is
      // capped at uiMessageLimit rows, so its length stops changing.
      useEffect(() => {
        if (!open || view !== "groups" || !group || document.hidden) return
        const next = readSeen(sessionId)
        if (!markSeen(group, next)) return
        writeSeen(sessionId, next)
        setSeen(next)
        announceSeen(sessionId)
      }, [open, view, group?.id, newestAt, sessionId])

      const unreadById = useMemo(() => {
        const out = {}
        for (const entry of groups) out[entry.id] = unreadFor(entry, seen)
        return out
      }, [groups, seen])

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

      const send = async ({ target, message, priority }) => {
        if (!group) return false
        return Boolean(await run("send", async () => {
          const data = await api("POST", sessionId, {
            action: "send",
            group: group.id,
            target,
            message,
            ...(priority === "urgent" || priority === "ambient" ? { priority } : {}),
          })
          if (data?.deduplicated) {
            setNotice({ kind: "success", text: t("deduplicated") })
            await load(true)
            return true
          }
          const failures = (data?.deliveries ?? []).filter((delivery) => delivery.status === "failed")
          const humanAlias = group.members.find((member) => member.sessionId === HUMAN)?.alias
          const humanFailure = failures.find((delivery) => delivery.alias === humanAlias)
          if (legacyHost && humanFailure) {
            // Mixed state: the new panel against the pre-2.0 Host. The room
            // transcript is the delivery; tell the user instead of a mystery
            // failure that looks like a lost message.
            setNotice({
              kind: "success",
              text: format(t, "recordedToHuman", { name: `@${humanFailure.alias}` }),
            })
          } else if (failures.length > 0) {
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

      const togglePin = () => {
        const next = !pinned
        writePinned(next)
        setPinned(next)
        setNotice({ kind: "success", text: next ? t("keepOpenOn") : t("keepOpenOff") })
      }

      const body = view === "create"
        ? h(CreateForm, {
            useSessions,
            onCreate: create,
            onCancel: () => setView("groups"),
            busy,
            error,
            t,
          })
        : h("div", { className: listOpen ? "dsh-group-talk-l-shell" : "dsh-group-talk-l-shell dsh-group-talk-l-shell-list-collapsed" },
            listOpen ? h(GroupList, {
              groups,
              selectedId,
              unreadById,
              loading,
              error,
              onSelect: (id) => {
                setSelectedId(id)
                writeFocus(id)
                setNotice(null)
                setError(null)
              },
              onCreate: () => setView("create"),
              onRetry: () => { void load() },
              t,
            }) : null,
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
                  onAudit: () => setAuditOpen(true),
                  onTogglePin: togglePin,
                  onToggleList: () => setListOpen((value) => !value),
                  listOpen,
                  pinned,
                  prioritySupported: capabilities?.priority === true,
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

      const dialogs = h(React.Fragment, null,
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

      if (embedded) {
        return h("div", { className: "dsh-group-talk-l-page" },
          h("div", { className: "dsh-group-talk-l-page-head" },
            h("div", { className: "dsh-group-talk-l-page-title" },
              h("span", null, view === "create" ? t("createTitle") : view === "audit" ? t("auditTitle") : t("title")),
              h("span", { className: "dsh-group-talk-l-page-sub" }, t("panelSubtitle"))),
            h("div", { className: "dsh-group-talk-l-head-actions" },
              h(Button, { variant: "ghost", size: "sm", onClick: () => setAuditOpen(true) }, t("audit")),
              h(Button, { variant: "ghost", size: "sm", onClick: () => setListOpen((value) => !value) }, listOpen ? t("hideGroupList") : t("showGroupList")),
              h(Button, { variant: "ghost", size: "sm", onClick: close }, t("backToChat")))),
          legacyHost || hostOutdated ? h("div", { className: "dsh-group-talk-l-page-notice", role: "status" },
            h(StateDot, { state: "error" }),
            h("span", null, legacyHost
              ? format(t, "legacyHostWarning", { version: version ?? "?" })
              : format(t, "hostOutdated", { version: version ?? "?" }))) : null,
          h("div", { className: "dsh-group-talk-l-page-body" }, body),
          auditOpen && group ? h(Modal, {
            open: true,
            onClose: () => setAuditOpen(false),
            title: t("auditTitle"),
            closeLabel: t("close"),
            className: "dsh-group-talk-l-modal dsh-group-talk-l-audit-modal",
          }, h(AuditView, { group, onBack: () => setAuditOpen(false), t })) : null,
          dialogs)
      }
      return h(React.Fragment, null,
        h(Modal, {
          open,
          onClose: close,
          title: view === "create" ? t("createTitle") : view === "audit" ? t("auditTitle") : t("title"),
          closeLabel: t("close"),
          className: "dsh-group-talk-l-modal",
        }, body),
        auditOpen && group ? h(Modal, {
          open: true,
          onClose: () => setAuditOpen(false),
          title: t("auditTitle"),
          closeLabel: t("close"),
          className: "dsh-group-talk-l-modal dsh-group-talk-l-audit-modal",
        }, h(AuditView, { group, onBack: () => setAuditOpen(false), t })) : null,
        dialogs)
    }

    /** Header shortcut: opens the full-area group panel (the sidebar owns the entry). */
    function GroupTalkLAction({ useSession, openPanel, t }) {
      // The projection uses `null` for an ordinary session; only a non-null
      // subagent address identifies a delegated conversation.
      const isSubagent = useSession((snapshot) => Boolean(snapshot?.subagent))
      if (isSubagent || typeof openPanel !== "function") return null
      return h("div", { className: "dsh-group-talk-l-root", "data-group-talk-l": true },
        h(Button, {
          variant: "ghost",
          size: "sm",
          className: "dsh-group-talk-l-trigger",
          icon: h(IconUsersOutlineRegular, { size: 14 }),
          "aria-label": t("trigger"),
          onClick: openPanel,
        }, h("span", { className: "dsh-group-talk-l-trigger-label" }, t("trigger"))))
    }

    /** Sidebar rail entry: one glyph, plus a quiet unread dot. */
    function GroupTalkLIcon({ size = 16, active, openPanel }) {
      const unread = useUnreadCount(HUMAN, !active)
      const [pinned, setPinned] = useState(readPinned())
      useEffect(() => {
        const onChange = (event) => setPinned(Boolean(event?.detail?.pinned ?? readPinned()))
        window.addEventListener(PIN_EVENT, onChange)
        return () => window.removeEventListener(PIN_EVENT, onChange)
      }, [])
      useEffect(() => {
        if (!pinned || active || typeof openPanel !== "function") return undefined
        // An explicit click on a Session row already means "leave the room";
        // an automatic Session activation (a new delivery) must not.
        if (Date.now() - lastExternalPointerAt < 900) return undefined
        // A new message must not silently drop the person out of the room. The
        // pin is installed while the room is open and cleared by an explicit
        // navigation or by 返回对话.
        const timer = setTimeout(() => {
          if (typeof document === "undefined" || !document.hidden) openPanel()
        }, 80)
        return () => clearTimeout(timer)
      }, [pinned, active, openPanel])
      return h("span", { className: "dsh-group-talk-l-panel-icon", "data-group-talk-l": true },
        h(IconUsersOutlineRegular, { size: Number(size) || 16 }),
        pinned ? h("span", { className: "dsh-group-talk-l-pin-mark", "aria-hidden": "true" }, "·") : null,
        unread > 0 && !active ? h("span", { className: "dsh-group-talk-l-unread-dot", "aria-hidden": "true" }) : null)
    }

    /** Keep a panel-level render error inside the group room, not the shell. */
    let PanelBoundary = ({ children }) => children
    if (typeof React.Component === "function") {
      PanelBoundary = class GroupTalkLPanelBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { failed: false }
          this.retry = this.retry.bind(this)
        }

        static getDerivedStateFromError() {
          return { failed: true }
        }

        componentDidCatch(error) {
          try {
            console.error("[group-talk-l] panel render failed", error)
          } catch {}
        }

        retry() {
          this.setState({ failed: false })
        }

        render() {
          if (!this.state.failed) return this.props.children
          const t = this.props.t ?? ((key) => key)
          return h("div", { className: "dsh-group-talk-l-page dsh-group-talk-l-crash" },
            h("div", { className: "dsh-group-talk-l-empty" },
              h("div", { className: "dsh-group-talk-l-empty-title" }, t("panelCrashed")),
              h("div", { className: "dsh-group-talk-l-empty-text" }, t("panelCrashedHint")),
              h("div", { className: "dsh-group-talk-l-form-actions" },
                h("button", { type: "button", className: "dsh-group-talk-l-iconbutton", onClick: this.retry }, t("retry")),
                h("button", { type: "button", className: "dsh-group-talk-l-iconbutton", onClick: this.props.onClose }, t("backToChat")))))
        }
      }
    }

    /** Full-area panel: a normal conversation surface with the app sidebar kept. */
    function GroupTalkLPanel({ sessionList, closePanel, openSession, t }) {
      const snapshot = useSessionSnapshot(sessionList)
      const useSessions = (selector) => selector(snapshot)
      // The slot usually supplies `t`; keep the panel readable if a host build
      // only injects the bound translator or neither.
      const translate = typeof t === "function" ? t : (key) => key
      useEffect(() => {
        writePinned(true)
        if (typeof document === "undefined") return undefined
        const onPointer = (event) => {
          const target = event?.target
          if (target && typeof target.closest === "function" && target.closest(".dsh-group-talk-l-page")) return
          lastExternalPointerAt = Date.now()
          writePinned(false)
        }
        document.addEventListener("pointerdown", onPointer, true)
        return () => document.removeEventListener("pointerdown", onPointer, true)
      }, [])
      const leave = () => {
        writePinned(false)
        closePanel()
      }
      return h(PanelBoundary, { t: translate, onClose: leave },
        h(GroupCenter, {
          embedded: true,
          open: true,
          onClose: leave,
          sessionId: HUMAN,
          useSessions,
          openSession,
          t: translate,
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

    const inject = ["sessions", "uiWorkspace", "slots", "locale", "layout"]

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
      ctx.effect(() => installIncomingGroupMarkers(), "group-talk-l: group message markers")
      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
        name: "conversation.session.header.actions",
        id: "group-talk-l",
        order: -12,
        locale: NS,
        inject: () => ({
          openPanel: () => ctx.layout?.selectPanel?.(PANEL_ID),
        }),
      }, GroupTalkLAction))

      // A keyed `main` panel plus a sidebar rail entry: the group chat occupies
      // the same area as a conversation instead of living in a modal.
      if (typeof ctx.inject === "function") {
        ctx.inject(["layout"], (pageCtx) => {
          pageCtx.slots.inject("main", () => pageCtx.slots.register({
            name: "main",
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              sessionList: ctx.sessions?.list,
              openSession: (id) => ctx.uiWorkspace.openSession(id),
              closePanel: () => pageCtx.layout.selectPanel(null),
              t: pageCtx.locale.bind(NS),
            }),
          }, GroupTalkLPanel))
          pageCtx.slots.inject("sidebar.panellist", () => pageCtx.slots.register({
            name: "sidebar.panellist",
            id: PANEL_ID,
            order: 20,
            label: () => pageCtx.locale.bind(NS)("trigger"),
            locale: NS,
            inject: () => ({ openPanel: () => pageCtx.layout?.selectPanel?.(PANEL_ID) }),
          }, GroupTalkLIcon))
        })
      }
    }

    exports.name = "group-talk-l"
    exports.inject = inject
    exports.apply = apply
    // Pure view helpers and the panel's leaf components, exported for the Node
    // test harness. None of them touch Host state directly.
    exports.__internals = {
      deriveWaiting,
      versionAtLeast,
      unreadFor,
      seedSeen,
      markSeen,
      readSeen,
      writeSeen,
      SEEN_PREFIX,
      SEEN_EVENT,
      GroupDetail,
      GroupList,
      CreateForm,
      GroupCenter,
      GroupTalkLPanel,
      AuditView,
      ROLE_PRESETS,
    }
    return module.exports
  },
})
