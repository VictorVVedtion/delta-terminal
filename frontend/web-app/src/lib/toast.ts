/**
 * Toast 通知封装
 * Story 5.1: Toast 即时通知组件
 *
 * 基于 Sonner 库，提供统一的 Toast API
 */

import { toast as sonnerToast } from 'sonner'

// =============================================================================
// Types
// =============================================================================

export interface ToastOptions {
  /** 详细描述 */
  description?: string
  /** 持续时间 (ms)，默认根据类型不同 */
  duration?: number
  /** 操作按钮 */
  action?: {
    label: string
    onClick: () => void
  }
}

// =============================================================================
// Toast Functions
// =============================================================================

/**
 * 成功通知
 * 默认持续 5 秒
 */
function success(title: string, options?: ToastOptions) {
  sonnerToast.success(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * 错误通知
 * 默认持续 8 秒（较长，确保用户看到）
 */
function error(title: string, options?: ToastOptions) {
  sonnerToast.error(title, {
    description: options?.description,
    duration: options?.duration ?? 8000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * 警告通知
 * 默认持续 6 秒
 */
function warning(title: string, options?: ToastOptions) {
  sonnerToast.warning(title, {
    description: options?.description,
    duration: options?.duration ?? 6000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * 信息通知
 * 默认持续 5 秒
 */
function info(title: string, options?: ToastOptions) {
  sonnerToast.info(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  })
}

/**
 * Loading 通知
 * 返回 ID 用于后续更新
 */
function loading(title: string, options?: Omit<ToastOptions, 'action'>) {
  return sonnerToast.loading(title, {
    description: options?.description,
  })
}

/**
 * Promise 通知
 * 自动处理 loading -> success/error
 */
function promise<T>(
  promise: Promise<T>,
  options: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: Error) => string)
  }
) {
  return sonnerToast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: options.error,
  })
}

/**
 * 关闭指定 Toast
 */
function dismiss(toastId?: string | number) {
  sonnerToast.dismiss(toastId)
}

// =============================================================================
// Export
// =============================================================================

export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  dismiss,
}

export default toast
