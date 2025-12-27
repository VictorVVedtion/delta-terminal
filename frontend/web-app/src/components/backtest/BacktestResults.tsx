'use client'

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  ListOrdered,
  Share2,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent,TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { BacktestResult, BacktestTrade } from '@/types/backtest'

// =============================================================================
// BacktestResults Component
// =============================================================================

interface BacktestResultsProps {
  result: BacktestResult
}

export function BacktestResults({ result }: BacktestResultsProps) {
  const { metrics, equity, trades, config } = result

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {config.name || '回测结果'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {config.symbol} · {config.startDate} 至 {config.endDate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="总收益率"
          value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`}
          icon={metrics.totalReturn >= 0 ? TrendingUp : TrendingDown}
          variant={metrics.totalReturn >= 0 ? 'success' : 'destructive'}
        />
        <MetricCard
          title="年化收益"
          value={`${metrics.annualizedReturn >= 0 ? '+' : ''}${metrics.annualizedReturn.toFixed(2)}%`}
          icon={Activity}
          variant={metrics.annualizedReturn >= 0 ? 'success' : 'destructive'}
        />
        <MetricCard
          title="最大回撤"
          value={`${metrics.maxDrawdown.toFixed(2)}%`}
          icon={TrendingDown}
          variant="warning"
        />
        <MetricCard
          title="夏普比率"
          value={metrics.sharpeRatio.toFixed(2)}
          icon={Target}
          variant={metrics.sharpeRatio >= 1 ? 'success' : 'default'}
        />
      </div>

      {/* Detailed Results Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="trades" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            交易记录
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equity Curve */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">权益曲线</CardTitle>
              </CardHeader>
              <CardContent>
                <EquityCurve data={equity} />
              </CardContent>
            </Card>

            {/* Trading Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">交易统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <StatRow label="总交易次数" value={metrics.totalTrades} />
                  <StatRow
                    label="胜率"
                    value={`${metrics.winRate.toFixed(1)}%`}
                    valueClass={metrics.winRate >= 50 ? 'text-up' : 'text-down'}
                  />
                  <StatRow
                    label="盈利因子"
                    value={metrics.profitFactor.toFixed(2)}
                    valueClass={metrics.profitFactor >= 1 ? 'text-up' : 'text-down'}
                  />
                  <StatRow
                    label="平均盈利"
                    value={`+${metrics.avgWin.toFixed(2)}%`}
                    valueClass="text-up"
                  />
                  <StatRow
                    label="平均亏损"
                    value={`${metrics.avgLoss.toFixed(2)}%`}
                    valueClass="text-down"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">风险指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <StatRow
                    label="最大回撤"
                    value={`${metrics.maxDrawdown.toFixed(2)}%`}
                    valueClass="text-down"
                  />
                  <StatRow
                    label="夏普比率"
                    value={metrics.sharpeRatio.toFixed(2)}
                    valueClass={metrics.sharpeRatio >= 1 ? 'text-up' : 'text-down'}
                  />
                  <StatRow
                    label="收益回撤比"
                    value={(metrics.totalReturn / Math.abs(metrics.maxDrawdown)).toFixed(2)}
                  />
                  {metrics.maxConsecutiveWins !== undefined && (
                    <StatRow
                      label="最大连胜"
                      value={`${metrics.maxConsecutiveWins} 次`}
                    />
                  )}
                  {metrics.maxConsecutiveLosses !== undefined && (
                    <StatRow
                      label="最大连亏"
                      value={`${metrics.maxConsecutiveLosses} 次`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                交易记录 ({trades.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                导出 CSV
              </Button>
            </CardHeader>
            <CardContent>
              <TradeTable trades={trades} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

interface MetricCardProps {
  title: string
  value: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'destructive' | 'warning'
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: MetricCardProps) {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-up',
    destructive: 'text-down',
    warning: 'text-warning',
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className={cn('h-4 w-4', variantClasses[variant])} />
        </div>
        <div className={cn('text-2xl font-bold mt-1', variantClasses[variant])}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatRowProps {
  label: string
  value: string | number
  valueClass?: string
}

function StatRow({ label, value, valueClass }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', valueClass)}>{value}</span>
    </div>
  )
}

interface EquityCurveProps {
  data: { date: string; equity: number }[]
}

function EquityCurve({ data }: EquityCurveProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        无数据
      </div>
    )
  }

  const lastEquity = data[data.length - 1]?.equity ?? 0
  const firstEquity = data[0]?.equity ?? 0
  const isPositive = lastEquity >= firstEquity
  const color = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#888' }} 
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#888' }} 
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
            formatter={(val: number) => [`$${val.toFixed(2)}`, '权益']}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="equity" 
            stroke={color} 
            fillOpacity={1} 
            fill="url(#colorEquity)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface TradeTableProps {
  trades: BacktestTrade[]
}

function TradeTable({ trades }: TradeTableProps) {
  const [sortField, setSortField] = React.useState<keyof BacktestTrade>('entryTime')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const sortedTrades = React.useMemo(() => {
    return [...trades].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [trades, sortField, sortDir])

  const handleSort = (field: keyof BacktestTrade) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              className="text-left py-3 px-2 font-medium cursor-pointer hover:text-foreground"
              onClick={() => { handleSort('entryTime'); }}
            >
              时间
            </th>
            <th className="text-left py-3 px-2 font-medium">方向</th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-foreground"
              onClick={() => { handleSort('entryPrice'); }}
            >
              入场价
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-foreground"
              onClick={() => { handleSort('exitPrice'); }}
            >
              出场价
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-foreground"
              onClick={() => { handleSort('quantity'); }}
            >
              数量
            </th>
            <th
              className="text-right py-3 px-2 font-medium cursor-pointer hover:text-foreground"
              onClick={() => { handleSort('pnlPercent'); }}
            >
              盈亏
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.slice(0, 50).map((trade) => (
            <tr
              key={trade.id}
              className="border-b border-border/50 hover:bg-muted/30"
            >
              <td className="py-2 px-2 text-muted-foreground">
                {new Date(trade.entryTime).toLocaleDateString()}
              </td>
              <td className="py-2 px-2">
                <Badge
                  variant={trade.side === 'buy' ? 'success' : 'destructive'}
                  className="text-xs"
                >
                  {trade.side === 'buy' ? '买入' : '卖出'}
                </Badge>
              </td>
              <td className="py-2 px-2 text-right font-mono">
                ${trade.entryPrice.toFixed(2)}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                ${trade.exitPrice.toFixed(2)}
              </td>
              <td className="py-2 px-2 text-right font-mono">
                {trade.quantity.toFixed(4)}
              </td>
              <td className="py-2 px-2 text-right">
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 font-medium',
                    trade.pnlPercent >= 0 ? 'text-up' : 'text-down'
                  )}
                >
                  {trade.pnlPercent >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {trade.pnlPercent >= 0 ? '+' : ''}
                  {trade.pnlPercent.toFixed(2)}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length > 50 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          显示前 50 条，共 {trades.length} 条记录
        </div>
      )}
    </div>
  )
}
