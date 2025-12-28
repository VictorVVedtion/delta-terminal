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
      apiError = error.name === 'AbortError'
        ? new ApiError('请求超时', 'TIMEOUT', 408)
        : new ApiError(error.message || '网络错误', 'NETWORK_ERROR', 0)
    } else {
      apiError = new ApiError('未知错误', 'UNKNOWN', 500)
    }
    if (showToast) notify('error', apiError.message)
    return apiError
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
        const errorData = await response.json().catch(() => ({}))
        const apiError = new ApiError(
          errorData.message || '请求失败 (' + response.status + ')',
          errorData.code || 'HTTP_' + response.status,
          response.status,
          errorData.details
        )
        if (showToast) notify('error', apiError.message)
        return { success: false, error: apiError }
      }
      const responseData = await response.json().catch(() => null)
      return { success: true, data: responseData as T }
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
