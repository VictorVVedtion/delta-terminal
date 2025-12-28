/**
 * NotificationItem - 单条通知展示组件
 *
 * @module S61 紧急通知渠道
 */

'use client'

import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotificationAction,NotificationData } from '@/types/notification'
import { CATEGORY_CONFIG, isUrgentNotification,PRIORITY_CONFIG } from '@/types/notification'

export interface NotificationItemProps {
  /** 通知数据 */
  notification: NotificationData
  /** 点击回调 */
  onClick?: () => void
  /** 标记已读回调 */
  onMarkRead?: () => void
  /** 删除回调 */
  onDelete?: () => void
  /** 动作按钮点击回调 */
  onActionClick?: (action: NotificationAction) => void
  /** 是否紧凑模式 */
  compact?: boolean
  /** 自定义样式 */
  className?: string
}

export function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onDelete,
  onActionClick,
  compact = false,
  className,
}: NotificationItemProps) {
  const priorityConfig = PRIORITY_CONFIG[notification.priority]
  const categoryConfig = CATEGORY_CONFIG[notification.category]
  const isUrgent = isUrgentNotification(notification)

  // 格式化时间
  const timeAgo = useMemo(() => {
    const now = Date.now()
    const diff = now - notification.createdAt
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(notification.createdAt).toLocaleDateString('zh-CN')
  }, [notification.createdAt])

  return (
    <div
      className={cn(
        'p-4 border-b last:border-b-0 transition-colors',
        !notification.read && 'bg-primary/5',
        isUrgent && 'border-l-4 border-l-red-500',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg',
            isUrgent ? 'bg-red-500/20' : 'bg-muted'
          )}
        >
          {priorityConfig.icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              'font-medium text-sm truncate',
              !notification.read && 'font-semibold'
            )}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>

          {/* 消息内容 */}
          {!compact && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {notification.message}
            </p>
          )}

          {/* 标签和时间 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs h-5">
              {categoryConfig.icon} {categoryConfig.label}
            </Badge>
            {notification.priority !== 'normal' && notification.priority !== 'low' && (
              <Badge
                variant={isUrgent ? 'destructive' : 'secondary'}
                className="text-xs h-5"
              >
                {priorityConfig.label}
              </Badge>
            )}
            <span className="ml-auto">{timeAgo}</span>
          </div>

          {/* 动作按钮 */}
          {!compact && notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {notification.actions.map((action) => (
                <Button
                  key={action.id}
                  variant={
                    action.type === 'primary'
                      ? 'default'
                      : action.type === 'destructive'
                      ? 'destructive'
                      : 'outline'
                  }
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(action)
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {!notification.read && onMarkRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead()
              }}
              title="标记已读"
            >
              ✓
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="删除"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationItem
