'use client'

/**
 * PaperTradingInsightCard Component
 *
 * EPIC-008: Paper Trading Insight Card
 * Interactive card for confirming and executing paper trading orders from AI
 */

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePerpetualPaperTradingStore } from '@/store/perpetualPaperTrading'
import type { InsightData, InsightParam } from '@/types/insight'
import type { OpenPositionParams, PositionSide } from '@/types/perpetualPaperTrading'

// =============================================================================
// Types
// =============================================================================

interface PaperTradingInsightCardProps {
  /** Insight data from AI */
  insight: InsightData
  /** Callback when order is executed successfully */
  onExecuted?: (result: { success: boolean; message: string }) => void
  /** Callback when cancelled */
  onCancel?: () => void
  /** Current prices for symbols */
  prices?: Record<string, number>
  /** Disabled state */
  disabled?: boolean
}

type OrderStatus = 'idle' | 'executing' | 'success' | 'error'

// =============================================================================
// PaperTradingInsightCard Component
// =============================================================================

export function PaperTradingInsightCard({
  insight,
  onExecuted,
  onCancel,
  prices = {},
  disabled = false,
}: PaperTradingInsightCardProps) {
  // Store
  const { account, initAccount, openPosition, isInitialized } = usePerpetualPaperTradingStore()

  // Local state for form values
  const [formValues, setFormValues] = React.useState<Record<string, unknown>>(() => {
    // Initialize from insight params
    const initial: Record<string, unknown> = {}
    for (const param of insight.params || []) {
      initial[param.key] = param.value
    }
    return initial
  })

  // Sync form values when insight changes (e.g., parent passes a different insight)
  React.useEffect(() => {
    const updated: Record<string, unknown> = {}
    for (const param of insight.params || []) {
      updated[param.key] = param.value
    }
    setFormValues(updated)
    setOrderStatus('idle')
    setErrorMessage('')
  }, [insight.id])

  const [orderStatus, setOrderStatus] = React.useState<OrderStatus>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string>('')

  // Get form values with defaults
  const symbol = (formValues.symbol as string) || 'BTC-PERP'
  const side = (formValues.side as PositionSide) || 'long'
  const margin = Number(formValues.margin) || 100
  const leverage = Number(formValues.leverage) || 10
  const stopLossPercent = Number(formValues.stop_loss_percent) || 10
  const takeProfitPercent = Number(formValues.take_profit_percent) || 20

  // Get current price
  const coin = symbol.replace('-PERP', '')
  const currentPrice = prices[`${coin}/USDT`] || prices[coin] || 0

  // Calculate position size
  const positionValue = margin * leverage
  const positionSize = currentPrice > 0 ? positionValue / currentPrice : 0

  // Calculate liquidation price (approximate)
  const liquidationPrice =
    side === 'long'
      ? currentPrice * (1 - 1 / leverage * 0.9) // 90% of margin lost
      : currentPrice * (1 + 1 / leverage * 0.9)

  // Handle value change
  const handleValueChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setErrorMessage('')
  }

  // Handle execute order
  const handleExecute = async () => {
    if (disabled || orderStatus === 'executing') return

    setOrderStatus('executing')
    setErrorMessage('')

    try {
      // Initialize account if not initialized
      if (!isInitialized || !account) {
        initAccount(10000) // Default 10000 USDT
      }

      // Prepare order params
      const orderParams: OpenPositionParams = {
        symbol,
        coin,
        side,
        size: positionSize,
        price: currentPrice,
        leverage,
        marginMode: 'isolated',
        // TP/SL will be set separately after position opens
      }

      // Execute order
      const result = openPosition(orderParams)

      if (result.success) {
        setOrderStatus('success')
        onExecuted?.({
          success: true,
          message: `${side === 'long' ? '做多' : '做空'} ${coin} 成功！开仓价格: $${currentPrice.toFixed(2)}`,
        })
      } else {
        setOrderStatus('error')
        setErrorMessage(result.error || '下单失败')
        onExecuted?.({
          success: false,
          message: result.error || '下单失败',
        })
      }
    } catch (err) {
      setOrderStatus('error')
      const message = err instanceof Error ? err.message : '下单时发生未知错误'
      setErrorMessage(message)
      onExecuted?.({
        success: false,
        message,
      })
    }
  }

  // Determine action type from insight target
  const actionType = insight.target?.strategy_id || 'paper_trading'
  const isQueryAction = actionType === 'paper_trading_query'
  const isCloseAction = actionType === 'paper_trading_close'
  const isOpenAction = !isQueryAction && !isCloseAction

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'border-l-4 border-teal-500',
        'bg-card/80 backdrop-blur-sm',
        orderStatus === 'success' && 'border-l-green-500',
        orderStatus === 'error' && 'border-l-red-500'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/10 p-2">
              <Activity className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">模拟交易</h3>
              <p className="text-xs text-muted-foreground">
                {isQueryAction ? '查询持仓' : isCloseAction ? '平仓操作' : '开仓确认'}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          {orderStatus === 'success' && (
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">已执行</span>
            </div>
          )}
          {orderStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">失败</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Explanation */}
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{insight.explanation}</p>

        {/* Open Position Form */}
        {isOpenAction && orderStatus !== 'success' && (
          <>
            {/* Symbol Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">交易对</label>
                <Select
                  value={symbol}
                  onValueChange={(v) => handleValueChange('symbol', v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC-PERP">BTC-PERP</SelectItem>
                    <SelectItem value="ETH-PERP">ETH-PERP</SelectItem>
                    <SelectItem value="SOL-PERP">SOL-PERP</SelectItem>
                    <SelectItem value="DOGE-PERP">DOGE-PERP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">方向</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={side === 'long' ? 'default' : 'outline'}
                    onClick={() => handleValueChange('side', 'long')}
                    disabled={disabled}
                    className={cn(
                      'flex-1',
                      side === 'long' && 'bg-green-500 hover:bg-green-600'
                    )}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    做多
                  </Button>
                  <Button
                    size="sm"
                    variant={side === 'short' ? 'default' : 'outline'}
                    onClick={() => handleValueChange('side', 'short')}
                    disabled={disabled}
                    className={cn(
                      'flex-1',
                      side === 'short' && 'bg-red-500 hover:bg-red-600'
                    )}
                  >
                    <TrendingDown className="mr-1 h-3 w-3" />
                    做空
                  </Button>
                </div>
              </div>
            </div>

            {/* Margin & Leverage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">保证金 (USDT)</label>
                <Input
                  type="number"
                  value={margin}
                  onChange={(e) => handleValueChange('margin', Number(e.target.value))}
                  disabled={disabled}
                  min={10}
                  max={100000}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">杠杆倍数</label>
                  <span className="text-xs font-medium">{leverage}x</span>
                </div>
                <Slider
                  value={leverage}
                  onChange={(v) => handleValueChange('leverage', v)}
                  min={1}
                  max={50}
                  step={1}
                  showValue={false}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Order Preview */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">当前价格</span>
                <span className="font-mono">
                  ${currentPrice > 0 ? currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">仓位价值</span>
                <span className="font-mono">${positionValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">仓位数量</span>
                <span className="font-mono">
                  {positionSize > 0 ? positionSize.toFixed(4) : '---'} {coin}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">预估爆仓价</span>
                <span className="font-mono text-orange-500">
                  ${liquidationPrice > 0 ? liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-2 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" onClick={onCancel} disabled={disabled}>
                <X className="mr-1 h-3 w-3" />
                取消
              </Button>

              <Button
                size="sm"
                onClick={handleExecute}
                disabled={disabled || orderStatus === 'executing' || currentPrice <= 0}
                className={cn(
                  'gap-1',
                  side === 'long'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                )}
              >
                {orderStatus === 'executing' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    {side === 'long' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    确认{side === 'long' ? '做多' : '做空'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Success State */}
        {orderStatus === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-green-500">
              {side === 'long' ? '做多' : '做空'} {coin} 成功！
            </p>
            <p className="text-xs text-muted-foreground">
              开仓价格: ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {' • '}
              仓位: {positionSize.toFixed(4)} {coin}
            </p>
          </div>
        )}

        {/* Query/Close Action Placeholder */}
        {(isQueryAction || isCloseAction) && (
          <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground">
            <Activity className="h-8 w-8" />
            <p className="text-sm">
              {isQueryAction
                ? '请前往模拟交易面板查看持仓详情'
                : '请前往模拟交易面板进行平仓操作'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Type guard
// =============================================================================

export function isPaperTradingInsight(insight: InsightData): boolean {
  return insight.type === 'paper_trading'
}

export default PaperTradingInsightCard
