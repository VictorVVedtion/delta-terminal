'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Activity, Target, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OverviewProps {
  activeStrategies: number
  totalTrades: number
  winRate: number
  dailyPnL: number
}

export function Overview({
  activeStrategies,
  totalTrades,
  winRate,
  dailyPnL,
}: OverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="活跃策略"
        value={activeStrategies.toString()}
        icon={<Activity className="h-4 w-4" />}
        badge={<Badge variant="success">运行中</Badge>}
      />

      <OverviewCard
        title="今日交易"
        value={totalTrades.toString()}
        icon={<Zap className="h-4 w-4" />}
        description="笔"
      />

      <OverviewCard
        title="胜率"
        value={`${winRate.toFixed(1)}%`}
        icon={<Target className="h-4 w-4" />}
        valueColor={winRate >= 50 ? 'text-green-500' : 'text-red-500'}
      />

      <OverviewCard
        title="今日盈亏"
        value={`$${formatCurrency(Math.abs(dailyPnL))}`}
        icon={<TrendingUp className="h-4 w-4" />}
        valueColor={dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}
        badge={
          dailyPnL >= 0 ? (
            <Badge variant="success">+{dailyPnL.toFixed(2)}%</Badge>
          ) : (
            <Badge variant="destructive">{dailyPnL.toFixed(2)}%</Badge>
          )
        }
      />
    </div>
  )
}

interface OverviewCardProps {
  title: string
  value: string
  icon: React.ReactNode
  description?: string
  badge?: React.ReactNode
  valueColor?: string
}

function OverviewCard({
  title,
  value,
  icon,
  description,
  badge,
  valueColor,
}: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-bold ${valueColor || ''}`}>
            {value}
            {description && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {description}
              </span>
            )}
          </div>
          {badge}
        </div>
      </CardContent>
    </Card>
  )
}
