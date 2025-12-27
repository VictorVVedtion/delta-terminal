'use client'

import {
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  MoreVertical,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { BacktestHistoryItem } from '@/types/backtest'

// =============================================================================
// BacktestHistory Component
// =============================================================================

interface BacktestHistoryProps {
  items: BacktestHistoryItem[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function BacktestHistory({
  items,
  onSelect,
  onDelete,
}: BacktestHistoryProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items
    const query = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.symbol.toLowerCase().includes(query)
    )
  }, [items, searchQuery])

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDelete = () => {
    selectedItems.forEach((id) => { onDelete(id); })
    setSelectedItems(new Set())
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无回测历史</h3>
          <p className="text-muted-foreground">
            运行新的回测后，历史记录将显示在这里
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索回测记录..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="pl-10"
          />
        </div>
        {selectedItems.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除 ({selectedItems.size})
          </Button>
        )}
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            回测历史 ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelect={() => { onSelect(item.id); }}
                onToggle={() => { toggleSelect(item.id); }}
                onDelete={() => { onDelete(item.id); }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          未找到匹配 &ldquo;{searchQuery}&rdquo; 的记录
        </div>
      )}
    </div>
  )
}

// =============================================================================
// HistoryItem Component
// =============================================================================

interface HistoryItemProps {
  item: BacktestHistoryItem
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
  onDelete: () => void
}

function HistoryItem({
  item,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
}: HistoryItemProps) {
  const [showMenu, setShowMenu] = React.useState(false)

  const statusConfig = {
    pending: {
      label: '等待中',
      icon: Clock,
      variant: 'secondary' as const,
      animate: false,
    },
    running: {
      label: '运行中',
      icon: Loader2,
      variant: 'default' as const,
      animate: true,
    },
    completed: {
      label: '已完成',
      icon: CheckCircle,
      variant: 'success' as const,
      animate: false,
    },
    failed: {
      label: '失败',
      icon: XCircle,
      variant: 'destructive' as const,
      animate: false,
    },
  }

  const status = statusConfig[item.status]
  const StatusIcon = status.icon

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer',
        isSelected && 'bg-muted/50'
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="h-4 w-4 rounded border-border"
        onClick={(e) => { e.stopPropagation(); }}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{item.name}</span>
          <Badge variant="outline" className="text-xs">
            {item.symbol}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.period}</span>
          <span>·</span>
          <span>{formatTimeAgo(item.createdAt)}</span>
        </div>
      </div>

      {/* Return */}
      <div
        className={cn(
          'flex items-center gap-1 font-medium',
          item.totalReturn >= 0 ? 'text-up' : 'text-down'
        )}
      >
        {item.totalReturn >= 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {item.totalReturn >= 0 ? '+' : ''}
        {item.totalReturn.toFixed(2)}%
      </div>

      {/* Status */}
      <Badge variant={status.variant} className="gap-1">
        <StatusIcon
          className={cn('h-3 w-3', status.animate && 'animate-spin')}
        />
        {status.label}
      </Badge>

      {/* Actions Menu */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => { setShowMenu(false); }}
            />
            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                  setShowMenu(false)
                }}
              >
                <Eye className="h-4 w-4" />
                查看详情
              </button>
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setShowMenu(false)
                }}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
}
