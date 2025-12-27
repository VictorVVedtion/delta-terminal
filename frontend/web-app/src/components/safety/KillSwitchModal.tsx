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
import { useNotificationStore } from '@/store/notification'
import { useSafetyStore } from '@/store/safety'
import type { KillSwitchResult } from '@/types/safety'

interface KillSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  activeStrategies: number
  pendingOrders: number
}

type ModalStep = 'confirm' | 'executing' | 'success' | 'error'

/**
 * Kill Switch Confirmation Modal
 * V3 Design Document: S30 - Emergency Stop Mechanism
 *
 * Provides secondary confirmation before executing emergency stop.
 * Features:
 * - Long-press to confirm (prevents accidental triggers)
 * - Optional close all positions
 * - Execution feedback
 * - Result summary
 */
export function KillSwitchModal({
  isOpen,
  onClose,
  activeStrategies,
  pendingOrders,
}: KillSwitchModalProps) {
  const [step, setStep] = useState<ModalStep>('confirm')
  const [closePositions, setClosePositions] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)
  const [result, setResult] = useState<KillSwitchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const triggerKillSwitch = useSafetyStore((state) => state.triggerKillSwitch)
  const config = useSafetyStore((state) => state.config.killSwitch)
  const addNotification = useNotificationStore((state) => state.addNotification)

  const CONFIRM_DURATION = 3000 // 3 seconds

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('confirm')
      setClosePositions(config.closePositionsDefault)
      setResult(null)
      setError(null)
      setPressProgress(0)
      setIsPressing(false)
    }
  }, [isOpen, config.closePositionsDefault])

  // Handle long press start
  const handlePressStart = useCallback(() => {
    if (step !== 'confirm') return

    setIsPressing(true)
    setPressProgress(0)

    const startTime = Date.now()

    // Update progress
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / CONFIRM_DURATION) * 100, 100)
      setPressProgress(progress)
    }, 16)

    // Execute after duration
    pressTimerRef.current = setTimeout(() => {
      void handleExecute()
    }, CONFIRM_DURATION)
  }, [step])

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

  // Execute kill switch
  const handleExecute = async () => {
    handlePressEnd()
    setStep('executing')

    try {
      const execResult = await triggerKillSwitch(closePositions)
      setResult(execResult)

      if (execResult.success) {
        setStep('success')
        addNotification({
          type: 'warning',
          title: 'Emergency Stop Executed',
          description: `Stopped ${execResult.stoppedStrategies} strategies, cancelled ${execResult.cancelledOrders} orders`,
          source: 'kill-switch',
        })
      } else {
        setStep('error')
        setError('Some operations failed. Check the details.')
      }
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      addNotification({
        type: 'error',
        title: 'Kill Switch Failed',
        description: 'Failed to execute emergency stop',
        source: 'kill-switch',
      })
    }
  }

  // Cleanup on unmount
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
                  Emergency Stop Confirmation
                </h2>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {step === 'confirm' && (
                <div className="space-y-4">
                  {/* Actions summary */}
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      The following actions will be executed:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Square className="w-3 h-3 text-red-500" />
                        Stop all running strategies ({activeStrategies})
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-red-500" />
                        Cancel all pending orders ({pendingOrders})
                      </li>
                    </ul>
                  </div>

                  {/* Close positions option */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <Checkbox
                      checked={closePositions}
                      onCheckedChange={(checked) => { setClosePositions(!!checked); }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Close all positions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Market sell all open positions immediately
                      </p>
                    </div>
                  </label>

                  {/* Warning */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-500">
                      This will immediately halt all trading activity. Strategies will
                      need to be manually restarted.
                    </p>
                  </div>

                  {/* Confirm button with long press */}
                  <div className="relative">
                    <Button
                      variant="destructive"
                      size="lg"
                      className={cn(
                        'w-full h-14 relative overflow-hidden',
                        'transition-all duration-200',
                        isPressing && 'ring-2 ring-red-400 ring-offset-2 ring-offset-background'
                      )}
                      onMouseDown={handlePressStart}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={handlePressStart}
                      onTouchEnd={handlePressEnd}
                    >
                      {/* Progress fill */}
                      <motion.div
                        className="absolute inset-0 bg-red-400/30"
                        initial={{ width: 0 }}
                        animate={{ width: `${pressProgress}%` }}
                        transition={{ duration: 0.05 }}
                      />

                      {/* Content */}
                      <span className="relative flex items-center gap-2">
                        <StopCircle className="w-5 h-5" />
                        {isPressing ? (
                          <span className="tabular-nums">
                            Hold... {Math.ceil((CONFIRM_DURATION - pressProgress * CONFIRM_DURATION / 100) / 1000)}s
                          </span>
                        ) : (
                          'Long press to confirm (3s)'
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
                    Executing Emergency Stop...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stopping all strategies and cancelling orders
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
                      Emergency Stop Complete
                    </p>
                  </div>

                  {/* Results summary */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Strategies stopped:</span>
                      <span className="font-medium">{result.stoppedStrategies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders cancelled:</span>
                      <span className="font-medium">{result.cancelledOrders}</span>
                    </div>
                    {closePositions && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Positions closed:</span>
                        <span className="font-medium">{result.closedPositions}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">Execution time:</span>
                      <span className="font-medium">{result.executionTime}ms</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onClose}
                  >
                    Close
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
                      Execution Failed
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={onClose}
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => { setStep('confirm'); }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel button (only in confirm step) */}
            {step === 'confirm' && (
              <div className="p-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default KillSwitchModal
