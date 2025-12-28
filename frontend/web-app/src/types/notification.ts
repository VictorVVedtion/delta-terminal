/**
 * Notification Types - 通知系统类型定义
 *
 * @module S61 紧急通知渠道
 */

// =============================================================================
// Notification Priority & Channels
// =============================================================================

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical'

/**
 * 通知渠道
 */
export type NotificationChannel =
  | 'in_app'       // 应用内通知
  | 'push'         // 推送通知
  | 'email'        // 邮件通知
  | 'sms'          // 短信通知
  | 'webhook'      // Webhook 回调
  | 'telegram'     // Telegram 机器人
  | 'discord'      // Discord webhook

/**
 * 通知类别
 */
export type NotificationCategory =
  | 'trade'           // 交易相关
  | 'risk_alert'      // 风险预警
  | 'strategy'        // 策略状态
  | 'system'          // 系统消息
  | 'market'          // 市场行情
  | 'account'         // 账户变动

// =============================================================================
// Notification Data Types
// =============================================================================

/**
 * 通知动作按钮
 */
export interface NotificationAction {
  /** 动作ID */
  id: string
  /** 按钮文本 */
  label: string
  /** 动作类型 */
  type: 'primary' | 'secondary' | 'destructive'
  /** 跳转链接 */
  href?: string
  /** 回调动作 */
  action?: string
}

/**
 * 基础通知数据
 */
export interface NotificationData {
  /** 通知ID */
  id: string
  /** 标题 */
  title: string
  /** 内容 */
  message: string
  /** 优先级 */
  priority: NotificationPriority
  /** 类别 */
  category: NotificationCategory
  /** 创建时间 */
  createdAt: number
  /** 是否已读 */
  read: boolean
  /** 是否已确认 (用于紧急通知) */
  acknowledged: boolean
  /** 相关实体ID */
  entityId?: string
  /** 相关实体类型 */
  entityType?: 'strategy' | 'order' | 'position' | 'account'
  /** 动作按钮 */
  actions?: NotificationAction[]
  /** 额外数据 */
  metadata?: Record<string, unknown>
  /** 过期时间 */
  expiresAt?: number
}

/**
 * 紧急通知 (需要立即确认)
 */
export interface UrgentNotification extends NotificationData {
  priority: 'urgent' | 'critical'
  /** 超时动作 */
  timeoutAction?: 'auto_dismiss' | 'auto_acknowledge' | 'escalate'
  /** 超时秒数 */
  timeoutSeconds?: number
  /** 声音提醒 */
  sound?: boolean
  /** 振动提醒 */
  vibrate?: boolean
}

/**
 * 交易通知
 */
export interface TradeNotification extends NotificationData {
  category: 'trade'
  /** 交易对 */
  symbol: string
  /** 交易方向 */
  side: 'buy' | 'sell'
  /** 价格 */
  price: number
  /** 数量 */
  quantity: number
  /** 盈亏 */
  pnl?: number
}

/**
 * 风险预警通知
 */
export interface RiskAlertNotification extends NotificationData {
  category: 'risk_alert'
  /** 预警类型 */
  alertType: string
  /** 严重程度 */
  severity: 'info' | 'warning' | 'critical'
  /** 受影响策略 */
  affectedStrategies?: string[]
  /** 当前值 */
  currentValue?: number
  /** 阈值 */
  threshold?: number
}

// =============================================================================
// Notification Center Types
// =============================================================================

/**
 * 通知筛选条件
 */
export interface NotificationFilter {
  categories?: NotificationCategory[]
  priorities?: NotificationPriority[]
  read?: boolean
  acknowledged?: boolean
  startDate?: number
  endDate?: number
}

/**
 * 通知统计
 */
export interface NotificationStats {
  total: number
  unread: number
  urgent: number
  byCategory: Record<NotificationCategory, number>
}

/**
 * 通知偏好设置
 */
export interface NotificationPreferences {
  /** 启用的渠道 */
  enabledChannels: NotificationChannel[]
  /** 免打扰时段 */
  quietHours?: {
    enabled: boolean
    start: string  // HH:mm
    end: string    // HH:mm
    timezone: string
  }
  /** 各类别通知设置 */
  categorySettings: Record<NotificationCategory, {
    enabled: boolean
    channels: NotificationChannel[]
    minPriority: NotificationPriority
  }>
  /** 紧急通知始终提醒 */
  alwaysAlertUrgent: boolean
  /** 声音开关 */
  soundEnabled: boolean
  /** 桌面通知开关 */
  desktopEnabled: boolean
}

// =============================================================================
// Notification Display Helpers
// =============================================================================

/**
 * 优先级显示配置
 */
export const PRIORITY_CONFIG: Record<NotificationPriority, {
  label: string
  color: string
  icon: string
}> = {
  low: { label: '低', color: '#6b7280', icon: '○' },
  normal: { label: '普通', color: '#3b82f6', icon: '●' },
  high: { label: '高', color: '#f59e0b', icon: '◆' },
  urgent: { label: '紧急', color: '#ef4444', icon: '⚠️' },
  critical: { label: '危急', color: '#dc2626', icon: '🚨' },
}

/**
 * 类别显示配置
 */
export const CATEGORY_CONFIG: Record<NotificationCategory, {
  label: string
  icon: string
}> = {
  trade: { label: '交易', icon: '📊' },
  risk_alert: { label: '风险预警', icon: '⚠️' },
  strategy: { label: '策略', icon: '🤖' },
  system: { label: '系统', icon: '⚙️' },
  market: { label: '市场', icon: '📈' },
  account: { label: '账户', icon: '👤' },
}

/**
 * 渠道显示配置
 */
export const CHANNEL_CONFIG: Record<NotificationChannel, {
  label: string
  icon: string
}> = {
  in_app: { label: '应用内', icon: '📱' },
  push: { label: '推送', icon: '🔔' },
  email: { label: '邮件', icon: '📧' },
  sms: { label: '短信', icon: '💬' },
  webhook: { label: 'Webhook', icon: '🔗' },
  telegram: { label: 'Telegram', icon: '✈️' },
  discord: { label: 'Discord', icon: '💬' },
}

// =============================================================================
// Type Guards
// =============================================================================

export function isUrgentNotification(
  notification: NotificationData
): notification is UrgentNotification {
  return notification.priority === 'urgent' || notification.priority === 'critical'
}

export function isTradeNotification(
  notification: NotificationData
): notification is TradeNotification {
  return notification.category === 'trade'
}

export function isRiskAlertNotification(
  notification: NotificationData
): notification is RiskAlertNotification {
  return notification.category === 'risk_alert'
}
