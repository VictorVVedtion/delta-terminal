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

type WebSocketCallback = (data: any) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<WebSocketEventType, Set<WebSocketCallback>> = new Map()
  private subscriptions: Set<string> = new Set()
  private isConnecting = false

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'))
        return
      }

      this.isConnecting = true
      const wsUrl = token ? `${this.url}?token=${token}` : this.url

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0

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
          console.error('WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnecting = false
          this.ws = null
          this.attemptReconnect()
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
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
      console.error('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Attempting to reconnect in ${delay}ms...`)

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnect failed:', error)
      })
    }, delay)
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected')
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
