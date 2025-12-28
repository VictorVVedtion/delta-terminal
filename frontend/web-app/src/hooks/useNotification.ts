/**
 * Notification Hook - 通知管理 Hook
 *
 * @module S61 紧急通知渠道
 *
 * 统一管理应用内通知，支持：
 * - 通知列表管理
 * - 紧急通知弹窗
 * - 桌面通知权限
 * - 声音提醒
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type {
  NotificationData,
  UrgentNotification,
  NotificationFilter,
  NotificationStats,
  NotificationPreferences,
  NotificationCategory,
} from '@/types/notification'
import { isUrgentNotification, PRIORITY_CONFIG } from '@/types/notification'

// =============================================================================
// Default Preferences
// =============================================================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabledChannels: ['in_app', 'push'],
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'Asia/Shanghai',
  },
  categorySettings: {
    trade: { enabled: true, channels: ['in_app', 'push'], minPriority: 'normal' },
    risk_alert: { enabled: true, channels: ['in_app', 'push', 'email'], minPriority: 'low' },
    strategy: { enabled: true, channels: ['in_app'], minPriority: 'normal' },
    system: { enabled: true, channels: ['in_app'], minPriority: 'high' },
    market: { enabled: true, channels: ['in_app'], minPriority: 'high' },
    account: { enabled: true, channels: ['in_app', 'email'], minPriority: 'normal' },
  },
  alwaysAlertUrgent: true,
  soundEnabled: true,
  desktopEnabled: true,
}

// =============================================================================
// Sound Effects
// =============================================================================

const NOTIFICATION_SOUNDS = {
  normal: '/sounds/notification.mp3',
  urgent: '/sounds/urgent.mp3',
  critical: '/sounds/critical.mp3',
}

// =============================================================================
// Hook Implementation
// =============================================================================

export interface UseNotificationOptions {
  /** 初始通知列表 */
  initialNotifications?: NotificationData[]
  /** 初始偏好设置 */
  initialPreferences?: Partial<NotificationPreferences>
  /** 最大通知数量 */
  maxNotifications?: number
  /** WebSocket 连接 (用于实时通知) */
  wsConnection?: WebSocket | null
}

export interface UseNotificationResult {
  /** 所有通知 */
  notifications: NotificationData[]
  /** 未读通知数 */
  unreadCount: number
  /** 紧急通知队列 */
  urgentQueue: UrgentNotification[]
  /** 当前弹出的紧急通知 */
  currentUrgent: UrgentNotification | null
  /** 通知统计 */
  stats: NotificationStats
  /** 偏好设置 */
  preferences: NotificationPreferences
  /** 桌面通知权限状态 */
  desktopPermission: NotificationPermission | 'unsupported'

  // Actions
  /** 添加通知 */
  addNotification: (notification: Omit<NotificationData, 'id' | 'createdAt' | 'read' | 'acknowledged'>) => string
  /** 标记已读 */
  markAsRead: (id: string) => void
  /** 标记全部已读 */
  markAllAsRead: () => void
  /** 确认紧急通知 */
  acknowledgeUrgent: (id: string) => void
  /** 删除通知 */
  removeNotification: (id: string) => void
  /** 清空通知 */
  clearNotifications: (filter?: NotificationFilter) => void
  /** 更新偏好设置 */
  updatePreferences: (updates: Partial<NotificationPreferences>) => void
  /** 请求桌面通知权限 */
  requestDesktopPermission: () => Promise<NotificationPermission>
  /** 发送桌面通知 */
  sendDesktopNotification: (title: string, options?: NotificationOptions) => void
  /** 播放提示音 */
  playSound: (type: 'normal' | 'urgent' | 'critical') => void
  /** 根据筛选条件获取通知 */
  getFilteredNotifications: (filter: NotificationFilter) => NotificationData[]
}

/**
 * 通知管理 Hook
 */
