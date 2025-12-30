'use client'

import { AlertTriangle, Archive, Clock, History, Trash2 } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  canDeleteStrategy,
  RECYCLE_BIN_RETENTION_DAYS,
  type StrategyWithLifecycle,
} from '@/types/strategy-lifecycle'

// =============================================================================
// Types
// =============================================================================

export interface DeleteConfirmDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 关闭对话框回调 */
  onOpenChange: (open: boolean) => void
  /** 要删除的策略 */
  strategy: StrategyWithLifecycle | null
  /** 确认删除回调 */
  onConfirmDelete: (strategyId: string, permanent: boolean) => void
  /** 是否显示永久删除选项 */
  showPermanentOption?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  strategy,
  onConfirmDelete,
  showPermanentOption = false,
}: DeleteConfirmDialogProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [permanentDelete, setPermanentDelete] = useState(false)

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmChecked(false)
      setPermanentDelete(false)
    }
    onOpenChange(newOpen)
  }

  if (!strategy) return null

  const { canDelete, reason } = canDeleteStrategy(strategy)
  const isRunning = strategy.runStatus === 'running'

  const handleConfirm = () => {
    if (canDelete && confirmChecked) {
      onConfirmDelete(strategy.id, permanentDelete)
      handleOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isRunning ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                无法删除运行中的策略
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 text-destructive" />
                确认删除策略
              </>
            )}
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Strategy Info */}
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{strategy.name}</span>
                  <Badge
                    variant={isRunning ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {isRunning ? '运行中' : strategy.runStatus === 'paused' ? '已暂停' : '已停止'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {strategy.description}
                </p>
              </div>

              {/* Warning for running strategy */}
              {isRunning && (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">
                        {reason}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        为确保交易安全，运行中的策略必须先停止后才能删除。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete impact info */}
              {canDelete && (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>
                        策略将移入回收站，保留 <strong>{RECYCLE_BIN_RETENTION_DAYS} 天</strong>后永久删除
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>
                        历史交易记录、绩效数据将<strong>永久保留</strong>，不会被删除
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Archive className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>
                        在回收站保留期间，您可以随时恢复此策略
                      </span>
                    </div>
                  </div>

                  {/* Permanent delete option */}
                  {showPermanentOption && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={permanentDelete}
                          onCheckedChange={(checked) =>
                            setPermanentDelete(checked === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="text-sm">
                          <span className="font-medium text-destructive">
                            永久删除（跳过回收站）
                          </span>
                          <p className="mt-0.5 text-muted-foreground">
                            此操作不可撤销，策略将立即被永久删除
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Confirm checkbox */}
                  <div className="rounded-lg border p-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={confirmChecked}
                        onCheckedChange={(checked) =>
                          setConfirmChecked(checked === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        我理解删除操作的影响，确认要删除此策略
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          {canDelete ? (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!confirmChecked}
              className={cn(!confirmChecked && 'opacity-50 cursor-not-allowed')}
            >
              {permanentDelete ? '永久删除' : '移入回收站'}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={() => handleOpenChange(false)}
              className="bg-primary"
            >
              我知道了
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// =============================================================================
// Permanent Delete Dialog (for recycle bin)
// =============================================================================

export interface PermanentDeleteDialogProps {
  /** 是否打开对话框 */
  open: boolean
  /** 关闭对话框回调 */
  onOpenChange: (open: boolean) => void
  /** 要永久删除的策略 */
  strategy: StrategyWithLifecycle | null
  /** 剩余天数 */
  remainingDays: number
  /** 确认永久删除回调 */
  onConfirmPermanentDelete: (strategyId: string) => void
}

export function PermanentDeleteDialog({
  open,
  onOpenChange,
  strategy,
  remainingDays,
  onConfirmPermanentDelete,
}: PermanentDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('')

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText('')
    }
    onOpenChange(newOpen)
  }

  if (!strategy) return null

  const isConfirmed = confirmText === '永久删除'

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirmPermanentDelete(strategy.id)
      handleOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            永久删除策略
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Strategy Info */}
              <div className="rounded-lg border bg-muted/50 p-3">
                <span className="font-medium text-foreground">{strategy.name}</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  剩余保留时间：{remainingDays} 天
                </p>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      此操作不可撤销！
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      永久删除后，策略配置将无法恢复。历史交易记录会保留。
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirm input */}
              <div className="space-y-2">
                <p className="text-sm">
                  请输入 <strong className="text-destructive">永久删除</strong> 以确认：
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="永久删除"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={cn(!isConfirmed && 'opacity-50 cursor-not-allowed')}
          >
            确认永久删除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
