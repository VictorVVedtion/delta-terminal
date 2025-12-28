/**
 * 错误上报服务
 *
 * 提供统一的错误收集和上报功能
 * - 本地 console.error 记录
 * - 可选的外部错误追踪服务集成 (Sentry, LogRocket 等)
 */

// =============================================================================
// Types
// =============================================================================

export interface ErrorReport {
  /** 错误消息 */
  message: string
  /** 错误堆栈 */
  stack?: string
  /** 组件堆栈 */
  componentStack?: string
  /** 错误类型 */
  type: 'runtime' | 'boundary' | 'network' | 'unknown'
  /** 时间戳 */
  timestamp: number
  /** 用户上下文 */
  context?: Record<string, unknown>
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// =============================================================================
// Error Reporter Service
// =============================================================================

class ErrorReporterService {
  private isDevelopment: boolean
  private isEnabled: boolean
  private errorQueue: ErrorReport[] = []
  private maxQueueSize = 50

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isEnabled = true
  }

  /**
   * 上报错误
   */
  report(error: Error, context?: {
    componentStack?: string
    type?: ErrorReport['type']
    severity?: ErrorReport['severity']
    additionalContext?: Record<string, unknown>
  }): void {
    if (!this.isEnabled) {
      return
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: context?.componentStack,
      type: context?.type || 'runtime',
      timestamp: Date.now(),
      context: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...context?.additionalContext,
      },
      severity: context?.severity || 'medium',
    }

    // 添加到队列
    this.addToQueue(errorReport)

    // 控制台输出（开发环境）
    if (this.isDevelopment) {
      this.logToConsole(errorReport)
    }

    // 发送到外部服务（生产环境）
    if (!this.isDevelopment) {
      this.sendToExternalService(errorReport)
    }
  }

  /**
   * 添加到错误队列
   */
  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport)

    // 限制队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }
  }

  /**
   * 控制台日志输出
   */
  private logToConsole(errorReport: ErrorReport): void {
    const style = this.getSeverityStyle(errorReport.severity)

    console.group(
      `%c🚨 Error Report [${errorReport.type}] - ${errorReport.severity}`,
      style
    )
    console.error('Message:', errorReport.message)

    if (errorReport.stack) {
      console.error('Stack:', errorReport.stack)
    }

    if (errorReport.componentStack) {
      console.error('Component Stack:', errorReport.componentStack)
    }

    if (errorReport.context && Object.keys(errorReport.context).length > 0) {
      console.info('Context:', errorReport.context)
    }

    console.info('Timestamp:', new Date(errorReport.timestamp).toISOString())
    console.groupEnd()
  }

  /**
   * 发送到外部错误追踪服务
   */
  private sendToExternalService(errorReport: ErrorReport): void {
    // TODO: 集成外部错误追踪服务
    // 例如: Sentry, LogRocket, Bugsnag 等

    // Sentry 示例:
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(new Error(errorReport.message), {
    //     level: this.mapSeverityToSentryLevel(errorReport.severity),
    //     contexts: {
    //       error: {
    //         type: errorReport.type,
    //         componentStack: errorReport.componentStack,
    //       },
    //     },
    //     extra: errorReport.context,
    //   })
    // }

    // 目前仅在控制台输出（生产环境也可见）
    console.error('[ErrorReporter] Error:', {
      message: errorReport.message,
      type: errorReport.type,
      severity: errorReport.severity,
      timestamp: new Date(errorReport.timestamp).toISOString(),
    })
  }

  /**
   * 获取严重程度样式
   */
  private getSeverityStyle(severity: ErrorReport['severity']): string {
    const styles = {
      low: 'color: #f59e0b; font-weight: bold;',
      medium: 'color: #ef4444; font-weight: bold;',
      high: 'color: #dc2626; font-weight: bold; font-size: 14px;',
      critical: 'color: #991b1b; font-weight: bold; font-size: 16px; background: #fee2e2;',
    }
    return styles[severity]
  }

  /**
   * 获取错误队列
   */
  getErrorQueue(): ErrorReport[] {
    return [...this.errorQueue]
  }

  /**
   * 清空错误队列
   */
  clearErrorQueue(): void {
    this.errorQueue = []
  }

  /**
   * 启用/禁用错误上报
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const errorReporter = new ErrorReporterService()

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * 上报运行时错误
 */
export function reportError(
  error: Error,
  options?: {
    severity?: ErrorReport['severity']
    context?: Record<string, unknown>
  }
): void {
  errorReporter.report(error, {
    type: 'runtime',
    severity: options?.severity,
    additionalContext: options?.context,
  })
}

/**
 * 上报边界错误
 */
export function reportBoundaryError(
  error: Error,
  componentStack?: string,
  options?: {
    severity?: ErrorReport['severity']
    context?: Record<string, unknown>
  }
): void {
  errorReporter.report(error, {
    type: 'boundary',
    componentStack,
    severity: options?.severity || 'high',
    additionalContext: options?.context,
  })
}

/**
 * 上报网络错误
 */
export function reportNetworkError(
  error: Error,
  options?: {
    url?: string
    method?: string
    statusCode?: number
    severity?: ErrorReport['severity']
  }
): void {
  errorReporter.report(error, {
    type: 'network',
    severity: options?.severity || 'medium',
    additionalContext: {
      url: options?.url,
      method: options?.method,
      statusCode: options?.statusCode,
    },
  })
}
