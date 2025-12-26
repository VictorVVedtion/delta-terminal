'use client'

/**
 * VersionHistoryCanvas Component
 *
 * EPIC-009 Story 9.3: 版本历史面板
 * 展示策略版本历史，支持快照、对比和回滚
 */

import React from 'react'
import {
  GitBranch,
  X,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVersionStore, selectStrategyVersions } from '@/store/version'
import { VersionList } from '@/components/version/VersionList'
import { VersionCompare } from '@/components/version/VersionCompare'
import type { StrategyVersion } from '@/types/version'

// =============================================================================
// Types
// =============================================================================

interface VersionHistoryCanvasProps {
  /** 策略 ID */
  strategyId: string
  /** 策略名称 */
  strategyName: string
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 回滚回调 */
  onRollback?: (versionId: string) => Promise<void>
}

interface CreateSnapshotModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (summary: string, reason?: string) => void
}

// =============================================================================
// CreateSnapshotModal Component
// =============================================================================

function CreateSnapshotModal({
  isOpen,
  onClose,
  onConfirm,
}: CreateSnapshotModalProps) {
  const [summary, setSummary] = React.useState('')
  const [reason, setReason] = React.useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (summary.trim()) {
      onConfirm(summary.trim(), reason.trim() || undefined)
      setSummary('')
      setReason('')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">创建版本快照</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              版本说明 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="例如：调整止损参数"
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              创建原因 (可选)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="说明为什么创建这个版本..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!summary.trim()}>
            创建快照
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// RollbackConfirmModal Component
// =============================================================================

interface RollbackConfirmModalProps {
  version: StrategyVersion | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  isLoading: boolean
}

function RollbackConfirmModal({
  version,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: RollbackConfirmModalProps) {
  const [reason, setReason] = React.useState('')

  if (!isOpen || !version) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">确认回滚</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm">
            确定要回滚到版本 <span className="font-mono font-medium">{version.version}</span> 吗？
          </p>

          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              回滚操作会创建一个新版本，包含目标版本的所有参数
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              回滚原因 (可选)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="说明为什么回滚..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={isLoading}
          >
            {isLoading ? '回滚中...' : '确认回滚'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// VersionHistoryCanvas Component
// =============================================================================

export function VersionHistoryCanvas({
  strategyId,
  strategyName,
  isOpen,
  onClose,
  onRollback,
}: VersionHistoryCanvasProps) {
  const versions = useVersionStore(selectStrategyVersions(strategyId))
  const rollbackToVersion = useVersionStore((s) => s.rollbackToVersion)

  // State
  const [selectedForCompare, setSelectedForCompare] = React.useState<string | null>(null)
  const [compareTarget, setCompareTarget] = React.useState<StrategyVersion | null>(null)
  const [showCreateSnapshot, setShowCreateSnapshot] = React.useState(false)
  const [rollbackTarget, setRollbackTarget] = React.useState<StrategyVersion | null>(null)
  const [isRollingBack, setIsRollingBack] = React.useState(false)

  // 获取当前活跃版本
  const activeVersion = versions.find(v => v.isActive)

  // 处理选择对比
  const handleSelectForCompare = (versionId: string) => {
    if (selectedForCompare === versionId) {
      setSelectedForCompare(null)
    } else if (selectedForCompare) {
      // 已选择一个，现在选择第二个进行对比
      const version1 = versions.find(v => v.id === selectedForCompare)
      const version2 = versions.find(v => v.id === versionId)
      if (version1 && version2) {
        setCompareTarget(version1.timestamp < version2.timestamp ? version2 : version1)
        // version1 应该是较旧的版本
        const older = version1.timestamp < version2.timestamp ? version1 : version2
        setSelectedForCompare(older.id)
      }
    } else {
      setSelectedForCompare(versionId)
    }
  }

  // 处理回滚
  const handleRollback = (versionId: string) => {
    const version = versions.find(v => v.id === versionId)
    if (version) {
      setRollbackTarget(version)
    }
  }

  // 确认回滚
  const handleConfirmRollback = async (reason?: string) => {
    if (!rollbackTarget) return

    setIsRollingBack(true)
    try {
      // 先在本地创建回滚版本
      rollbackToVersion(strategyId, rollbackTarget.id, reason)

      // 如果有外部回调，执行它
      if (onRollback) {
        await onRollback(rollbackTarget.id)
      }

      setRollbackTarget(null)
    } finally {
      setIsRollingBack(false)
    }
  }

  // 创建快照
  const handleCreateSnapshot = (_summary: string, _reason?: string) => {
    // TODO: 实现创建快照逻辑
    setShowCreateSnapshot(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Canvas */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-lg z-50',
          'bg-background border-l border-border shadow-xl',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              版本历史
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {strategyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateSnapshot(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              创建快照
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <VersionList
            versions={versions}
            selectedForCompare={selectedForCompare || undefined}
            onSelectForCompare={handleSelectForCompare}
            onRollback={handleRollback}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-center text-xs text-muted-foreground">
          共 {versions.length} 个版本
        </div>
      </div>

      {/* Compare Modal */}
      {selectedForCompare && compareTarget && activeVersion && (
        <VersionCompare
          version1={versions.find(v => v.id === selectedForCompare)!}
          version2={compareTarget}
          isOpen={!!compareTarget}
          onClose={() => {
            setCompareTarget(null)
            setSelectedForCompare(null)
          }}
          onRollback={handleRollback}
        />
      )}

      {/* Create Snapshot Modal */}
      <CreateSnapshotModal
        isOpen={showCreateSnapshot}
        onClose={() => setShowCreateSnapshot(false)}
        onConfirm={handleCreateSnapshot}
      />

      {/* Rollback Confirm Modal */}
      <RollbackConfirmModal
        version={rollbackTarget}
        isOpen={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        onConfirm={handleConfirmRollback}
        isLoading={isRollingBack}
      />
    </>
  )
}

export default VersionHistoryCanvas
