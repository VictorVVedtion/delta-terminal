'use client'

/**
 * InterventionHistory Component
 *
 * EPIC-009 Story 9.2: 干预历史记录组件
 * 展示所有人工干预操作记录
 */

import React from 'react'
import {
  History,
  Download,
  Settings2,
  AlertTriangle,
  ChevronRight,
  X,
  Clock,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useInterventionStore, selectRecentRecords } from '@/store/intervention'
import type { InterventionRecord } from '@/types/intervention'
import { formatInterventionType, formatEmergencyAction } from '@/types/intervention'

// =============================================================================
// Types
// =============================================================================

interface InterventionHistoryProps {
  /** Agent ID */
  agentId: string
  /** 最大显示条数 */
  maxRecords?: number
  /** 自定义类名 */
  className?: string
}

interface RecordDetailModalProps {
  record: InterventionRecord
  isOpen: boolean
  onClose: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// =============================================================================
// RecordDetailModal Component
// =============================================================================

function RecordDetailModal({ record, isOpen, onClose }: RecordDetailModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">干预详情</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">时间</span>
              </div>
              <p className="font-medium text-sm">
                {new Date(record.timestamp).toLocaleString('zh-CN')}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">操作人</span>
              </div>
              <p className="font-medium text-sm">{record.operator}</p>
            </div>
          </div>

          {/* 操作类型 */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">操作类型</p>
            <div className="flex items-center gap-2">
              {record.type === 'param_change' ? (
                <Settings2 className="h-4 w-4 text-blue-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium">
                {formatInterventionType(record.type)}
                {record.action && ` - ${formatEmergencyAction(record.action)}`}
              </span>
            </div>
          </div>

          {/* 参数变更详情 */}
          {record.paramChanges && record.paramChanges.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">参数变更</p>
              <div className="space-y-2">
                {record.paramChanges.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <span className="text-muted-foreground">{change.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">
                        {String(change.oldValue)}{change.unit}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-500">
                        {String(change.newValue)}{change.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 原因 */}
          {record.reason && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">操作原因</p>
              <p className="text-sm">{record.reason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// InterventionHistory Component
// =============================================================================

export function InterventionHistory({
  agentId,
  maxRecords = 20,
  className,
}: InterventionHistoryProps) {
  const records = useInterventionStore(selectRecentRecords(agentId, maxRecords))
  const exportRecordsCSV = useInterventionStore((s) => s.exportRecordsCSV)

  // State
  const [selectedRecord, setSelectedRecord] = React.useState<InterventionRecord | null>(null)

  // 导出 CSV
  const handleExport = () => {
    const csv = exportRecordsCSV(agentId)
    if (!csv) return

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `intervention-history-${agentId}-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-primary" />
              干预历史
            </CardTitle>
            {records.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                导出 CSV
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">暂无干预记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left',
                    'bg-card hover:bg-muted/50 transition-colors',
                    'flex items-start gap-3'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                      record.type === 'param_change'
                        ? 'bg-blue-500/10'
                        : 'bg-yellow-500/10'
                    )}
                  >
                    {record.type === 'param_change' ? (
                      <Settings2 className="h-4 w-4 text-blue-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatInterventionType(record.type)}
                      </Badge>
                      {record.action && (
                        <span className="text-sm font-medium">
                          {formatEmergencyAction(record.action)}
                        </span>
                      )}
                    </div>

                    {record.paramChanges && record.paramChanges.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {record.paramChanges.map(c => c.label).join(', ')}
                      </p>
                    )}

                    {record.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        原因: {record.reason}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(record.timestamp)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* 记录数统计 */}
          {records.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              显示最近 {records.length} 条记录
            </p>
          )}
        </CardContent>
      </Card>

      {/* 详情模态框 */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </>
  )
}

export default InterventionHistory
