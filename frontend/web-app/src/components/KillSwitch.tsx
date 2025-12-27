'use client'

import { AnimatePresence,motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Square,
  StopCircle,
  XCircle,
} from 'lucide-react'
import React, { useCallback, useEffect,useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'
import { useNotificationStore } from '@/store/notification'

/**
 * KillSwitch - 紧急全局停止按钮 (增强版)
 * V3 Design Document: S30 - Emergency Stop Mechanism
 *
 * 功能:
 * - 长按确认防止误触
 * - 取消所有挂单
 * - 平所有持仓 (可选)
 * - 暂停所有运行中的策略
 * - 记录操作日志
 *
 * 位置: Header 右侧状态栏
 */

interface KillSwitchResult {
  success: boolean
  stoppedStrategies: number
  cancelledOrders: number
  closedPositions: number
  executionTime: number
}

type KillSwitchStatus = 'ready' | 'triggered' | 'cooldown'
type ModalStep = 'confirm' | 'executing' | 'success' | 'error'

const LONG_PRESS_DURATION = 3000 // 3 seconds
const COOLDOWN_DURATION = 5000 // 5 seconds

export function KillSwitch() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)
  const [status, setStatus] = useState<KillSwitchStatus>('ready')

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const agents = useAgentStore((state) => state.agents)
  const activeAgents = agents.filter(
    (a) => a.status === 'live' || a.status === 'paper'
  ).length

  const isReady = status === 'ready'

  // Handle long press start
  const handlePressStart = useCallback(() => {
    if (!isReady || activeAgents === 0) return

    setIsPressing(true)
    setPressProgress(0)

    const startTime = Date.now()

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100)
      setPressProgress(progress)
    }, 16)

    pressTimerRef.current = setTimeout(() => {
      setIsPressing(false)
      setPressProgress(0)
      setIsModalOpen(true)
    }, LONG_PRESS_DURATION)
  }, [isReady, activeAgents])

  // Handle press end
  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setIsPressing(false)
    setPressProgress(0)
  }, [])

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  return (
    <>
      <div className="relative">
        {/* Progress ring */}
        <AnimatePresence>
          {isPressing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 -m-1"
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="16"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="18" cy="18" r="16"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeDasharray={`${pressProgress} 100`}
                  className="text-red-500 transition-all duration-75"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          type="button"
          disabled={!isReady || activeAgents === 0}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          {...(isReady && activeAgents > 0 ? { whileTap: { scale: 0.95 } } : {})}
          className={cn(
            'relative flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-sm font-medium transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-red-500/50',
            isReady && activeAgents > 0 && [
              'bg-red-500/10 hover:bg-red-500/20',
              'text-red-500 hover:text-red-400',
              'cursor-pointer',
            ],
            isReady && activeAgents === 0 && [
              'bg-muted/50 text-muted-foreground/50',
              'cursor-not-allowed',
            ],
            status === 'triggered' && [
              'bg-red-500 text-white animate-pulse',
            ],
            status === 'cooldown' && [
              'bg-amber-500/20 text-amber-500 cursor-not-allowed',
            ],
            isPressing && 'bg-red-500/30 ring-2 ring-red-500'
          )}
          title={
            !isReady
              ? 'Kill Switch is not ready'
              : activeAgents === 0
                ? 'No active strategies'
                : 'Long press to emergency stop all'
          }
        >
          <StopCircle className="w-4 h-4" />
          <span className="hidden md:inline">
            {status === 'triggered'
              ? 'Stopping...'
              : status === 'cooldown'
                ? 'Cooldown'
                : '紧急停止'}
          </span>
        </motion.button>

        {/* Active indicator */}
        {isReady && activeAgents > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </div>

      {/* Confirmation Modal */}
      <KillSwitchModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); }}
        activeStrategies={activeAgents}
        pendingOrders={0}
        onStatusChange={setStatus}
      />
    </>
  )
}

// ============================================================================
// Kill Switch Modal Component
// ============================================================================

interface KillSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  activeStrategies: number
  pendingOrders: number
  onStatusChange: (status: KillSwitchStatus) => void
}

