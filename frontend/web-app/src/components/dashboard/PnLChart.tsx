'use client'

import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DataPoint {
  timestamp: number
  value: number
}

interface PnLChartProps {
  data: DataPoint[]
  title?: string
}

export function PnLChart({ data, title = '盈亏曲线' }: PnLChartProps) {
  const [timeframe, setTimeframe] = React.useState('24h')

  // 简化的图表渲染（实际应使用 recharts）
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Tabs defaultValue="24h" value={timeframe} onValueChange={setTimeframe}>
            <TabsList>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          {/* 简化的SVG图表 */}
          <svg width="100%" height="100%" className="text-primary">
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 网格线 */}
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1="0"
                y1={`${percent}%`}
                x2="100%"
                y2={`${percent}%`}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
            ))}

            {/* 数据路径 */}
            <path
              d={generatePath(data, maxValue, minValue)}
              fill="url(#chartGradient)"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Y轴标签 */}
          <div className="absolute top-0 left-0 flex flex-col justify-between h-full text-xs text-muted-foreground">
            <span>${maxValue.toFixed(0)}</span>
            <span>${((maxValue + minValue) / 2).toFixed(0)}</span>
            <span>${minValue.toFixed(0)}</span>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <StatItem label="最高" value={`$${maxValue.toFixed(2)}`} />
          <StatItem label="最低" value={`$${minValue.toFixed(2)}`} />
          <StatItem
            label="涨幅"
            value={data.length > 0 ? `${((data[data.length - 1]!.value - data[0]!.value) / data[0]!.value * 100).toFixed(2)}%` : '0%'}
            isPercentage
          />
        </div>
      </CardContent>
    </Card>
  )
}

function generatePath(data: DataPoint[], max: number, min: number): string {
  if (data.length === 0) return ''

  const range = max - min
  const width = 100 / (data.length - 1)

  const points = data.map((point, index) => {
    const x = index * width
    const y = 100 - ((point.value - min) / range) * 100
    return `${x},${y}`
  })

  return `M ${points.join(' L ')}`
}

interface StatItemProps {
  label: string
  value: string
  isPercentage?: boolean
}

function StatItem({ label, value, isPercentage }: StatItemProps) {
  const isPositive = isPercentage && parseFloat(value) >= 0

  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-sm font-semibold ${
          isPercentage
            ? isPositive
              ? 'text-green-500'
              : 'text-red-500'
            : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
