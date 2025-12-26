/**
 * Notification Helper - 统一通知接口
 * Story 5.3: 通知系统集成
 *
 * 同时触发 Toast 即时通知和记录到 NotificationStore
 */

import { toast } from './toast'
import { useNotificationStore, type NotificationType } from '@/store/notification'

// =============================================================================
// Types
// =============================================================================

export interface NotifyOptions {
  /** 详细描述 */
  description?: string
  /** 来源组件 */
  source?: string
  /** 操作按钮 */
  action?: {
    label: string
    onClick: () => void
  }
  /** 是否只显示 Toast 不记录到 Store */
  toastOnly?: boolean
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * 统一通知函数
 * 同时显示 Toast 并记录到历史通知
 *
 * @param type - 通知类型: success | error | warning | info
 * @param title - 通知标题
 * @param options - 可选配置
 *
 * @example
 * ```typescript
 * // 基础用法
 * notify('success', '操作成功')
 *
 * // 带描述和来源
 * notify('error', '部署失败', {
 *   description: '网络连接超时',
 *   source: 'DeployCanvas',
 * })
 *
 * // 带操作按钮
 * notify('warning', '策略已暂停', {
 *   description: 'MA Cross 已暂停运行',
 *   source: 'MonitorCanvas',
 *   action: {
 *     label: '恢复',
 *     onClick: () => resumeStrategy(id),
 *   },
 * })
 *
 * // 仅显示 Toast，不记录历史
 * notify('info', '刷新中...', { toastOnly: true })
 * ```
 */
export function notify(
  type: NotificationType,
  title: string,
  options?: NotifyOptions
): void {
  // 1. 显示 Toast 即时通知
  toast[type](title, {
    ...(options?.description ? { description: options.description } : {}),
    ...(options?.action ? { action: options.action } : {}),
  })

  // 2. 记录到 NotificationStore（除非指定 toastOnly）
  if (!options?.toastOnly) {
    useNotificationStore.getState().addNotification({
      type,
      title,
      ...(options?.description ? { description: options.description } : {}),
      ...(options?.source ? { source: options.source } : {}),
    })
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * 成功通知
 */
export function notifySuccess(title: string, options?: NotifyOptions): void {
  notify('success', title, options)
}

/**
 * 错误通知
 */
export function notifyError(title: string, options?: NotifyOptions): void {
  notify('error', title, options)
}

/**
 * 警告通知
 */
export function notifyWarning(title: string, options?: NotifyOptions): void {
  notify('warning', title, options)
}

/**
 * 信息通知
 */
export function notifyInfo(title: string, options?: NotifyOptions): void {
  notify('info', title, options)
}

// =============================================================================
// Export
// =============================================================================

export default notify
