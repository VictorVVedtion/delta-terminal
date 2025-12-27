'use client'

import React from 'react'

import { MainLayout } from '@/components/layout/MainLayout'
import { OrderBook } from '@/components/trading/OrderBook'
import { OrderForm } from '@/components/trading/OrderForm'
import { TradeHistory } from '@/components/trading/TradeHistory'
import { TradingView } from '@/components/trading/TradingView'

export default function TradingPage() {
  // 模拟数据
  const tradingViewData = {
    symbol: 'BTC/USDT',
    price: 43256.78,
    change24h: 2.34,
    high24h: 44120.45,
    low24h: 42890.23,
    volume24h: 2340000000,
  }

  const orderBookData = {
    asks: Array.from({ length: 20 }, (_, i) => ({
      price: 43260 + i * 10,
      amount: Math.random() * 2,
      total: 0,
    })).map(order => ({
      ...order,
      total: order.price * order.amount,
    })),
    bids: Array.from({ length: 20 }, (_, i) => ({
      price: 43250 - i * 10,
      amount: Math.random() * 2,
      total: 0,
    })).map(order => ({
      ...order,
      total: order.price * order.amount,
    })),
    spread: 10,
    spreadPercent: 0.023,
  }

  const tradesData = Array.from({ length: 20 }, (_, i) => ({
    id: `trade-${i}`,
    timestamp: Date.now() - i * 5 * 60 * 1000,
    symbol: 'BTC/USDT',
    side: (i % 2 === 0 ? 'buy' : 'sell') as 'buy' | 'sell',
    price: 43200 + Math.random() * 100,
    amount: Math.random() * 0.5,
    total: 0,
    fee: 0,
    status: 'completed' as const,
  })).map(trade => ({
    ...trade,
    total: trade.price * trade.amount,
    fee: trade.price * trade.amount * 0.001,
  }))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">现货交易</h1>
          <p className="text-muted-foreground mt-1">
            实时交易主流加密货币
          </p>
        </div>

        {/* Trading Layout */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Column - Chart */}
          <div className="lg:col-span-3 space-y-6">
            <TradingView {...tradingViewData} />
            <TradeHistory trades={tradesData} />
          </div>

          {/* Right Column - Order Book & Order Form */}
          <div className="lg:col-span-1 space-y-6">
            <OrderBook {...orderBookData} />
            <OrderForm
              symbol="BTC/USDT"
              currentPrice={43256.78}
              balance={10000}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
