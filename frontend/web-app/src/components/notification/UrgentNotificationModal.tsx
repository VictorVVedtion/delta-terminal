/**
 * UrgentNotificationModal - 紧急通知弹窗
 *
 * @module S61 紧急通知渠道
 *
 * 全屏遮罩弹窗，用于显示需要立即确认的紧急通知
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import type { UrgentNotification, NotificationAction } from '@/types/notification'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '@/types/notification'

export interface UrgentNotificationModalProps {
  /** 紧急通知 */
  notification: UrgentNotification | null
  /** 确认回调 */
  onAcknowledge: (id: string) => void
  /** 动作点击回调 */
  onActionClick?: (notification: UrgentNotification, action: NotificationAction) => void
  /** 是否显示倒计时 */
  showCountdown?: boolean
  /** 自定义样式 */
  className?: string
}

export function UrgentNotificationModal({
  notification,
  onAcknowledge,
  onActionClick,
  showCountdown = true,
  className,
}: UrgentNotificationModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null)

  // 初始化倒计时
  useEffect(() => {
    if (!notification || !notification.timeoutSeconds) {
      setCountdown(null)
      return
    }
    setCountdown(notification.timeoutSeconds)
  }, [notification])

  // 倒计时逻辑
  useEffect(() => {
    if (countdown === null || countdown <= 0 || !notification) return

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, notification])

  // 倒计时结束处理
  useEffect(() => {
    if (countdown !== 0 || !notification) return

    switch (notification.timeoutAction) {
      case 'auto_acknowledge':
        onAcknowledge(notification.id)
        break
      case 'auto_dismiss':
        onAcknowledge(notification.id)
        break
      case 'escalate':
        // TODO: 升级处理逻辑
        break
    }
  }, [countdown, notification, onAcknowledge])

  // 处理确认
  const handleAcknowledge = useCallback(() => {
    if (notification) {
      onAcknowledge(notification.id)
    }
  }, [notification, onAcknowledge])

  if (!notification) return null

  const priorityConfig = PRIORITY_CONFIG[notification.priority]
  const categoryConfig = CATEGORY_CONFIG[notification.category]
  const isCritical = notification.priority === 'critical'

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/60 backdrop-blur-sm',
        isCritical && 'animate-pulse-slow',
        className
      )}
    >
      <Card
        className={cn(
          'w-full max-w-md shadow-2xl',
          isCritical
            ? 'border-red-500 border-2 shadow-red-500/20'
            : 'border-orange-500 border-2 shadow-orange-500/20'
        )}
      >
        <CardHeader
          className={cn(
            'pb-2',
            isCritical ? 'bg-red-500/10' : 'bg-orange-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">
                {priorityConfig.icon}
              </span>
              <div>
                <span className="text-xs text-muted-foreground block">
                  {categoryConfig.label}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: priorityConfig.color }}
                >
                  {priorityConfig.label}通知
                </span>
              </div>
            </div>
            {showCountdown && countdown !== null && countdown > 0 && (
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
                  isCritical ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                )}
              >
                {countdown}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <CardTitle className="text-lg">
            {notification.title}
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>

          {/* 额外信息 */}
          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              {Object.entries(notification.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 动作按钮 */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex flex-col gap-2">
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
                  className="w-full"
                  onClick={() => onActionClick?.(notification, action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end gap-2 pt-0">
          <Button
            variant={isCritical ? 'destructive' : 'default'}
            onClick={handleAcknowledge}
            className="min-w-[100px]"
          >
            {countdown !== null && countdown > 0 ? `知道了 (${countdown}s)` : '知道了'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default UrgentNotificationModal
