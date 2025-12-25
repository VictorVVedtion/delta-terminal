/**
 * 市场数据 Hook
 * 处理实时市场数据订阅和更新
 */

import { useEffect, useState, useCallback } from 'react'
import { useMarketStore } from '@/store'
import { wsClient } from '@/lib/websocket'
import { apiClient } from '@/lib/api'

interface MarketData {
  symbol: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
}

interface OrderBookData {
  asks: Array<{ price: number; amount: number; total: number }>
  bids: Array<{ price: number; amount: number; total: number }>
  spread: number
  spreadPercent: number
}

interface TradeData {
  id: string
  price: number
  amount: number
  side: 'buy' | 'sell'
  timestamp: number
}

export function useMarketData(symbol: string) {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { updateMarket } = useMarketStore()

  // 获取初始市场数据
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getMarketData(symbol) as MarketData
      setMarketData(data)
      updateMarket(symbol, data as MarketData)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [symbol, updateMarket])

  // 订阅实时更新
  useEffect(() => {
    fetchMarketData()

    const handleTickerUpdate = (data: any) => {
      setMarketData(prev => ({ ...prev, ...data }))
      updateMarket(symbol, data)
    }

    wsClient.subscribeTicker(symbol, handleTickerUpdate)

    return () => {
      wsClient.unsubscribe(`ticker:${symbol}`, 'ticker', handleTickerUpdate)
    }
  }, [symbol, fetchMarketData, updateMarket])

  return { marketData, loading, error, refetch: fetchMarketData }
}

export function useOrderBook(symbol: string, limit: number = 20) {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrderBook = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getOrderBook(symbol, limit) as OrderBookData
      setOrderBook(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [symbol, limit])

  useEffect(() => {
    fetchOrderBook()

    const handleOrderBookUpdate = (data: any) => {
      setOrderBook(data)
    }

    wsClient.subscribeOrderBook(symbol, handleOrderBookUpdate)

    return () => {
      wsClient.unsubscribe(
        `orderbook:${symbol}`,
        'orderbook',
        handleOrderBookUpdate
      )
    }
  }, [symbol, fetchOrderBook])

  return { orderBook, loading, error, refetch: fetchOrderBook }
}

export function useTrades(symbol: string, limit: number = 50) {
  const [trades, setTrades] = useState<TradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getTrades(symbol, limit) as TradeData[]
      setTrades(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [symbol, limit])

  useEffect(() => {
    fetchTrades()

    const handleTradeUpdate = (data: TradeData) => {
      setTrades(prev => [data, ...prev.slice(0, limit - 1)])
    }

    wsClient.subscribeTrades(symbol, handleTradeUpdate)

    return () => {
      wsClient.unsubscribe(`trades:${symbol}`, 'trades', handleTradeUpdate)
    }
  }, [symbol, limit, fetchTrades])

  return { trades, loading, error, refetch: fetchTrades }
}

export function useMarketList() {
  const [markets, _setMarkets] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, _setError] = useState<Error | null>(null)

  useEffect(() => {
    // 这里应该有一个获取所有市场列表的 API
    // 暂时返回模拟数据
    setLoading(false)
  }, [])

  return { markets, loading, error }
}
