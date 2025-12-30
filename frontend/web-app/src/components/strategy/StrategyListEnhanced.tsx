'use client'

import {
  Activity,
  Archive,
  Clock,
  Edit,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import React, { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import {
  selectActiveCount,
  selectArchivedCount,
  selectDeletedCount,
  useStrategyLifecycleStore,
} from '@/store/strategyLifecycle'
import type { StrategyWithLifecycle } from '@/types/strategy-lifecycle'

import { ArchiveConfirmDialog, ArchivedStrategyView } from './ArchivedStrategyView'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { RecycleBinPage } from './RecycleBinPage'

// =============================================================================
// Types
// =============================================================================

export interface StrategyListEnhancedProps {
  /** 创建新策略回调 */
  onCreateNew?: () => void
  /** 编辑策略回调 */
  onEdit?: (id: string) => void
  /** 查看策略详情回调 */
  onView?: (id: string) => void
}

// =============================================================================
// Component
// =============================================================================

export function StrategyListEnhanced({
  onCreateNew,
  onEdit,
  onView,
}: StrategyListEnhancedProps) {
  const store = useStrategyLifecycleStore()
  const {
    getActiveStrategies,
    updateStrategy,
    softDeleteStrategy,
    archiveStrategy,
  } = store

  const activeStrategies = getActiveStrategies()
  const activeCount = selectActiveCount(store)
  const archivedCount = selectArchivedCount(store)
  const deletedCount = selectDeletedCount(store)

  const [activeTab, setActiveTab] = useState('active')
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithLifecycle | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  const handleToggleStatus = (
    id: string,
    currentStatus: StrategyWithLifecycle['runStatus']
  ) => {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running'
    updateStrategy(id, { runStatus: newStatus })
  }

  const handleDelete = (strategy: StrategyWithLifecycle) => {
    setSelectedStrategy(strategy)
    setShowDeleteDialog(true)
  }

  const handleArchive = (strategy: StrategyWithLifecycle) => {
    setSelectedStrategy(strategy)
    setShowArchiveDialog(true)
  }

  const handleConfirmDelete = (strategyId: string, permanent: boolean) => {
    if (permanent) {
      // 永久删除（实际上在普通视图中不应该发生）
      store.permanentDeleteStrategy(strategyId)
    } else {
      softDeleteStrategy(strategyId)
    }
    setSelectedStrategy(null)
  }

  const handleConfirmArchive = (strategyId: string) => {
    archiveStrategy(strategyId)
    setSelectedStrategy(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">我的策略</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理和监控你的交易策略
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          创建新策略
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Activity className="h-4 w-4" />
            活跃 {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            归档 {archivedCount > 0 && <Badge variant="secondary">{archivedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            回收站 {deletedCount > 0 && <Badge variant="destructive">{deletedCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeStrategies.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={() => onEdit?.(strategy.id)}
                  onView={() => onView?.(strategy.id)}
                  onDelete={() => handleDelete(strategy)}
                  onArchive={() => handleArchive(strategy)}
                  onToggleStatus={() =>
                    handleToggleStatus(strategy.id, strategy.runStatus)
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState onCreateNew={onCreateNew} />
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          <ArchivedStrategyView onSwitchToActive={() => setActiveTab('active')} />
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          <RecycleBinPage onBack={() => setActiveTab('active')} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        strategy={selectedStrategy}
        onConfirmDelete={handleConfirmDelete}
      />

      <ArchiveConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        strategy={selectedStrategy}
        onConfirmArchive={handleConfirmArchive}
      />
    </div>
  )
}

// =============================================================================
// StrategyCard
// =============================================================================

interface StrategyCardProps {
  strategy: StrategyWithLifecycle
  onEdit?: () => void
  onView?: () => void
  onDelete?: () => void
  onArchive?: () => void
  onToggleStatus?: () => void
}

function StrategyCard({
  strategy,
  onEdit,
  onView,
  onDelete,
  onArchive,
  onToggleStatus,
}: StrategyCardProps) {
  const isRunning = strategy.runStatus === 'running'

  const statusConfig = {
    running: { variant: 'success' as const, label: '运行中' },
    paused: { variant: 'warning' as const, label: '已暂停' },
    stopped: { variant: 'secondary' as const, label: '已停止' },
  }

  const { variant, label } = statusConfig[strategy.runStatus]

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <CardTitle className="text-base">{strategy.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {strategy.description}
            </p>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge variant={variant}>{label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  归档
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label="盈亏"
            value={`$${formatCurrency(Math.abs(strategy.performance.pnl))}`}
            subValue={formatPercentage(strategy.performance.pnlPercent)}
            isPositive={strategy.performance.pnl >= 0}
          />
          <MetricItem
            label="交易次数"
            value={strategy.performance.trades.toString()}
            subValue={`胜率 ${strategy.performance.winRate}%`}
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            最后活跃:{' '}
            {new Date(strategy.timestamps.lastActiveAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant={isRunning ? 'outline' : 'default'}
            size="sm"
            className="flex-1"
            onClick={onToggleStatus}
          >
            {isRunning ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                暂停
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                启动
              </>
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MetricItem
// =============================================================================

interface MetricItemProps {
  label: string
  value: string
  subValue?: string
  isPositive?: boolean
}

function MetricItem({ label, value, subValue, isPositive }: MetricItemProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-sm font-semibold ${
          isPositive !== undefined
            ? isPositive
              ? 'text-green-500'
              : 'text-red-500'
            : ''
        }`}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  )
}

// =============================================================================
// EmptyState
// =============================================================================

interface EmptyStateProps {
  onCreateNew?: () => void
}

function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">还没有策略</h3>
        <p className="text-sm text-muted-foreground mb-4">
          使用 AI 助手创建你的第一个交易策略
        </p>
        <Button onClick={onCreateNew}>开始创建</Button>
      </CardContent>
    </Card>
  )
}
