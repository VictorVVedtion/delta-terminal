'use client'

import { notify } from '@/components/ui/use-toast'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiErrorData {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(message: string, code: string, status = 500, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export interface RequestConfig extends RequestInit {
  baseUrl?: string
  timeout?: number
  retries?: number
  showErrorToast?: boolean
  onError?: (error: ApiError) => void
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const DEFAULT_TIMEOUT = 30000

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetchWithTimeout(url: string, config: RequestConfig): Promise<Response> {
    const timeout = config.timeout || DEFAULT_TIMEOUT
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const { timeout: _, ...fetchConfig } = config
      return await fetch(url, { ...fetchConfig, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private handleError(error: unknown, showToast: boolean): ApiError {
    let apiError: ApiError
    if (error instanceof Error) {
      apiError =
        error.name === 'AbortError'
          ? new ApiError('请求超时，请检查网络后重试', 'TIMEOUT', 408)
          : new ApiError(error.message || '网络连接失败', 'NETWORK_ERROR', 0)
    } else {
      apiError = new ApiError('服务暂时不可用', 'UNKNOWN', 500)
    }
    if (showToast) notify('error', apiError.message)
    return apiError
  }

  /**
   * 获取友好的 HTTP 错误消息
   */
  private getHttpErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '请求参数有误',
      401: '请先登录',
      403: '没有访问权限',
      404: '请求的资源不存在',
      408: '请求超时，请重试',
      429: '请求过于频繁，请稍后再试',
      500: '服务器错误，请稍后再试',
      502: '服务暂时不可用',
      503: '服务正在维护中',
      504: '服务响应超时',
    }
    return messages[status] || `请求失败 (${status})`
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = config.baseUrl || this.baseUrl
    const url = baseUrl + endpoint
    const showToast = config.showErrorToast !== false

    const requestConfig: RequestConfig = {
      method,
      headers: { 'Content-Type': 'application/json', ...config.headers },
      ...config,
    }
    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data)
    }

    try {
      const response = await this.fetchWithTimeout(url, requestConfig)

      if (!response.ok) {
        // 尝试解析错误响应
        let errorData: Record<string, unknown> = {}
        let errorText = ''

        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            errorData = await response.json()
          } else {
            // 非 JSON 响应，读取文本
            errorText = await response.text()
          }
        } catch {
          // 解析失败，使用状态码
        }

        // 构建友好的错误消息
        const errorMessage =
          (errorData.message as string) ||
          (errorData.error as string) ||
          errorText.slice(0, 100) ||
          this.getHttpErrorMessage(response.status)

        const apiError = new ApiError(
          errorMessage,
          (errorData.code as string) || `HTTP_${response.status}`,
          response.status,
          errorData.details as Record<string, unknown> | undefined
        )

        if (showToast) notify('error', apiError.message)
        return { success: false, error: apiError }
      }

      // 处理成功响应
      const contentType = response.headers.get('content-type')

      // 204 No Content 或无响应体
      if (response.status === 204 || !contentType) {
        return { success: true, data: undefined as unknown as T }
      }

      // JSON 响应
      if (contentType.includes('application/json')) {
        try {
          const responseData = await response.json()
          return { success: true, data: responseData as T }
        } catch (parseError) {
          console.warn('[ApiClient] JSON parse error:', parseError)
          return { success: true, data: undefined as unknown as T }
        }
      }

      // 其他类型响应
      return { success: true, data: undefined as unknown as T }
    } catch (error) {
      return { success: false, error: this.handleError(error, showToast) }
    }
  }

  get<T>(endpoint: string, config?: RequestConfig) {
    return this.request<T>('GET', endpoint, undefined, config)
  }

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>('POST', endpoint, data, config)
  }

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig) {
    return this.request<T>('PUT', endpoint, data, config)
  }

  delete<T>(endpoint: string, config?: RequestConfig) {
    return this.request<T>('DELETE', endpoint, undefined, config)
  }
}

export const apiClient = new ApiClient()
export default apiClient
