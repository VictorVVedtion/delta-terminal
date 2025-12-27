'use client'

import {
  AlertTriangle,
  Check,
  DollarSign,
  Rocket,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react'
import React from 'react'

import { ParamSlider } from '@/components/a2ui/controls/ParamSlider'
import { ApprovalFlow } from '@/components/deployment/ApprovalFlow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { getCapitalLimits, getDefaultCapital } from '@/config/trading'
import { formatPrice, useHyperliquidPrice } from '@/hooks/useHyperliquidPrice'
import { useRiskValidation } from '@/hooks/useRiskValidation'
import { notify } from '@/lib/notification'
import { cn } from '@/lib/utils'
import { usePaperTradingStore } from '@/store/paperTrading'
import type {
  RiskSettings as RiskSettingsType} from '@/types/risk';
import {
  DEFAULT_RISK_SETTINGS
} from '@/types/risk'

import { RiskSettings } from './RiskSettings'

// =============================================================================
// Types
// =============================================================================

export interface BacktestSummary {
  passed: boolean
  expectedReturn: number
  maxDrawdown: number
  winRate: number
}

export interface PaperPerformance {
  runningDays: number
  requiredDays: number // Usually 7
  pnl: number
  pnlPercent: number
}

export interface DeployConfig {
  mode: 'paper' | 'live'
  capital: number
  confirmationToken?: string // Live mode requires
  /** Story 4.3: Risk management settings */
  riskSettings: RiskSettingsType
}

interface DeployCanvasProps {
  /** Strategy ID */
  strategyId: string
  /** Strategy name */
  strategyName?: string | undefined
  /** Symbol */
  symbol?: string | undefined
  /** Deploy mode */
  mode: 'paper' | 'live'
  /** Backtest result summary */
  backtestResult: BacktestSummary
  /** Paper performance data (required for Live mode) */
  paperPerformance?: PaperPerformance | undefined
  /** Whether the panel is open */
  isOpen: boolean
  /** Deploy callback */
  onDeploy: (config: DeployConfig) => Promise<void>
  /** Cancel callback */
  onCancel: () => void
  /** Loading state */
  isLoading?: boolean | undefined
}

// =============================================================================
// DeployCanvas Component
// =============================================================================

export function DeployCanvas({
  strategyId,
  strategyName = '策略',
  symbol = 'BTC/USDT',
  mode,
  backtestResult,
  paperPerformance,
  isOpen,
  onDeploy,
  onCancel,
  isLoading = false,
}: DeployCanvasProps) {
  // State - 从配置获取默认资本
  const [capital, setCapital] = React.useState(() => getDefaultCapital(mode))
  const [confirmed, setConfirmed] = React.useState(false)
  const [riskSettings, setRiskSettings] = React.useState<RiskSettingsType>(DEFAULT_RISK_SETTINGS)
  const [showApprovalFlow, setShowApprovalFlow] = React.useState(false)

  // Paper Trading integration
  const initPaperAccount = usePaperTradingStore((state) => state.initAccount)
  const getAccountByAgentId = usePaperTradingStore((state) => state.getAccountByAgentId)

  // Get real-time price for the symbol (extract base asset from symbol like "BTC/USDT" -> "BTC")
  const baseAsset = symbol.split('/')[0] || 'BTC'
  const { prices: livePrices } = useHyperliquidPrice([baseAsset], {
    enabled: isOpen && mode === 'paper'
  })

  // Risk validation
  const riskValidation = useRiskValidation({
    settings: riskSettings,
    mode,
    totalCapital: capital,
  })

  // Reset confirmation when mode changes
  React.useEffect(() => {
    setConfirmed(false)
    setCapital(getDefaultCapital(mode))
  }, [mode])

  // ESC key handler
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
  }, [isOpen, onCancel])

  // Check if Live deploy is allowed
  const canDeployLive = React.useMemo(() => {
    if (mode !== 'live') return true
    if (!backtestResult.passed) return false
    if (!paperPerformance) return false
    return paperPerformance.runningDays >= paperPerformance.requiredDays
  }, [mode, backtestResult.passed, paperPerformance])

  // Handle deploy button click
  const handleDeployClick = React.useCallback(() => {
    if (!riskValidation.valid) return

    if (mode === 'live') {
      // For Live mode, show approval flow (S31)
      if (!canDeployLive) return
      setShowApprovalFlow(true)
    } else {
      // For Paper mode, deploy directly
      void handleDeploy()
    }
  }, [mode, riskValidation.valid, canDeployLive])

  // Execute deployment
  const handleDeploy = React.useCallback(async (approvalToken?: string) => {
    const config: DeployConfig = {
      mode,
      capital,
      riskSettings,
      ...(approvalToken ? { confirmationToken: approvalToken } : {}),
    }

    try {
      // Story 8.2: Paper Trading 集成 - 初始化虚拟账户
      if (mode === 'paper') {
        const agentId = `strategy_${strategyId}`
        const existingAccount = getAccountByAgentId(agentId)

        if (!existingAccount) {
          // 初始化新的 Paper Trading 账户
          const accountId = initPaperAccount(agentId, capital)
          notify('info', 'Paper Trading 账户已创建', {
            description: `账户 ID: ${accountId.slice(0, 8)}...，虚拟资金: $${capital.toLocaleString()}`,
            source: 'DeployCanvas',
          })
        } else {
          notify('info', '使用现有 Paper Trading 账户', {
            description: `当前余额: $${existingAccount.currentBalance.toLocaleString()}`,
            source: 'DeployCanvas',
          })
        }
      }

      await onDeploy(config)

      // Story 5.3: 部署成功通知
      notify('success', '部署成功', {
        description: `${strategyName} 已部署到${mode === 'live' ? '实盘' : '模拟盘'}，初始资金 $${capital.toLocaleString()}`,
        source: 'DeployCanvas',
      })

      // Close approval flow if open
      setShowApprovalFlow(false)
    } catch (error) {
      // Story 5.3: 部署失败通知
      notify('error', '部署失败', {
        description: error instanceof Error ? error.message : '请检查网络连接后重试',
        source: 'DeployCanvas',
      })
    }
  }, [mode, capital, riskSettings, onDeploy, strategyName, strategyId, initPaperAccount, getAccountByAgentId])

  // Handle approval flow completion (S31)
  const handleApprovalComplete = React.useCallback((token: string) => {
    void handleDeploy(token)
  }, [handleDeploy])

  // Deploy button disabled state
  const isDeployDisabled =
    isLoading ||
    !riskValidation.valid ||
    (mode === 'live' && !canDeployLive)

  // Conditional rendering to prevent scroll issues with fixed position elements
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[520px]',
          'bg-card/80 backdrop-blur-sm border-l border-border shadow-2xl',
          'flex flex-col animate-slide-in-right'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Deploy Canvas"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{strategyName}</h2>
                <Badge
                  variant={mode === 'live' ? 'default' : 'secondary'}
                  className={cn(
                    mode === 'live'
                      ? 'bg-[hsl(var(--rb-green))]/10 text-[hsl(var(--rb-green))] border-[hsl(var(--rb-green))]/20'
                      : 'bg-[hsl(var(--rb-yellow))]/10 text-[hsl(var(--rb-yellow))] border-[hsl(var(--rb-yellow))]/20'
                  )}
                >
                  {mode === 'live' ? 'Live' : 'Paper'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* Backtest Status */}
            <BacktestStatusSection result={backtestResult} />

            {/* Mode-specific content */}
            {mode === 'paper' ? (
              <PaperDeployContent
                capital={capital}
                onCapitalChange={setCapital}
                isLoading={isLoading}
                symbol={symbol}
                livePrice={livePrices.get(baseAsset) ?? null}
              />
            ) : (
              <LiveDeployContent
                capital={capital}
                onCapitalChange={setCapital}
                paperPerformance={paperPerformance}
                backtestPassed={backtestResult.passed}
                isLoading={isLoading}
              />
            )}

            {/* Story 4.3: Risk Settings Section */}
            <RiskSettingsSection
              riskSettings={riskSettings}
              onRiskSettingsChange={setRiskSettings}
              capital={capital}
              disabled={isLoading}
            />

            {/* Story 4.3: Validation Messages */}
            <ValidationMessagesSection
              errors={riskValidation.errors}
              warnings={riskValidation.warnings}
            />

            {/* Live mode confirmation */}
            {mode === 'live' && (
              <LiveConfirmationSection
                confirmed={confirmed}
                onConfirmedChange={setConfirmed}
                canDeploy={canDeployLive && riskValidation.valid}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            取消
          </Button>

          <Button
            onClick={handleDeployClick}
            disabled={isDeployDisabled}
            className={cn(
              'flex-[2]',
              mode === 'live'
                ? 'bg-[hsl(var(--rb-green))] hover:bg-[hsl(var(--rb-green))]/90 text-[hsl(var(--rb-d900))]'
                : 'bg-[hsl(var(--rb-yellow))] hover:bg-[hsl(var(--rb-yellow))]/90 text-[hsl(var(--rb-d900))]',
              isDeployDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                部署中...
              </span>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                {mode === 'live' ? '实盘部署' : '部署模拟盘'}
              </>
            )}
          </Button>
        </footer>
      </aside>

      {/* S31: Approval Flow for Live deployment */}
      <ApprovalFlow
        isOpen={showApprovalFlow}
        onClose={() => { setShowApprovalFlow(false); }}
        onApprove={handleApprovalComplete}
        strategyName={strategyName}
        capital={capital}
        riskLevel={riskValidation.riskLevel === 'critical' ? 'high' : riskValidation.riskLevel}
        {...(riskSettings.stopLoss.enabled
          ? { estimatedLoss: capital * (riskSettings.stopLoss.value / 100) }
          : {})}
        {...(riskSettings.takeProfit.enabled
          ? { estimatedGain: capital * (riskSettings.takeProfit.value / 100) }
          : {})}
      />
    </>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * BacktestStatusSection - Shows backtest pass/fail status
 */
function BacktestStatusSection({ result }: { result: BacktestSummary }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Shield className="h-4 w-4" />
        回测验证
      </h3>
      <div
        className={cn(
          'p-3 rounded-lg border',
          result.passed
            ? 'bg-[hsl(var(--rb-green))]/5 border-[hsl(var(--rb-green))]/20'
            : 'bg-[hsl(var(--rb-red))]/5 border-[hsl(var(--rb-red))]/20'
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          {result.passed ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--rb-green))] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium text-[hsl(var(--rb-green))]">
                回测已通过
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--rb-red))] flex items-center justify-center">
                <X className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium text-[hsl(var(--rb-red))]">
                回测未通过
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">预估收益</span>
            <p
              className={cn(
                'font-mono font-medium',
                result.expectedReturn >= 0
                  ? 'text-[hsl(var(--rb-green))]'
                  : 'text-[hsl(var(--rb-red))]'
              )}
            >
              {result.expectedReturn >= 0 ? '+' : ''}
              {result.expectedReturn.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">最大回撤</span>
            <p className="font-mono font-medium text-[hsl(var(--rb-red))]">
              -{result.maxDrawdown.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">胜率</span>
            <p className="font-mono font-medium">{result.winRate.toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * PaperDeployContent - Paper mode deployment configuration
 * Story 8.2: 集成 Paper Trading 和实时价格
 */
function PaperDeployContent({
  capital,
  onCapitalChange,
  isLoading,
  symbol,
  livePrice,
}: {
  capital: number
  onCapitalChange: (value: number) => void
  isLoading: boolean
  symbol: string
  livePrice: number | null
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        模拟盘配置
      </h3>

      <div className="space-y-4">
        {/* Story 8.1: 实时价格显示 */}
        {livePrice !== null && (
          <div className="p-3 rounded-lg bg-card/50 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {symbol} 实时价格
              </span>
              <span className="text-lg font-bold font-mono text-[hsl(var(--rb-green))]">
                {formatPrice(livePrice)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              数据来源: Hyperliquid DEX
            </p>
          </div>
        )}

        <div className="p-3 rounded-lg bg-[hsl(var(--rb-yellow))]/5 border border-[hsl(var(--rb-yellow))]/20">
          <div className="flex items-start gap-2 text-xs text-[hsl(var(--rb-yellow))]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              模拟盘使用虚拟资金进行交易测试，不会产生真实盈亏。建议在模拟盘运行 7
              天以上后再考虑实盘部署。
            </p>
          </div>
        </div>

        <ParamSlider
          param={{
            key: 'virtualCapital',
            label: '虚拟资金',
            type: 'slider',
            value: capital,
            level: 1,
            config: {
              ...getCapitalLimits('paper'),
              unit: '$',
            },
            description: '模拟交易的初始资金',
          }}
          value={capital}
          onChange={(v) => { onCapitalChange(v); }}
          disabled={isLoading}
        />
      </div>
    </section>
  )
}

/**
 * LiveDeployContent - Live mode deployment configuration
 */
function LiveDeployContent({
  capital,
  onCapitalChange,
  paperPerformance,
  backtestPassed,
  isLoading,
}: {
  capital: number
  onCapitalChange: (value: number) => void
  paperPerformance?: PaperPerformance | undefined
  backtestPassed: boolean
  isLoading: boolean
}) {
  const paperDaysOk = paperPerformance
    ? paperPerformance.runningDays >= paperPerformance.requiredDays
    : false

  return (
    <section className="space-y-4">
      {/* Prerequisites checklist */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" />
          前置条件
        </h3>

        <div className="space-y-2">
          <PrerequisiteItem
            label="回测验证通过"
            passed={backtestPassed}
          />
          <PrerequisiteItem
            label={`Paper 运行 ${paperPerformance?.requiredDays || 7} 天`}
            passed={paperDaysOk}
            detail={
              paperPerformance
                ? `已运行 ${paperPerformance.runningDays} 天`
                : '未找到 Paper 数据'
            }
          />
        </div>
      </div>

      {/* Paper performance */}
      {paperPerformance && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Paper 阶段表现
          </h3>

          <div className="p-3 rounded-lg border bg-card/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">模拟盘收益</span>
              <span
                className={cn(
                  'text-lg font-bold font-mono',
                  paperPerformance.pnlPercent >= 0
                    ? 'text-[hsl(var(--rb-green))]'
                    : 'text-[hsl(var(--rb-red))]'
                )}
              >
                {paperPerformance.pnlPercent >= 0 ? '+' : ''}
                {paperPerformance.pnlPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                运行 {paperPerformance.runningDays} 天
              </span>
              <span
                className={cn(
                  'text-sm font-mono',
                  paperPerformance.pnl >= 0
                    ? 'text-[hsl(var(--rb-green))]'
                    : 'text-[hsl(var(--rb-red))]'
                )}
              >
                {paperPerformance.pnl >= 0 ? '+' : ''}${paperPerformance.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Capital configuration */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          实盘资金配置
        </h3>

        <ParamSlider
          param={{
            key: 'initialCapital',
            label: '初始资金',
            type: 'slider',
            value: capital,
            level: 1,
            config: {
              ...getCapitalLimits('live'),
              unit: '$',
            },
            description: '实盘交易的初始资金',
          }}
          value={capital}
          onChange={(v) => { onCapitalChange(v); }}
          disabled={isLoading}
        />
      </div>
    </section>
  )
}

/**
 * PrerequisiteItem - Single prerequisite check item
 */
function PrerequisiteItem({
  label,
  passed,
  detail,
}: {
  label: string
  passed: boolean
  detail?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md text-sm',
        passed ? 'bg-[hsl(var(--rb-green))]/5' : 'bg-[hsl(var(--rb-red))]/5'
      )}
    >
      {passed ? (
        <Check className="h-4 w-4 text-[hsl(var(--rb-green))]" />
      ) : (
        <X className="h-4 w-4 text-[hsl(var(--rb-red))]" />
      )}
      <span className={passed ? 'text-[hsl(var(--rb-green))]' : 'text-[hsl(var(--rb-red))]'}>
        {label}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground ml-auto">{detail}</span>
      )}
    </div>
  )
}

/**
 * RiskSettingsSection - Risk management configuration
 * Story 4.3: 风险设置集成
 */
function RiskSettingsSection({
  riskSettings,
  onRiskSettingsChange,
  capital,
  disabled,
}: {
  riskSettings: RiskSettingsType
  onRiskSettingsChange: (settings: RiskSettingsType) => void
  capital: number
  disabled: boolean
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Shield className="h-4 w-4" />
        风险管理
      </h3>
      <div className="p-3 rounded-lg border bg-card/50">
        <RiskSettings
          value={riskSettings}
          onChange={onRiskSettingsChange}
          currentPrice={40000} // TODO: 接入实时价格
          totalCapital={capital}
          disabled={disabled}
        />
      </div>
    </section>
  )
}

/**
 * ValidationMessagesSection - Show validation errors and warnings
 * Story 4.3: 验证消息展示
 */
function ValidationMessagesSection({
  errors,
  warnings,
}: {
  errors: { field: string; message: string; code: string }[]
  warnings: { field: string; message: string; code: string }[]
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return null
  }

  return (
    <section className="space-y-2">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 rounded-lg bg-[hsl(var(--rb-red))]/10 border border-[hsl(var(--rb-red))]/30">
          <div className="flex items-start gap-2">
            <X className="h-4 w-4 text-[hsl(var(--rb-red))] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[hsl(var(--rb-red))]">
                配置错误
              </p>
              <ul className="text-xs text-[hsl(var(--rb-red))]/80 space-y-0.5">
                {errors.map((e) => (
                  <li key={e.code}>• {e.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-[hsl(var(--rb-yellow))]/10 border border-[hsl(var(--rb-yellow))]/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--rb-yellow))] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[hsl(var(--rb-yellow))]">
                风险提示
              </p>
              <ul className="text-xs text-[hsl(var(--rb-yellow))]/80 space-y-0.5">
                {warnings.map((w) => (
                  <li key={w.code}>• {w.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * LiveConfirmationSection - Double confirmation for live deployment
 */
function LiveConfirmationSection({
  confirmed,
  onConfirmedChange,
  canDeploy,
}: {
  confirmed: boolean
  onConfirmedChange: (value: boolean) => void
  canDeploy: boolean
}) {
  return (
    <section className="space-y-3">
      {/* Warning box */}
      <div className="p-3 rounded-lg bg-[hsl(var(--rb-yellow))]/10 border border-[hsl(var(--rb-yellow))]/30">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--rb-yellow))] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[hsl(var(--rb-yellow))]">
              实盘涉及真实资金
            </p>
            <p className="text-xs text-muted-foreground">
              实盘交易将使用您的真实资金进行操作，可能产生实际盈亏。请确保您已充分了解交易风险。
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
        <Checkbox
          id="confirm-live"
          checked={confirmed}
          onCheckedChange={(checked) => { onConfirmedChange(checked === true); }}
          disabled={!canDeploy}
          className="data-[state=checked]:bg-[hsl(var(--rb-green))] data-[state=checked]:border-[hsl(var(--rb-green))]"
        />
        <label
          htmlFor="confirm-live"
          className={cn(
            'text-sm cursor-pointer select-none',
            !canDeploy && 'opacity-50 cursor-not-allowed'
          )}
        >
          我确认使用真实资金进行交易
        </label>
      </div>

      {/* Status hint */}
      {!canDeploy && (
        <p className="text-xs text-[hsl(var(--rb-red))]">
          请先满足所有前置条件后再进行实盘部署
        </p>
      )}
    </section>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default DeployCanvas
