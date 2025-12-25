'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { wsClient } from '@/lib/websocket'
import { useAuthStore } from '@/store/auth'
import { useMarketStore, type MarketData } from '@/store'

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
      console.error('WebSocket connection error:', err)
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
      wsClient.subscribeOrderBook(symbol, (data) => {
        // Handle order book update
        console.log('Order book update:', data)
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
      wsClient.subscribeTrades(symbol, (data) => {
        // Handle trades update
        console.log('Trades update:', data)
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
      connect()
    }

    return () => {
      // Cleanup on unmount
      if (isConnected) {
        disconnect()
      }
    }
  }, [autoConnect, isAuthenticated, isConnected, isConnecting, connect, disconnect])

  // Handle connection status updates
  useEffect(() => {
    const checkConnection = setInterval(() => {
      const connected = wsClient.isConnected()
      if (connected !== isConnected) {
        setIsConnected(connected)
      }
    }, 1000)

    return () => clearInterval(checkConnection)
  }, [isConnected])

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
