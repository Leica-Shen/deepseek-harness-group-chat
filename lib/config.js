/**
 * Group-Talk-L row configuration.
 *
 * The defaults are deliberately conservative: group messages wake other
 * sessions, so one accepted send can cost several model turns. Deployment
 * owners can raise the spending and fan-out ceilings, but must do so
 * explicitly in the Loader row.
 */
import { resolveDataFile } from './store.js'

export const DEFAULTS = {
  enabled: true,
  dataFile: '',
  allowAgentCreate: false,
  allowAgentManage: false,
  allowAgentDelegate: false,
  allowAgentNote: true,
  maxNotesPerAgentPerMinute: 10,
  maxNotesPerAgentPerDay: 50,
  delegationProvider: '',
  delegationTimeoutMs: 120000,
  maxDelegationsPerDay: 3,
  maxDelegationChars: 6000,
  humanBypassTargetCaps: true,
  historyLimit: 100,
  maxGroupsPerSession: 5,
  maxGroupsTotal: 32,
  maxMembersPerGroup: 16,
  policyRecentMessages: 3,
  policyMaxChars: 3500,
  // auto: full prose for 1–2 groups, compact blocks beyond that (S4).
  policyCompact: 'auto',
  // Ambient delivery: queue finishes the target's current turn first.
  deliveryMode: 'queue',
  maxMessageChars: 2000,
  maxRecipientsPerSend: 6,
  // Only a human-confirmed broadcast may exceed maxRecipientsPerSend.
  maxBroadcastRecipients: 16,
  // The person types faster than a model and the panel renders a busy state;
  // agents keep a cooldown because retry loops are the failure mode.
  sendCooldownMs: 3000,
  humanCooldownMs: 0,
  // Human and agent message budgets are separate: one review session can use
  // 50 messages without weakening the agent-side anti-chatter ceiling.
  dedupeWindowMs: 8000,
  burstWindowMs: 60000,
  maxMessagesPerSenderPerBurst: 8,
  maxMessagesPerGroupPerBurst: 12,
  maxMessagesPerHostPerBurst: 20,
  maxDeliveriesPerTargetPerBurst: 6,
  maxEstimatedTokensPerSenderPerBurst: 12000,
  maxEstimatedTokensPerGroupPerBurst: 24000,
  maxEstimatedTokensPerHostPerBurst: 60000,
  dailyMessagesPerHost: 300,
  dailyDeliveriesPerHost: 500,
  dailyEstimatedTokensPerHost: 300000,
  dailyMessagesPerSender: 30,
  dailyMessagesPerHuman: 120,
  dailyDeliveriesPerSender: 60,
  dailyMessagesPerGroup: 60,
  dailyDeliveriesPerGroup: 120,
  dailyDeliveriesPerTarget: 40,
  dailyBroadcastsPerSender: 6,
  // Circuit breaker (S11): too many room-wide sends pause the room.
  maxBroadcastsPerGroupPerHour: 12,
  dailyEstimatedTokensPerSender: 60000,
  dailyEstimatedTokensPerGroup: 120000,
  dailyEstimatedTokensPerTarget: 30000,
  assumedTokensPerDelivery: 800,
  maxHistoryToolChars: 12000,
  maxReadsPerAgentPerMinute: 20,
  replyNudgeAfterMs: 120000,
  // off | soft | strict. soft names a reply owner; strict also rejects other
  // members' messages while the turn is open (corrections still allowed).
  turnMode: 'soft',
  turnTimeoutMs: 900000,
  pendingTimeoutMs: 120000,
  // Concurrency gate (S10): how many sessions may be woken at once.
  maxConcurrentDeliveries: 2,
  deliveryQueueLimit: 32,
  // Retention (S16): 0 keeps everything.
  retentionDays: 30,
  // Relay (S23): default on, one bounded round, 10-minute TTL.
  allowRelay: true,
  relayTtlMs: 600000,
  relayPairPerHour: 6,
  // Credential scan (S8). The panel can override after an explicit confirm.
  secretScan: true,
  defaultSensitivity: 'internal',
  // all: every member can read the whole transcript (current behaviour).
  // own: a member only sees rows addressed to them or sent by them.
  memberHistoryScope: 'all',
  // Reference-only delegation (S7): children cannot mutate the workspace.
  delegationReadOnly: true,
  // Advisory lock for the JSON store (single-process assumption, F24).
  lockFile: true,
  // /group output language; the Web panel follows the host locale.
  commandLang: 'zh',
  uiMessageLimit: 20,
}

