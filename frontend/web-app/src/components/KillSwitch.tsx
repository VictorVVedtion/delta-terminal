'use client'

import React from 'react'
import { AlertCircle, Power } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api'
import { useStrategyStore } from '@/store'
import { notify } from '@/lib/notification'

/**
 * KillSwitch - 紧急全局停止按钮
 *
 * 功能:
 * - 取消所有挂单
 * - 平所有持仓
 * - 暂停所有运行中的策略
 * - 记录操作日志
 *
 * 位置: Header 右侧状态栏
 * 设计: RiverBit 红色警告色 (--rb-red)
 */
export function KillSwitch() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isExecuting, setIsExecuting] = React.useState(false)
  const { strategies, updateStrategy } = useStrategyStore()

  /**
   * 执行紧急停止操作
   */
  const handleEmergencyStop = async () => {
    setIsExecuting(true)

    try {
      // 1. 取消所有挂单
      console.log('[KillSwitch] 取消所有挂单...')
      await apiClient.cancelAllOrders()

      // 2. 平所有持仓
      console.log('[KillSwitch] 平所有持仓...')
      await apiClient.closeAllPositions()

      // 3. 暂停所有运行中的策略
      console.log('[KillSwitch] 暂停所有策略...')
      const runningStrategies = strategies.filter(s => s.status === 'running')
      await Promise.all(
        runningStrategies.map(async (strategy) => {
          await apiClient.stopStrategy(strategy.id)
          updateStrategy(strategy.id, { status: 'paused' })
        })
      )

      // 4. 记录操作日志
      console.log('[KillSwitch] 记录操作日志...')
      await apiClient.logKillSwitchEvent({
        timestamp: new Date().toISOString(),
        cancelledOrders: await apiClient.getActiveOrdersCount(),
        closedPositions: await apiClient.getOpenPositionsCount(),
        stoppedStrategies: runningStrategies.length,
      })

      console.log('[KillSwitch] 紧急停止完成')

      // 关闭对话框
      setIsOpen(false)

      // 显示成功通知
      notify('success', '紧急停止已执行', {
        description: `已取消 ${await apiClient.getActiveOrdersCount()} 个挂单，平仓 ${await apiClient.getOpenPositionsCount()} 个持仓，暂停 ${runningStrategies.length} 个策略`,
        source: 'KillSwitch',
      })
    } catch (error) {
      console.error('[KillSwitch] 执行失败:', error)
      notify('error', '紧急停止执行失败', {
        description: '请手动检查账户状态',
        source: 'KillSwitch',
        action: {
          label: '重试',
          onClick: () => handleEmergencyStop(),
        },
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold"
          title="紧急全局停止"
        >
          <Power className="h-4 w-4" />
          <span className="hidden md:inline">紧急停止</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              确认紧急停止?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4 text-base leading-relaxed">
            此操作将立即执行以下动作:
            <ul className="mt-3 space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>取消所有挂单</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>平所有持仓 (市价单)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>暂停所有运行中的策略</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>记录操作日志</span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              此操作不可撤销，请谨慎操作。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isExecuting}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              handleEmergencyStop()
            }}
            disabled={isExecuting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isExecuting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                执行中...
              </>
            ) : (
              '确认执行'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
