'use client'

import React from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from '@/store/notification'

// =============================================================================
// Constants
// =============================================================================

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
}

// =============================================================================
// NotificationCenter Component
// =============================================================================

export function NotificationCenter() {
  const [isOpen, setIsOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const {
    notifications,
    getUnreadCount,
    getGroupedNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore()

  const unreadCount = getUnreadCount()
  const grouped = getGroupedNotifications()

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on ESC
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        title="通知中心"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-80 sm:w-96 max-h-[70vh]',
            'bg-card border border-border rounded-lg shadow-lg',
            'flex flex-col overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium">通知中心</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} 未读
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-2"
                  title="全部标为已读"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  全部已读
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">暂无通知</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Today */}
                {grouped.today.length > 0 && (
                  <NotificationGroup
                    title="今天"
                    notifications={grouped.today}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                )}

                {/* Yesterday */}
                {grouped.yesterday.length > 0 && (
                  <NotificationGroup
                    title="昨天"
                    notifications={grouped.yesterday}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                )}

                {/* Earlier */}
                {grouped.earlier.length > 0 && (
                  <NotificationGroup
                    title="更早"
                    notifications={grouped.earlier}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-center px-4 py-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                清空所有通知
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// NotificationGroup Component
// =============================================================================

interface NotificationGroupProps {
  title: string
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onRemove: (id: string) => void
}

function NotificationGroup({
  title,
  notifications,
  onMarkAsRead,
  onRemove,
}: NotificationGroupProps) {
  return (
    <div className="px-2">
      <div className="px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="space-y-1">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// NotificationItem Component
// =============================================================================

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onRemove: (id: string) => void
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationItemProps) {
  const { id, type, title, description, timestamp, read, source } = notification
  const config = TYPE_CONFIG[type]

  const timeString = formatTime(timestamp)

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-2 rounded-md transition-colors',
        'hover:bg-muted/50',
        !read && 'bg-primary/5'
      )}
      onClick={() => !read && onMarkAsRead(id)}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          config.bgColor,
          config.color
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              !read && 'text-foreground',
              read && 'text-muted-foreground'
            )}
          >
            {title}
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {timeString}
          </span>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}

        {source && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">{source}</p>
        )}
      </div>

      {/* Unread indicator */}
      {!read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      {/* Actions (visible on hover) */}
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {!read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(id)
            }}
            title="标为已读"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(id)
          }}
          title="删除"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// =============================================================================
// Export
// =============================================================================

export default NotificationCenter
