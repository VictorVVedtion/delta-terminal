/**
 * Spirit WebSocket 客户端
 * 连接到 strategy-service 的 Spirit 实时事件流
 */

import { SpiritEvent, SpiritState } from '@/types/spirit'

export interface SpiritInitData {
  status: SpiritState
  lastHeartbeat: number
  recentEvents: SpiritEvent[]
}

export type SpiritMessageHandler = (event: SpiritEvent) => void
export type SpiritInitHandler = (data: SpiritInitData) => void

class SpiritClient {
  private ws: WebSocket | null = null
  private baseUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private isConnecting = false
  private connectPromise: Promise<void> | null = null
  private hasLoggedConnectionError = false

  // Event handlers
  private onEventHandler: SpiritMessageHandler | null = null
  private onInitHandler: SpiritInitHandler | null = null
  private onStatusChangeHandler: ((connected: boolean) => void) | null = null

  constructor() {
    // Spirit WebSocket 直接连接到 strategy-service
    this.baseUrl = process.env.NEXT_PUBLIC_STRATEGY_URL || 'http://localhost:3002'
  }

  /**
   * 连接到 Spirit WebSocket
   */
  connect(): Promise<void> {
    // 已连接，直接返回
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    // 正在连接中
    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise
    }

    this.isConnecting = true
    this.connectPromise = new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/api/v1/spirit/ws'
      console.log('[Spirit] Connecting to:', wsUrl)

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('[Spirit] WebSocket connected')
          this.isConnecting = false
          this.connectPromise = null
          this.reconnectAttempts = 0
          this.hasLoggedConnectionError = false
          this.onStatusChangeHandler?.(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('[Spirit] Failed to parse message:', error)
          }
        }

        this.ws.onerror = (error) => {
          if (!this.hasLoggedConnectionError) {
            console.warn('[Spirit] WebSocket connection failed - strategy-service may not be running')
            this.hasLoggedConnectionError = true
          }
          this.isConnecting = false
          this.connectPromise = null
          this.onStatusChangeHandler?.(false)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('[Spirit] WebSocket disconnected')
          this.isConnecting = false
          this.connectPromise = null
          this.ws = null
          this.onStatusChangeHandler?.(false)
          this.attemptReconnect()
        }
      } catch (error) {
        this.isConnecting = false
        this.connectPromise = null
        reject(error)
      }
    })

    return this.connectPromise
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // 阻止自动重连
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (!this.hasLoggedConnectionError) {
        console.warn('[Spirit] Max reconnect attempts reached')
        this.hasLoggedConnectionError = true
      }
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    console.log(`[Spirit] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch(() => {
        // 错误已在 onerror 中处理
      })
    }, delay)
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: { type: string; data: any }) {
    switch (data.type) {
      case 'init':
        // 初始化消息，包含当前状态和最近事件
        console.log('[Spirit] Init received:', data.data.status)
        this.onInitHandler?.(data.data as SpiritInitData)
        break

      case 'spirit_event':
        // Spirit 事件
        this.onEventHandler?.(data.data as SpiritEvent)
        break

      default:
        console.warn('[Spirit] Unknown message type:', data.type)
    }
  }

  /**
   * 设置事件处理器
   */
  onEvent(handler: SpiritMessageHandler) {
    this.onEventHandler = handler
  }

  /**
   * 设置初始化处理器
   */
  onInit(handler: SpiritInitHandler) {
    this.onInitHandler = handler
  }

  /**
   * 设置连接状态变化处理器
   */
  onStatusChange(handler: (connected: boolean) => void) {
    this.onStatusChangeHandler = handler
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 导出单例
export const spiritClient = new SpiritClient()
export default spiritClient
