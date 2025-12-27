'use client'

/**
 * VersionCompare Component
 *
 * EPIC-009 Story 9.3: 版本对比组件
 * 并排对比两个版本的参数差异
 */

import {
  ArrowRight,
  Equal,
  GitCompare,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { StrategyVersion, VersionComparison } from '@/types/version'
import { compareVersionParams } from '@/types/version'

// =============================================================================
// Types
// =============================================================================

interface VersionCompareProps {
  /** 版本1（旧版本） */
  version1: StrategyVersion
  /** 版本2（新版本） */
  version2: StrategyVersion
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 回滚回调 */
  onRollback?: (versionId: string) => void
}

// =============================================================================
// VersionCompare Component
// =============================================================================

export function VersionCompare({
  version1,
  version2,
  isOpen,
  onClose,
  onRollback,
}: VersionCompareProps) {
  if (!isOpen) return null

  const comparison: VersionComparison = compareVersionParams(version1, version2)
  const changedCount = comparison.diffs.filter(d => d.hasChanged).length
  const unchangedCount = comparison.diffs.filter(d => !d.hasChanged).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">版本对比</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Version Headers */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{version1.version}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(version1.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Badge variant={version2.isActive ? 'default' : 'outline'}>
              {version2.version}
              {version2.isActive && ' (当前)'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(version2.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border text-sm">
          <span className="flex items-center gap-1 text-yellow-500">
            <Plus className="h-3 w-3" />
            {comparison.addedParams.length} 新增
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <Minus className="h-3 w-3" />
            {comparison.removedParams.length} 移除
          </span>
          <span className="flex items-center gap-1 text-blue-500">
            <GitCompare className="h-3 w-3" />
            {changedCount} 变更
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Equal className="h-3 w-3" />
            {unchangedCount} 不变
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comparison.diffs.map((diff) => (
            <div
              key={diff.key}
              className={cn(
                'p-3 rounded-lg border',
                diff.hasChanged
                  ? 'bg-yellow-500/5 border-yellow-500/20'
                  : 'bg-muted/30 border-transparent'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{diff.label}</span>
                {diff.hasChanged ? (
                  <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">
                    已变更
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    无变化
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{version1.version}</p>
                  <p
                    className={cn(
                      'font-mono',
                      diff.hasChanged && 'text-red-500 line-through'
                    )}
                  >
                    {diff.oldValue === undefined ? (
                      <span className="text-muted-foreground italic">无</span>
                    ) : (
                      <>
                        {String(diff.oldValue)}
                        {diff.unit && <span className="text-muted-foreground ml-1">{diff.unit}</span>}
                      </>
                    )}
                  </p>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{version2.version}</p>
                  <p
                    className={cn(
                      'font-mono',
                      diff.hasChanged && 'text-green-500 font-medium'
                    )}
                  >
                    {diff.newValue === undefined ? (
                      <span className="text-muted-foreground italic">无</span>
                    ) : (
                      <>
                        {String(diff.newValue)}
                        {diff.unit && <span className="text-muted-foreground ml-1">{diff.unit}</span>}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          {onRollback && !version1.isActive && (
            <Button
              variant="outline"
              onClick={() => { onRollback(version1.id); }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              回滚到 {version1.version}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default VersionCompare
