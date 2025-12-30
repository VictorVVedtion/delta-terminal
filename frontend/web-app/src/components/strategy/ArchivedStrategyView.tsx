'use client'

import {
  Archive,
  ArchiveRestore,
  Clock,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import React, { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useStrategyLifecycleStore } from '@/store/strategyLifecycle'
import type { StrategyWithLifecycle } from '@/types/strategy-lifecycle'

import { DeleteConfirmDialog } from './DeleteConfirmDialog'

// =============================================================================
// Types
// =============================================================================

export interface ArchivedStrategyViewProps {
  /** 切换到活跃策略标签回调 */
  onSwitchToActive?: () => void
}

// =============================================================================
// Component
// =============================================================================

export function ArchivedStrategyView({ onSwitchToActive }: ArchivedStrategyViewProps) {
  const {
    getArchivedStrategies,
    restoreStrategy,
    softDeleteStrategy,
  } = useStrategyLifecycleStore()

  const archivedStrategies = getArchivedStrategies()

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithLifecycle | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleRestore = (strategy: StrategyWithLifecycle) => {
    const result = restoreStrategy(strategy.id)
    if (result.success) {
      // 可选：恢复后切换到活跃标签
      // onSwitchToActive?.()
    } else {
      console.error('恢复失败:', result.error)
      // TODO: 显示错误提示
    }
  }

  const handleDelete = (strategyId: string) => {
    softDeleteStrategy(strategyId)
    setSelectedStrategy(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Archive className="h-6 w-6 text-muted-foreground" />
            已归档策略
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            归档的策略不会运行，但配置和历史数据会保留
          </p>
        </div>

        {archivedStrategies.length > 0 && onSwitchToActive && (
          <Button variant="outline" size="sm" onClick={onSwitchToActive}>
            查看活跃策略
          </Button>
        )}
      </div>

      {/* Strategy List */}
      {archivedStrategies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {archivedStrategies.map((strategy) => (
            <ArchivedStrategyCard
              key={strategy.id}
              strategy={strategy}
              onRestore={() => handleRestore(strategy)}
              onDelete={() => {
                setSelectedStrategy(strategy)
                setShowDeleteDialog(true)
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Archive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">没有归档策略</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              暂时不需要的策略可以归档保存。归档的策略不会运行，
              但您随时可以恢复它们。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        strategy={selectedStrategy}
        onConfirmDelete={handleDelete}
      />
    </div>
  )
}

// =============================================================================
// ArchivedStrategyCard
// =============================================================================

interface ArchivedStrategyCardProps {
  strategy: StrategyWithLifecycle
  onRestore: () => void
  onDelete: () => void
}

function ArchivedStrategyCard({
  strategy,
  onRestore,
  onDelete,
}: ArchivedStrategyCardProps) {
  return (
    <Card className="relative overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
      {/* Archived Badge */}
      <div className="absolute top-3 right-3">
        <Badge variant="secondary" className="flex items-center gap-1">
          <ArchiveRestore className="h-3 w-3" />
          已归档
        </Badge>
      </div>

      <CardHeader className="pb-3 pr-24">
        <CardTitle className="text-base line-clamp-1 text-muted-foreground">
          {strategy.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {strategy.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">历史盈亏</span>
            <div
              className={`font-semibold ${
                strategy.performance.pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'
              }`}
            >
              ${formatCurrency(Math.abs(strategy.performance.pnl))}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">总交易</span>
            <div className="font-semibold text-muted-foreground">
              {strategy.performance.trades} 笔
            </div>
          </div>
        </div>

        {/* Archive Time */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            归档于:{' '}
            {strategy.timestamps.archivedAt
              ? new Date(strategy.timestamps.archivedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onRestore}
          >
            <RefreshCcw className="h-3 w-3 mr-1" />
            恢复策略
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// ArchiveConfirmDialog
// =============================================================================

export interface ArchiveConfirmDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 关闭对话框回调 */
  onOpenChange: (open: boolean) => void
  /** 要归档的策略 */
  strategy: StrategyWithLifecycle | null
  /** 确认归档回调 */
  onConfirmArchive: (strategyId: string) => void
}

export function ArchiveConfirmDialog({
  open,
  onOpenChange,
  strategy,
  onConfirmArchive,
}: ArchiveConfirmDialogProps) {
  if (!strategy) return null

  const isRunning = strategy.runStatus === 'running'

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}
      onClick={() => onOpenChange(false)}
    >
      <div className="fixed inset-0 bg-black/80" />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Archive className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {isRunning ? '无法归档运行中的策略' : '确认归档策略'}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Strategy Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{strategy.name}</span>
              <Badge variant={isRunning ? 'success' : 'secondary'}>
                {isRunning ? '运行中' : '已停止'}
              </Badge>
            </div>
          </div>

          {isRunning ? (
            <p className="text-sm text-muted-foreground">
              运行中的策略不能归档，请先停止策略后再尝试归档。
            </p>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>归档后：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>策略将停止运行</li>
                <li>配置和历史数据会保留</li>
                <li>随时可以恢复并重新启用</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {!isRunning && (
            <Button
              onClick={() => {
                onConfirmArchive(strategy.id)
                onOpenChange(false)
              }}
            >
              确认归档
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
