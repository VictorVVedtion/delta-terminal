'use client'

/**
 * EmergencyActions Component
 *
 * EPIC-009 Story 9.2: 紧急操作按钮组件
 * 提供平仓、禁用开仓、重启、暂停等紧急操作
 */

import React from 'react'
import {
  AlertTriangle,
  Square,
  Ban,
  RotateCcw,
  Pause,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { EmergencyAction } from '@/types/intervention'
import { EMERGENCY_ACTIONS, getEmergencyActionConfig } from '@/types/intervention'

// =============================================================================
// Types
// =============================================================================

interface EmergencyActionsProps {
  /** Agent ID */
  agentId: string
  /** 当前策略状态 */
  strategyStatus: 'running' | 'paused' | 'stopped'
  /** 是否禁用新开仓 */
  newPositionsDisabled?: boolean
  /** 执行紧急操作回调 */
  onAction: (action: EmergencyAction) => Promise<void>
  /** 自定义类名 */
  className?: string
}

interface ConfirmDialogProps {
  isOpen: boolean
  action: EmergencyAction | null
  onConfirm: () => void
  onCancel: () => void
  isExecuting: boolean
}

// =============================================================================
// Icon Mapping
// =============================================================================

const ACTION_ICONS: Record<EmergencyAction, React.ReactNode> = {
  close_all_positions: <Square className="h-4 w-4" />,
  disable_new_positions: <Ban className="h-4 w-4" />,
  restart_strategy: <RotateCcw className="h-4 w-4" />,
  pause_strategy: <Pause className="h-4 w-4" />,
}

// =============================================================================
// ConfirmDialog Component
// =============================================================================

function ConfirmDialog({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isExecuting,
}: ConfirmDialogProps) {
  const config = action ? getEmergencyActionConfig(action) : null

  if (!isOpen || !config) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-5 w-5',
                config.severity === 'danger' ? 'text-red-500' : 'text-yellow-500'
              )}
            />
            <h2 className="font-semibold">确认操作</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            disabled={isExecuting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
                config.severity === 'danger'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-yellow-500/10 text-yellow-500'
              )}
            >
              {ACTION_ICONS[action!]}
            </div>
            <div>
              <h3 className="font-medium">{config.label}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>

          {config.severity === 'danger' && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                ⚠️ 此操作不可撤销，请确认后继续
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onCancel} disabled={isExecuting}>
            取消
          </Button>
          <Button
            variant={config.severity === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isExecuting}
          >
            {isExecuting ? '执行中...' : '确认执行'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// EmergencyActions Component
// =============================================================================

export function EmergencyActions({
  agentId: _agentId,
  strategyStatus,
  newPositionsDisabled = false,
  onAction,
  className,
}: EmergencyActionsProps) {
  const [pendingAction, setPendingAction] = React.useState<EmergencyAction | null>(null)
  const [isExecuting, setIsExecuting] = React.useState(false)

  // 处理操作点击
  const handleActionClick = (action: EmergencyAction) => {
    const config = getEmergencyActionConfig(action)
    if (config?.confirmRequired) {
      setPendingAction(action)
    } else {
      executeAction(action)
    }
  }

  // 执行操作
  const executeAction = async (action: EmergencyAction) => {
    setIsExecuting(true)
    try {
      await onAction(action)
    } finally {
      setIsExecuting(false)
      setPendingAction(null)
    }
  }

  // 确认执行
  const handleConfirm = () => {
    if (pendingAction) {
      executeAction(pendingAction)
    }
  }

  // 取消确认
  const handleCancel = () => {
    setPendingAction(null)
  }

  // 判断按钮是否禁用
  const isActionDisabled = (action: EmergencyAction): boolean => {
    switch (action) {
      case 'pause_strategy':
        return strategyStatus !== 'running'
      case 'restart_strategy':
        return strategyStatus === 'stopped'
      case 'disable_new_positions':
        return newPositionsDisabled
      case 'close_all_positions':
        return false // 始终可用
      default:
        return false
    }
  }

  // 获取按钮标签
  const getActionLabel = (action: EmergencyAction): string => {
    const config = getEmergencyActionConfig(action)
    if (!config) return action

    if (action === 'disable_new_positions' && newPositionsDisabled) {
      return '已禁用开仓'
    }
    if (action === 'pause_strategy' && strategyStatus === 'paused') {
      return '已暂停'
    }

    return config.label
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            紧急操作
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {EMERGENCY_ACTIONS.map((config) => {
              const disabled = isActionDisabled(config.action)
              const isDanger = config.severity === 'danger'

              return (
                <Button
                  key={config.action}
                  variant={isDanger ? 'destructive' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-auto py-3 flex flex-col items-center gap-1.5',
                    disabled && 'opacity-50'
                  )}
                  disabled={disabled || isExecuting}
                  onClick={() => handleActionClick(config.action)}
                >
                  {ACTION_ICONS[config.action]}
                  <span className="text-xs">{getActionLabel(config.action)}</span>
                </Button>
              )
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            危险操作需要二次确认
          </p>
        </CardContent>
      </Card>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        action={pendingAction}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isExecuting={isExecuting}
      />
    </>
  )
}

export default EmergencyActions
