'use client'

import {
  Activity,
  Clock,
  Edit,
  Pause,
  Play,
  Plus,
  Trash2} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface Strategy {
  id: string
  name: string
  description: string
  status: 'running' | 'paused' | 'stopped'
  performance: {
    pnl: number
    pnlPercent: number
    trades: number
    winRate: number
  }
  createdAt: number
  lastActive: number
}

interface StrategyListProps {
  strategies: Strategy[]
  onCreateNew?: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: Strategy['status']) => void
}

export function StrategyList({
  strategies,
  onCreateNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: StrategyListProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">我的策略</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理和监控你的交易策略
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          创建新策略
        </Button>
      </div>

      {/* Strategy Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            {...(onEdit && { onEdit })}
            {...(onDelete && { onDelete })}
            {...(onToggleStatus && { onToggleStatus })}
          />
        ))}

        {strategies.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">还没有策略</h3>
              <p className="text-sm text-muted-foreground mb-4">
                使用 AI 助手创建你的第一个交易策略
              </p>
              <Button onClick={onCreateNew}>开始创建</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface StrategyCardProps {
  strategy: Strategy
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: Strategy['status']) => void
}

function StrategyCard({
  strategy,
  onEdit,
  onDelete,
  onToggleStatus,
}: StrategyCardProps) {
  const isRunning = strategy.status === 'running'

  const statusConfig = {
    running: { variant: 'success' as const, label: '运行中' },
    paused: { variant: 'warning' as const, label: '已暂停' },
    stopped: { variant: 'secondary' as const, label: '已停止' },
  }

  const { variant, label } = statusConfig[strategy.status]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{strategy.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {strategy.description}
            </p>
          </div>
          <Badge variant={variant}>{label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label="盈亏"
            value={`$${formatCurrency(Math.abs(strategy.performance.pnl))}`}
            subValue={formatPercentage(strategy.performance.pnlPercent)}
            isPositive={strategy.performance.pnl >= 0}
          />
          <MetricItem
            label="交易次数"
            value={strategy.performance.trades.toString()}
            subValue={`胜率 ${strategy.performance.winRate}%`}
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            最后活跃:{' '}
            {new Date(strategy.lastActive).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant={isRunning ? 'outline' : 'default'}
            size="sm"
            className="flex-1"
            onClick={() =>
              onToggleStatus?.(
                strategy.id,
                isRunning ? 'paused' : 'running'
              )
            }
          >
            {isRunning ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                暂停
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                启动
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(strategy.id)}
          >
            <Edit className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(strategy.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricItemProps {
  label: string
  value: string
  subValue?: string
  isPositive?: boolean
}

function MetricItem({ label, value, subValue, isPositive }: MetricItemProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-sm font-semibold ${
          isPositive !== undefined
            ? isPositive
              ? 'text-green-500'
              : 'text-red-500'
            : ''
        }`}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  )
}
