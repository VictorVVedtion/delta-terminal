'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef,useState } from 'react'

import { wsClient } from '@/lib/websocket'
import { type MarketData,useMarketStore } from '@/store'
import { useAuthStore } from '@/store/auth'

// =============================================================================
// Types
// =============================================================================

interface WebSocketContextValue {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  subscribeTicker: (symbol: string) => () => void
  subscribeOrderBook: (symbol: string) => () => void
  subscribeTrades: (symbol: string) => () => void
}

interface TickerData {
  symbol: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
}

// =============================================================================
// Context
// =============================================================================

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// =============================================================================
// Provider
// =============================================================================

interface WebSocketProviderProps {
  children: React.ReactNode
  autoConnect?: boolean | undefined
}

export function WebSocketProvider({ children, autoConnect = true }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { accessToken, isAuthenticated } = useAuthStore()
  const { updateMarket } = useMarketStore()
  const subscriptionsRef = useRef<Set<string>>(new Set())

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      await wsClient.connect(accessToken ?? undefined)
      setIsConnected(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      // 错误已在 wsClient 中记录，此处静默处理
    } finally {
      setIsConnecting(false)
    }
  }, [accessToken, isConnecting, isConnected])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsClient.disconnect()
    setIsConnected(false)
    subscriptionsRef.current.clear()
  }, [])

  // Handle ticker updates
  const handleTickerUpdate = useCallback((data: TickerData) => {
    updateMarket(data.symbol, {
      symbol: data.symbol,
      price: data.price,
      change24h: data.change24h,
      volume24h: data.volume24h,
      timestamp: data.timestamp,
    })
  }, [updateMarket])

  // Subscribe to ticker
  const subscribeTicker = useCallback((symbol: string) => {
    const key = `ticker:${symbol}`

    if (!subscriptionsRef.current.has(key)) {
      wsClient.subscribeTicker(symbol, handleTickerUpdate)
      subscriptionsRef.current.add(key)
    }

    // Return unsubscribe function
    return () => {
      if (subscriptionsRef.current.has(key)) {
        wsClient.unsubscribe(`ticker:${symbol}`, 'ticker')
        subscriptionsRef.current.delete(key)
      }
    }
  }, [handleTickerUpdate])

  // Subscribe to order book
  const subscribeOrderBook = useCallback((symbol: string) => {
    const key = `orderbook:${symbol}`

    if (!subscriptionsRef.current.has(key)) {
      wsClient.subscribeOrderBook(symbol, (_data) => {
        // Handle order book update
      })
      subscriptionsRef.current.add(key)
    }

    return () => {
      if (subscriptionsRef.current.has(key)) {
        wsClient.unsubscribe(`orderbook:${symbol}`, 'orderbook')
        subscriptionsRef.current.delete(key)
      }
    }
  }, [])

  // Subscribe to trades
  const subscribeTrades = useCallback((symbol: string) => {
    const key = `trades:${symbol}`

    if (!subscriptionsRef.current.has(key)) {
      wsClient.subscribeTrades(symbol, (_data) => {
        // Handle trades update
      })
      subscriptionsRef.current.add(key)
    }

    return () => {
      if (subscriptionsRef.current.has(key)) {
        wsClient.unsubscribe(`trades:${symbol}`, 'trades')
        subscriptionsRef.current.delete(key)
      }
    }
  }, [])

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected && !isConnecting) {
      void connect()
    }

    return () => {
      // Cleanup on unmount
      if (isConnected) {
        disconnect()
      }
    }
  }, [autoConnect, isAuthenticated, isConnected, isConnecting, connect, disconnect])

  // Handle connection status updates with debouncing to prevent flicker
  useEffect(() => {
    let lastStatus = isConnected
    let debounceTimer: NodeJS.Timeout | null = null

    const checkConnection = setInterval(() => {
      const connected = wsClient.isConnected()

      // Only update if status has been stable for 500ms
      if (connected !== lastStatus) {
        if (debounceTimer) clearTimeout(debounceTimer)

        debounceTimer = setTimeout(() => {
          if (wsClient.isConnected() === connected) {
            setIsConnected(connected)
            lastStatus = connected
          }
        }, 500)
      }
    }, 1000)

    return () => {
      clearInterval(checkConnection)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [isConnected])

  // Auto-reconnect when disconnected
  useEffect(() => {
    if (!isConnected && !isConnecting && isAuthenticated && autoConnect) {
      const reconnectTimer = setTimeout(() => {
        void connect()
      }, 3000) // Wait 3 seconds before attempting reconnect

      return () => { clearTimeout(reconnectTimer); }
    }
  }, [isConnected, isConnecting, isAuthenticated, autoConnect, connect])

  const value: WebSocketContextValue = {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    subscribeTicker,
    subscribeOrderBook,
    subscribeTrades,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook for subscribing to ticker data
 */
export function useTicker(symbol: string): MarketData | undefined {
  const { subscribeTicker, isConnected } = useWebSocket()
  const { getMarket } = useMarketStore()
  const [data, setData] = useState<MarketData | undefined>(undefined)

  useEffect(() => {
    if (!isConnected || !symbol) return

    const unsubscribe = subscribeTicker(symbol)

    return () => {
      unsubscribe()
    }
  }, [symbol, isConnected, subscribeTicker])

  // Sync with store
  useEffect(() => {
    const market = getMarket(symbol)
    if (market) {
      setData(market)
    }
  }, [symbol, getMarket])

  return data
}

/**
 * Hook for connection status indicator
 */
export function useConnectionStatus() {
  const { isConnected, isConnecting, error, connect } = useWebSocket()

  return {
    isConnected,
    isConnecting,
    error,
    reconnect: connect,
    status: isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected',
  }
}
