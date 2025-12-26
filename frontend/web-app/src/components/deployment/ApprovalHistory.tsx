'use client'

/**
 * ApprovalHistory Component
 *
 * EPIC-007 Story 7.2: 审批历史记录组件
 * 展示所有 Live 部署的审批记录，支持查看详情、搜索筛选
 */

import React from 'react'
import {
  ClipboardCheck,
  Search,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  X,
  FileText,
  DollarSign,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSafetyStore, selectSafetyConfig } from '@/store/safety'
import type { ApprovalRecord } from '@/types/safety'

// =============================================================================
// Types
// =============================================================================

interface ApprovalHistoryProps {
  /** 最大显示条数 */
  maxRecords?: number
  /** 是否显示操作按钮（撤销） */
  showActions?: boolean
  /** 自定义类名 */
  className?: string
}

interface ApprovalDetailModalProps {
  record: ApprovalRecord
  isOpen: boolean
  onClose: () => void
  onRevoke: ((recordId: string) => void) | undefined
}

// =============================================================================
// ApprovalHistory Component
// =============================================================================

export function ApprovalHistory({
  maxRecords = 20,
  showActions = true,
  className,
}: ApprovalHistoryProps) {
  const approvalHistory = useSafetyStore((s) => s.approvalHistory)
  const config = useSafetyStore(selectSafetyConfig)

  // State
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc')
  const [selectedRecord, setSelectedRecord] = React.useState<ApprovalRecord | null>(null)

  // Filter and sort records
  const filteredRecords = React.useMemo(() => {
    let records = [...approvalHistory]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      records = records.filter(
        (r) =>
          r.strategyName.toLowerCase().includes(query) ||
          r.mode.toLowerCase().includes(query) ||
          r.riskLevel.toLowerCase().includes(query)
      )
    }

    // Sort
    records.sort((a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1
      return (a.approvedAt - b.approvedAt) * order
    })

    return records.slice(0, maxRecords)
  }, [approvalHistory, searchQuery, sortOrder, maxRecords])

  // Check if token is valid
  const isTokenValid = (record: ApprovalRecord) => {
    const validityMs = config.approval.tokenValidityMinutes * 60 * 1000
    return Date.now() - record.approvedAt < validityMs
  }

  // Handle revoke
  const handleRevoke = (_recordId: string) => {
    // In production, this would call an API to revoke the approval
    // For now, we just close the modal
    setSelectedRecord(null)
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            审批历史
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索策略名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-9 pr-3 py-2 text-sm rounded-lg',
                  'bg-muted border border-border',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50'
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="gap-1.5"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? '最新' : '最早'}
            </Button>
          </div>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                {searchQuery ? '没有找到匹配的记录' : '暂无审批记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => {
                const tokenValid = isTokenValid(record)
                const timeAgo = formatTimeAgo(record.approvedAt)

                return (
                  <button
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left',
                      'bg-card hover:bg-muted/50 transition-colors',
                      'flex items-center gap-3'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                        tokenValid ? 'bg-green-500/10' : 'bg-muted'
                      )}
                    >
                      {tokenValid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{record.strategyName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>资金: ${record.capital.toLocaleString()}</span>
                        <span>•</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {tokenValid ? (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          有效
                        </Badge>
                      ) : (
                        <Badge variant="secondary">已过期</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Total Count */}
          {approvalHistory.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              共 {approvalHistory.length} 条记录
              {filteredRecords.length < approvalHistory.length &&
                ` (显示 ${filteredRecords.length} 条)`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedRecord && (
        <ApprovalDetailModal
          record={selectedRecord}
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onRevoke={showActions ? handleRevoke : undefined}
        />
      )}
    </>
  )
}

// =============================================================================
// ApprovalDetailModal Component
// =============================================================================

function ApprovalDetailModal({
  record,
  isOpen,
  onClose,
  onRevoke,
}: ApprovalDetailModalProps) {
  const config = useSafetyStore(selectSafetyConfig)
  const tokenValid = Date.now() - record.approvedAt < config.approval.tokenValidityMinutes * 60 * 1000

  // Calculate remaining time if valid
  const remainingMs = config.approval.tokenValidityMinutes * 60 * 1000 - (Date.now() - record.approvedAt)
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">审批详情</h2>
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
          {/* Strategy Info */}
          <div>
            <h3 className="text-lg font-semibold">{record.strategyName}</h3>
            <p className="text-sm text-muted-foreground">
              审批时间: {new Date(record.approvedAt).toLocaleString('zh-CN')}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard
              icon={<DollarSign className="h-4 w-4" />}
              label="使用资金"
              value={`$${record.capital.toLocaleString()}`}
            />
            <DetailCard
              icon={<Shield className="h-4 w-4" />}
              label="风险等级"
              value={record.riskLevel === 'high' ? '高' : record.riskLevel === 'medium' ? '中' : '低'}
            />
          </div>

          {/* Token Status */}
          <div
            className={cn(
              'p-4 rounded-lg',
              tokenValid ? 'bg-green-500/10' : 'bg-muted'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {tokenValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium">
                {tokenValid ? 'Token 有效' : 'Token 已过期'}
              </span>
            </div>
            {tokenValid && (
              <p className="text-sm text-muted-foreground">
                剩余有效时间: {remainingMinutes} 分钟
              </p>
            )}
            {!tokenValid && (
              <p className="text-sm text-muted-foreground">
                Token 已于 {new Date(record.approvedAt + config.approval.tokenValidityMinutes * 60 * 1000).toLocaleTimeString('zh-CN')} 过期
              </p>
            )}
          </div>

          {/* Approval Steps */}
          <div className="space-y-2">
            <p className="text-sm font-medium">审批步骤</p>
            <div className="flex items-center gap-2">
              {['风险审核', '资金确认', '最终确认'].map((step, index) => (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{step}</span>
                  </div>
                  {index < 2 && (
                    <div className="h-px w-4 bg-green-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          {onRevoke && tokenValid && (
            <Button
              variant="destructive"
              onClick={() => onRevoke(record.id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              撤销审批
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DetailCard Component
// =============================================================================

interface DetailCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function DetailCard({ icon, label, value }: DetailCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// =============================================================================
// Helpers
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
// Export
// =============================================================================

export default ApprovalHistory