function KillSwitchModal({
  isOpen,
  onClose,
  activeStrategies,
  pendingOrders,
  onStatusChange,
}: KillSwitchModalProps) {
  const [step, setStep] = useState<ModalStep>('confirm')
  const [closePositions, setClosePositions] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)
  const [result, setResult] = useState<KillSwitchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const updateAgent = useAgentStore((state) => state.updateAgent)
  const agents = useAgentStore((state) => state.agents)
  const addNotification = useNotificationStore((state) => state.addNotification)

  const CONFIRM_DURATION = 3000

  useEffect(() => {
    if (isOpen) {
      setStep('confirm')
      setClosePositions(false)
      setResult(null)
      setError(null)
      setPressProgress(0)
      setIsPressing(false)
    }
  }, [isOpen])

  const handlePressStart = useCallback(() => {
    if (step !== 'confirm') return

    setIsPressing(true)
    setPressProgress(0)

    const startTime = Date.now()

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / CONFIRM_DURATION) * 100, 100)
      setPressProgress(progress)
    }, 16)

    pressTimerRef.current = setTimeout(() => {
      handleExecute()
    }, CONFIRM_DURATION)
  }, [step])

  const handlePressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setIsPressing(false)
    setPressProgress(0)
  }, [])

  const handleExecute = () => {
    handlePressEnd()
    setStep('executing')
    onStatusChange('triggered')

    const startTime = Date.now()

    try {
      // Stop all running agents
      const runningAgents = agents.filter(
        (a) => a.status === 'live' || a.status === 'paper'
      )

      for (const agent of runningAgents) {
        updateAgent(agent.id, { status: 'stopped' })
      }

      // TODO: Call API to cancel orders and close positions
      // await apiClient.cancelAllOrders()
      // if (closePositions) await apiClient.closeAllPositions()

      const execResult: KillSwitchResult = {
        success: true,
        stoppedStrategies: runningAgents.length,
        cancelledOrders: pendingOrders,
        closedPositions: closePositions ? 0 : 0,
        executionTime: Date.now() - startTime,
      }

      setResult(execResult)
      setStep('success')

      addNotification({
        type: 'warning',
        title: '紧急停止已执行',
        description: `已停止 ${execResult.stoppedStrategies} 个策略`,
        source: 'kill-switch',
      })

      // Set cooldown
      setTimeout(() => {
        onStatusChange('ready')
      }, COOLDOWN_DURATION)
      onStatusChange('cooldown')
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      onStatusChange('ready')

      addNotification({
        type: 'error',
        title: '紧急停止失败',
        description: '请手动检查账户状态',
        source: 'kill-switch',
      })
    }
  }

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80"
            onClick={step === 'confirm' ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md rounded-xl',
              'bg-background border border-red-500/30',
              'shadow-2xl shadow-red-500/10'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  紧急停止确认
                </h2>
                <p className="text-sm text-muted-foreground">
                  此操作不可撤销
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      即将执行以下操作:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Square className="w-3 h-3 text-red-500" />
                        停止所有运行中的策略 ({activeStrategies})
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-red-500" />
                        取消所有挂单 ({pendingOrders})
                      </li>
                    </ul>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <Checkbox
                      checked={closePositions}
                      onCheckedChange={(checked) => { setClosePositions(!!checked); }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        平仓所有持仓
                      </p>
                      <p className="text-xs text-muted-foreground">
                        以市价立即卖出所有持仓
                      </p>
                    </div>
                  </label>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-500">
                      此操作将立即停止所有交易活动，策略需要手动重启。
                    </p>
                  </div>

                  <div className="relative">
                    <Button
                      variant="destructive"
                      size="lg"
                      className={cn(
                        'w-full h-14 relative overflow-hidden',
                        isPressing && 'ring-2 ring-red-400 ring-offset-2 ring-offset-background'
                      )}
                      onMouseDown={handlePressStart}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={handlePressStart}
                      onTouchEnd={handlePressEnd}
                    >
                      <motion.div
                        className="absolute inset-0 bg-red-400/30"
                        initial={{ width: 0 }}
                        animate={{ width: `${pressProgress}%` }}
                        transition={{ duration: 0.05 }}
                      />
                      <span className="relative flex items-center gap-2">
                        <StopCircle className="w-5 h-5" />
                        {isPressing ? (
                          <span className="tabular-nums">
                            按住... {Math.ceil((CONFIRM_DURATION - pressProgress * CONFIRM_DURATION / 100) / 1000)}s
                          </span>
                        ) : (
                          '长按 3 秒确认停止'
                        )}
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {step === 'executing' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
                  <p className="text-lg font-medium text-foreground">
                    正在执行紧急停止...
                  </p>
                </div>
              )}

              {step === 'success' && result && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      紧急停止完成
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">停止策略:</span>
                      <span className="font-medium">{result.stoppedStrategies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">取消订单:</span>
                      <span className="font-medium">{result.cancelledOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">执行时间:</span>
                      <span className="font-medium">{result.executionTime}ms</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={onClose}>
                    关闭
                  </Button>
                </div>
              )}

              {step === 'error' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      执行失败
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                      关闭
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => { setStep('confirm'); }}
                    >
                      重试
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {step === 'confirm' && (
              <div className="p-4 border-t border-border">
                <Button variant="ghost" className="w-full" onClick={onClose}>
                  取消
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default KillSwitch
