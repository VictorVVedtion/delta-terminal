'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  Target,
  Power,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SentinelAlerts } from '@/components/risk'
import { KillSwitch } from '@/components/KillSwitch'

// =============================================================================
// Types
// =============================================================================

interface RiskMetric {
  label: string
  value: number | string
  change?: number
  status: 'safe' | 'warning' | 'danger'
  icon: React.ElementType
}

interface PositionRisk {
  symbol: string
  side: 'long' | 'short'
  size: number
  pnl: number
  pnlPercent: number
  leverage: number
  liquidationPrice: number
  riskScore: number
}

// =============================================================================
// Mock Data
// =============================================================================

const riskMetrics: RiskMetric[] = [
  {
    label: '总体风险评分',
    value: 72,
    status: 'warning',
    icon: Shield,
  },
  {
    label: '最大回撤',
    value: '-8.5%',
    change: -2.3,
    status: 'warning',
    icon: TrendingDown,
  },
  {
    label: '在险价值 (VaR)',
    value: '$1,234',
    status: 'safe',
    icon: DollarSign,
  },
  {
    label: '波动率',
    value: '23.4%',
    change: 5.2,
    status: 'warning',
    icon: Activity,
  },
]

const positionRisks: PositionRisk[] = [
  {
    symbol: 'BTC/USDT',
    side: 'long',
    size: 5000,
    pnl: 234.5,
    pnlPercent: 4.69,
    leverage: 5,
    liquidationPrice: 38500,
    riskScore: 45,
  },
  {
    symbol: 'ETH/USDT',
    side: 'long',
    size: 3000,
    pnl: -89.2,
    pnlPercent: -2.97,
    leverage: 3,
    liquidationPrice: 2100,
    riskScore: 32,
  },
  {
    symbol: 'SOL/USDT',
    side: 'short',
    size: 1500,
    pnl: 45.8,
    pnlPercent: 3.05,
    leverage: 10,
    liquidationPrice: 185,
    riskScore: 78,
  },
]

// =============================================================================
// Components
// =============================================================================

function RiskScoreCard({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s <= 30) return 'text-green-500'
    if (s <= 60) return 'text-yellow-500'
    if (s <= 80) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreLabel = (s: number) => {
    if (s <= 30) return '低风险'
    if (s <= 60) return '中等风险'
    if (s <= 80) return '较高风险'
    return '高风险'
  }

  const getScoreBg = (s: number) => {
    if (s <= 30) return 'bg-green-500/10 border-green-500/20'
    if (s <= 60) return 'bg-yellow-500/10 border-yellow-500/20'
    if (s <= 80) return 'bg-orange-500/10 border-orange-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  return (
    <Card className={cn('border', getScoreBg(score))}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">总体风险评分</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn('text-4xl font-bold', getScoreColor(score))}>
                {score}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <Badge variant="outline" className={cn('mt-2', getScoreColor(score))}>
              {getScoreLabel(score)}
            </Badge>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${score * 2.51} 251`}
                className={getScoreColor(score)}
              />
            </svg>
            <Shield className={cn('absolute inset-0 m-auto h-8 w-8', getScoreColor(score))} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ metric }: { metric: RiskMetric }) {
  const Icon = metric.icon
  const statusColors = {
    safe: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className={cn('text-2xl font-bold mt-1', statusColors[metric.status])}>
              {metric.value}
            </p>
            {metric.change !== undefined && (
              <p className={cn(
                'text-xs mt-1',
                metric.change >= 0 ? 'text-red-500' : 'text-green-500'
              )}>
                {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}% 较昨日
              </p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted/50', statusColors[metric.status])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PositionRiskTable({ positions }: { positions: PositionRisk[] }) {
  const getRiskColor = (score: number) => {
    if (score <= 30) return 'bg-green-500'
    if (score <= 60) return 'bg-yellow-500'
    if (score <= 80) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          持仓风险
        </CardTitle>
        <CardDescription>当前持仓的风险分析</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.map((position, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{position.symbol}</span>
                  <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
                    {position.side === 'long' ? '做多' : '做空'}
                  </Badge>
                  <Badge variant="outline">{position.leverage}x</Badge>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'font-mono font-medium',
                    position.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} USDT
                  </span>
                  <span className={cn(
                    'text-xs ml-2',
                    position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">仓位大小</span>
                  <p className="font-mono">${position.size.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">强平价格</span>
                  <p className="font-mono text-orange-500">
                    ${position.liquidationPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">风险评分</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress
                      value={position.riskScore}
                      className="h-2 flex-1"
                      // @ts-expect-error - indicatorClassName not in types
                      indicatorClassName={getRiskColor(position.riskScore)}
                    />
                    <span className="text-xs font-mono w-8">{position.riskScore}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Risk Page
// =============================================================================

export default function RiskPage() {
  const overallScore = 72

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            风险管理
          </h1>
          <p className="text-muted-foreground mt-1">
            监控和管理您的交易风险
          </p>
        </div>

        {/* Risk Score + Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-1">
            <RiskScoreCard score={overallScore} />
          </div>
          {riskMetrics.slice(1).map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>

        {/* Position Risks + Sentinel Alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PositionRiskTable positions={positionRisks} />
          </div>
          <div className="space-y-4">
            <SentinelAlerts maxVisible={3} />
          </div>
        </div>

        {/* Quick Actions + Kill Switch */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  风险控制
                </CardTitle>
                <CardDescription>快速调整风险参数</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">全局止损</p>
                    <p className="text-2xl font-bold text-orange-500 mt-1">-10%</p>
                    <p className="text-xs text-muted-foreground mt-1">触发后平仓所有持仓</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">最大仓位</p>
                    <p className="text-2xl font-bold mt-1">$15,000</p>
                    <p className="text-xs text-muted-foreground mt-1">单策略最大持仓</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">日亏损限制</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">-$500</p>
                    <p className="text-xs text-muted-foreground mt-1">达到后停止交易</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Kill Switch */}
          <div>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <Power className="h-5 w-5" />
                  紧急熔断
                </CardTitle>
                <CardDescription>
                  长按激活紧急停止所有交易
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KillSwitch />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