export function useNotification(options: UseNotificationOptions = {}): UseNotificationResult {
  const {
    initialNotifications = [],
    initialPreferences = {},
    maxNotifications = 100,
  } = options

  // State
  const [notifications, setNotifications] = useState<NotificationData[]>(initialNotifications)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ...DEFAULT_PREFERENCES,
    ...initialPreferences,
  })
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>('default')

  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 检查桌面通知权限
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopPermission(Notification.permission)
    } else {
      setDesktopPermission('unsupported')
    }
  }, [])

  // 紧急通知队列
  const urgentQueue = useMemo<UrgentNotification[]>(() => {
    return notifications.filter(
      (n): n is UrgentNotification => isUrgentNotification(n) && !n.acknowledged
    ).sort((a, b) => {
      // critical 优先于 urgent
      if (a.priority === 'critical' && b.priority !== 'critical') return -1
      if (b.priority === 'critical' && a.priority !== 'critical') return 1
      return b.createdAt - a.createdAt
    })
  }, [notifications])

  // 当前紧急通知
  const currentUrgent = useMemo<UrgentNotification | null>(() => {
    return urgentQueue[0] || null
  }, [urgentQueue])

  // 未读数量
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  // 统计数据
  const stats = useMemo<NotificationStats>(() => {
    const byCategory = {} as Record<NotificationCategory, number>
    const categories: NotificationCategory[] = ['trade', 'risk_alert', 'strategy', 'system', 'market', 'account']
    categories.forEach((cat) => {
      byCategory[cat] = notifications.filter((n) => n.category === cat).length
    })

    return {
      total: notifications.length,
      unread: unreadCount,
      urgent: urgentQueue.length,
      byCategory,
    }
  }, [notifications, unreadCount, urgentQueue.length])

  // 生成通知ID
  const generateId = useCallback(() => {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // 播放声音
  const playSound = useCallback((type: 'normal' | 'urgent' | 'critical') => {
    if (!preferences.soundEnabled) return

    try {
      const soundPath = NOTIFICATION_SOUNDS[type]
      if (audioRef.current) {
        audioRef.current.src = soundPath
        audioRef.current.play().catch(() => {
          // 忽略自动播放限制错误
        })
      } else if (typeof window !== 'undefined') {
        const audio = new Audio(soundPath)
        audioRef.current = audio
        audio.play().catch(() => {})
      }
    } catch {
      // 忽略音频播放错误
    }
  }, [preferences.soundEnabled])

  // 发送桌面通知
  const sendDesktopNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (desktopPermission !== 'granted' || !preferences.desktopEnabled) return

    try {
      new Notification(title, {
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        ...options,
      })
    } catch {
      // 忽略桌面通知错误
    }
  }, [desktopPermission, preferences.desktopEnabled])

  // 添加通知
  const addNotification = useCallback((
    notificationData: Omit<NotificationData, 'id' | 'createdAt' | 'read' | 'acknowledged'>
  ): string => {
    const id = generateId()
    const notification: NotificationData = {
      ...notificationData,
      id,
      createdAt: Date.now(),
      read: false,
      acknowledged: false,
    }

    setNotifications((prev) => {
      const updated = [notification, ...prev]
      // 限制数量
      if (updated.length > maxNotifications) {
        return updated.slice(0, maxNotifications)
      }
      return updated
    })

    // 紧急通知特殊处理
    if (isUrgentNotification(notification)) {
      const urgentNotif = notification as UrgentNotification
      if (urgentNotif.priority === 'critical') {
        playSound('critical')
      } else {
        playSound('urgent')
      }

      if (preferences.alwaysAlertUrgent) {
        sendDesktopNotification(notification.title, {
          body: notification.message,
          requireInteraction: true,
          tag: notification.id,
        })
      }
    } else if (notification.priority === 'high') {
      playSound('normal')
      sendDesktopNotification(notification.title, {
        body: notification.message,
        tag: notification.id,
      })
    }

    return id
  }, [generateId, maxNotifications, playSound, sendDesktopNotification, preferences.alwaysAlertUrgent])

  // 标记已读
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // 标记全部已读
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // 确认紧急通知
  const acknowledgeUrgent = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, acknowledged: true, read: true } : n))
    )
  }, [])

  // 删除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 清空通知
  const clearNotifications = useCallback((filter?: NotificationFilter) => {
    if (!filter) {
      setNotifications([])
      return
    }

    setNotifications((prev) =>
      prev.filter((n) => {
        if (filter.categories && !filter.categories.includes(n.category)) return true
        if (filter.priorities && !filter.priorities.includes(n.priority)) return true
        if (filter.read !== undefined && n.read !== filter.read) return true
        if (filter.acknowledged !== undefined && n.acknowledged !== filter.acknowledged) return true
        if (filter.startDate && n.createdAt < filter.startDate) return true
        if (filter.endDate && n.createdAt > filter.endDate) return true
        return false
      })
    )
  }, [])

  // 更新偏好
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }, [])

  // 请求桌面通知权限
  const requestDesktopPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    setDesktopPermission(permission)
    return permission
  }, [])

  // 筛选通知
  const getFilteredNotifications = useCallback((filter: NotificationFilter): NotificationData[] => {
    return notifications.filter((n) => {
      if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(n.category)) {
        return false
      }
      if (filter.priorities && filter.priorities.length > 0 && !filter.priorities.includes(n.priority)) {
        return false
      }
      if (filter.read !== undefined && n.read !== filter.read) {
        return false
      }
      if (filter.acknowledged !== undefined && n.acknowledged !== filter.acknowledged) {
        return false
      }
      if (filter.startDate && n.createdAt < filter.startDate) {
        return false
      }
      if (filter.endDate && n.createdAt > filter.endDate) {
        return false
      }
      return true
    })
  }, [notifications])

  return {
    notifications,
    unreadCount,
    urgentQueue,
    currentUrgent,
    stats,
    preferences,
    desktopPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    acknowledgeUrgent,
    removeNotification,
    clearNotifications,
    updatePreferences,
    requestDesktopPermission,
    sendDesktopNotification,
    playSound,
    getFilteredNotifications,
  }
}

export default useNotification
