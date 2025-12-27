'use client'

import { TrendingDown,TrendingUp } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TradingViewProps {
  symbol: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
}

export function TradingView({
  symbol,
  price,
  change24h,
  high24h,
  low24h,
  volume24h,
}: TradingViewProps) {
  const [timeframe, setTimeframe] = React.useState('1D')
  const isPositive = change24h >= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{symbol}</CardTitle>
            <Badge variant="outline">现货</Badge>
          </div>

          <Tabs defaultValue="1D" value={timeframe} onValueChange={setTimeframe}>
            <TabsList>
              <TabsTrigger value="1M">1分</TabsTrigger>
              <TabsTrigger value="5M">5分</TabsTrigger>
              <TabsTrigger value="15M">15分</TabsTrigger>
              <TabsTrigger value="1H">1时</TabsTrigger>
              <TabsTrigger value="4H">4时</TabsTrigger>
              <TabsTrigger value="1D">1日</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Price Info */}
        <div className="flex items-baseline gap-3 mt-4">
          <div className="text-3xl font-bold">${price.toLocaleString()}</div>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span
              className={`text-lg font-semibold ${
                isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isPositive ? '+' : ''}
              {change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24h Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-muted-foreground">24h最高</div>
            <div className="font-medium">${high24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">24h最低</div>
            <div className="font-medium">${low24h.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">24h成交量</div>
            <div className="font-medium">${(volume24h / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 图表占位符 - 实际项目中应集成 TradingView 或 LightWeight Charts */}
        <div className="h-[400px] bg-muted/20 rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-lg font-medium mb-2">K线图表</div>
            <div className="text-sm">
              集成 TradingView 或 LightWeight Charts
            </div>
          </div>
        </div>

        {/* 技术指标 */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <IndicatorBadge label="MA(7)" value="43,245" />
          <IndicatorBadge label="MA(25)" value="42,890" />
          <IndicatorBadge label="RSI(14)" value="58.3" />
          <IndicatorBadge label="MACD" value="正向" positive />
        </div>
      </CardContent>
    </Card>
  )
}

interface IndicatorBadgeProps {
  label: string
  value: string
  positive?: boolean
}

function IndicatorBadge({ label, value, positive }: IndicatorBadgeProps) {
  return (
    <div className="px-3 py-1.5 rounded-md bg-muted text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-medium ${positive ? 'text-green-500' : ''}`}>
        {value}
      </span>
    </div>
  )
}
