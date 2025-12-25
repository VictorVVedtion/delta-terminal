'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Play,
  Loader2,
  Grid3X3,
  Calendar,
  Activity,
  TrendingUp,
  GitMerge,
  ArrowUpRight,
  RefreshCw,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { BacktestConfig, StrategyType } from '@/types/backtest'
import { STRATEGY_TYPES } from '@/types/backtest'

// =============================================================================
// BacktestForm Component
// =============================================================================

interface BacktestFormProps {
  onSubmit: (config: BacktestConfig) => void
  isRunning: boolean
}

const STRATEGY_ICONS: Record<string, React.ElementType> = {
  grid: Grid3X3,
  calendar: Calendar,
  activity: Activity,
  'trending-up': TrendingUp,
  'git-merge': GitMerge,
  'arrow-up-right': ArrowUpRight,
  'refresh-cw': RefreshCw,
  code: Code,
}

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT']

export function BacktestForm({ onSubmit, isRunning }: BacktestFormProps) {
  const [config, setConfig] = React.useState<BacktestConfig>({
    name: '',
    symbol: 'BTC/USDT',
    strategyType: 'rsi',
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    initialCapital: 10000,
    feeRate: 0.1,
    slippage: 0.05,
    params: STRATEGY_TYPES.rsi.defaultParams,
  })

  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Handle strategy type change
  const handleStrategyChange = (type: StrategyType) => {
    setConfig((prev) => ({
      ...prev,
      strategyType: type,
      params: STRATEGY_TYPES[type].defaultParams,
    }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(config)
  }

  // Update param value
  const updateParam = (key: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }))
  }

  const selectedStrategy = STRATEGY_TYPES[config.strategyType]

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>配置回测参数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">策略名称</label>
              <Input
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="输入策略名称..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">交易对</label>
              <div className="flex flex-wrap gap-2">
                {SYMBOLS.map((symbol) => (
                  <Badge
                    key={symbol}
                    variant={config.symbol === symbol ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, symbol }))
                    }
                  >
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">策略类型</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.values(STRATEGY_TYPES).map((strategy) => {
                const IconComponent = STRATEGY_ICONS[strategy.icon] || Code
                const isSelected = config.strategyType === strategy.id
                return (
                  <div
                    key={strategy.id}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => handleStrategyChange(strategy.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isSelected && 'text-primary'
                        )}
                      >
                        {strategy.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {strategy.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Strategy Parameters */}
          {Object.keys(selectedStrategy.defaultParams).length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">策略参数</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                {Object.entries(selectedStrategy.defaultParams).map(
                  ([key, defaultValue]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-muted-foreground capitalize">
                        {formatParamLabel(key)}
                      </label>
                      <Input
                        type={typeof defaultValue === 'number' ? 'number' : 'text'}
                        value={
                          config.params[key] !== undefined
                            ? String(config.params[key])
                            : String(defaultValue)
                        }
                        onChange={(e) =>
                          updateParam(
                            key,
                            typeof defaultValue === 'number'
                              ? parseFloat(e.target.value) || 0
                              : e.target.value
                          )
                        }
                        className="h-9"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">开始日期</label>
              <Input
                type="date"
                value={config.startDate}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">结束日期</label>
              <Input
                type="date"
                value={config.endDate}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Initial Capital */}
          <div className="space-y-2">
            <label className="text-sm font-medium">初始资金 (USDT)</label>
            <Input
              type="number"
              value={config.initialCapital}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  initialCapital: parseFloat(e.target.value) || 0,
                }))
              }
              min={100}
              step={100}
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            高级选项
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">手续费率 (%)</label>
                <Input
                  type="number"
                  value={config.feeRate}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      feeRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min={0}
                  step={0.01}
                  max={1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">滑点 (%)</label>
                <Input
                  type="number"
                  value={config.slippage}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      slippage: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min={0}
                  step={0.01}
                  max={1}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                回测运行中...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                开始回测
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultStartDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 6)
  return date.toISOString().split('T')[0] ?? ''
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function formatParamLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
}
