/**
 * Notification Store - 通知状态管理
 * Story 5.2: NotificationCenter 通知中心
 *
 * 管理历史通知，支持持久化存储
 */

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  /** 唯一标识 */
  id: string
  /** 通知类型 */
  type: NotificationType
  /** 标题 */
  title: string
  /** 描述 */
  description?: string
  /** 时间戳 */
  timestamp: number
  /** 是否已读 */
  read: boolean
  /** 来源组件 */
  source?: string
  /** 点击跳转 URL */
  actionUrl?: string
}

interface NotificationState {
  /** 通知列表 */
  notifications: Notification[]

  // Actions
  /** 添加通知 */
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ) => void
  /** 标记单个已读 */
  markAsRead: (id: string) => void
  /** 标记全部已读 */
  markAllAsRead: () => void
  /** 删除单个通知 */
  removeNotification: (id: string) => void
  /** 清空所有通知 */
  clearAll: () => void

  // Computed (as functions since zustand doesn't have getters)
  /** 获取未读数量 */
  getUnreadCount: () => number
  /** 获取按日期分组的通知 */
  getGroupedNotifications: () => {
    today: Notification[]
    yesterday: Notification[]
    earlier: Notification[]
  }
}

// =============================================================================
// Constants
// =============================================================================

/** 最大保留通知数量 */
const MAX_NOTIFICATIONS = 100

// =============================================================================
// Store
// =============================================================================

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        notifications: [],

        addNotification: (notification) =>
          set(
            (state) => ({
              notifications: [
                {
                  ...notification,
                  id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  timestamp: Date.now(),
                  read: false,
                },
                ...state.notifications,
              ].slice(0, MAX_NOTIFICATIONS),
            }),
            false,
            'notification/add'
          ),

        markAsRead: (id) =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              ),
            }),
            false,
            'notification/markAsRead'
          ),

        markAllAsRead: () =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({
                ...n,
                read: true,
              })),
            }),
            false,
            'notification/markAllAsRead'
          ),

        removeNotification: (id) =>
          set(
            (state) => ({
              notifications: state.notifications.filter((n) => n.id !== id),
            }),
            false,
            'notification/remove'
          ),

        clearAll: () =>
          set({ notifications: [] }, false, 'notification/clearAll'),

        getUnreadCount: () => {
          return get().notifications.filter((n) => !n.read).length
        },

        getGroupedNotifications: () => {
          const { notifications } = get()

          const now = new Date()
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).getTime()

          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

          return {
            today: notifications.filter((n) => n.timestamp >= todayStart),
            yesterday: notifications.filter(
              (n) => n.timestamp >= yesterdayStart && n.timestamp < todayStart
            ),
            earlier: notifications.filter((n) => n.timestamp < yesterdayStart),
          }
        },
      }),
      {
        name: 'delta-notifications',
        partialize: (state) => ({
          notifications: state.notifications.slice(0, 50), // 持久化时只保留最近 50 条
        }),
      }
    ),
    { name: 'NotificationStore' }
  )
)

// =============================================================================
// Export
// =============================================================================

export default useNotificationStore
