'use client'

/**
 * VersionList Component
 *
 * EPIC-009 Story 9.3: 策略版本列表组件
 * 展示版本历史列表，支持回滚和对比
 */

import React from 'react'
import {
  GitBranch,
  RotateCcw,
  Eye,
  ChevronRight,
  Check,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StrategyVersion } from '@/types/version'
import { formatVersionTime } from '@/types/version'

// =============================================================================
// Types
// =============================================================================

interface VersionListProps {
  /** 版本列表 */
  versions: StrategyVersion[]
  /** 选中版本进行对比 */
  selectedForCompare: string | undefined
  /** 选择版本对比回调 */
  onSelectForCompare?: (versionId: string) => void
  /** 回滚回调 */
  onRollback?: (versionId: string) => void
  /** 查看详情回调 */
  onViewDetails?: (version: StrategyVersion) => void
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// VersionList Component
// =============================================================================

export function VersionList({
  versions,
  selectedForCompare,
  onSelectForCompare,
  onRollback,
  onViewDetails,
  className,
}: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div className={cn('py-8 text-center text-muted-foreground', className)}>
        <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">暂无版本记录</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {versions.map((version, index) => {
        const isActive = version.isActive
        const isSelected = selectedForCompare === version.id
        const canRollback = !isActive && index > 0

        return (
          <div
            key={version.id}
            className={cn(
              'p-4 rounded-lg border transition-all',
              isActive
                ? 'bg-primary/5 border-primary/30'
                : 'bg-card hover:bg-muted/50',
              isSelected && 'ring-2 ring-primary/50'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                <span className="font-mono font-medium">{version.version}</span>
                {isActive && (
                  <Badge variant="default" className="text-xs">
                    当前
                  </Badge>
                )}
                {version.createdBy === 'user' && (
                  <Badge variant="outline" className="text-xs">
                    手动
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatVersionTime(version.timestamp)}
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground mb-3">
              {version.summary}
            </p>

            {/* Reason */}
            {version.reason && (
              <p className="text-xs text-muted-foreground mb-3 italic">
                原因: {version.reason}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onSelectForCompare && (
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSelectForCompare(version.id)}
                    className="h-7 text-xs"
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        已选
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        对比
                      </>
                    )}
                  </Button>
                )}

                {canRollback && onRollback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRollback(version.id)}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    回滚
                  </Button>
                )}
              </div>

              {onViewDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(version)}
                  className="h-7 text-xs"
                >
                  详情
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default VersionList