/** Clamp one integer config value, with a visible fallback on invalid input. */
function integerOption(value, fallback, min, max, label, log) {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    log(`${label}=${String(value)} is outside ${min}..${max}; using ${fallback}`)
    return fallback
  }
  return number
}

/** Resolve and validate the row config. */
export function resolveConfig(raw = {}, log = () => {}) {
  const config = raw && typeof raw === 'object' ? raw : {}
  return {
    enabled: config.enabled !== false,
    allowAgentCreate: config.allowAgentCreate === true,
    allowAgentManage: config.allowAgentManage === true,
    allowAgentDelegate: config.allowAgentDelegate === true,
    allowAgentNote: config.allowAgentNote !== false,
    maxNotesPerAgentPerMinute: integerOption(config.maxNotesPerAgentPerMinute, DEFAULTS.maxNotesPerAgentPerMinute, 0, 1000, 'maxNotesPerAgentPerMinute', log),
    maxNotesPerAgentPerDay: integerOption(config.maxNotesPerAgentPerDay, DEFAULTS.maxNotesPerAgentPerDay, 0, 10000, 'maxNotesPerAgentPerDay', log),
    delegationProvider: typeof config.delegationProvider === 'string' ? config.delegationProvider.trim().slice(0, 80) : '',
    delegationTimeoutMs: integerOption(config.delegationTimeoutMs, DEFAULTS.delegationTimeoutMs, 10000, 600000, 'delegationTimeoutMs', log),
    maxDelegationsPerDay: integerOption(config.maxDelegationsPerDay, DEFAULTS.maxDelegationsPerDay, 0, 50, 'maxDelegationsPerDay', log),
    maxDelegationChars: integerOption(config.maxDelegationChars, DEFAULTS.maxDelegationChars, 500, 50000, 'maxDelegationChars', log),
    humanBypassTargetCaps: config.humanBypassTargetCaps !== false,
    dataFile: resolveDataFile(typeof config.dataFile === 'string' ? config.dataFile : ''),
    deliveryMode: config.deliveryMode === 'steer' ? 'steer' : 'queue',
    historyLimit: integerOption(config.historyLimit, DEFAULTS.historyLimit, 20, 500, 'historyLimit', log),
    maxGroupsPerSession: integerOption(config.maxGroupsPerSession, DEFAULTS.maxGroupsPerSession, 1, 50, 'maxGroupsPerSession', log),
    maxGroupsTotal: integerOption(config.maxGroupsTotal, DEFAULTS.maxGroupsTotal, 1, 500, 'maxGroupsTotal', log),
    maxMembersPerGroup: integerOption(config.maxMembersPerGroup, DEFAULTS.maxMembersPerGroup, 1, 64, 'maxMembersPerGroup', log),
    policyRecentMessages: integerOption(config.policyRecentMessages, DEFAULTS.policyRecentMessages, 0, 10, 'policyRecentMessages', log),
    policyMaxChars: integerOption(config.policyMaxChars, DEFAULTS.policyMaxChars, 800, 20000, 'policyMaxChars', log),
    policyCompact: config.policyCompact === 'always' || config.policyCompact === 'never' ? config.policyCompact : 'auto',
    maxMessageChars: integerOption(config.maxMessageChars, DEFAULTS.maxMessageChars, 100, 8000, 'maxMessageChars', log),
    maxRecipientsPerSend: integerOption(config.maxRecipientsPerSend, DEFAULTS.maxRecipientsPerSend, 1, 64, 'maxRecipientsPerSend', log),
    maxBroadcastRecipients: integerOption(config.maxBroadcastRecipients, DEFAULTS.maxBroadcastRecipients, 1, 64, 'maxBroadcastRecipients', log),
    sendCooldownMs: integerOption(config.sendCooldownMs, DEFAULTS.sendCooldownMs, 0, 600000, 'sendCooldownMs', log),
    humanCooldownMs: integerOption(config.humanCooldownMs, DEFAULTS.humanCooldownMs, 0, 600000, 'humanCooldownMs', log),
    dedupeWindowMs: integerOption(config.dedupeWindowMs, DEFAULTS.dedupeWindowMs, 0, 3600000, 'dedupeWindowMs', log),
    burstWindowMs: integerOption(config.burstWindowMs, DEFAULTS.burstWindowMs, 0, 3600000, 'burstWindowMs', log),
    maxMessagesPerSenderPerBurst: integerOption(config.maxMessagesPerSenderPerBurst, DEFAULTS.maxMessagesPerSenderPerBurst, 1, 1000, 'maxMessagesPerSenderPerBurst', log),
    maxMessagesPerGroupPerBurst: integerOption(config.maxMessagesPerGroupPerBurst, DEFAULTS.maxMessagesPerGroupPerBurst, 1, 1000, 'maxMessagesPerGroupPerBurst', log),
    maxMessagesPerHostPerBurst: integerOption(config.maxMessagesPerHostPerBurst, DEFAULTS.maxMessagesPerHostPerBurst, 1, 10000, 'maxMessagesPerHostPerBurst', log),
    maxDeliveriesPerTargetPerBurst: integerOption(config.maxDeliveriesPerTargetPerBurst, DEFAULTS.maxDeliveriesPerTargetPerBurst, 1, 1000, 'maxDeliveriesPerTargetPerBurst', log),
    maxEstimatedTokensPerSenderPerBurst: integerOption(config.maxEstimatedTokensPerSenderPerBurst, DEFAULTS.maxEstimatedTokensPerSenderPerBurst, 1000, 100000000, 'maxEstimatedTokensPerSenderPerBurst', log),
    maxEstimatedTokensPerGroupPerBurst: integerOption(config.maxEstimatedTokensPerGroupPerBurst, DEFAULTS.maxEstimatedTokensPerGroupPerBurst, 1000, 100000000, 'maxEstimatedTokensPerGroupPerBurst', log),
    maxEstimatedTokensPerHostPerBurst: integerOption(config.maxEstimatedTokensPerHostPerBurst, DEFAULTS.maxEstimatedTokensPerHostPerBurst, 1000, 100000000, 'maxEstimatedTokensPerHostPerBurst', log),
    dailyMessagesPerHost: integerOption(config.dailyMessagesPerHost, DEFAULTS.dailyMessagesPerHost, 1, 100000, 'dailyMessagesPerHost', log),
    dailyDeliveriesPerHost: integerOption(config.dailyDeliveriesPerHost, DEFAULTS.dailyDeliveriesPerHost, 1, 1000000, 'dailyDeliveriesPerHost', log),
    dailyEstimatedTokensPerHost: integerOption(config.dailyEstimatedTokensPerHost, DEFAULTS.dailyEstimatedTokensPerHost, 1000, 1000000000, 'dailyEstimatedTokensPerHost', log),
    dailyMessagesPerSender: integerOption(config.dailyMessagesPerSender, DEFAULTS.dailyMessagesPerSender, 1, 10000, 'dailyMessagesPerSender', log),
    dailyMessagesPerHuman: integerOption(config.dailyMessagesPerHuman, DEFAULTS.dailyMessagesPerHuman, 1, 100000, 'dailyMessagesPerHuman', log),
    dailyDeliveriesPerSender: integerOption(config.dailyDeliveriesPerSender, DEFAULTS.dailyDeliveriesPerSender, 1, 100000, 'dailyDeliveriesPerSender', log),
    dailyMessagesPerGroup: integerOption(config.dailyMessagesPerGroup, DEFAULTS.dailyMessagesPerGroup, 1, 10000, 'dailyMessagesPerGroup', log),
    dailyDeliveriesPerGroup: integerOption(config.dailyDeliveriesPerGroup, DEFAULTS.dailyDeliveriesPerGroup, 1, 100000, 'dailyDeliveriesPerGroup', log),
    dailyDeliveriesPerTarget: integerOption(config.dailyDeliveriesPerTarget, DEFAULTS.dailyDeliveriesPerTarget, 1, 100000, 'dailyDeliveriesPerTarget', log),
    dailyBroadcastsPerSender: integerOption(config.dailyBroadcastsPerSender, DEFAULTS.dailyBroadcastsPerSender, 0, 1000, 'dailyBroadcastsPerSender', log),
    maxBroadcastsPerGroupPerHour: integerOption(config.maxBroadcastsPerGroupPerHour, DEFAULTS.maxBroadcastsPerGroupPerHour, 1, 1000, 'maxBroadcastsPerGroupPerHour', log),
    dailyEstimatedTokensPerSender: integerOption(config.dailyEstimatedTokensPerSender, DEFAULTS.dailyEstimatedTokensPerSender, 1000, 100000000, 'dailyEstimatedTokensPerSender', log),
    dailyEstimatedTokensPerGroup: integerOption(config.dailyEstimatedTokensPerGroup, DEFAULTS.dailyEstimatedTokensPerGroup, 1000, 100000000, 'dailyEstimatedTokensPerGroup', log),
    dailyEstimatedTokensPerTarget: integerOption(config.dailyEstimatedTokensPerTarget, DEFAULTS.dailyEstimatedTokensPerTarget, 1000, 100000000, 'dailyEstimatedTokensPerTarget', log),
    assumedTokensPerDelivery: integerOption(config.assumedTokensPerDelivery, DEFAULTS.assumedTokensPerDelivery, 50, 100000, 'assumedTokensPerDelivery', log),
    maxHistoryToolChars: integerOption(config.maxHistoryToolChars, DEFAULTS.maxHistoryToolChars, 1000, 200000, 'maxHistoryToolChars', log),
    maxReadsPerAgentPerMinute: integerOption(config.maxReadsPerAgentPerMinute, DEFAULTS.maxReadsPerAgentPerMinute, 1, 1000, 'maxReadsPerAgentPerMinute', log),
    replyNudgeAfterMs: integerOption(config.replyNudgeAfterMs, DEFAULTS.replyNudgeAfterMs, 10000, 86400000, 'replyNudgeAfterMs', log),
    turnMode: config.turnMode === 'strict' || config.turnMode === 'off' ? config.turnMode : 'soft',
    turnTimeoutMs: integerOption(config.turnTimeoutMs, DEFAULTS.turnTimeoutMs, 60000, 86400000, 'turnTimeoutMs', log),
    pendingTimeoutMs: integerOption(config.pendingTimeoutMs, DEFAULTS.pendingTimeoutMs, 10000, 86400000, 'pendingTimeoutMs', log),
    maxConcurrentDeliveries: integerOption(config.maxConcurrentDeliveries, DEFAULTS.maxConcurrentDeliveries, 1, 16, 'maxConcurrentDeliveries', log),
    deliveryQueueLimit: integerOption(config.deliveryQueueLimit, DEFAULTS.deliveryQueueLimit, 1, 512, 'deliveryQueueLimit', log),
    retentionDays: integerOption(config.retentionDays, DEFAULTS.retentionDays, 0, 3650, 'retentionDays', log),
    allowRelay: config.allowRelay !== false,
    relayTtlMs: integerOption(config.relayTtlMs, DEFAULTS.relayTtlMs, 60000, 1800000, 'relayTtlMs', log),
    relayPairPerHour: integerOption(config.relayPairPerHour, DEFAULTS.relayPairPerHour, 1, 60, 'relayPairPerHour', log),
    secretScan: config.secretScan !== false,
    defaultSensitivity: ['public', 'internal', 'secret'].includes(config.defaultSensitivity) ? config.defaultSensitivity : DEFAULTS.defaultSensitivity,
    memberHistoryScope: config.memberHistoryScope === 'own' ? 'own' : 'all',
    delegationReadOnly: config.delegationReadOnly !== false,
    lockFile: config.lockFile !== false,
    commandLang: config.commandLang === 'en' ? 'en' : 'zh',
    uiMessageLimit: integerOption(config.uiMessageLimit, DEFAULTS.uiMessageLimit, 1, 100, 'uiMessageLimit', log),
  }
}
