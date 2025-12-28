/**
 * WebSocket 客户端
 * 处理实时市场数据和订单更新
 */

type WebSocketEventType =
  | 'ticker'
  | 'orderbook'
  | 'trades'
  | 'order_update'
  | 'balance_update'
  | 'strategy_update'
  | 'spirit_event'

type WebSocketCallback = (data: any) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners = new Map<WebSocketEventType, Set<WebSocketCallback>>()
  private subscriptions = new Set<string>()
  private isConnecting = false
  private connectPromise: Promise<void> | null = null
  private hasLoggedConnectionError = false

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
  }

  connect(token?: string): Promise<void> {
    // 已连接，直接返回成功
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    // 正在连接中，返回现有的 Promise（支持 React 18 Strict Mode 双重调用）
    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise
    }

    this.isConnecting = true
    this.connectPromise = new Promise((resolve, reject) => {
      const wsUrl = token ? `${this.url}?token=${token}` : this.url

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnecting = false
          this.connectPromise = null
          this.reconnectAttempts = 0
          this.hasLoggedConnectionError = false

          // 重新订阅之前的频道
          this.subscriptions.forEach(channel => {
            this.send({ type: 'subscribe', channel })
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          if (!this.hasLoggedConnectionError) {
            console.warn('WebSocket 连接失败 - 后端服务可能未启动')
            this.hasLoggedConnectionError = true
          }
          this.isConnecting = false
          this.connectPromise = null
          reject(error)
        }

        this.ws.onclose = () => {
          this.isConnecting = false
          this.connectPromise = null
          this.ws = null
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

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
    this.listeners.clear()
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (!this.hasLoggedConnectionError) {
        console.warn('WebSocket 重连次数已达上限，停止重连')
        this.hasLoggedConnectionError = true
      }
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      this.connect().catch(() => {
        // 错误已在 onerror 中处理，这里静默失败
      })
    }, delay)
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private handleMessage(data: any) {
    const { type, payload } = data

    const callbacks = this.listeners.get(type as WebSocketEventType)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload)
        } catch (error) {
          console.error(`Error in ${type} callback:`, error)
        }
      })
    }
  }

  // 订阅市场数据
  subscribeTicker(symbol: string, callback: WebSocketCallback) {
    const channel = `ticker:${symbol}`
    this.subscribe(channel, 'ticker', callback)
  }

  subscribeOrderBook(symbol: string, callback: WebSocketCallback) {
    const channel = `orderbook:${symbol}`
    this.subscribe(channel, 'orderbook', callback)
  }

  subscribeTrades(symbol: string, callback: WebSocketCallback) {
    const channel = `trades:${symbol}`
    this.subscribe(channel, 'trades', callback)
  }

  // 订阅用户数据
  subscribeOrderUpdates(callback: WebSocketCallback) {
    this.on('order_update', callback)
  }

  subscribeBalanceUpdates(callback: WebSocketCallback) {
    this.on('balance_update', callback)
  }

  subscribeStrategyUpdates(callback: WebSocketCallback) {
    this.on('strategy_update', callback)
  }

  // Spirit 系统事件
  subscribeSpiritEvents(callback: WebSocketCallback) {
    this.subscribe('spirit:events', 'spirit_event', callback)
  }

  unsubscribeSpiritEvents(callback: WebSocketCallback) {
    this.unsubscribe('spirit:events', 'spirit_event', callback)
  }

  // 通用订阅方法
  private subscribe(
    channel: string,
    eventType: WebSocketEventType,
    callback: WebSocketCallback
  ) {
    this.on(eventType, callback)

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel)
      this.send({ type: 'subscribe', channel })
    }
  }

  unsubscribe(channel: string, eventType: WebSocketEventType, callback?: WebSocketCallback) {
    if (callback) {
      this.off(eventType, callback)
    }

    this.subscriptions.delete(channel)
    this.send({ type: 'unsubscribe', channel })
  }

  on(eventType: WebSocketEventType, callback: WebSocketCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  off(eventType: WebSocketEventType, callback: WebSocketCallback) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 导出单例实例
export const wsClient = new WebSocketClient()

export default wsClient
