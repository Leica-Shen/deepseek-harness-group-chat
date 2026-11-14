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
  delegationProvider: '',
  delegationTimeoutMs: 120000,
  maxDelegationsPerDay: 3,
  maxDelegationChars: 6000,
  humanBypassTargetCaps: true,
  historyLimit: 100,
  maxGroupsPerSession: 5,
  maxGroupsTotal: 32,
  maxMembersPerGroup: 16,
  policyRecentMessages: 0,
  policyMaxChars: 3500,
  deliveryMode: 'steer',
  maxMessageChars: 2000,
  maxRecipientsPerSend: 6,
  sendCooldownMs: 3000,
  dedupeWindowMs: 30000,
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
  dailyDeliveriesPerSender: 60,
  dailyMessagesPerGroup: 60,
  dailyDeliveriesPerGroup: 120,
  dailyDeliveriesPerTarget: 40,
  dailyEstimatedTokensPerSender: 60000,
  dailyEstimatedTokensPerGroup: 120000,
  dailyEstimatedTokensPerTarget: 30000,
  assumedTokensPerDelivery: 800,
  maxHistoryToolChars: 12000,
  maxReadsPerAgentPerMinute: 20,
  replyNudgeAfterMs: 120000,
  pendingTimeoutMs: 120000,
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
    delegationProvider: typeof config.delegationProvider === 'string' ? config.delegationProvider.trim().slice(0, 80) : '',
    delegationTimeoutMs: integerOption(config.delegationTimeoutMs, DEFAULTS.delegationTimeoutMs, 10000, 600000, 'delegationTimeoutMs', log),
    maxDelegationsPerDay: integerOption(config.maxDelegationsPerDay, DEFAULTS.maxDelegationsPerDay, 0, 50, 'maxDelegationsPerDay', log),
    maxDelegationChars: integerOption(config.maxDelegationChars, DEFAULTS.maxDelegationChars, 500, 50000, 'maxDelegationChars', log),
    humanBypassTargetCaps: config.humanBypassTargetCaps !== false,
    dataFile: resolveDataFile(typeof config.dataFile === 'string' ? config.dataFile : ''),
    deliveryMode: config.deliveryMode === 'queue' ? 'queue' : 'steer',
    historyLimit: integerOption(config.historyLimit, DEFAULTS.historyLimit, 20, 500, 'historyLimit', log),
    maxGroupsPerSession: integerOption(config.maxGroupsPerSession, DEFAULTS.maxGroupsPerSession, 1, 50, 'maxGroupsPerSession', log),
    maxGroupsTotal: integerOption(config.maxGroupsTotal, DEFAULTS.maxGroupsTotal, 1, 500, 'maxGroupsTotal', log),
    maxMembersPerGroup: integerOption(config.maxMembersPerGroup, DEFAULTS.maxMembersPerGroup, 1, 64, 'maxMembersPerGroup', log),
    policyRecentMessages: integerOption(config.policyRecentMessages, DEFAULTS.policyRecentMessages, 0, 10, 'policyRecentMessages', log),
    policyMaxChars: integerOption(config.policyMaxChars, DEFAULTS.policyMaxChars, 800, 20000, 'policyMaxChars', log),
    maxMessageChars: integerOption(config.maxMessageChars, DEFAULTS.maxMessageChars, 100, 8000, 'maxMessageChars', log),
    maxRecipientsPerSend: integerOption(config.maxRecipientsPerSend, DEFAULTS.maxRecipientsPerSend, 1, 64, 'maxRecipientsPerSend', log),
    sendCooldownMs: integerOption(config.sendCooldownMs, DEFAULTS.sendCooldownMs, 0, 600000, 'sendCooldownMs', log),
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
    dailyDeliveriesPerSender: integerOption(config.dailyDeliveriesPerSender, DEFAULTS.dailyDeliveriesPerSender, 1, 100000, 'dailyDeliveriesPerSender', log),
    dailyMessagesPerGroup: integerOption(config.dailyMessagesPerGroup, DEFAULTS.dailyMessagesPerGroup, 1, 10000, 'dailyMessagesPerGroup', log),
    dailyDeliveriesPerGroup: integerOption(config.dailyDeliveriesPerGroup, DEFAULTS.dailyDeliveriesPerGroup, 1, 100000, 'dailyDeliveriesPerGroup', log),
    dailyDeliveriesPerTarget: integerOption(config.dailyDeliveriesPerTarget, DEFAULTS.dailyDeliveriesPerTarget, 1, 100000, 'dailyDeliveriesPerTarget', log),
    dailyEstimatedTokensPerSender: integerOption(config.dailyEstimatedTokensPerSender, DEFAULTS.dailyEstimatedTokensPerSender, 1000, 100000000, 'dailyEstimatedTokensPerSender', log),
    dailyEstimatedTokensPerGroup: integerOption(config.dailyEstimatedTokensPerGroup, DEFAULTS.dailyEstimatedTokensPerGroup, 1000, 100000000, 'dailyEstimatedTokensPerGroup', log),
    dailyEstimatedTokensPerTarget: integerOption(config.dailyEstimatedTokensPerTarget, DEFAULTS.dailyEstimatedTokensPerTarget, 1000, 100000000, 'dailyEstimatedTokensPerTarget', log),
    assumedTokensPerDelivery: integerOption(config.assumedTokensPerDelivery, DEFAULTS.assumedTokensPerDelivery, 50, 100000, 'assumedTokensPerDelivery', log),
    maxHistoryToolChars: integerOption(config.maxHistoryToolChars, DEFAULTS.maxHistoryToolChars, 1000, 200000, 'maxHistoryToolChars', log),
    maxReadsPerAgentPerMinute: integerOption(config.maxReadsPerAgentPerMinute, DEFAULTS.maxReadsPerAgentPerMinute, 1, 1000, 'maxReadsPerAgentPerMinute', log),
    replyNudgeAfterMs: integerOption(config.replyNudgeAfterMs, DEFAULTS.replyNudgeAfterMs, 10000, 86400000, 'replyNudgeAfterMs', log),
    pendingTimeoutMs: integerOption(config.pendingTimeoutMs, DEFAULTS.pendingTimeoutMs, 10000, 86400000, 'pendingTimeoutMs', log),
    uiMessageLimit: integerOption(config.uiMessageLimit, DEFAULTS.uiMessageLimit, 1, 100, 'uiMessageLimit', log),
  }
}
