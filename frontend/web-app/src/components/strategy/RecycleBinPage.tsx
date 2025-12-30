'use client'

import {
  AlertTriangle,
  Clock,
  RefreshCcw,
  Trash2,
  Undo2,
} from 'lucide-react'
import React, { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useStrategyLifecycleStore } from '@/store/strategyLifecycle'
import { RECYCLE_BIN_RETENTION_DAYS, type StrategyWithLifecycle } from '@/types/strategy-lifecycle'

import { PermanentDeleteDialog } from './DeleteConfirmDialog'

// =============================================================================
// Types
// =============================================================================

export interface RecycleBinPageProps {
  /** 返回策略列表回调 */
  onBack?: () => void
}

// =============================================================================
// Component
// =============================================================================

export function RecycleBinPage({ onBack }: RecycleBinPageProps) {
  const {
    getDeletedStrategies,
    restoreStrategy,
    permanentDeleteStrategy,
    emptyRecycleBin,
    getRemainingDays,
  } = useStrategyLifecycleStore()

  const deletedStrategies = getDeletedStrategies()

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithLifecycle | null>(null)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [showEmptyBinDialog, setShowEmptyBinDialog] = useState(false)

  const handleRestore = (strategy: StrategyWithLifecycle) => {
    const result = restoreStrategy(strategy.id)
    if (!result.success) {
      console.error('恢复失败:', result.error)
      // TODO: 显示错误提示
    }
  }

  const handlePermanentDelete = (strategyId: string) => {
    permanentDeleteStrategy(strategyId)
    setSelectedStrategy(null)
  }

  const handleEmptyRecycleBin = () => {
    emptyRecycleBin()
    setShowEmptyBinDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <Undo2 className="h-4 w-4 mr-1" />
              返回
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-muted-foreground" />
              回收站
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              已删除的策略会保留 {RECYCLE_BIN_RETENTION_DAYS} 天，之后将被永久删除
            </p>
          </div>
        </div>

        {deletedStrategies.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEmptyBinDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            清空回收站
          </Button>
        )}
      </div>

      {/* Strategy List */}
      {deletedStrategies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deletedStrategies.map((strategy) => (
            <RecycleBinCard
              key={strategy.id}
              strategy={strategy}
              remainingDays={getRemainingDays(strategy.id)}
              onRestore={() => handleRestore(strategy)}
              onPermanentDelete={() => {
                setSelectedStrategy(strategy)
                setShowPermanentDeleteDialog(true)
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">回收站为空</h3>
            <p className="text-sm text-muted-foreground">
              删除的策略会暂存在这里，方便您随时恢复
            </p>
          </CardContent>
        </Card>
      )}

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
        strategy={selectedStrategy}
        remainingDays={selectedStrategy ? getRemainingDays(selectedStrategy.id) : 0}
        onConfirmPermanentDelete={handlePermanentDelete}
      />

      {/* Empty Recycle Bin Dialog */}
      <EmptyRecycleBinDialog
        open={showEmptyBinDialog}
        onOpenChange={setShowEmptyBinDialog}
        strategyCount={deletedStrategies.length}
        onConfirm={handleEmptyRecycleBin}
      />
    </div>
  )
}

// =============================================================================
// RecycleBinCard
// =============================================================================

interface RecycleBinCardProps {
  strategy: StrategyWithLifecycle
  remainingDays: number
  onRestore: () => void
  onPermanentDelete: () => void
}

function RecycleBinCard({
  strategy,
  remainingDays,
  onRestore,
  onPermanentDelete,
}: RecycleBinCardProps) {
  const isUrgent = remainingDays <= 7

  return (
    <Card className="relative overflow-hidden">
      {/* Countdown Badge */}
      <div className="absolute top-3 right-3">
        <Badge
          variant={isUrgent ? 'destructive' : 'secondary'}
          className="flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          {remainingDays} 天后删除
        </Badge>
      </div>

      <CardHeader className="pb-3 pr-24">
        <CardTitle className="text-base line-clamp-1">{strategy.name}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {strategy.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">盈亏</span>
            <div
              className={`font-semibold ${
                strategy.performance.pnl >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              ${formatCurrency(Math.abs(strategy.performance.pnl))}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">交易次数</span>
            <div className="font-semibold">{strategy.performance.trades}</div>
          </div>
        </div>

        {/* Delete Time */}
        <div className="text-xs text-muted-foreground">
          删除于:{' '}
          {strategy.timestamps.deletedAt
            ? new Date(strategy.timestamps.deletedAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-'}
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
            恢复
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onPermanentDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// EmptyRecycleBinDialog
// =============================================================================

interface EmptyRecycleBinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategyCount: number
  onConfirm: () => void
}

function EmptyRecycleBinDialog({
  open,
  onOpenChange,
  strategyCount,
  onConfirm,
}: EmptyRecycleBinDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            清空回收站
          </AlertDialogTitle>

          <AlertDialogDescription className="space-y-3">
            <p>
              确定要永久删除回收站中的 <strong>{strategyCount}</strong> 个策略吗？
            </p>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <span>
                  此操作不可撤销！所有策略配置将被永久删除，历史交易记录会保留。
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            确认清空
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
