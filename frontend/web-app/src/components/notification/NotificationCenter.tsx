/**
 * NotificationCenter - 通知中心面板
 *
 * @module S61 紧急通知渠道
 *
 * 下拉式通知面板，包含通知列表和快捷操作
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationItem } from './NotificationItem'
import type {
  NotificationData,
  NotificationCategory,
  NotificationAction,
} from '@/types/notification'
import { CATEGORY_CONFIG } from '@/types/notification'

export interface NotificationCenterProps {
  /** 通知列表 */
  notifications: NotificationData[]
  /** 未读数量 */
  unreadCount: number
  /** 标记已读回调 */
  onMarkRead: (id: string) => void
  /** 标记全部已读回调 */
  onMarkAllRead: () => void
  /** 删除通知回调 */
  onDelete: (id: string) => void
  /** 清空通知回调 */
  onClear: () => void
  /** 点击通知回调 */
  onNotificationClick?: (notification: NotificationData) => void
  /** 动作按钮点击回调 */
  onActionClick?: (notification: NotificationData, action: NotificationAction) => void
  /** 是否显示 */
  open?: boolean
  /** 关闭回调 */
  onClose?: () => void
  /** 自定义样式 */
  className?: string
}

const ALL_CATEGORIES: NotificationCategory[] = [
  'trade',
  'risk_alert',
  'strategy',
  'system',
  'market',
  'account',
]

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClear,
  onNotificationClick,
  onActionClick,
  open = true,
  onClose,
  className,
}: NotificationCenterProps) {
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // 筛选通知
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (selectedCategory !== 'all' && n.category !== selectedCategory) return false
      if (showUnreadOnly && n.read) return false
      return true
    })
  }, [notifications, selectedCategory, showUnreadOnly])

  // 各分类未读数
  const categoryUnreadCounts = useMemo(() => {
    const counts: Record<NotificationCategory | 'all', number> = {
      all: unreadCount,
      trade: 0,
      risk_alert: 0,
      strategy: 0,
      system: 0,
      market: 0,
      account: 0,
    }
    notifications.forEach((n) => {
      if (!n.read) {
        counts[n.category]++
      }
    })
    return counts
  }, [notifications, unreadCount])

  if (!open) return null

  return (
    <Card
      className={cn(
        'w-96 max-h-[600px] flex flex-col shadow-xl',
        className
      )}
    >
      {/* 头部 */}
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            🔔 通知中心
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onMarkAllRead}
              >
                全部已读
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onClose}
              >
                ✕
              </Button>
            )}
          </div>
        </div>

        {/* 筛选标签 */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 scrollbar-thin">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-xs flex-shrink-0"
            onClick={() => setSelectedCategory('all')}
          >
            全部
            {categoryUnreadCounts.all > 0 && (
              <span className="ml-1 opacity-70">({categoryUnreadCounts.all})</span>
            )}
          </Button>
          {ALL_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs flex-shrink-0"
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
              {categoryUnreadCounts[cat] > 0 && (
                <span className="ml-1 opacity-70">({categoryUnreadCounts[cat]})</span>
              )}
            </Button>
          ))}
        </div>

        {/* 只看未读 */}
        <div className="flex items-center justify-between mt-2">
          <Button
            variant={showUnreadOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? '✓ ' : ''}只看未读
          </Button>
          {filteredNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={onClear}
            >
              清空
            </Button>
          )}
        </div>
      </CardHeader>

      {/* 通知列表 */}
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => {
                  if (!notification.read) onMarkRead(notification.id)
                  onNotificationClick?.(notification)
                }}
                onMarkRead={() => onMarkRead(notification.id)}
                onDelete={() => onDelete(notification.id)}
                onActionClick={(action) => onActionClick?.(notification, action)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationCenter
