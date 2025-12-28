'use client'

import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react'
import React from 'react'

import { TermTooltip } from '@/components/common/TermTooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type RiskLevel = 'info' | 'warning' | 'danger'

export interface RiskWarningDialogProps {
  /** 是否显示对话框 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 确认回调 */
  onConfirm: () => void
  /** 标题 */
  title: string
  /** 描述内容 */
  description: string
  /** 风险等级 */
  riskLevel?: RiskLevel
  /** 风险详情列表 */
  riskDetails?: string[]
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 是否需要勾选确认 */
  requireCheckbox?: boolean
  /** 确认复选框文字 */
  checkboxLabel?: string
  /** 涉及的金额（可选） */
  amount?: number
  /** 货币单位 */
  currency?: string
  /** 相关术语（显示术语解释） */
  relatedTerms?: string[]
}

// =============================================================================
// RiskWarningDialog Component
// =============================================================================

/**
 * 风险警告对话框
 *
 * 用于在执行敏感操作前向用户显示风险提示
 * - 支持三种风险等级：info, warning, danger
 * - 可选的确认复选框
 * - 显示相关术语的 Tooltip 解释
 */
export function RiskWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  riskLevel = 'warning',
  riskDetails = [],
  confirmText = '我了解风险，继续操作',
  cancelText = '取消',
  requireCheckbox = false,
  checkboxLabel = '我已阅读并理解以上风险提示',
  amount,
  currency = 'USDT',
  relatedTerms = [],
}: RiskWarningDialogProps) {
  const [isChecked, setIsChecked] = React.useState(false)

  // 重置状态
  React.useEffect(() => {
    if (!isOpen) {
      setIsChecked(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const riskConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/30',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      borderColor: 'border-yellow-500/30',
    },
    danger: {
      icon: ShieldAlert,
      bgColor: 'bg-red-500/10',
      iconColor: 'text-red-500',
      borderColor: 'border-red-500/30',
    },
  }

  const config = riskConfig[riskLevel]
  const Icon = config.icon

  const canConfirm = !requireCheckbox || isChecked

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full max-w-md p-6 rounded-2xl',
            'bg-background border shadow-2xl',
            config.borderColor,
            'animate-in zoom-in-95 fade-in duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="关闭"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* 图标 */}
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
              config.bgColor
            )}
          >
            <Icon className={cn('h-7 w-7', config.iconColor)} />
          </div>

          {/* 标题 */}
          <h2 className="text-xl font-bold mb-2">{title}</h2>

          {/* 描述 */}
          <p className="text-muted-foreground mb-4">{description}</p>

          {/* 金额提示 */}
          {amount !== undefined && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4">
              <div className="text-xs text-muted-foreground mb-1">涉及金额</div>
              <div className="text-lg font-bold">
                {amount.toLocaleString()} {currency}
              </div>
            </div>
          )}

          {/* 风险详情 */}
          {riskDetails.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="text-sm font-medium">风险提示：</div>
              <ul className="space-y-1.5">
                {riskDetails.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', config.iconColor)} />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 相关术语 */}
          {relatedTerms.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-muted-foreground">了解更多：</span>
              {relatedTerms.map((term) => (
                <TermTooltip key={term} term={term} showIcon className="text-xs" />
              ))}
            </div>
          )}

          {/* 确认复选框 */}
          {requireCheckbox && (
            <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{checkboxLabel}</span>
            </label>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {cancelText}
            </Button>
            <Button
              variant={riskLevel === 'danger' ? 'destructive' : 'default'}
              className="flex-1"
              onClick={onConfirm}
              disabled={!canConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// useRiskWarning Hook
// =============================================================================

interface RiskWarningState {
  isOpen: boolean
  config: Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> | null
  resolver: ((confirmed: boolean) => void) | null
}

/**
 * 风险警告 Hook
 *
 * 提供一个 Promise-based 的 API 来显示风险警告
 * 返回用户是否确认操作
 */
export function useRiskWarning() {
  const [state, setState] = React.useState<RiskWarningState>({
    isOpen: false,
    config: null,
    resolver: null,
  })

  const showWarning = React.useCallback(
    (config: Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
      return new Promise<boolean>((resolve) => {
        setState({
          isOpen: true,
          config,
          resolver: resolve,
        })
      })
    },
    []
  )

  const handleClose = React.useCallback(() => {
    state.resolver?.(false)
    setState({ isOpen: false, config: null, resolver: null })
  }, [state.resolver])

  const handleConfirm = React.useCallback(() => {
    state.resolver?.(true)
    setState({ isOpen: false, config: null, resolver: null })
  }, [state.resolver])

  const RiskWarning = React.useMemo(() => {
    if (!state.config) return null

    return (
      <RiskWarningDialog
        {...state.config}
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    )
  }, [state.isOpen, state.config, handleClose, handleConfirm])

  return { showWarning, RiskWarning }
}

// =============================================================================
// Preset Warning Configs
// =============================================================================

/**
 * 预设警告配置
 */
export const RISK_PRESETS = {
  /** 策略部署警告 */
  deployStrategy: (strategyName: string, amount?: number): Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> => ({
    title: '确认部署策略',
    description: `您即将部署「${strategyName}」策略到真实市场。`,
    riskLevel: 'warning',
    riskDetails: [
      '策略一旦启动，将开始自动执行交易',
      '市场波动可能导致意外亏损',
      '请确保您已充分了解策略逻辑和风险参数',
    ],
    ...(amount !== undefined && { amount }),
    confirmText: '确认部署',
    requireCheckbox: true,
    relatedTerms: ['stopLoss', 'maxDrawdown', 'positionSize'],
  }),

  /** 杠杆交易警告 */
  leverageTrading: (leverage: number): Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> => ({
    title: '高杠杆风险提醒',
    description: `您选择了 ${leverage}x 杠杆，这将显著放大您的盈亏。`,
    riskLevel: 'danger',
    riskDetails: [
      `价格反向波动 ${(100 / leverage).toFixed(1)}% 将导致本金全部损失`,
      '杠杆交易不适合新手投资者',
      '建议从低杠杆开始，逐步增加',
    ],
    confirmText: '我了解风险',
    requireCheckbox: true,
    relatedTerms: ['leverage', 'marginRate'],
  }),

  /** 删除策略警告 */
  deleteStrategy: (strategyName: string): Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> => ({
    title: '删除策略',
    description: `确定要删除「${strategyName}」策略吗？此操作不可撤销。`,
    riskLevel: 'warning',
    riskDetails: [
      '策略配置和历史数据将被永久删除',
      '相关的回测结果也会被删除',
    ],
    confirmText: '确认删除',
  }),

  /** 停止策略警告 */
  stopStrategy: (strategyName: string): Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> => ({
    title: '停止策略',
    description: `确定要停止「${strategyName}」策略吗？`,
    riskLevel: 'info',
    riskDetails: [
      '策略将停止执行新的交易',
      '已持有的仓位不会自动平仓',
      '您可以稍后重新启动策略',
    ],
    confirmText: '确认停止',
    relatedTerms: ['positionSize'],
  }),

  /** API Key 提交警告 */
  submitApiKey: (exchangeName: string): Omit<RiskWarningDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> => ({
    title: 'API 密钥安全提醒',
    description: `您即将连接 ${exchangeName} 交易所。`,
    riskLevel: 'warning',
    riskDetails: [
      '请确保只授予「交易」权限，不要授予「提现」权限',
      'API Secret 只会显示一次，请妥善保管',
      '如有疑虑，建议先用小额资金测试',
    ],
    confirmText: '我已了解',
    relatedTerms: ['apiKey', 'apiSecret'],
  }),
} as const

export default RiskWarningDialog
