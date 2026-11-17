window.__ModuleLoader__.load({
  id: "@leica-shen/dsh-group-chat",
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
.dsh-group-talk-l-unread-dot { position: absolute; top: 1px; right: -1px; width: 7px; height: 7px; border-radius: 999px; background: var(--dsw-alias-state-warning-primary, #d97706); box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1); pointer-events: none; }
.dsh-group-talk-l-row-unread { flex: none; min-width: 18px; height: 18px; padding: 0 6px; border-radius: 999px; background: var(--dsw-alias-state-warning-primary, #d97706); color: #fff; font-size: 11px; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums; }
.dsh-group-talk-l-workspace-create { box-sizing: border-box; display: inline-flex; flex: none; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: 2px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; pointer-events: auto; position: relative; z-index: 1; }
.dsh-group-talk-l-workspace-create:hover, .dsh-group-talk-l-workspace-create:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-workspace-create:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: -2px; }
[class*="sectionLabelHidden"] + .dsh-group-talk-l-workspace-create { display: none; }
@container (max-width: 480px) { .dsh-group-talk-l-trigger-label { display: none; } }
.dsh-group-talk-l-page { height: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); }
.dsh-group-talk-l-page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px 8px; border-bottom: .5px solid var(--dsw-alias-border-l2); flex: none; }
.dsh-group-talk-l-page-title { display: flex; flex-direction: column; gap: 2px; color: var(--dsw-alias-label-primary); font-size: 15px; line-height: 20px; font-weight: 500; }
.dsh-group-talk-l-page-sub { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 17px; font-weight: 400; }
.dsh-group-talk-l-page-notice { display: flex; align-items: flex-start; gap: 6px; margin: 8px 18px 0; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-page-notice-warn { color: var(--dsw-alias-state-warning-primary, #b45309); }
.dsh-group-talk-l-page-body { flex: 1; min-height: 0; display: flex; padding: 12px 18px 14px; }
.dsh-group-talk-l-page-body > .dsh-group-talk-l-shell { flex: 1; max-height: none; min-height: 0; height: 100%; }
.dsh-group-talk-l-page-body > .dsh-group-talk-l-create { flex: 1; max-height: none; }
.dsh-group-talk-l-panel-icon { position: relative; display: inline-flex; align-items: center; justify-content: center; color: inherit; }
.dsh-group-talk-l-panel-icon .dsh-group-talk-l-unread-dot { top: -1px; right: -3px; box-shadow: 0 0 0 2px var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base)); }
.dsh-group-talk-l-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-group-talk-l-chip { border: .5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 4px 11px; font-size: 12px; line-height: 18px; cursor: pointer; }
.dsh-group-talk-l-chip:hover, .dsh-group-talk-l-chip:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-chip-active { border-color: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-pick-duty { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 17px; }
.dsh-group-talk-l-at { min-width: 26px; padding: 0 6px; font-weight: 600; }
.dsh-group-talk-l-target { position: relative; display: inline-flex; }
.dsh-group-talk-l-target-button { white-space: nowrap; }
.dsh-group-talk-l-caret { margin-left: 4px; color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-pop-overlay { position: fixed; inset: 0; z-index: 40; }
.dsh-group-talk-l-target-menu { position: fixed; z-index: 41; min-width: 220px; max-height: min(320px, 60vh); overflow-y: auto; padding: 4px; border-radius: 9px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-menu, 0 10px 30px rgba(0, 0, 0, .18)), 0 0 0 .5px var(--dsw-alias-border-l2); }
.dsh-group-talk-l-target-menu button { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; padding: 7px 9px; border-radius: 6px; text-align: left; cursor: pointer; }
.dsh-group-talk-l-target-menu button:hover, .dsh-group-talk-l-target-menu button:focus-visible, .dsh-group-talk-l-target-menu button[data-active="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-target-menu button[disabled] { color: var(--dsw-alias-label-tertiary); cursor: not-allowed; }
.dsh-group-talk-l-target-note { padding: 6px 9px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-menu { position: absolute; z-index: 30; right: 0; top: calc(100% + 6px); min-width: 210px; padding: 5px; border-radius: 9px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-menu, 0 10px 30px rgba(0, 0, 0, .18)), 0 0 0 .5px var(--dsw-alias-border-l2); }
.dsh-group-talk-l-menu button { display: flex; align-items: center; gap: 8px; width: 100%; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; padding: 7px 9px; border-radius: 6px; text-align: left; cursor: pointer; }
.dsh-group-talk-l-menu button:hover, .dsh-group-talk-l-menu button:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-menu-sep { height: .5px; margin: 4px 6px; background: var(--dsw-alias-border-l2); }
.dsh-group-talk-l-modal { width: min(880px, 100%); max-height: 100%; }
.dsh-group-talk-l-shell { display: flex; min-height: 0; max-height: none; gap: 16px; }
.dsh-group-talk-l-shell-list-collapsed { gap: 0; }
.dsh-group-talk-l-sidebar { width: 232px; flex: none; display: flex; flex-direction: column; gap: 8px; min-height: 0; border-right: .5px solid var(--dsw-alias-border-l2); padding-right: 12px; }
.dsh-group-talk-l-sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 2px; }
.dsh-group-talk-l-sidebar-title { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; }
.dsh-group-talk-l-list { display: flex; flex-direction: column; gap: 3px; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; padding-right: 2px; }
.dsh-group-talk-l-list-empty { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 8px 2px; }
.dsh-group-talk-l-row { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; border: 0; border-left: 2px solid transparent; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary); padding: 8px 9px; cursor: pointer; }
.dsh-group-talk-l-row:hover, .dsh-group-talk-l-row:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-group-talk-l-row-active { background: var(--dsw-alias-interactive-bg-hover); border-left-color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-row-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-group-talk-l-row-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; }
.dsh-group-talk-l-row-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-main { min-width: 0; flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; position: relative; }
.dsh-group-talk-l-main-head { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 6px 10px; padding: 0 2px 8px; flex: none; }
.dsh-group-talk-l-main-headtext { min-width: 0; flex: 1; }
.dsh-group-talk-l-main-title { margin: 0; color: var(--dsw-alias-label-primary); font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.dsh-group-talk-l-main-sub { margin: 2px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dsh-group-talk-l-head-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; flex: none; max-width: 64%; position: relative; }
.dsh-group-talk-l-section { border-top: .5px solid var(--dsw-alias-border-l2); padding: 8px 2px 0; min-height: 0; }
.dsh-group-talk-l-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.dsh-group-talk-l-section-title { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; }
.dsh-group-talk-l-members { display: flex; flex-direction: column; gap: 5px; max-height: 188px; overflow-y: auto; padding-right: 2px; }
.dsh-group-talk-l-members-drawer { position: absolute; z-index: 6; top: 52px; right: 10px; width: min(330px, 86%); max-height: 60%; padding: 10px; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-menu, 0 10px 30px rgba(0, 0, 0, .18)), 0 0 0 .5px var(--dsw-alias-border-l2); }
.dsh-group-talk-l-member { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); }
.dsh-group-talk-l-member-icon { flex: none; color: var(--dsw-alias-label-tertiary); display: inline-flex; }
.dsh-group-talk-l-avatar { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 600; box-shadow: 0 0 0 .5px var(--dsw-alias-border-l2); }
.dsh-group-talk-l-member-text { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.dsh-group-talk-l-member-name { display: flex; align-items: center; gap: 5px; min-width: 0; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; }
.dsh-group-talk-l-member-alias { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-member-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-member-actions { display: flex; align-items: center; gap: 2px; flex: none; }
.dsh-group-talk-l-member-menu { flex-wrap: wrap; max-width: 86px; justify-content: flex-end; }
.dsh-group-talk-l-iconbutton { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dsh-group-talk-l-iconbutton:hover, .dsh-group-talk-l-iconbutton:focus-visible { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-iconbutton-danger:hover, .dsh-group-talk-l-iconbutton-danger:focus-visible { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-messages { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 2px; padding: 2px 4px 6px 2px; scrollbar-gutter: stable; }
.dsh-group-talk-l-day { position: sticky; top: 0; z-index: 2; align-self: center; margin: 8px 0 6px; padding: 1px 10px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 17px; box-shadow: 0 0 0 .5px var(--dsw-alias-border-l2); }
.dsh-group-talk-l-message { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-stroke); --dsw-elevation-stroke-color: var(--dsw-alias-border-l2); max-width: 86%; overflow: hidden; flex: none; }
.dsh-group-talk-l-message-self { align-self: flex-end; background: var(--dsw-alias-bg-layer-1); border: .5px solid var(--dsw-alias-border-l2); max-width: 78%; }
.dsh-group-talk-l-message-grouped { margin-top: -1px; }
.dsh-group-talk-l-message-row { display: flex; gap: 8px; align-items: flex-start; max-width: 100%; }
.dsh-group-talk-l-message-row-self { justify-content: flex-end; }
.dsh-group-talk-l-message-column { min-width: 0; display: flex; flex-direction: column; gap: 2px; max-width: 100%; }
.dsh-group-talk-l-message-system { background: transparent; box-shadow: none; padding: 2px 4px; max-width: 100%; }
.dsh-group-talk-l-message-control { border-left: 2px solid var(--dsw-alias-state-warning-primary, var(--dsw-alias-border-l2)); background: var(--dsw-alias-bg-layer-2); border-radius: 4px; padding: 8px 10px; max-width: 100%; }
.dsh-group-talk-l-message-control .dsh-group-talk-l-message-author { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dsh-group-talk-l-message-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 17px; }
.dsh-group-talk-l-message-author { color: var(--dsw-alias-label-secondary); font-weight: 600; }
.dsh-group-talk-l-message-body { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 21px; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 100%; }
.dsh-group-talk-l-message-body a { color: var(--dsw-alias-state-business-primary); text-decoration: underline; text-underline-offset: 2px; }
.dsh-group-talk-l-message-system .dsh-group-talk-l-message-body { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-message-tools { display: flex; flex-wrap: wrap; gap: 10px; opacity: 0; transition: opacity .12s ease; }
.dsh-group-talk-l-message:hover .dsh-group-talk-l-message-tools, .dsh-group-talk-l-message:focus-within .dsh-group-talk-l-message-tools { opacity: 1; }
.dsh-group-talk-l-message-toggle { border: 0; background: transparent; color: var(--dsw-alias-state-business-primary); cursor: pointer; padding: 2px 0; font-size: 12px; line-height: 17px; text-align: left; }
.dsh-group-talk-l-message-toggle:focus-visible, .dsh-group-talk-l-collapse:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; border-radius: 3px; }
.dsh-group-talk-l-priority { display: inline-flex; align-items: center; border-radius: 999px; padding: 0 6px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 17px; }
.dsh-group-talk-l-priority-urgent { color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-state-error-primary)); }
.dsh-group-talk-l-role { display: inline-flex; align-items: center; border-radius: 999px; padding: 0 6px; font-size: 11px; line-height: 17px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); white-space: nowrap; }
.dsh-group-talk-l-role-organizer { color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-role-security { color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-state-error-primary)); }
.dsh-group-talk-l-role-secretary { color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-audit-mark { font-size: 11px; color: var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-tertiary)); }
.dsh-group-talk-l-member-alias { overflow-wrap: anywhere; min-width: 0; }
.dsh-group-talk-l-delivery-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 17px; }
.dsh-group-talk-l-composer { border-top: .5px solid var(--dsw-alias-border-l2); margin-top: 8px; padding: 8px 2px 0; display: flex; flex-direction: column; gap: 6px; flex: none; }
.dsh-group-talk-l-composer-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.dsh-group-talk-l-select { height: 28px; min-width: 128px; max-width: 230px; border: .5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 0 8px; }
.dsh-group-talk-l-textarea { box-sizing: border-box; width: 100%; min-height: 62px; max-height: 150px; resize: vertical; border: .5px solid var(--dsw-alias-border-l3); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; padding: 8px 10px; }
.dsh-group-talk-l-textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-textarea:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-incoming-row [class*="bubble"] { border-left: 2px solid var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-incoming-badge { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px; color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-bg-layer-2); border: .5px solid var(--dsw-alias-border-l2); border-radius: 999px; padding: 1px 7px; margin-bottom: 2px; font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-version { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; padding: 6px 2px 0; }
.dsh-group-talk-l-waiting { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 4px 2px 0; }
.dsh-group-talk-l-composer-hint { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; min-width: 0; }
.dsh-group-talk-l-composer-hint-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-group-talk-l-help-pop { position: absolute; z-index: 31; bottom: calc(100% + 6px); left: 0; width: min(420px, 88vw); padding: 10px 12px; border-radius: 9px; background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-menu, 0 10px 30px rgba(0, 0, 0, .18)), 0 0 0 .5px var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-help-pop ul { margin: 4px 0 0; padding-left: 16px; }
.dsh-group-talk-l-dissolved { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; padding: 10px 2px 4px; border-top: .5px solid var(--dsw-alias-border-l2); margin-top: 8px; }
.dsh-group-talk-l-notice { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; line-height: 18px; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-notice-error { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-notice-success { color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-notice-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dsh-group-talk-l-notice-close { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0 2px; font-size: 14px; line-height: 16px; opacity: .7; }
.dsh-group-talk-l-notice-close:hover { opacity: 1; }
.dsh-group-talk-l-empty { flex: 1; min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--dsw-alias-label-tertiary); }
.dsh-group-talk-l-empty-icon { opacity: .55; }
.dsh-group-talk-l-empty-title { color: var(--dsw-alias-label-secondary); font-size: 14px; font-weight: 500; }
.dsh-group-talk-l-empty-text { max-width: 340px; font-size: 12px; line-height: 19px; }
.dsh-group-talk-l-create { display: flex; flex-direction: column; gap: 12px; max-height: min(640px, calc(100vh - 220px)); overflow-y: auto; padding: 0 2px 2px; }
.dsh-group-talk-l-field { display: flex; flex-direction: column; gap: 5px; }
.dsh-group-talk-l-field-label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; }
.dsh-group-talk-l-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-field-row { display: flex; gap: 8px; }
.dsh-group-talk-l-field-row > * { flex: 1; min-width: 0; }
.dsh-group-talk-l-card { border: .5px solid var(--dsw-alias-border-l2); border-radius: 9px; padding: 10px 12px; background: var(--dsw-alias-bg-layer-2); display: flex; flex-direction: column; gap: 8px; }
.dsh-group-talk-l-card-title { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; }
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
.dsh-group-talk-l-form-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; border-top: .5px solid var(--dsw-alias-border-l2); padding-top: 10px; flex: none; }
.dsh-group-talk-l-modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.dsh-group-talk-l-role-fields { display: flex; flex-direction: column; gap: 10px; }
.dsh-group-talk-l-confirm { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dsh-group-talk-l-confirm-list { margin: 6px 0 0; padding-left: 18px; font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-danger { color: var(--dsw-alias-state-error-primary); }
.dsh-group-talk-l-collapse { border: 0; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; padding: 0; font-size: 14px; line-height: 18px; }
.dsh-group-talk-l-collapse:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-group-talk-l-row-preview { display: block; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.dsh-group-talk-l-pinned { color: var(--dsw-alias-state-business-primary); }
.dsh-group-talk-l-mode { max-width: 150px; }
.dsh-group-talk-l-search { margin: 0 2px; }
.dsh-group-talk-l-audit .dsh-group-talk-l-messages { border: .5px solid var(--dsw-alias-border-l2); border-radius: 9px; padding: 10px; }
.dsh-group-talk-l-audit-modal .dsh-group-talk-l-main { min-height: 420px; max-height: min(640px, calc(100vh - 180px)); overflow-y: auto; }
.dsh-group-talk-l-audit-failures { display: flex; flex-direction: column; gap: 6px; }
.dsh-group-talk-l-relay-list { display: flex; flex-direction: column; gap: 6px; }
.dsh-group-talk-l-relay-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 7px 9px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 18px; }
.dsh-group-talk-l-relay-meta { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dsh-group-talk-l-stat { border: .5px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 8px 10px; background: var(--dsw-alias-bg-layer-2); }
.dsh-group-talk-l-stat-value { color: var(--dsw-alias-label-primary); font-size: 16px; line-height: 22px; font-variant-numeric: tabular-nums; }
.dsh-group-talk-l-stat-label { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.dsh-group-talk-l-settings { display: flex; flex-direction: column; gap: 10px; }
.dsh-group-talk-l-kbd { border: .5px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsh-group-talk-l-linkish { border: 0; background: transparent; color: var(--dsw-alias-state-business-primary); cursor: pointer; padding: 0; font: inherit; font-size: 12px; }
.dsh-group-talk-l-crash { align-items: center; justify-content: center; }
@media (max-width: 760px) {
  .dsh-group-talk-l-shell { flex-direction: column; }
  .dsh-group-talk-l-sidebar { width: 100%; border-right: 0; border-bottom: .5px solid var(--dsw-alias-border-l2); padding: 0 0 10px; }
  .dsh-group-talk-l-list { max-height: 180px; }
  .dsh-group-talk-l-head-actions { max-width: 100%; }
  .dsh-group-talk-l-message, .dsh-group-talk-l-message-self { max-width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-group-talk-l-message-tools { transition: none; }
}
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
      participantsCount: "{count} 位成员",
      panelSubtitle: "像普通对话一样和参与者交流",
      backToChat: "返回对话",
      createHint2: "你是主持人；参与者是已有会话。每位参与者会让此后每次请求多约 800–1200 token 的群聊说明。",
      selectParticipants: "选择参与者",
      roleCustom: "自定义",
      roleLabel: "角色",
      noParticipants: "至少选择一位参与者。",
      sendTo: "发送给",
      allParticipants: "全部参与者",
      allTooMany: "单次最多 {max} 人，当前 {count} 人；请按 @别名 或角色分批发送。",
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
      priorityAmbient: "通知（本轮结束后）",
      priorityUrgent: "紧急（step 边界）",
      priorityHint: "通知：等目标完成当前回合后送达，不改变当前计划；紧急：下一个 step 边界优先处理。两者都不中止正在运行的工具。",
      priorityUnsupported: "当前 Host 不支持 priority；重启加载 2.1+ 后启用。",
      priorityAmbientShort: "本轮后送达",
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
      nudgeMessage: "提醒：群聊「{group}」里有消息还在等待你的回复。请用 group_talk_send 发到群里（target 用 * 或 @对方；purpose 用 review，无法处理时用 blocked），或说明你暂时无法回复。",
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
      hostOutdated: "Host 版本 v{version} 低于 client 2.3.0：按需审计、2.3 投递语义和 purpose 门禁需要重启 Harness 才会加载。",
      recordedToHuman: "已写入群记录：{name} 是 UI-only 操作者，不会唤醒会话（旧 Host 无法投递）。",
      hostMismatch: "Host {version} 与面板 {client} 不一致，部分功能可能不可用；请重启 Harness 加载新版 Host。",
      lang: "语言",
      langSystem: "跟随系统",
      langZh: "中文",
      langEn: "English",
      moreActions: "更多操作",
      settings: "设置",
      settingsTitle: "群聊设置",
      settingsHint: "这些限额属于 Host 配置（cordis.patch.yml），面板只读显示；改动后需重启一次。",
      settingsDelegationOn: "已启用子代理委派（只读工具白名单）",
      settingsDelegationOff: "未启用子代理委派",
      settingsNotesOn: "已启用审计记录",
      settingsNotesOff: "未启用审计记录",
      showingRecent: "最近 {shown} / 共 {total} 条",
      historyTruncatedText: "为控制长度，这里只显示最近 {shown} 条，共 {total} 条。",
      loadEarlier: "加载更早",
      loadingEarlier: "正在加载…",
      dateToday: "今天",
      dateYesterday: "昨天",
      openLinkConfirm: "在浏览器打开这个链接？\n{url}",
      groupIdLabel: "群聊 ID",
      copy: "复制",
      copiedId: "已复制群聊 ID",
      mute: "静音",
      unmute: "取消静音",
      hide: "从列表隐藏",
      unhide: "取消隐藏",
      muted: "已静音",
      markAllRead: "全部已读",
      allReadDone: "已把全部群聊标为已读。",
      searchGroups: "搜索群聊",
      searchMessages: "搜索消息",
      noMatches: "没有匹配项。",
      pause: "暂停群聊",
      resume: "恢复群聊",
      pauseHost: "暂停全部群聊",
      resumeHost: "恢复全部群聊",
      pausedBanner: "群聊已暂停：消息会记录，但不会唤醒任何会话。",
      pausedHostBanner: "全部群聊已暂停：消息会记录，但不会唤醒任何会话。",
      relayPause: "暂停传话筒",
      relayResume: "恢复传话筒",
      rename: "重命名",
      renameTitle: "重命名群聊",
      renamePlaceholder: "新的群聊名称",
      topicTitle: "编辑主题",
      topicField: "主题",
      sensitivity: "敏感度",
      sensitivityPublic: "公开",
      sensitivityInternal: "内部",
      sensitivitySecret: "机密（仅面板可发）",
      cleanup: "清理失效成员",
      cleanupDone: "已移除失效会话：{names}",
      cleanupNone: "所有成员会话仍然存在。",
      relay: "向 @{alias} 确认",
      relayTitle: "传话筒 · 一对一确认",
      relayHint: "只传一轮，默认 10 分钟超时；不写入群记录，不能批准预算、付款或删除。",
      relaySend: "发出传话",
      relayPlaceholder: "要确认的具体问题…",
      relayIntent: "意图",
      relayConfirm: "确认（confirm）",
      relayAsk: "询问（ask）",
      relayHandoff: "转交（handoff）",
      relayStatus: "传话记录",
      noRelays: "还没有传话记录。",
      relaySentDone: "传话已发出，答案会回到当前会话。",
      broadcastTitle: "确认群发",
      broadcastText: "这条消息会唤醒多个会话。确认收件人与预估成本后再发送。",
      broadcastRecipients: "收件人：{names}",
      broadcastCost: "预计 {tokens} tokens（{count} 个会话）",
      broadcastConfirm: "确认发送",
      sendEmptyRoom: "房间还没有参与者；先添加成员再发消息。",
      read: "已读",
      held: "已暂存",
      queued: "收件箱",
      copyMessage: "复制",
      reply: "引用回复",
      replyTo: "回复 @{alias}",
      quotePrefix: "> @{alias}：{text}",
      dismiss: "关闭",
      exportChat: "导出记录",
      exportDone: "已生成脱敏导出（{chars} 字符）。",
      auditTotal: "{shown} / 共 {total} 条",
      settingsStats: "运行统计",
      settingsLimits: "当前限额",
      settingsRelay: "传话筒",
      settingsPauseHost: "全站急停",
      settingsTransport: "连接方式",
      settingsWake: "可唤醒会话",
      settingsMailbox: "收件箱模式（不即时）",
      settingsRetention: "保留期：{days} 天",
      settingsPolicy: "群聊说明上限：{chars} 字符",
      settingsConcurrency: "并发投递上限：{max}",
      settingsVoice: "普通回答不会自动回群；成员必须显式调用群聊工具。",
      keyboardHint: "Enter 发送 · Shift+Enter 换行 · Esc 关闭",
      roleOwner: "群主",
      youPanel: "你（面板）",
      roleMismatch: "角色标签不等于权限；组织者权限由群主显式授予。",
      digest: "本轮摘要",
      digestTitle: "群聊摘要",
      digestToday: "今天 {count} 条消息",
      digestDecisions: "已记录的决定",
      digestNoDecisions: "还没有记录决定；组织者/秘书可用 group_talk_note kind=decision 或 /group decision。",
      digestWaiting: "等待回复",
      digestNoWaiting: "没有等待中的投递。",
      digestFailures: "最近失败/未确认",
      digestNoFailures: "没有失败或未确认的投递。",
      digestRelays: "进行中的传话",
      digestNoRelays: "没有进行中的传话。",
      digestRecent: "最近消息",
      digestCopy: "复制摘要",
      digestCopied: "摘要已复制",
      digestEmpty: "这个群还没有可摘要的内容。",
      membersIncludeYou: "上限含你（人类操作者）",
      secretTitle: "这条消息可能包含凭据",
      secretText: "群记录是明文，所有成员都能读到。确认这是占位符或你确实要发送吗？",
      renamed: "群聊已重命名。",
      unhideAll: "恢复全部隐藏的群聊（{count}）",
      taintPasted: "粘贴内容 · 不可信",
      taintTool: "工具输出 · 不可信",
      controlDecision: "决定",
      redact: "脱敏",
      messageField: "消息内容",
      composerHintFull: "发送给 @别名/#角色/*；人类消息优先，单次最多 6 人；成员必须用群聊工具显式回复；每日额度按本地零点重置。",
      composerHelpTitle: "发送说明",
      composerHelpTargets: "目标是 @别名（单人）、#角色（同角色全部）或 *（其他所有人）。广播前会显示收件人与预估成本。",
      composerHelpCost: "每条消息会唤醒一个完整回合；一次广播等于多次推理，预算按估算先扣。",
      composerHelpReply: "对方的普通回答不会自动回群；只有显式调用 group_talk_send 才会回到这里。",
      composerHelpKeys: "Enter 发送，Shift+Enter 换行，Esc 关闭菜单。",
      composerHelpNote: "审计记录与决定最多 1000 字；它们进入审计日志，不是聊天指令。",
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
      participantsCount: "{count} members",
      panelSubtitle: "Talk to participants like an ordinary conversation",
      backToChat: "Back to chat",
      createHint2: "You are the host; participants are existing sessions. Each participant adds roughly 800–1200 tokens to every subsequent request.",
      selectParticipants: "Select participants",
      roleCustom: "Custom",
      roleLabel: "Role",
      noParticipants: "Select at least one participant.",
      sendTo: "Send to",
      allParticipants: "All participants",
      allTooMany: "At most {max} recipients per send; this room has {count}. Send to an alias or role in batches.",
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
      priorityAmbient: "Notice (after this turn)",
      priorityUrgent: "Urgent (step boundary)",
      priorityHint: "Notice: delivered after the target finishes its current turn, without changing the plan. Urgent: handle at the next step boundary. Neither aborts a running tool.",
      priorityUnsupported: "This Host does not support priority; restart with 2.1+.",
      priorityAmbientShort: "After this turn",
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
      nudgeMessage: "Reminder: a message in group chat \"{group}\" is waiting for your reply. Use group_talk_send with target * or @sender and purpose review (blocked if you cannot help), or say you cannot reply right now.",
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
      hostOutdated: "Host v{version} is below client 2.3.0: audit-on-demand, the 2.3 delivery semantics and the purpose gate need a Harness restart.",
      recordedToHuman: "Recorded in the room: {name} is the UI-only operator, so no session is woken (the old Host cannot deliver to it).",
      hostMismatch: "Host {version} does not match panel {client}; some features may be unavailable. Restart Harness to load the new Host half.",
      lang: "Language",
      langSystem: "Follow system",
      langZh: "中文",
      langEn: "English",
      moreActions: "More actions",
      settings: "Settings",
      settingsTitle: "Group chat settings",
      settingsHint: "These limits are Host configuration (cordis.patch.yml); the panel only reads them. A change needs one restart.",
      settingsDelegationOn: "Subagent delegation is enabled (read-only tool allow-list)",
      settingsDelegationOff: "Subagent delegation is disabled",
      settingsNotesOn: "Audited notes are enabled",
      settingsNotesOff: "Audited notes are disabled",
      showingRecent: "Last {shown} of {total}",
      historyTruncatedText: "Only the most recent {shown} of {total} entries are shown.",
      loadEarlier: "Load earlier",
      loadingEarlier: "Loading…",
      dateToday: "Today",
      dateYesterday: "Yesterday",
      openLinkConfirm: "Open this link in a browser?\n{url}",
      groupIdLabel: "Group chat ID",
      copy: "Copy",
      copiedId: "Group chat ID copied",
      mute: "Mute",
      unmute: "Unmute",
      hide: "Hide from list",
      unhide: "Unhide",
      muted: "Muted",
      markAllRead: "Mark all read",
      allReadDone: "Marked every group chat as read.",
      searchGroups: "Search group chats",
      searchMessages: "Search messages",
      noMatches: "No matches.",
      pause: "Pause group chat",
      resume: "Resume group chat",
      pauseHost: "Pause every group chat",
      resumeHost: "Resume every group chat",
      pausedBanner: "This group chat is paused: messages are recorded but no session is woken.",
      pausedHostBanner: "Every group chat is paused: messages are recorded but no session is woken.",
      relayPause: "Pause relay",
      relayResume: "Resume relay",
      rename: "Rename",
      renameTitle: "Rename group chat",
      renamePlaceholder: "New group chat name",
      topicTitle: "Edit topic",
      topicField: "Topic",
      sensitivity: "Sensitivity",
      sensitivityPublic: "Public",
      sensitivityInternal: "Internal",
      sensitivitySecret: "Secret (panel only)",
      cleanup: "Clean up missing members",
      cleanupDone: "Removed missing sessions: {names}",
      cleanupNone: "Every member session still exists.",
      relay: "Confirm with @{alias}",
      relayTitle: "Relay · one-to-one confirmation",
      relayHint: "One round by default, 10-minute timeout, never written to a room, never an approval for budget, payment or deletion.",
      relaySend: "Send relay",
      relayPlaceholder: "The exact question to confirm…",
      relayIntent: "Intent",
      relayConfirm: "Confirm",
      relayAsk: "Ask",
      relayHandoff: "Hand off",
      relayStatus: "Relay log",
      noRelays: "No relays yet.",
      relaySentDone: "Relay sent; the answer returns to this conversation.",
      broadcastTitle: "Confirm broadcast",
      broadcastText: "This message wakes several sessions. Check the recipients and estimated cost before sending.",
      broadcastRecipients: "Recipients: {names}",
      broadcastCost: "About {tokens} tokens ({count} sessions)",
      broadcastConfirm: "Send anyway",
      sendEmptyRoom: "This room has no participants yet; add a member before sending.",
      read: "Read",
      held: "Held",
      queued: "Inbox",
      copyMessage: "Copy",
      reply: "Quote reply",
      replyTo: "Reply to @{alias}",
      quotePrefix: "> @{alias}: {text}",
      dismiss: "Dismiss",
      exportChat: "Export transcript",
      exportDone: "Redacted export ready ({chars} characters).",
      auditTotal: "{shown} / {total} total",
      settingsStats: "Runtime stats",
      settingsLimits: "Current limits",
      settingsRelay: "Relay",
      settingsPauseHost: "Host emergency stop",
      settingsTransport: "Transport",
      settingsWake: "Can wake sessions",
      settingsMailbox: "Mailbox mode (not instant)",
      settingsRetention: "Retention: {days} days",
      settingsPolicy: "Group policy budget: {chars} chars",
      settingsConcurrency: "Concurrent deliveries: {max}",
      settingsVoice: "An ordinary answer never returns to the room; members must call the group tool explicitly.",
      keyboardHint: "Enter sends · Shift+Enter adds a line · Esc closes",
      roleOwner: "Owner",
      youPanel: "You (panel)",
      roleMismatch: "A role label is not a permission; organizer capability is granted by the owner.",
      digest: "Round digest",
      digestTitle: "Group digest",
      digestToday: "{count} messages today",
      digestDecisions: "Recorded decisions",
      digestNoDecisions: "No decision recorded yet; a secretary/organizer can use group_talk_note kind=decision or /group decision.",
      digestWaiting: "Waiting for a reply",
      digestNoWaiting: "No delivery is waiting.",
      digestFailures: "Recent failures / unconfirmed",
      digestNoFailures: "No failed or unconfirmed delivery.",
      digestRelays: "Open relays",
      digestNoRelays: "No open relay.",
      digestRecent: "Recent messages",
      digestCopy: "Copy digest",
      digestCopied: "Digest copied",
      digestEmpty: "Nothing to digest in this room yet.",
      membersIncludeYou: "The ceiling includes you (the human operator)",
      secretTitle: "This message may contain a credential",
      secretText: "The room transcript is plain text and every member can read it. Confirm only if this is a placeholder or you really mean to send it.",
      renamed: "Group chat renamed.",
      unhideAll: "Show every hidden group chat ({count})",
      taintPasted: "Pasted · untrusted",
      taintTool: "Tool output · untrusted",
      controlDecision: "Decision",
      redact: "Redacted",
      messageField: "Message text",
      composerHintFull: "Send to an alias, a role or everyone; the human goes first, at most six recipients per send; members must answer with the group tool; the daily ledger resets at local midnight.",
      composerHelpTitle: "Sending",
      composerHelpTargets: "A target is @alias (one member), #role (everyone with that role) or * (everyone else). A broadcast shows recipients and estimated cost first.",
      composerHelpCost: "Every message wakes a full turn; a broadcast is several inferences, and the budget is charged up front from an estimate.",
      composerHelpReply: "An ordinary answer never returns to the room; only an explicit group_talk_send does.",
      composerHelpKeys: "Enter sends, Shift+Enter adds a line, Esc closes a menu.",
      composerHelpNote: "Notes and decisions are capped at 1,000 characters; they are audit rows, not chat instructions.",
    }

    /** Same-origin authenticated request to the Host's exact Fetch route. */
    async function api(method, sessionId, payload, signal, options = {}) {
      const params = new URLSearchParams({ sessionId })
      if (options.lang) params.set("lang", options.lang)
      if (options.limit) params.set("limit", String(options.limit))
      if (options.stats) params.set("stats", "1")
      const lifetime = signal ?? AbortSignal.timeout(method === "GET" ? 10000 : 45000)
      const init = method === "GET"
        ? {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: lifetime,
            ...(options.etag ? { headers: { "if-none-match": options.etag } } : {}),
          }
        : {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json", "x-group-talk-l": "1" },
            body: JSON.stringify({ sessionId, ...(options.lang ? { lang: options.lang } : {}), ...payload }),
            signal: lifetime,
          }
      const response = await fetch(`/api/group-talk-l?${params.toString()}`, init)
      if (response.status === 304) return { __notModified: true, etag: options.etag }
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok) {
        const error = new Error(body?.error?.message ?? `Request failed (${response.status})`)
        error.code = body?.error?.code
        error.suggestion = body?.error?.suggestion
        error.retryAfterMs = body?.error?.retryAfterMs
        error.status = response.status
        throw error
      }
      if (response.headers?.get?.("etag")) body.__etag = response.headers.get("etag")
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

    // ---------------------------------------------------------------- 语言
    //
    // Three states: follow the host (default), force zh, force en. The override
    // is local because the host dictionary is already registered; the panel
    // simply prefers its own copy of the same keys. API calls send the chosen
    // language so host errors come back localized too (S29).

    const LANG_KEY = "group-talk-l:lang"

    function readLangPref() {
      try {
        const value = window.localStorage?.getItem(LANG_KEY)
        return value === "zh" || value === "en" ? value : "system"
      } catch {
        return "system"
      }
    }

    function writeLangPref(value) {
      try {
        window.localStorage?.setItem(LANG_KEY, value)
      } catch {}
    }

    function systemLang() {
      try {
        const tag = String(globalThis.navigator?.language ?? "en").toLowerCase()
        return tag.startsWith("zh") ? "zh" : "en"
      } catch {
        return "en"
      }
    }

    function effectiveLang(pref) {
      return pref === "zh" || pref === "en" ? pref : systemLang()
    }

    /** Wrap the host translator with the panel's local override. */
    function makeTranslator(baseT, pref) {
      if (pref === "system" && typeof baseT === "function") {
        // Follow the host exactly (it already owns the language decision).
        return (key, values) => {
          try {
            return baseT(key, values)
          } catch {
            return key
          }
        }
      }
      const dict = effectiveLang(pref) === "zh" ? zh : en
      return (key, values) => {
        let text = dict[key]
        if (typeof text !== "string") text = key
        if (!values) return text
        return text.replace(/\{(\w+)\}/gu, (_, name) => String(values[name] ?? `{${name}}`))
      }
    }

    /** Local language label for buttons. */
    function langLabel(pref, t) {
      return pref === "zh" ? t("langZh") : pref === "en" ? t("langEn") : t("langSystem")
    }

    // ---------------------------------------------------------------- 身份与角色

    /** Reserved human actor: the panel composes as the person, not a session. */
    const HUMAN = "human"
    const PANEL_ID = "group-talk-l"
    /** Client half version; keep in sync with package.json. */
    const CLIENT_VERSION = "2.4.5"

    /**
     * Role shelves. A role is a label plus a duty sentence the agent reads in
     * its group prompt; presets keep the common seats one click away.
     */
    const ROLE_PRESETS = [
      { id: "participant", zh: "参与者", en: "Participant", dutiesZh: "", dutiesEn: "" },
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
        preset.zh.toLocaleLowerCase() === needle
        || preset.en.toLocaleLowerCase() === needle
        || preset.id === needle
      ))
    }

    /** Preset for a member, preferring the stable roleId over the stored label. */
    function presetForMember(member) {
      return rolePreset(member?.roleId) ?? presetForRole(member?.role)
    }

    /** Localized display role: preset label when known, otherwise stored text. */
    function displayRole(member, t) {
      const preset = presetForMember(member)
      if (preset) return presetLabel(preset, t)
      return String(member?.role ?? "")
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
    /** Session that opened the panel; the create form offers it first (#4). */
    let pendingPreselect = ""

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

    /** Last selected room, scoped to the panel's session so two panes do not fight. */
    function readFocus(sessionId = HUMAN) {
      try {
        return window.localStorage?.getItem(`${FOCUS_KEY}:${sessionId}`) || window.localStorage?.getItem(FOCUS_KEY) || null
      } catch {
        return null
      }
    }

    function writeFocus(sessionId, id) {
      try {
        if (id) window.localStorage?.setItem(`${FOCUS_KEY}:${sessionId}`, id)
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

    const LIST_OPEN_KEY = "group-talk-l:list-open"
    const MEMBERS_OPEN_KEY = "group-talk-l:members-open"

    function readFlag(key, fallback) {
      try {
        const value = window.localStorage?.getItem(key)
        return value === null || value === undefined ? fallback : value === "1"
      } catch {
        return fallback
      }
    }

    function writeFlag(key, value) {
      try {
        window.localStorage?.setItem(key, value ? "1" : "0")
      } catch {}
    }

    const MUTE_KEY = "group-talk-l:muted"
    const HIDE_KEY = "group-talk-l:hidden"

    /** Read a `{groupId: true}` preference map. */
    function readFlagMap(key) {
      try {
        const raw = window.localStorage?.getItem(key)
        const parsed = raw ? JSON.parse(raw) : null
        const map = {}
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [id, value] of Object.entries(parsed)) {
            if (typeof id === "string" && value === true) map[id] = true
          }
        }
        return map
      } catch {
        return {}
      }
    }

    function writeFlagMap(key, map) {
      try {
        window.localStorage?.setItem(key, JSON.stringify(map))
      } catch {}
    }

    async function copyToClipboard(text) {
      // Electron exposes the native clipboard to the renderer; this preserves
      // Unicode where the legacy execCommand path may use the system encoding.
      try {
        const electron = typeof globalThis !== "undefined" ? globalThis.require?.("electron") : undefined
        if (electron?.clipboard?.writeText) {
          electron.clipboard.writeText(text)
          return true
        }
      } catch {}
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
      return { target, since: mine.at, nudgeable: true }
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
        let emptyBursts = 0
        const refresh = async () => {
          try {
            const data = await api("GET", sessionId)
            if (!alive) return
            const groups = Array.isArray(data?.groups) ? data.groups : []
            const seen = readSeen(sessionId)
            if (seedSeen(groups, seen)) writeSeen(sessionId, seen)
            const muted = readFlagMap(MUTE_KEY)
            setCount(groups.reduce((sum, group) => sum + (muted[group.id] ? 0 : unreadFor(group, seen)), 0))
            emptyBursts = groups.length === 0 ? emptyBursts + 1 : 0
          } catch {
            // The panel shows load errors; the dot just stays as it was.
          }
        }
        void refresh()
        const timer = setInterval(() => {
          // No rooms means nothing to badge. Two empty passes are enough; the
          // panel's own load and the seen event still refresh on demand.
          if (!document.hidden && emptyBursts < 2) void refresh()
        }, 60000)
        const onSeen = () => { void refresh() }
        const onVisible = () => { if (!document.hidden) void refresh() }
        window.addEventListener(SEEN_EVENT, onSeen)
        document.addEventListener?.("visibilitychange", onVisible)
        return () => {
          alive = false
          clearInterval(timer)
          window.removeEventListener(SEEN_EVENT, onSeen)
          document.removeEventListener?.("visibilitychange", onVisible)
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

    /** Compact preset selector for a participant row (stable id, localized label). */
    function RoleSelect({ value, roleId, onChange, t }) {
      const preset = rolePreset(roleId) ?? presetForRole(value)
      const selected = preset ? preset.id : (roleId === "custom" || value ? "custom" : "participant")
      return h("select", {
        className: "dsh-group-talk-l-select",
        value: selected,
        "aria-label": t("roleLabel"),
        onChange: (event) => {
          const id = event.target.value
          if (id === "custom") {
            onChange({ role: preset ? "" : (value ?? ""), roleId: "custom", duties: "" })
            return
          }
          const next = rolePreset(id)
          onChange({ role: presetLabel(next, t), roleId: next.id, duties: presetDuties(next, t) })
        },
      },
        ROLE_PRESETS.map((entry) => h("option", { key: entry.id, value: entry.id }, presetLabel(entry, t))),
        h("option", { value: "custom" }, t("roleCustom")))
    }

    /** Preset chips plus a free-text role; used by the role editor. */
    function RoleChips({ role, roleId, onPick, t }) {
      const active = rolePreset(roleId) ?? presetForRole(role)
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
    function TargetPicker({ group, sessionId, target, onChange, openSignal = 0, maxRecipients = 6, t }) {
      const [open, setOpen] = useState(false)
      const [position, setPosition] = useState(null)
      const buttonRef = useRef(null)
      useEffect(() => {
        if (openSignal > 0) openMenu()
      }, [openSignal])
      const others = group.members.filter((member) => member.sessionId !== sessionId && member.sessionId !== HUMAN)
      const roles = [...new Set(others.map((member) => member.role))]
      const overCap = others.length > maxRecipients

      /** Anchor the menu to the button and flip it when the composer is low. */
      const openMenu = () => {
        try {
          const rect = buttonRef.current?.getBoundingClientRect?.()
          if (rect && typeof window !== "undefined") {
            const below = window.innerHeight - rect.bottom
            const up = below < 300 && rect.top > below
            setPosition({
              up,
              top: up ? undefined : rect.bottom + 4,
              bottom: up ? Math.max(8, window.innerHeight - rect.top + 4) : undefined,
              left: Math.max(8, Math.min(rect.left, (window.innerWidth || 800) - 236)),
            })
          }
        } catch {
          setPosition(null)
        }
        setOpen(true)
      }

      const close = () => setOpen(false)
      const choose = (value) => {
        onChange(value)
        close()
      }
      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          close()
          try { buttonRef.current?.focus?.() } catch {}
          return
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return
        event.preventDefault()
        const items = [...(event.currentTarget.querySelectorAll("button") ?? [])].filter((node) => !node.disabled)
        if (items.length === 0) return
        const current = items.indexOf(document.activeElement)
        let next = current
        if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length
        if (event.key === "ArrowUp") next = current <= 0 ? items.length - 1 : current - 1
        if (event.key === "Home") next = 0
        if (event.key === "End") next = items.length - 1
        items[next]?.focus?.()
      }

      const label = target === "*" ? t("allParticipants") : target
      return h("span", { className: "dsh-group-talk-l-target", ref: buttonRef },
        h(Button, {
          variant: "ghost",
          size: "sm",
          className: "dsh-group-talk-l-target-button",
          "aria-haspopup": "menu",
          "aria-expanded": open,
          onClick: () => (open ? close() : openMenu()),
        }, `${t("sendTo")} ${label}`, h("span", { className: "dsh-group-talk-l-caret", "aria-hidden": "true" }, "▾")),
        open ? h(React.Fragment, null,
          h("div", { className: "dsh-group-talk-l-pop-overlay", onClick: close }),
          h("div", {
            className: "dsh-group-talk-l-target-menu",
            role: "menu",
            style: position ?? undefined,
            onKeyDown,
          },
            h("button", { type: "button", role: "menuitem", autoFocus: true, onClick: () => choose("*") },
              h("span", null, t("allParticipants")),
              h("span", { className: "dsh-group-talk-l-relay-meta" }, String(others.length))),
            overCap
              ? h("div", { className: "dsh-group-talk-l-target-note" },
                  format(t, "allTooMany", { count: others.length, max: maxRecipients }))
              : null,
            others.map((member) => h("button", {
              type: "button",
              role: "menuitem",
              key: member.sessionId,
              onClick: () => choose(`@${member.alias}`),
            },
              h("span", null, `@${member.alias}`),
              h("span", { className: "dsh-group-talk-l-relay-meta" }, displayRole(member, t)))),
            roles.length > 0 ? h("div", { className: "dsh-group-talk-l-menu-sep" }) : null,
            roles.map((role) => {
              const count = others.filter((member) => member.role === role).length
              return h("button", {
                type: "button",
                role: "menuitem",
                key: `role-${role}`,
                onClick: () => choose(`#${role}`),
              },
                h("span", null, `#${role}`),
                h("span", { className: "dsh-group-talk-l-relay-meta" }, String(count)))
            }))) : null)
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

    function ErrorNotice({ text, t, onDismiss }) {
      if (!text) return null
      return h("div", { className: "dsh-group-talk-l-notice dsh-group-talk-l-notice-error", role: "alert" },
        h(StateDot, { state: "error" }),
        h("span", { className: "dsh-group-talk-l-notice-text" }, text),
        typeof onDismiss === "function"
          ? h("button", {
              type: "button",
              className: "dsh-group-talk-l-notice-close",
              "aria-label": t?.("dismiss") ?? "Dismiss",
              onClick: onDismiss,
            }, "×")
          : null)
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

    function GroupList({ groups, selectedId, unreadById = {}, muted = {}, loading, error, onSelect, onCreate, onRetry, onMarkAllRead, t }) {
      const [collapsed, setCollapsed] = useState(false)
      const [query, setQuery] = useState("")
      const needle = query.trim().toLowerCase()
      const visible = needle
        ? groups.filter((group) => `${group.name} ${group.topic ?? ""}`.toLowerCase().includes(needle))
        : groups
      return h("div", { className: "dsh-group-talk-l-sidebar" },
        h("div", { className: "dsh-group-talk-l-sidebar-head" },
          h("button", {
            type: "button",
            className: "dsh-group-talk-l-collapse",
            "aria-expanded": !collapsed,
            "aria-label": collapsed ? t("expandGroups") : t("collapseGroups"),
            title: collapsed ? t("expandGroups") : t("collapseGroups"),
            onClick: () => setCollapsed((value) => !value),
          }, h("span", { "aria-hidden": "true" }, collapsed ? "▸" : "▾")),
          h("span", { className: "dsh-group-talk-l-sidebar-title" }, t("title")),
          h("span", { style: { flex: 1 } }),
          typeof onMarkAllRead === "function"
            ? h("button", {
                type: "button",
                className: "dsh-group-talk-l-linkish",
                title: t("markAllRead"),
                onClick: onMarkAllRead,
              }, t("markAllRead"))
            : null,
          h(IconButton, { label: t("create"), onClick: onCreate },
            h(IconPlusOutlineRegular, { size: 15 }))),
        error ? h(ErrorNotice, { text: `${t("loadFailed")}${error}`, t }) : null,
        collapsed ? null : h("div", { className: "dsh-group-talk-l-list" },
          groups.length > 3
            ? h(Input, {
                className: "dsh-group-talk-l-search",
                value: query,
                placeholder: t("searchGroups"),
                onChange: (event) => setQuery(event.target.value),
              })
            : null,
          loading && groups.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" },
                h("span", { style: { display: "inline-flex", marginRight: 6, verticalAlign: "middle" } }, h(StateDot, { state: "ongoing" })),
                t("loadingGroups"))
            : null,
          !loading && groups.length === 0 && !error
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("emptyTitle"))
            : null,
          !loading && groups.length > 0 && visible.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noMatches"))
            : null,
          visible.map((group) => h("button", {
            type: "button",
            key: group.id,
            className: group.id === selectedId
              ? "dsh-group-talk-l-row dsh-group-talk-l-row-active"
              : "dsh-group-talk-l-row",
            title: group.topic || group.name,
            onClick: () => onSelect(group.id),
          },
            h("span", { className: "dsh-group-talk-l-row-top" },
              h("span", { className: "dsh-group-talk-l-row-name" }, group.name),
              muted[group.id] ? h("span", { className: "dsh-group-talk-l-relay-meta" }, t("muted")) : null,
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
              `${format(t, "participantsCount", { count: (Array.isArray(group.members) ? group.members : []).length })}${group.me ? ` · ${group.me.sessionId === HUMAN ? t("you") : `@${group.me.alias}`}` : ""}`)))),
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

    /** One avatar initial; avoids loading remote images and keeps rows dense. */
    function initialOf(member) {
      const value = String(member?.alias ?? "?").trim()
      return value ? value.slice(0, 1).toUpperCase() : "?"
    }

    function MemberRow({ member, group, sessionId, onEditRole, onRemove, onOpen, onRelay, t, title, running = false, missing = false }) {
      const isHuman = member.sessionId === HUMAN
      const isMe = member.sessionId === sessionId
      const isOwner = member.sessionId === group.ownerSessionId
      const organizer = member.organizer === true || isOwner || isHuman
      return h("div", { className: "dsh-group-talk-l-member" },
        h("span", { className: "dsh-group-talk-l-avatar", "aria-hidden": "true" }, isHuman ? "你" : initialOf(member)),
        h("div", { className: "dsh-group-talk-l-member-text" },
          h("div", { className: "dsh-group-talk-l-member-name" },
            h("span", { className: "dsh-group-talk-l-member-alias" }, `@${member.alias}`),
            h("span", { className: `dsh-group-talk-l-role ${roleClass(member.role)}` }, displayRole(member, t)),
            isMe ? h(Tag, { tone: "outline" }, t("youTag")) : null,
            isHuman ? h(Tag, { tone: "outline" }, t("humanPriority")) : null,
            isOwner ? h(Tag, { tone: "outline" }, t("ownerTag")) : null,
            organizer && !isOwner && !isHuman ? h(Tag, { tone: "outline" }, t("role_organizer")) : null,
            missing ? h(Tag, { tone: "outline" }, t("sessionMissing")) : null),
          h("div", { className: "dsh-group-talk-l-member-meta", title: [running ? t("busy") : "", title, member.duties].filter(Boolean).join(" · ") },
            `${running ? `${t("busy")} · ` : ""}${title ? `${title} · ` : ""}${member.duties ? `${member.duties}` : (isHuman ? t("humanHost", { alias: `@${member.alias}` }) : "")}`)),
        h("div", { className: "dsh-group-talk-l-member-actions" },
          !isHuman && typeof onOpen === "function"
            ? h(IconButton, { label: t("openSession"), onClick: () => onOpen(member.sessionId) },
                h(IconRightUpOutlineRegular, { size: 14 }))
            : null,
          !isHuman && typeof onRelay === "function" && group.status === "active"
            ? h(IconButton, { label: format(t, "relay", { alias: member.alias }), onClick: () => onRelay(member) },
                h(IconPaperPlaneOutlineRegular, { size: 14 }))
            : null,
          !isHuman && group.me?.isOwner && group.status === "active"
            ? h(IconButton, { label: t("editRole"), onClick: () => onEditRole(member) },
                h(IconEditOutlineRegular, { size: 14 }))
            : null,
          !isHuman && group.me?.isOwner && group.status === "active" && !isOwner
            ? h(IconButton, { label: t("removeMember"), onClick: () => onRemove(member), danger: true },
                h(IconTrashOutlineRegular, { size: 14 }))
            : null))
    }

    /** Render http(s) URLs as links with an explicit confirmation. */
    function linkify(text, t) {
      const value = String(text ?? "")
      const parts = value.split(/(https?:\/\/[^\s<>"']+)/gu)
      return parts.map((part, index) => {
        if (index % 2 === 0) return part
        return h("a", {
          key: `link-${index}`,
          href: part,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: (event) => {
            event.preventDefault()
            try {
              const ok = typeof window.confirm === "function"
                ? window.confirm(format(t, "openLinkConfirm", { url: part }))
                : true
              if (ok) window.open(part, "_blank", "noopener,noreferrer")
            } catch {}
          },
        }, part)
      })
    }

    /** 24-hour clock, stable across locales (the old panel showed "11:45 PM"). */
    function clockTime(at) {
      const date = new Date(Number(at) || 0)
      const pad = (value) => String(value).padStart(2, "0")
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** Full local timestamp for audit rows. */
    function stampTime(at) {
      const date = new Date(Number(at) || 0)
      const pad = (value) => String(value).padStart(2, "0")
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** Day separator label relative to today. */
    function dayLabel(at, t) {
      const date = new Date(Number(at) || 0)
      const now = new Date()
      const start = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
      const days = Math.round((start(now) - start(date)) / 86400000)
      if (days === 0) return t("dateToday")
      if (days === 1) return t("dateYesterday")
      const pad = (value) => String(value).padStart(2, "0")
      return date.getFullYear() === now.getFullYear()
        ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    function dayKeyOf(at) {
      const date = new Date(Number(at) || 0)
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }

    function MessageRow({ message, t, grouped = false, self = false, onReply }) {
      const [expanded, setExpanded] = useState(false)
      const [copied, setCopied] = useState(false)
      if (message.kind === "system") {
        return h("div", { className: "dsh-group-talk-l-message dsh-group-talk-l-message-system" },
          h("div", { className: "dsh-group-talk-l-message-body" }, message.text))
      }
      if (message.kind === "control") {
        const labels = {
          delegate: t("controlDelegate"),
          note: t("controlNote"),
          decision: t("controlDecision"),
          relay: t("relayStatus"),
          pause: t("pause"),
          sensitivity: t("sensitivity"),
          redact: t("redact"),
          topic: t("topicTitle"),
        }
        const action = labels[message.action] ?? (message.action ?? t("audit"))
        const outcome = message.outcome === "started" ? t("controlStarted") : message.outcome === "completed" ? t("controlCompleted") : message.outcome === "failed" ? t("controlFailed") : (message.outcome ?? "")
        return h("div", { className: "dsh-group-talk-l-message dsh-group-talk-l-message-control" },
          h("div", { className: "dsh-group-talk-l-message-meta" },
            h("span", { className: "dsh-group-talk-l-message-author" }, `▣ ${action}`),
            outcome ? h("span", null, outcome) : null,
            h("span", { className: "dsh-group-talk-l-audit-mark" }, t("auditRecord")),
            h("span", null, "·"),
            h("span", null, message.fromAlias ? `@${message.fromAlias}` : t("system")),
            h("span", { style: { marginLeft: "auto" } }, stampTime(message.at))),
          h("div", { className: "dsh-group-talk-l-message-body" }, message.text))
      }
      const deliveries = Array.isArray(message.deliveries) ? message.deliveries : []
      const failed = deliveries.filter((delivery) => delivery.status === "failed")
      const delivered = deliveries.filter((delivery) => (delivery.status === "delivered" || delivery.status === "read") && delivery.sessionId !== HUMAN).length
      const read = deliveries.filter((delivery) => delivery.status === "read").length
      const roomOnly = deliveries.filter((delivery) => delivery.status === "in-room" || (delivery.status === "delivered" && delivery.sessionId === HUMAN)).length
      const unknown = deliveries.filter((delivery) => delivery.status === "unknown").length
      const held = deliveries.filter((delivery) => delivery.status === "held").length
      const queued = deliveries.filter((delivery) => delivery.status === "queued").length
      const total = deliveries.length
      const deliveryLabel = (() => {
        if (held > 0) return t("held")
        if (queued > 0) return t("queued")
        const problems = []
        if (unknown > 0) problems.push(`${unknown} ${t("deliveryUnknown")}`)
        if (failed.length > 0) problems.push(`${failed.length} ${t("failed")}`)
        if (problems.length > 0) return `${delivered}/${total} ${t("delivered")} · ${problems.join(" · ")}`
        if (delivered === 0 && roomOnly > 0) return t("roomOnly")
        if (read > 0) return `${delivered} ${t("delivered")} · ${read} ${t("read")}`
        return roomOnly > 0 ? `${delivered} ${t("delivered")} · ${roomOnly} ${t("roomOnly")}` : t("delivered")
      })()
      const fullText = String(message.text ?? "")
      const long = fullText.length > 600
      const visibleText = long && !expanded ? `${fullText.slice(0, 600)}…` : fullText
      const mine = self || message.fromSessionId === HUMAN
      const who = mine ? t("you") : `@${message.fromAlias ?? "?"}`
      const meta = h("div", { className: "dsh-group-talk-l-message-meta" },
        h("span", { className: "dsh-group-talk-l-message-author" }, who),
        message.fromKind === "human" && !mine ? h(Tag, { tone: "outline" }, t("humanPriority")) : null,
        message.taint === "human-pasted" ? h("span", { className: "dsh-group-talk-l-priority" }, t("taintPasted")) : null,
        message.taint === "tool" ? h("span", { className: "dsh-group-talk-l-priority" }, t("taintTool")) : null,
        message.priority ? h("span", {
          className: message.priority === "urgent" ? "dsh-group-talk-l-priority dsh-group-talk-l-priority-urgent" : "dsh-group-talk-l-priority",
        }, message.priority === "urgent" ? t("priorityUrgentShort") : t("priorityAmbientShort")) : null,
        h("span", null, "→"),
        h("span", null, message.target ?? "*"),
        h("span", null, "·"),
        h("span", null, clockTime(message.at)),
        total > 0 ? h("span", { style: { marginLeft: "auto" } }, deliveryLabel) : null)
      return h("div", {
        className: [
          "dsh-group-talk-l-message",
          mine ? "dsh-group-talk-l-message-self" : "",
          grouped ? "dsh-group-talk-l-message-grouped" : "",
          message.kind === "control" ? "dsh-group-talk-l-message-control" : "",
        ].filter(Boolean).join(" "),
      },
        h("div", { className: mine ? "dsh-group-talk-l-message-row dsh-group-talk-l-message-row-self" : "dsh-group-talk-l-message-row" },
          !mine && !grouped ? h("span", { className: "dsh-group-talk-l-avatar", "aria-hidden": "true" }, initialOf(message)) : null,
          h("div", { className: "dsh-group-talk-l-message-column" },
            grouped ? null : meta,
            h("div", { className: "dsh-group-talk-l-message-body" }, linkify(visibleText, t)),
            Array.isArray(message.refs) && message.refs.length > 0
              ? h("div", { className: "dsh-group-talk-l-relay-meta" }, message.refs.map((ref) => `${ref.kind}: ${ref.value}`).join(" · "))
              : null,
            h("div", { className: "dsh-group-talk-l-message-tools" },
              long ? h("button", {
                type: "button",
                className: "dsh-group-talk-l-message-toggle",
                "aria-expanded": expanded,
                onClick: (event) => {
                  const list = event.currentTarget.closest(".dsh-group-talk-l-messages")
                  const top = list?.scrollTop
                  setExpanded((value) => !value)
                  if (list) requestAnimationFrame(() => { list.scrollTop = top })
                },
              }, expanded ? t("collapseMessage") : t("expandMessage")) : null,
              typeof onReply === "function" && !mine
                ? h("button", {
                    type: "button",
                    className: "dsh-group-talk-l-message-toggle",
                    onClick: () => onReply(message),
                  }, t("reply"))
                : null,
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
              }, copied ? t("copied") : (long ? t("copyFull") : t("copyMessage")))),
            failed.map((delivery) => h("div", { className: "dsh-group-talk-l-delivery-error", key: delivery.sessionId },
              `@${delivery.alias}: ${delivery.error ?? t("failed")}`)))))
    }

    function EmptyState({ icon, title, text, action }) {
      return h("div", { className: "dsh-group-talk-l-empty" },
        h("span", { className: "dsh-group-talk-l-empty-icon" }, icon),
        h("div", { className: "dsh-group-talk-l-empty-title" }, title),
        h("div", { className: "dsh-group-talk-l-empty-text" }, text),
        action)
    }

    function GroupDetail({
      group, sessionId, busy, notice, error, limits, usage,
      onSend, onEditRole, onRemoveMember, onOpen, onDissolve, onDelete, onAddMember, onLeave,
      onNudge, onAudit, onTogglePin, onToggleList, listOpen = true, pinned = false, prioritySupported = false,
      version, t, useSessions,
      onRename, onTopic, onSensitivity, onPause, onExport, onCleanup, onSettings, onRelay,
      onLoadEarlier, muted = false, onMute, onHide, relays = [], capabilities = null, onDismissError, onDigest,
    }) {
      const sessionsById = useSessions ? useSessions((state) => state.byId) : {}
      const [target, setTarget] = useState("*")
      const [text, setText] = useState(readDraft(group.id))
      const [priority, setPriority] = useState("ambient")
      const [composing, setComposing] = useState(false)
      const [membersOpen, setMembersOpen] = useState(readFlag(MEMBERS_OPEN_KEY, false))
      const [atSignal, setAtSignal] = useState(0)
      const [clock, setClock] = useState(Date.now())
      const [menuOpen, setMenuOpen] = useState(false)
      const [helpOpen, setHelpOpen] = useState(false)
      const [msgQuery, setMsgQuery] = useState("")
      const messagesRef = useRef(null)
      const keepScroll = useRef(null)
      const draftOwner = useRef(group.id)
      useEffect(() => { writeFlag(MEMBERS_OPEN_KEY, membersOpen) }, [membersOpen])
      const active = group.status === "active"
      const members = Array.isArray(group.members) ? group.members : []
      const messages = Array.isArray(group.messages) ? group.messages : []
      const otherMembers = members.filter((member) => member.sessionId !== sessionId && member.sessionId !== HUMAN)
      const humanMember = members.find((member) => member.sessionId === HUMAN)
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
      const canNudge = Boolean(waiting && active && waitedMs >= nudgeAfter && (waitingMember || otherMembers.length > 0))
      const showingTimeout = Boolean(waiting && waitedMs >= nudgeAfter)
      const paused = group.paused === true
      const canSend = active && otherMembers.length > 0

      useEffect(() => {
        const cap = limits?.maxRecipientsPerSend ?? 6
        if (otherMembers.length > 0 && (otherMembers.length === 1 || otherMembers.length > cap)) {
          setTarget(`@${otherMembers[0].alias}`)
        } else {
          setTarget("*")
        }
      }, [group.id, members.length, limits?.maxRecipientsPerSend])

      useEffect(() => {
        const node = messagesRef.current
        if (!node) return
        if (keepScroll.current) {
          // "Load earlier" must keep the reader anchored to the message they
          // were looking at, not jump to the bottom of the larger window.
          node.scrollTop = keepScroll.current.top + (node.scrollHeight - keepScroll.current.height)
          keepScroll.current = null
          return
        }
        node.scrollTop = node.scrollHeight
      }, [messages.length])

      const loadEarlier = () => {
        const node = messagesRef.current
        if (node) keepScroll.current = { top: node.scrollTop, height: node.scrollHeight }
        onLoadEarlier?.()
      }

      const send = () => {
        const value = text.trim()
        if (!value || busy === "send" || !canSend) return
        void onSend({ target, message: value, priority }).then((ok) => {
          if (ok) {
            // Keep whatever the person typed while the receipt was in flight.
            setText((current) => {
              if (current !== value) return current
              writeDraft(group.id, "")
              return ""
            })
          }
        })
      }

      const replyTo = (message) => {
        const quote = format(t, "quotePrefix", { alias: message.fromAlias ?? "?", text: String(message.text ?? "").replace(/\s+/gu, " ").slice(0, 120) })
        setText((current) => `${quote}\n${current}`)
        setAtSignal(Date.now())
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
          h(TargetPicker, { group, sessionId, target, onChange: setTarget, openSignal: atSignal, maxRecipients: limits?.maxRecipientsPerSend ?? 6, t }),
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
            disabled: !canSend || busy === "send" || text.trim().length === 0,
            title: canSend ? undefined : t("sendEmptyRoom"),
            onClick: send,
          }, busy === "send" ? t("sending") : t("send"))),
        h("textarea", {
          className: "dsh-group-talk-l-textarea",
          value: text,
          maxLength: limits?.maxMessageChars ?? 2000,
          placeholder: canSend ? t("composerPlaceholder") : t("sendEmptyRoom"),
          disabled: !canSend,
          onChange: (event) => {
            const value = event.target.value
            if (/(^|\s)@$/u.test(value)) {
              setText(value.replace(/@$/u, ""))
              setAtSignal((current) => current + 1)
              return
            }
            setText(value)
          },
          onPaste: () => {
            // Taint is decided by the panel: pasted bytes are not typed by the
            // person, so the envelope labels them untrusted (S6).
            try { window.sessionStorage?.setItem(`group-talk-l:pasted:${group.id}`, "1") } catch {}
          },
          onCompositionStart: () => setComposing(true),
          onCompositionEnd: () => setComposing(false),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !composing) {
              event.preventDefault()
              send()
              return
            }
            if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent?.isComposing) {
              event.preventDefault()
              send()
            }
          },
          "aria-label": t("messageField"),
        }),
        h("div", { className: "dsh-group-talk-l-composer-hint" },
          h("span", { className: "dsh-group-talk-l-composer-hint-text", title: t("composerHintFull") },
            group.me ? (group.me.sessionId === HUMAN ? t("you") : `@${group.me.alias} · ${displayRole(group.me, t)}`) : "",
            limits ? ` · ${format(t, "limitHint", {
              chars: limits.maxMessageChars,
              seconds: Math.ceil((limits.humanCooldownMs ?? limits.sendCooldownMs ?? 0) / 1000),
              recipients: limits.maxRecipientsPerSend,
            })}` : "",
            usage?.sender ? ` · ${format(t, "usageHint", {
              used: usage.sender.messages,
              limit: limits?.dailyMessagesPerHuman ?? limits?.dailyMessagesPerSender ?? 0,
            })}` : ""),
          active && !prioritySupported ? h("span", null, ` · ${t("priorityUnsupported")}`) : null,
          h("button", {
            type: "button",
            className: "dsh-group-talk-l-linkish",
            "aria-expanded": helpOpen,
            onClick: () => setHelpOpen((value) => !value),
          }, "?")),
        helpOpen ? h("div", { className: "dsh-group-talk-l-help-pop" },
          h("div", null, t("sendEmptyRoom") === "" ? "" : t("composerHelpTitle")),
          h("ul", null,
            h("li", null, t("composerHelpTargets")),
            h("li", null, t("composerHelpCost")),
            h("li", null, t("composerHelpReply")),
            h("li", null, t("composerHelpKeys")),
            h("li", null, t("composerHelpNote")))) : null)

      // Build the transcript with sticky day separators and same-sender grouping.
      const normalizedQuery = msgQuery.trim().toLowerCase()
      const visibleMessages = normalizedQuery
        ? messages.filter((message) => String(message.text ?? "").toLowerCase().includes(normalizedQuery))
        : messages
      const rows = []
      let lastDay = ""
      let previous = null
      for (const message of visibleMessages) {
        const day = dayKeyOf(message.at)
        if (day !== lastDay) {
          lastDay = day
          rows.push(h("div", { className: "dsh-group-talk-l-day", key: `day-${day}-${message.id}` }, dayLabel(message.at, t)))
          previous = null
        }
        const grouped = Boolean(previous
          && previous.kind === "message"
          && message.kind === "message"
          && previous.fromSessionId === message.fromSessionId
          && Math.abs(message.at - previous.at) < 5 * 60 * 1000)
        rows.push(h(MessageRow, {
          key: message.id,
          message,
          t,
          grouped,
          self: message.fromSessionId === sessionId,
          onReply: active ? replyTo : undefined,
        }))
        previous = message
      }
      const total = Number(group.messageTotal) || messages.length
      const truncated = total > messages.length || group.hasOlder === true
      const roomOnlyHint = messages.length === 0
        ? (members.length <= 1 ? t("emptyRoomHint") : t("noMessages"))
        : null

      const memberRows = members.map((member) => h(MemberRow, {
        key: member.sessionId,
        member,
        group,
        sessionId,
        onEditRole,
        onRemove: onRemoveMember,
        onOpen,
        onRelay,
        title: member.sessionId === HUMAN ? "" : (sessionsById?.[member.sessionId]?.title || ""),
        running: member.sessionId === HUMAN ? false : Boolean(sessionsById?.[member.sessionId]?.running),
        missing: member.sessionId !== HUMAN
          && Boolean(sessionsById)
          && Object.keys(sessionsById).length > 0
          && !sessionsById[member.sessionId],
        t,
      }))

      return h("div", { className: "dsh-group-talk-l-main" },
        h("div", { className: "dsh-group-talk-l-main-head" },
          h("div", { className: "dsh-group-talk-l-main-headtext" },
            h("h3", { className: "dsh-group-talk-l-main-title" }, group.name),
            h("p", { className: "dsh-group-talk-l-main-sub" },
              `${group.status === "active" ? t("active") : t("dissolved")}${paused ? ` · ${t("paused")}` : ""} · ${format(t, "participantsCount", { count: members.length })}${group.sensitivity && group.sensitivity !== "internal" ? ` · ${t(`sensitivity${group.sensitivity[0].toUpperCase()}${group.sensitivity.slice(1)}`)}` : ""}`),
            group.me?.sessionId === HUMAN
              ? h("p", { className: "dsh-group-talk-l-main-sub" }, format(t, "humanHost", { alias: `@${group.me.alias}` }))
              : null,
            group.topic ? h("p", { className: "dsh-group-talk-l-main-sub" }, group.topic) : null,
            h("details", { className: "dsh-group-talk-l-main-sub" },
              h("summary", { style: { cursor: "pointer" } }, t("groupIdLabel")),
              h("span", null, `${group.id} `),
              h("button", {
                type: "button",
                className: "dsh-group-talk-l-linkish",
                onClick: () => { void copyToClipboard(group.id) },
              }, t("copy")))),
          h("div", { className: "dsh-group-talk-l-head-actions" },
            group.me?.sessionId === HUMAN ? h(Tag, { tone: "info" }, t("humanPriority")) : null,
            h(Button, { variant: "ghost", size: "sm", onClick: onTogglePin, title: pinned ? t("keepOpenOff") : t("keepOpen"), className: pinned ? "dsh-group-talk-l-pinned" : undefined },
              pinned ? t("keepOpenOn") : t("keepOpen")),
            group.me?.isOwner && active
              ? h(Button, { variant: "ghost", size: "sm", icon: h(IconPlusOutlineRegular, { size: 14 }), onClick: onAddMember }, t("addMember"))
              : null,
            h(IconButton, { label: t("moreActions"), onClick: () => setMenuOpen((value) => !value) },
              h("span", { "aria-hidden": "true", style: { fontSize: 16, lineHeight: "16px", letterSpacing: 1 } }, "⋯")),
            h("div", { className: "dsh-group-talk-l-menu", style: { display: menuOpen ? "" : "none" } },
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onAudit?.() } }, t("audit")),
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onDigest?.() } }, t("digest")),
              group.me?.isOwner ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onRename?.() } }, t("rename")) : null,
              group.me?.isOwner ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onTopic?.() } }, t("topicTitle")) : null,
              group.me?.isOwner ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onSensitivity?.() } }, t("sensitivity")) : null,
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onExport?.() } }, t("exportChat")),
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onSettings?.() } }, t("settings")),
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onMute?.() } }, muted ? t("unmute") : t("mute")),
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onHide?.() } }, t("hide")),
              h("button", { type: "button", onClick: () => { setMenuOpen(false); onToggleList?.() } }, listOpen ? t("hideGroupList") : t("showGroupList")),
              group.me?.isOwner ? h("div", { className: "dsh-group-talk-l-menu-sep" }) : null,
              group.me?.isOwner && active ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onPause?.() } }, paused ? t("resume") : t("pause")) : null,
              group.me?.isOwner ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onCleanup?.() } }, t("cleanup")) : null,
              group.me?.isOwner ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onDissolve?.() }, disabled: !active }, t("dissolve")) : null,
              group.me?.isOwner
                ? h("button", { type: "button", className: "dsh-group-talk-l-danger", onClick: () => { setMenuOpen(false); onDelete?.() } }, t("delete"))
                : (active ? h("button", { type: "button", onClick: () => { setMenuOpen(false); onLeave?.() } }, t("leave")) : null)))),
        paused || capabilities?.gate?.paused ? h("div", { className: "dsh-group-talk-l-page-notice dsh-group-talk-l-page-notice-warn" },
          h("span", null, paused ? t("pausedBanner") : t("pausedHostBanner"))) : null,
        h(Notice, { kind: notice?.kind, text: notice?.text }),
        h(ErrorNotice, { text: error, t, onDismiss: onDismissError }),
        h("div", { className: "dsh-group-talk-l-section" },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("button", {
              type: "button",
              className: "dsh-group-talk-l-linkish",
              onClick: () => setMembersOpen((value) => !value),
              "aria-expanded": membersOpen,
            }, `${format(t, "participantsCount", { count: members.length })} · ${membersOpen ? t("collapseMembers") : t("expandMembers")}`),
            group.me?.isOwner && active ? h("span", { className: "dsh-group-talk-l-field-hint", title: t("membersIncludeYou") }, t("membersIncludeYou")) : null),
          membersOpen ? h("div", { className: "dsh-group-talk-l-members dsh-group-talk-l-members-drawer" }, memberRows) : null),
        h("div", { className: "dsh-group-talk-l-section", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" },
              truncated
                ? format(t, "showingRecent", { shown: messages.length, total })
                : t("messagesCount", { count: total })),
            messages.length > 10
              ? h(Input, {
                  className: "dsh-group-talk-l-search",
                  value: msgQuery,
                  placeholder: t("searchMessages"),
                  onChange: (event) => setMsgQuery(event.target.value),
                })
              : null),
          truncated
            ? h("div", { className: "dsh-group-talk-l-field-hint" },
                format(t, "historyTruncatedText", { shown: messages.length, total }),
                typeof onLoadEarlier === "function" && group.hasOlder
                  ? h("button", { type: "button", className: "dsh-group-talk-l-linkish", onClick: loadEarlier }, t("loadEarlier"))
                  : null)
            : null,
          h("div", { className: "dsh-group-talk-l-messages", ref: messagesRef },
            rows.length === 0
              ? h("div", { className: "dsh-group-talk-l-list-empty" }, normalizedQuery ? t("noMatches") : (roomOnlyHint ?? t("noMessages")))
              : rows)),
        waiting ? h("div", { className: "dsh-group-talk-l-waiting" },
          h("span", null, showingTimeout
            ? format(t, "waitingLong", { target: waitingLabel, minutes: Math.max(1, Math.round(waitedMs / 60000)) })
            : format(t, "waitingReply", { target: waitingLabel })),
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
        Array.isArray(relays) && relays.length > 0
          ? h("div", { className: "dsh-group-talk-l-section" },
              h("div", { className: "dsh-group-talk-l-section-head" },
                h("span", { className: "dsh-group-talk-l-section-title" }, t("relayStatus"))),
              h("div", { className: "dsh-group-talk-l-relay-list" },
                relays.slice(0, 6).map((relay) => h("div", { className: "dsh-group-talk-l-relay-row", key: relay.id },
                  h("div", null,
                    h("div", null, `${relay.intent} · @${relay.peer?.alias} · ${relay.status} · ${relay.round}/${relay.maxRounds}`),
                    relay.last ? h("div", { className: "dsh-group-talk-l-relay-meta" }, String(relay.last.text ?? "").slice(0, 100)) : null),
                  h("span", { className: "dsh-group-talk-l-relay-meta" }, clockTime(relay.updatedAt))))))
          : null,
        active ? composer : h("div", { className: "dsh-group-talk-l-dissolved" }, t("readOnly")),
        version ? h("div", { className: "dsh-group-talk-l-version" },
          h("span", null, `Group-Talk-L ${CLIENT_VERSION}`),
          version === CLIENT_VERSION
            ? null
            : h("span", { title: format(t, "hostMismatch", { version, client: CLIENT_VERSION }) },
                `· Host ${version} · ${format(t, "hostMismatch", { version, client: CLIENT_VERSION })}`)) : null)
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

    function CreateForm({ useSessions, onCreate, onCancel, busy, error, t, preselectId }) {
      const [name, setName] = useState("")
      const [topic, setTopic] = useState("")
      const [selected, setSelected] = useState(() => (preselectId
        ? { [preselectId]: { alias: "agent-1", role: t("roleDefault"), roleId: "participant", duties: "" } }
        : {}))
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
              roleId: "participant",
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
          roleId: value.roleId ?? "participant",
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
                  const custom = value !== undefined && value.roleId === "custom"
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
                            roleId: value.roleId,
                            t,
                            onChange: (next) => patch(id, next),
                          }),
                          custom
                            ? h(Input, {
                                key: "custom",
                                value: value.role,
                                placeholder: t("rolePlaceholder"),
                                onChange: (event) => patch(id, { role: event.target.value, roleId: "custom" }),
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
      const [roleId, setRoleId] = useState(member.roleId ?? (presetForRole(member.role)?.id ?? "custom"))
      const [duties, setDuties] = useState(member.duties ?? "")
      const pick = (preset) => {
        if (!preset) {
          setRole("")
          setRoleId("custom")
          setDuties("")
          return
        }
        setRole(presetLabel(preset, t))
        setRoleId(preset.id)
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
            onClick: () => onSave({ role: role.trim(), roleId, duties: duties.trim() }),
          }, busy === "role" ? t("saving") : t("save"))),
      },
        h("div", { className: "dsh-group-talk-l-role-fields" },
          h(ErrorNotice, { text: error, t }),
          h("div", { className: "dsh-group-talk-l-field" },
            h("span", { className: "dsh-group-talk-l-field-label" }, t("roleLabel")),
            h(RoleChips, { role, roleId, onPick: pick, t })),
          h("div", { className: "dsh-group-talk-l-field" },
            h(Input, {
              value: role,
              placeholder: t("rolePlaceholder"),
              onChange: (event) => { setRole(event.target.value); setRoleId(presetForRole(event.target.value)?.id ?? "custom") },
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
      const [roleId, setRoleId] = useState("participant")
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
            onClick: () => onAdd({ sessionId: picked, alias: alias.trim(), role: role.trim() || t("roleDefault"), roleId }),
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
    function AuditView({ group, rows, onBack, onExport, t }) {
      const messages = Array.isArray(group.messages) ? group.messages : []
      const source = Array.isArray(rows) ? rows : (Array.isArray(group.audit) ? group.audit : messages.filter((message) => message.kind === "control"))
      const controls = source.slice(-80).reverse()
      const total = Number(group.auditTotal) || source.length
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
          h(Button, { variant: "ghost", size: "sm", onClick: onBack }, t("back")),
          typeof onExport === "function"
            ? h(Button, { variant: "ghost", size: "sm", onClick: onExport }, t("exportChat"))
            : null),
        h("div", { className: "dsh-group-talk-l-section" },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, t("delegationLog"))),
          delegations.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("noDelegations"))
            : h("div", { className: "dsh-group-talk-l-audit-failures" }, delegations.map((message) => h(MessageRow, { key: message.id, message, t })))),
        h("div", { className: "dsh-group-talk-l-section", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
          h("div", { className: "dsh-group-talk-l-section-head" },
            h("span", { className: "dsh-group-talk-l-section-title" }, `${t("controlNote")} / ${t("controlDelegate")} / ${t("controlDecision")}`),
            h("span", { className: "dsh-group-talk-l-relay-meta" }, format(t, "auditTotal", { shown: controls.length, total }))),
          controls.length === 0
            ? h("div", { className: "dsh-group-talk-l-list-empty" }, t("auditEmpty"))
            : h("div", { className: "dsh-group-talk-l-messages" }, controls.map((message) => h(MessageRow, { key: message.id, message, t })))),
        failures.length > 0
          ? h("div", { className: "dsh-group-talk-l-section" },
              h("div", { className: "dsh-group-talk-l-section-head" },
                h("span", { className: "dsh-group-talk-l-section-title" }, t("failed"))),
              h("div", { className: "dsh-group-talk-l-audit-failures" },
                failures.map((message) => h("div", { key: message.id, className: "dsh-group-talk-l-delivery-error" },
                  `${stampTime(message.at)} · ${message.text.slice(0, 120)}`))))
          : null)
    }

    /**
     * Local, deterministic digest: no model call, no extra token spend.
     * It answers "what happened, what was decided, who is still expected to
     * answer, what failed" for a person returning to a busy room (#56/#63).
     */
    function digestOf(group, relays, t) {
      const messages = Array.isArray(group?.messages) ? group.messages : []
      const rows = Array.isArray(group?.audit) ? group.audit : messages.filter((row) => row.kind === "control")
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      const today = messages.filter((row) => row.kind === "message" && row.at >= cutoff).length
      const decisions = rows.filter((row) => row.action === "decision").slice(-5)
      const failures = messages
        .filter((row) => row.kind === "message" && (row.deliveries ?? []).some((delivery) => delivery.status === "failed" || delivery.status === "unknown"))
        .slice(-5)
      const waiting = messages
        .filter((row) => row.kind === "message" && (row.deliveries ?? []).some((delivery) => delivery.status === "pending" || delivery.status === "delivered"))
        .slice(-5)
      const openRelays = (Array.isArray(relays) ? relays : []).filter((relay) => relay.status === "created" || relay.status === "delivered")
      const recent = messages.filter((row) => row.kind === "message").slice(-5)
      const lines = [
        `${group?.name ?? ""} · ${format(t, "digestToday", { count: today })}`,
        "",
        `${t("digestDecisions")}:`,
        ...(decisions.length > 0 ? decisions.map((row) => `- @${row.fromAlias ?? "?"}: ${String(row.text ?? "").slice(0, 300)}`) : [`- ${t("digestNoDecisions")}`]),
        "",
        `${t("digestWaiting")}:`,
        ...(waiting.length > 0
          ? waiting.map((row) => `- @${row.fromAlias ?? "?"} → ${row.target ?? "*"}: ${String(row.text ?? "").slice(0, 160)}`)
          : [`- ${t("digestNoWaiting")}`]),
        "",
        `${t("digestFailures")}:`,
        ...(failures.length > 0
          ? failures.map((row) => `- @${row.fromAlias ?? "?"}: ${String(row.text ?? "").slice(0, 160)}`)
          : [`- ${t("digestNoFailures")}`]),
        "",
        `${t("digestRelays")}:`,
        ...(openRelays.length > 0
          ? openRelays.map((relay) => `- ${relay.intent} @${relay.peer?.alias}: ${relay.status} ${relay.round}/${relay.maxRounds}`)
          : [`- ${t("digestNoRelays")}`]),
        "",
        `${t("digestRecent")}:`,
        ...(recent.length > 0
          ? recent.map((row) => `- @${row.fromAlias ?? "?"} → ${row.target ?? "*"}: ${String(row.text ?? "").replace(/\s+/gu, " ").slice(0, 160)}`)
          : [`- ${t("digestEmpty")}`]),
      ]
      return lines.join("\n")
    }

    /** One-line text prompt used for rename/topic. */
    function TextPromptModal({ title, label, value, placeholder, onSave, onClose, busy, error, t }) {
      const [text, setText] = useState(value ?? "")
      return h(Modal, {
        open: true,
        onClose,
        title,
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: "primary",
            size: "sm",
            disabled: Boolean(busy) || !text.trim(),
            onClick: () => onSave(text.trim()),
          }, busy ? t("saving") : t("save"))),
      },
        h("div", { className: "dsh-group-talk-l-field" },
          h("span", { className: "dsh-group-talk-l-field-label" }, label),
          h(Input, {
            value: text,
            placeholder,
            autoFocus: true,
            maxLength: 240,
            onChange: (event) => setText(event.target.value),
            "aria-label": label,
          })),
        h(ErrorNotice, { text: error, t }))
    }

    /** Broadcast confirmation with recipients and an estimated cost (S2). */
    function BroadcastModal({ preview, secret, onConfirm, onClose, busy, t }) {
      return h(Modal, {
        open: true,
        onClose,
        title: secret ? t("secretTitle") : t("broadcastTitle"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: preview?.needsConfirm ? "primary" : "outline",
            size: "sm",
            disabled: Boolean(busy),
            onClick: onConfirm,
          }, busy ? t("sending") : t("broadcastConfirm"))),
      },
        h("div", { className: "dsh-group-talk-l-confirm" },
          secret ? t("secretText") : t("broadcastText"),
          preview
            ? h("ul", { className: "dsh-group-talk-l-confirm-list" },
                h("li", null, format(t, "broadcastRecipients", { names: preview.recipients.join(", ") })),
                h("li", null, format(t, "broadcastCost", { tokens: preview.estimatedTokens, count: preview.sessions })),
                preview.paused ? h("li", null, t("pausedBanner")) : null)
            : null))
    }

    /** One-to-one relay composer (S23). */
    function RelayModal({ member, onSend, onClose, busy, error, t }) {
      const [message, setMessage] = useState("")
      const [intent, setIntent] = useState("confirm")
      return h(Modal, {
        open: true,
        onClose,
        title: format(t, "relay", { alias: member.alias }),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel")),
          h(Button, {
            variant: "primary",
            size: "sm",
            disabled: Boolean(busy) || !message.trim(),
            onClick: () => onSend({ to: `@${member.alias}`, message: message.trim(), intent }),
          }, busy ? t("sending") : t("relaySend"))),
      },
        h("div", { className: "dsh-group-talk-l-role-fields" },
          h(ErrorNotice, { text: error, t }),
          h("div", { className: "dsh-group-talk-l-field-hint" }, t("relayHint")),
          h("div", { className: "dsh-group-talk-l-field" },
            h("span", { className: "dsh-group-talk-l-field-label" }, t("relayIntent")),
            h("select", {
              className: "dsh-group-talk-l-select",
              value: intent,
              "aria-label": t("relayIntent"),
              onChange: (event) => setIntent(event.target.value),
            },
              h("option", { value: "confirm" }, t("relayConfirm")),
              h("option", { value: "ask" }, t("relayAsk")),
              h("option", { value: "handoff" }, t("relayHandoff")))),
          h("div", { className: "dsh-group-talk-l-field" },
            h("span", { className: "dsh-group-talk-l-field-label" }, t("messageField")),
            h("textarea", {
              className: "dsh-group-talk-l-textarea",
              value: message,
              maxLength: 2000,
              placeholder: t("relayPlaceholder"),
              onChange: (event) => setMessage(event.target.value),
              "aria-label": t("messageField"),
            }))))
    }

    function DigestModal({ group, relays, onClose, t }) {
      const digest = digestOf(group, relays, t)
      const [copied, setCopied] = useState(false)
      return h(Modal, {
        open: true,
        onClose,
        title: t("digestTitle"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => {
              void copyToClipboard(digest).then((ok) => {
                if (!ok) return
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            },
          }, copied ? t("digestCopied") : t("digestCopy")),
          h(Button, { variant: "primary", size: "sm", onClick: onClose }, t("close"))),
      }, h("div", { className: "dsh-group-talk-l-message-body", style: { whiteSpace: "pre-wrap" } }, digest))
    }

    /** Settings/observability: read-only limits, live stats, pause controls. */
    function SettingsModal({ limits, capabilities, gate, stats, onClose, onToggleHostPause, onToggleRelayPause, onCleanup, onExport, onUnhide, hiddenCount = 0, busy, t }) {
      const item = (label, value) => h("div", { className: "dsh-group-talk-l-stat" },
        h("div", { className: "dsh-group-talk-l-stat-value" }, String(value)),
        h("div", { className: "dsh-group-talk-l-stat-label" }, label))
      return h(Modal, {
        open: true,
        onClose,
        title: t("settingsTitle"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onCleanup, disabled: Boolean(busy) }, t("cleanup")),
          h(Button, { variant: "ghost", size: "sm", onClick: onExport, disabled: Boolean(busy) }, t("exportChat")),
          h(Button, { variant: "primary", size: "sm", onClick: onClose }, t("close"))),
      },
        h("div", { className: "dsh-group-talk-l-settings" },
          h("div", { className: "dsh-group-talk-l-field-hint" }, t("settingsHint")),
          h("div", { className: "dsh-group-talk-l-card" },
            h("div", { className: "dsh-group-talk-l-card-title" }, t("settingsPauseHost")),
            h(Button, {
              variant: "outline",
              size: "sm",
              onClick: onToggleHostPause,
            }, gate?.paused ? t("resumeHost") : t("pauseHost")),
            h("div", { className: "dsh-group-talk-l-field-hint" }, t("settingsVoice"))),
          h("div", { className: "dsh-group-talk-l-card" },
            h("div", { className: "dsh-group-talk-l-card-title" }, t("settingsRelay")),
            h(Button, { variant: "outline", size: "sm", onClick: onToggleRelayPause },
              gate?.relayPaused ? t("relayResume") : t("relayPause"))),
          hiddenCount > 0
            ? h("div", { className: "dsh-group-talk-l-card" },
                h(Button, { variant: "outline", size: "sm", onClick: onUnhide },
                  format(t, "unhideAll", { count: hiddenCount })))
            : null,
          stats
            ? h("div", { className: "dsh-group-talk-l-stats" },
                item(t("settingsStats"), stats.counters?.sends ?? 0),
                item(t("messagesCount", { count: "" }).replace("{count}", " ").trim(), stats.counters?.sends ?? 0),
                item("tokens (est.)", stats.estimatedTokens ?? 0),
                item("tokens (actual)", stats.actualTokens ?? 0),
                item(t("failed"), stats.counters?.failed ?? 0),
                item(t("rate-limited"), stats.counters?.rejected ?? 0))
            : null,
          limits
            ? h("div", { className: "dsh-group-talk-l-card" },
                h("div", { className: "dsh-group-talk-l-card-title" }, t("settingsLimits")),
                h("div", { className: "dsh-group-talk-l-field-hint" },
                  `${limits.maxMessageChars} chars · ${limits.maxRecipientsPerSend}/${limits.maxBroadcastRecipients} recipients · ${format(t, "settingsRetention", { days: limits.retentionDays })}`),
                h("div", { className: "dsh-group-talk-l-field-hint" },
                  `${format(t, "settingsPolicy", { chars: limits.policyMaxChars })} · ${format(t, "settingsConcurrency", { max: limits.maxConcurrentDeliveries })}`),
                h("div", { className: "dsh-group-talk-l-field-hint" },
                  capabilities?.delegate ? t("settingsDelegationOn") : t("settingsDelegationOff")),
                h("div", { className: "dsh-group-talk-l-field-hint" },
                  capabilities?.wake ? t("settingsWake") : t("settingsMailbox")))
            : null))
    }

    /** Four-option sensitivity picker. */
    function SensitivityModal({ current, onSave, onClose, t }) {
      const options = ["public", "internal", "secret"]
      return h(Modal, {
        open: true,
        onClose,
        title: t("sensitivity"),
        closeLabel: t("close"),
        className: "dsh-group-talk-l-modal",
        footer: h("div", { className: "dsh-group-talk-l-modal-footer" },
          h(Button, { variant: "ghost", size: "sm", onClick: onClose }, t("cancel"))),
      },
        h("div", { className: "dsh-chips dsh-group-talk-l-chips" }, options.map((level) => h("button", {
          key: level,
          type: "button",
          className: level === current ? "dsh-group-talk-l-chip dsh-group-talk-l-chip-active" : "dsh-group-talk-l-chip",
          onClick: () => onSave(level),
        }, t(`sensitivity${level[0].toUpperCase()}${level.slice(1)}`)))),
        h("div", { className: "dsh-group-talk-l-field-hint" }, t("roleMismatch")))
    }

    function downloadText(name, text) {
      try {
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = name
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return true
      } catch {
        return false
      }
    }

    function GroupCenter({ open, onClose, sessionId, launch, useSessions, openSession, embedded = false, t }) {
      const [groups, setGroups] = useState([])
      const [limits, setLimits] = useState(null)
      const [usage, setUsage] = useState(null)
      const [version, setVersion] = useState(null)
      const [capabilities, setCapabilities] = useState(null)
      const [gate, setGate] = useState(null)
      const [relays, setRelays] = useState([])
      const [stats, setStats] = useState(null)
      const [langPref, setLangPref] = useState(readLangPref())
      const [listOpen, setListOpen] = useState(readFlag(LIST_OPEN_KEY, true))
      const [auditOpen, setAuditOpen] = useState(false)
      const [audit, setAudit] = useState(null)
      const [seen, setSeen] = useState(readSeen(sessionId))
      const [muted, setMuted] = useState(readFlagMap(MUTE_KEY))
      const [hidden, setHidden] = useState(readFlagMap(HIDE_KEY))
      const [olderLimit, setOlderLimit] = useState(0)
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState(null)
      const [notice, setNotice] = useState(null)
      const [selectedId, setSelectedId] = useState(readFocus(sessionId))
      const [view, setView] = useState("groups")
      const [pinned, setPinned] = useState(readPinned())
      const [busy, setBusy] = useState("")
      const [confirm, setConfirm] = useState(null)
      const [roleMember, setRoleMember] = useState(null)
      const [addOpen, setAddOpen] = useState(false)
      const [pendingSend, setPendingSend] = useState(null)
      const [relayMember, setRelayMember] = useState(null)
      const [textPrompt, setTextPrompt] = useState(null)
      const [sensitivityOpen, setSensitivityOpen] = useState(false)
      const [settingsOpen, setSettingsOpen] = useState(false)
      const [digestOpen, setDigestOpen] = useState(false)
      const sequence = useRef(0)
      const inflight = useRef(false)
      const etag = useRef(null)
      const tt = useMemo(() => makeTranslator(t, langPref), [t, langPref])
      const lang = effectiveLang(langPref)
      useEffect(() => { writeFlag(LIST_OPEN_KEY, listOpen) }, [listOpen])
      useEffect(() => { writeLangPref(langPref) }, [langPref])

      useEffect(() => {
        if (!notice) return undefined
        const timer = setTimeout(() => setNotice(null), 4500)
        return () => clearTimeout(timer)
      }, [notice])

      const load = useCallback(async (silent = false) => {
        if (inflight.current) return
        inflight.current = true
        const id = ++sequence.current
        if (!silent) setLoading(true)
        try {
          const data = await api("GET", sessionId, undefined, undefined, {
            lang,
            ...(olderLimit > 0 ? { limit: olderLimit } : {}),
            ...(etag.current ? { etag: etag.current } : {}),
          })
          if (data?.__notModified) return
          if (sequence.current !== id) return
          if (data?.__etag) etag.current = data.__etag
          const nextGroups = Array.isArray(data?.groups) ? data.groups : []
          setGroups(nextGroups)
          setLimits(data?.limits ?? null)
          setUsage(data?.usage ?? null)
          setVersion(typeof data?.version === "string" ? data.version : null)
          setCapabilities(data?.capabilities && typeof data.capabilities === "object" ? data.capabilities : null)
          setGate(data?.gate ?? null)
          setRelays(Array.isArray(data?.relays) ? data.relays : [])
          if (data?.stats) setStats(data.stats)
          const nextSeen = readSeen(sessionId)
          if (seedSeen(nextGroups, nextSeen)) writeSeen(sessionId, nextSeen)
          setSeen(nextSeen)
        } catch (reason) {
          if (sequence.current !== id) return
          // Errors persist until the person acts: the 8s poll must not erase a
          // message they are still reading (#11 / F12).
          setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          inflight.current = false
          if (sequence.current === id) setLoading(false)
        }
      }, [sessionId, lang, olderLimit])

      useEffect(() => {
        if (!open) return undefined
        void load()
        const timer = setInterval(() => {
          if (!document.hidden) void load(true)
        }, 8000)
        const onVisible = () => { if (!document.hidden) void load(true) }
        document.addEventListener?.("visibilitychange", onVisible)
        return () => {
          clearInterval(timer)
          document.removeEventListener?.("visibilitychange", onVisible)
        }
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
          const remembered = readFocus(sessionId)
          const visible = groups.filter((group) => !hidden[group.id])
          const preferred = groups.find((group) => group.id === remembered)
          setSelectedId(preferred ? preferred.id : (visible[0]?.id ?? groups[0].id))
        }
      }, [open, groups, selectedId])

      useEffect(() => {
        if (selectedId) writeFocus(sessionId, selectedId)
        setAudit(null)
        setOlderLimit(0)
      }, [selectedId])

      const group = groups.find((entry) => entry.id === selectedId) ?? null

      const openAudit = async () => {
        // No group means no audit: opening a modal for one and then selecting a
        // room used to pop it late (#24 / F20).
        if (!group) return
        setAuditOpen(true)
        setAudit(null)
        if (capabilities && capabilities.audit !== true) return
        if (!capabilities && typeof version === "string" && version.length > 0 && !versionAtLeast(version, [2, 3, 0])) return
        try {
          const data = await api("POST", sessionId, { action: "audit", group: group.id, limit: 200 }, undefined, { lang })
          setAudit(data)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }
      const legacyHost = capabilities
        ? capabilities.inRoom !== true
        : (typeof version === "string" && version.length > 0 && !versionAtLeast(version, [2, 0, 1]))
      const hostOutdated = capabilities
        ? capabilities.control !== true || capabilities.audit !== true
        : (typeof version === "string" && version.length > 0 && !versionAtLeast(version, [2, 3, 0]))
      const newestAt = group?.messages?.at(-1)?.at ?? 0

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
        for (const entry of groups) out[entry.id] = muted[entry.id] ? 0 : unreadFor(entry, seen)
        return out
      }, [groups, seen, muted])

      const visibleGroups = useMemo(() => groups.filter((entry) => !hidden[entry.id]), [groups, hidden])

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

      const applyMessage = (message) => {
        if (!message || !group) return
        setGroups((current) => current.map((entry) => {
          if (entry.id !== group.id) return entry
          const messages = entry.messages ?? []
          const exists = messages.some((row) => row.id === message.id)
          return {
            ...entry,
            messages: exists ? messages.map((row) => (row.id === message.id ? message : row)) : [...messages, message],
            messageTotal: (Number(entry.messageTotal) || messages.length) + (exists ? 0 : 1),
            updatedAt: message.at ?? Date.now(),
          }
        }))
      }

      const removeLocalMessage = (id) => {
        setGroups((current) => current.map((entry) => {
          if (entry.id !== group.id) return entry
          const messages = entry.messages ?? []
          if (!messages.some((row) => row.id === id)) return entry
          return {
            ...entry,
            messages: messages.filter((row) => row.id !== id),
            messageTotal: Math.max(0, (Number(entry.messageTotal) || messages.length) - 1),
          }
        }))
      }

      const postSend = async (payload, tempId = null) => {
        const data = await api("POST", sessionId, {
          action: "send",
          group: group.id,
          target: payload.target,
          message: payload.message,
          ...(payload.priority === "urgent" || payload.priority === "ambient" ? { priority: payload.priority } : {}),
          ...(payload.taint ? { taint: payload.taint } : {}),
          ...(payload.broadcast ? { broadcast: true } : {}),
          ...(payload.confirmSecrets ? { confirmSecrets: true } : {}),
        }, undefined, { lang })
        if (tempId) removeLocalMessage(tempId)
        if (data?.deduplicated) {
          setNotice({ kind: "success", text: tt("deduplicated") })
          await load(true)
          return true
        }
        if (data?.message) applyMessage(data.message)
        const failures = (data?.deliveries ?? []).filter((delivery) => delivery.status === "failed")
        const humanAlias = group.members.find((member) => member.sessionId === HUMAN)?.alias
        const humanFailure = failures.find((delivery) => delivery.alias === humanAlias)
        if (legacyHost && humanFailure) {
          setNotice({ kind: "success", text: format(tt, "recordedToHuman", { name: `@${humanFailure.alias}` }) })
        } else if (failures.length > 0) {
          setNotice({ kind: "error", text: format(tt, "sendPartial", { names: failures.map((item) => `@${item.alias}`).join(", ") }) })
        } else {
          setNotice({ kind: "success", text: data?.held ? tt("pausedBanner") : tt("sent") })
        }
        void load(true)
        return true
      }

      const send = async ({ target, message, priority }) => {
        if (!group) return false
        let taint = "human-typed"
        try {
          if (window.sessionStorage?.getItem(`group-talk-l:pasted:${group.id}`) === "1") {
            taint = "human-pasted"
            window.sessionStorage.removeItem(`group-talk-l:pasted:${group.id}`)
          }
        } catch {}
        const payload = { target, message, priority, taint }
        if (target === "*" || target.startsWith("#")) {
          try {
            const preview = await api("POST", sessionId, {
              action: "preview",
              group: group.id,
              target,
              message,
            }, undefined, { lang })
            if (preview?.needsConfirm || preview?.overCap) {
              setPendingSend({ ...payload, preview })
              setNotice(null)
              setError(null)
              return false
            }
          } catch {
            // A failed preview must not block a direct send.
          }
        }
        const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        // Optimistic insert: the person sees their own message immediately even
        // when a target takes the full 30 s to admit the turn. The real row
        // replaces this one when the receipt arrives (F1 / S30).
        applyMessage({
          id: tempId,
          kind: "message",
          at: Date.now(),
          fromSessionId: HUMAN,
          fromAlias: group.me?.alias ?? "human",
          fromKind: "human",
          target,
          text: message,
          priority,
          taint,
          estimatedTokens: 0,
          deliveries: [],
          optimistic: true,
        })
        const done = Boolean(await run("send", async () => {
          try {
            return await postSend(payload, tempId)
          } catch (reason) {
            if (reason?.code === "secret-detected") {
              setPendingSend({ ...payload, secret: true, preview: null })
              setError(reason.message)
              return false
            }
            throw reason
          }
        }))
        if (!done) removeLocalMessage(tempId)
        return done
      }

      const confirmSend = async () => {
        if (!pendingSend) return
        const payload = { ...pendingSend, broadcast: true, confirmSecrets: pendingSend.secret === true }
        setPendingSend(null)
        await run("send", async () => postSend(payload))
      }

      const sendRelay = async ({ to, message, intent }) => {
        return Boolean(await run("relay", async () => {
          const data = await api("POST", sessionId, { action: "relay", to, message, intent }, undefined, { lang })
          setRelayMember(null)
          setNotice({ kind: "success", text: tt("relaySentDone") })
          if (data?.relay?.id) setRelays((current) => [data.relay, ...current])
          return true
        }))
      }

      const nudge = async (target) => {
        if (!group || typeof target !== "string") return false
        let resolved = target
        if (resolved === "*") {
          const first = group.members.find((member) => member.sessionId !== HUMAN && member.sessionId !== group.me?.sessionId)
          if (!first) return false
          resolved = `@${first.alias}`
        }
        const message = format(tt, "nudgeMessage", { group: group.name, me: `@${group.me?.alias ?? "owner"}` })
        const ok = await send({ target: resolved, message })
        return Boolean(ok)
      }

      const saveRole = async ({ role, roleId, duties }) => {
        if (!group || !roleMember) return
        const ok = await run("role", async () => {
          await api("POST", sessionId, {
            action: "setRole",
            group: group.id,
            member: roleMember.sessionId,
            role,
            roleId,
            duties,
          }, undefined, { lang })
          setNotice({ kind: "success", text: tt("roleSaved") })
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
          await api("POST", sessionId, { action: "removeMember", group: group.id, member: member.sessionId }, undefined, { lang })
          setNotice({ kind: "success", text: tt("memberRemoved") })
          setConfirm(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const dissolve = async () => {
        if (!group) return
        const ok = await run("dissolve", async () => {
          await api("POST", sessionId, { action: "dissolve", group: group.id }, undefined, { lang })
          setNotice({ kind: "success", text: tt("dissolvedDone") })
          setConfirm(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const removeGroup = async () => {
        if (!group) return
        const ok = await run("delete", async () => {
          await api("POST", sessionId, { action: "delete", group: group.id }, undefined, { lang })
          setNotice({ kind: "success", text: tt("deletedDone") })
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
          await api("POST", sessionId, { action: "leave", group: group.id }, undefined, { lang })
          setNotice({ kind: "success", text: tt("leaveDone") })
          setConfirm(null)
          setSelectedId(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const addMember = async ({ sessionId: memberSessionId, alias, role, roleId }) => {
        if (!group) return
        const ok = await run("add", async () => {
          await api("POST", sessionId, {
            action: "addMember",
            group: group.id,
            memberSessionId,
            alias,
            role,
            roleId,
          }, undefined, { lang })
          setNotice({ kind: "success", text: tt("added") })
          setAddOpen(false)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const create = async (draft) => {
        pendingPreselect = ""
        return await run("create", async () => {
          const data = await api("POST", sessionId, { action: "create", ...draft }, undefined, { lang })
          setView("groups")
          setNotice({ kind: "success", text: tt("createdDone") })
          if (data?.group?.id) setSelectedId(data.group.id)
          await load(true)
          return true
        })
      }

      const savePrompt = async (value) => {
        if (!group || !textPrompt) return
        const kind = textPrompt.kind
        const ok = await run(kind, async () => {
          await api("POST", sessionId, {
            action: kind === "rename" ? "rename" : "setTopic",
            group: group.id,
            ...(kind === "rename" ? { name: value } : { topic: value }),
          }, undefined, { lang })
          setNotice({ kind: "success", text: kind === "rename" ? tt("renamed") : tt("topicSet", { name: group.name, topic: value }) })
          setTextPrompt(null)
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const saveSensitivity = async (level) => {
        if (!group) return
        const ok = await run("sensitivity", async () => {
          await api("POST", sessionId, { action: "sensitivity", group: group.id, level }, undefined, { lang })
          setSensitivityOpen(false)
          setNotice({ kind: "success", text: tt("sensitivity") })
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const togglePause = async () => {
        if (!group) return
        const ok = await run("pause", async () => {
          const data = await api("POST", sessionId, { action: group.paused ? "resume" : "pause", group: group.id }, undefined, { lang })
          setGroupFromResponse(data)
          setNotice({ kind: "success", text: group.paused ? tt("resumed") : tt("paused") })
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const setGroupFromResponse = (data) => {
        const next = data?.group
        if (!next?.id) return
        setGroups((current) => current.map((entry) => entry.id === next.id ? { ...entry, ...next } : entry))
      }

      const toggleHostPause = async () => {
        const ok = await run("host-pause", async () => {
          await api("POST", sessionId, { action: "pauseHost", paused: !(gate?.paused === true) }, undefined, { lang })
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const toggleRelayPause = async () => {
        const ok = await run("relay-pause", async () => {
          await api("POST", sessionId, { action: "pauseRelay", paused: !(gate?.relayPaused === true) }, undefined, { lang })
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const exportChat = async () => {
        if (!group) return
        const ok = await run("export", async () => {
          const data = await api("POST", sessionId, { action: "export", group: group.id }, undefined, { lang })
          const text = String(data?.text ?? "")
          const saved = downloadText(`group-chat-${group.name.replace(/[^\w.-]+/gu, "_")}-${Date.now()}.md`, text)
          if (!saved) await copyToClipboard(text)
          setNotice({ kind: "success", text: format(tt, "exportDone", { chars: text.length }) })
          return true
        })
        return Boolean(ok)
      }

      const cleanup = async () => {
        if (!group) return
        const ok = await run("cleanup", async () => {
          const data = await api("POST", sessionId, { action: "cleanup", group: group.id }, undefined, { lang })
          const removed = Array.isArray(data?.removed) ? data.removed : []
          setNotice({
            kind: "success",
            text: removed.length > 0 ? format(tt, "cleanupDone", { names: removed.map((alias) => `@${alias}`).join(", ") }) : tt("cleanupNone"),
          })
          await load(true)
          return true
        })
        return Boolean(ok)
      }

      const markAllRead = () => {
        const next = { ...seen }
        for (const entry of groups) next[entry.id] = latestAt(entry)
        writeSeen(sessionId, next)
        setSeen(next)
        announceSeen(sessionId)
        setNotice({ kind: "success", text: tt("allReadDone") })
      }

      const toggleMute = () => {
        if (!group) return
        const next = { ...muted, [group.id]: !muted[group.id] }
        setMuted(next)
        writeFlagMap(MUTE_KEY, next)
        setNotice({ kind: "success", text: next[group.id] ? tt("muted") : tt("unmute") })
      }

      const hideGroup = () => {
        if (!group) return
        const next = { ...hidden, [group.id]: true }
        setHidden(next)
        writeFlagMap(HIDE_KEY, next)
        setSelectedId(null)
        setNotice({ kind: "success", text: tt("hide") })
      }

      const openSettings = () => {
        setSettingsOpen(true)
        void api("GET", sessionId, undefined, undefined, { lang, stats: true })
          .then((data) => { if (data?.stats) setStats(data.stats) })
          .catch(() => {})
      }

      const close = () => onClose()

      const togglePin = () => {
        const next = !pinned
        writePinned(next)
        setPinned(next)
        setNotice({ kind: "success", text: next ? tt("keepOpenOn") : tt("keepOpenOff") })
      }

      const cycleLang = () => {
        const next = langPref === "system" ? "zh" : langPref === "zh" ? "en" : "system"
        setLangPref(next)
        setNotice({ kind: "success", text: format(tt, "lang") + ": " + langLabel(next, tt) })
      }

      const body = view === "create"
        ? h(CreateForm, {
            useSessions,
            preselectId: pendingPreselect,
            onCreate: create,
            onCancel: () => { pendingPreselect = ""; setView("groups") },
            busy,
            error,
            t: tt,
          })
        : h("div", { className: listOpen ? "dsh-group-talk-l-shell" : "dsh-group-talk-l-shell dsh-group-talk-l-shell-list-collapsed" },
            listOpen ? h(GroupList, {
              groups: visibleGroups,
              selectedId,
              unreadById,
              muted,
              loading,
              error,
              onSelect: (id) => {
                setSelectedId(id)
                writeFocus(sessionId, id)
                setNotice(null)
                setError(null)
              },
              onCreate: () => setView("create"),
              onRetry: () => { void load() },
              onMarkAllRead: markAllRead,
              t: tt,
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
                  onAudit: () => { void openAudit() },
                  onTogglePin: togglePin,
                  onToggleList: () => setListOpen((value) => !value),
                  onRename: () => setTextPrompt({ kind: "rename", title: tt("renameTitle"), label: tt("groupName"), value: group.name, placeholder: tt("renamePlaceholder") }),
                  onTopic: () => setTextPrompt({ kind: "topic", title: tt("topicTitle"), label: tt("topicField"), value: group.topic ?? "", placeholder: tt("topicPlaceholder") }),
                  onSensitivity: () => setSensitivityOpen(true),
                  onPause: togglePause,
                  onExport: exportChat,
                  onCleanup: cleanup,
                  onSettings: openSettings,
                  onDigest: () => setDigestOpen(true),
                  onRelay: (member) => setRelayMember(member),
                  onLoadEarlier: () => setOlderLimit((value) => (value || (limits?.uiMessageLimit ?? 20)) + 50),
                  muted: Boolean(muted[group.id]),
                  onMute: toggleMute,
                  onHide: hideGroup,
                  relays: relays.filter((relay) => !relay.groupId || relay.groupId === group.id),
                  capabilities: { ...(capabilities ?? {}), gate },
                  onDismissError: () => setError(null),
                  listOpen,
                  pinned,
                  prioritySupported: capabilities?.priority === true,
                  version,
                  t: tt,
                  useSessions,
                })
              : h("div", { className: "dsh-group-talk-l-main" },
                  h(EmptyState, {
                    icon: h(IconUsersOutlineRegular, { size: 32 }),
                    title: groups.length === 0 ? tt("emptyTitle") : tt("noSelection"),
                    text: groups.length === 0 ? tt("emptyText") : tt("help"),
                    action: groups.length === 0
                      ? h(Button, { variant: "primary", size: "sm", icon: h(IconPlusOutlineRegular, { size: 14 }), onClick: () => setView("create") }, tt("create"))
                      : null,
                  })))

      const dialogs = h(React.Fragment, null,
        roleMember ? h(RoleModal, {
          member: roleMember,
          onSave: saveRole,
          onClose: () => setRoleMember(null),
          busy,
          error,
          t: tt,
        }) : null,
        confirm ? h(ConfirmModal, {
          title: confirm.kind === "delete" ? tt("deleteTitle") : confirm.kind === "dissolve" ? tt("dissolveTitle") : confirm.kind === "leave" ? tt("leaveTitle") : tt("removeTitle"),
          text: confirm.kind === "delete" ? tt("deleteText") : confirm.kind === "dissolve" ? tt("dissolveText") : confirm.kind === "leave" ? tt("leaveText") : tt("removeText"),
          confirmLabel: confirm.kind === "delete" ? tt("confirmDelete") : confirm.kind === "dissolve" ? tt("confirmDissolve") : confirm.kind === "leave" ? tt("confirmLeave") : tt("confirmRemove"),
          danger: confirm.kind === "delete" || confirm.kind === "remove",
          onConfirm: confirm.kind === "delete" ? removeGroup : confirm.kind === "dissolve" ? dissolve : confirm.kind === "leave" ? leaveGroup : removeMember,
          onClose: () => setConfirm(null),
          busy: confirm.kind === "delete" ? busy === "delete" : confirm.kind === "dissolve" ? busy === "dissolve" : confirm.kind === "leave" ? busy === "leave" : busy === "remove",
          error,
          t: tt,
        }) : null,
        addOpen && group ? h(AddMemberModal, {
          group,
          sessionId,
          useSessions,
          onAdd: addMember,
          onClose: () => setAddOpen(false),
          busy: busy === "add",
          error,
          t: tt,
        }) : null,
        pendingSend ? h(BroadcastModal, {
          preview: pendingSend.preview,
          secret: pendingSend.secret === true,
          onConfirm: confirmSend,
          onClose: () => setPendingSend(null),
          busy: busy === "send",
          t: tt,
        }) : null,
        relayMember ? h(RelayModal, {
          member: relayMember,
          onSend: sendRelay,
          onClose: () => setRelayMember(null),
          busy: busy === "relay",
          error,
          t: tt,
        }) : null,
        textPrompt ? h(TextPromptModal, {
          title: textPrompt.title,
          label: textPrompt.label,
          value: textPrompt.value,
          placeholder: textPrompt.placeholder,
          onSave: savePrompt,
          onClose: () => setTextPrompt(null),
          busy: busy === textPrompt.kind,
          error,
          t: tt,
        }) : null,
        sensitivityOpen && group ? h(SensitivityModal, {
          current: group.sensitivity ?? "internal",
          onSave: saveSensitivity,
          onClose: () => setSensitivityOpen(false),
          t: tt,
        }) : null,
        digestOpen && group ? h(DigestModal, {
          group,
          relays,
          onClose: () => setDigestOpen(false),
          t: tt,
        }) : null,
        settingsOpen ? h(SettingsModal, {
          limits,
          capabilities,
          gate,
          stats,
          onClose: () => setSettingsOpen(false),
          onToggleHostPause: toggleHostPause,
          onToggleRelayPause: toggleRelayPause,
          onCleanup: cleanup,
          onExport: exportChat,
          onUnhide: () => { const next = {}; setHidden(next); writeFlagMap(HIDE_KEY, next) },
          hiddenCount: Object.keys(hidden).filter((id) => groups.some((entry) => entry.id === id)).length,
          busy,
          t: tt,
        }) : null)

      if (embedded) {
        return h("div", { className: "dsh-group-talk-l-page" },
          h("div", { className: "dsh-group-talk-l-page-head" },
            h("div", { className: "dsh-group-talk-l-page-title" },
              h("span", null, view === "create" ? tt("createTitle") : tt("title")),
              h("span", { className: "dsh-group-talk-l-page-sub" }, tt("panelSubtitle"))),
            h("div", { className: "dsh-group-talk-l-head-actions" },
              !listOpen
                ? h(Button, { variant: "ghost", size: "sm", onClick: () => setListOpen(true) }, tt("showGroupList"))
                : null,
              h(Button, { variant: "ghost", size: "sm", onClick: cycleLang, title: tt("lang") }, langLabel(langPref, tt)),
              h(Button, { variant: "ghost", size: "sm", onClick: () => { void openAudit() }, disabled: !group }, tt("audit")),
              h(Button, { variant: "ghost", size: "sm", onClick: openSettings }, tt("settings")),
              h(Button, { variant: "ghost", size: "sm", onClick: close }, tt("backToChat")))),
          legacyHost || hostOutdated ? h("div", { className: "dsh-group-talk-l-page-notice dsh-group-talk-l-page-notice-warn", role: "status" },
            h(StateDot, { state: "warning" }),
            h("span", null, legacyHost
              ? format(tt, "legacyHostWarning", { version: version ?? "?" })
              : format(tt, "hostOutdated", { version: version ?? "?" }))) : null,
          h("div", { className: "dsh-group-talk-l-page-body" }, body),
          auditOpen && group ? h(Modal, {
            open: true,
            onClose: () => setAuditOpen(false),
            title: tt("auditTitle"),
            closeLabel: tt("close"),
            className: "dsh-group-talk-l-modal dsh-group-talk-l-audit-modal",
          }, h(AuditView, { group, rows: audit?.audit, onBack: () => setAuditOpen(false), onExport: exportChat, t: tt })) : null,
          dialogs)
      }
      return h(React.Fragment, null,
        h(Modal, {
          open,
          onClose: close,
          title: view === "create" ? tt("createTitle") : tt("title"),
          closeLabel: tt("close"),
          className: "dsh-group-talk-l-modal",
        }, body),
        auditOpen && group ? h(Modal, {
          open: true,
          onClose: () => setAuditOpen(false),
          title: tt("auditTitle"),
          closeLabel: tt("close"),
          className: "dsh-group-talk-l-modal dsh-group-talk-l-audit-modal",
        }, h(AuditView, { group, rows: audit?.audit, onBack: () => setAuditOpen(false), onExport: exportChat, t: tt })) : null,
        dialogs)
    }

    /** Header shortcut: opens the full-area group panel (the sidebar owns the entry). */
    function GroupTalkLAction({ useSession, openPanel, t }) {
      // The projection uses `null` for an ordinary session; only a non-null
      // subagent address identifies a delegated conversation.
      const session = useSession((snapshot) => snapshot ?? null)
      const isSubagent = Boolean(session?.subagent)
      if (isSubagent || typeof openPanel !== "function") return null
      const currentId = String(session?.sessionId ?? session?.id ?? "")
      return h("div", { className: "dsh-group-talk-l-root", "data-group-talk-l": true },
        h(Button, {
          variant: "ghost",
          size: "sm",
          className: "dsh-group-talk-l-trigger",
          icon: h(IconUsersOutlineRegular, { size: 14 }),
          "aria-label": t("trigger"),
          onClick: () => {
            pendingPreselect = currentId
            openPanel()
          },
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
        if (typeof document === "undefined") return undefined
        const onKey = (event) => {
          const target = event.target
          const tag = String(target?.tagName ?? "").toLowerCase()
          if (tag === "input" || tag === "textarea" || tag === "select") return
          if (event.key === "Escape") {
            try { closePanel() } catch {}
          }
        }
        document.addEventListener("keydown", onKey)
        const onPointer = (event) => {
          const target = event?.target
          if (target && typeof target.closest === "function" && target.closest(".dsh-group-talk-l-page")) return
          lastExternalPointerAt = Date.now()
          writePinned(false)
        }
        document.addEventListener("pointerdown", onPointer, true)
        return () => {
          document.removeEventListener("keydown", onKey)
          document.removeEventListener("pointerdown", onPointer, true)
        }
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
      if (typeof document === "undefined" || typeof MutationObserver === "undefined" || !document.body) return () => {}
      const decorate = (row) => {
        if (!row || row.classList?.contains("dsh-group-talk-l-incoming-row")) return
        const text = row.textContent ?? ""
        // Require the envelope header *and* the payload marker, so an ordinary
        // message that merely starts with the words is not decorated (F31).
        if (!text.trimStart().startsWith("【群聊 / Group chat】")) return
        if (!text.includes('"group":{"name"')) return
        row.classList.add("dsh-group-talk-l-incoming-row")
        const stack = row.querySelector('[class*="userStack"]')
        if (!stack || stack.querySelector(".dsh-group-talk-l-incoming-badge")) return
        const badge = document.createElement("span")
        badge.className = "dsh-group-talk-l-incoming-badge"
        badge.textContent = String(document.documentElement?.lang ?? "").toLowerCase().startsWith("zh") ? "群聊 · Group-Talk-L" : "Group chat · Group-Talk-L"
        stack.prepend(badge)
      }
      const inspect = (root) => {
        if (!(root instanceof Element)) return
        if (root.matches?.('[class*="userRow"]')) decorate(root)
        for (const row of root.querySelectorAll?.('[class*="userRow"]') ?? []) decorate(row)
      }
      inspect(document.body)
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) inspect(node)
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      return () => {
        observer.disconnect()
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
        tag.dataset.plugin = "@leica-shen/dsh-group-chat"
        tag.dataset.pluginCss = "@leica-shen/dsh-group-chat/panel.css"
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
      makeTranslator,
      effectiveLang,
      displayRole,
      digestOf,
      DigestModal,
      zh,
      en,
      CLIENT_VERSION,
    }
    return module.exports
  },
})
