'use client'

import { AnimatePresence,motion } from 'framer-motion'
import { AlertTriangle, Loader2,  XCircle } from 'lucide-react'
import React, { useCallback,useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'
import { useSafetyStore } from '@/store/safety'

import { KillSwitchModal } from './KillSwitchModal'

interface KillSwitchProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

/**
 * Kill Switch Component
 * V3 Design Document: S30 - Emergency Stop Mechanism
 *
 * Provides one-click emergency stop for all trading activities.
 * Features:
 * - Global visibility in Header
 * - Long-press confirmation to prevent accidental triggers
 * - Visual feedback during trigger
 * - Cooldown period after activation
 */
export function KillSwitch({
  className,
  size = 'md',
  showLabel = false,
}: KillSwitchProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const killSwitchStatus = useSafetyStore((state) => state.status.killSwitch)
  const config = useSafetyStore((state) => state.config.killSwitch)

  // Get active agent count for display
  const agents = useAgentStore((state) => state.agents)
  const activeAgents = agents.filter(
    (a) => a.status === 'live' || a.status === 'paper'
  ).length

  const isReady = killSwitchStatus.status === 'ready'
  const isTriggered = killSwitchStatus.status === 'triggered'
  const isCooldown = killSwitchStatus.status === 'cooldown'

  // Size variants
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }

  // Handle long press start
  const handlePressStart = useCallback(() => {
    if (!isReady || activeAgents === 0) return

    setIsPressing(true)
    setPressProgress(0)

    const startTime = Date.now()
    const duration = config.longPressDuration

    // Update progress
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      setPressProgress(progress)
    }, 16) // ~60fps

    // Trigger after long press duration
    pressTimerRef.current = setTimeout(() => {
      setIsPressing(false)
      setPressProgress(0)
      setIsModalOpen(true)
    }, duration)
  }, [isReady, activeAgents, config.longPressDuration])

  // Handle press end (cancel if not complete)
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

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  // Handle click for non-long-press mode
  const handleClick = () => {
    if (config.confirmMethod === 'doubleClick') {
      // For double click mode, just open modal directly
      if (isReady && activeAgents > 0) {
        setIsModalOpen(true)
      }
    }
    // For long press mode, click does nothing (handled by press events)
  }

  return (
    <>
      <div className={cn('relative', className)}>
        {/* Progress ring for long press */}
        <AnimatePresence>
          {isPressing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 -m-1"
            >
              <svg
                className="w-full h-full -rotate-90"
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
          onClick={handleClick}
          {...(config.confirmMethod === 'longPress' ? {
            onMouseDown: handlePressStart,
            onMouseUp: handlePressEnd,
            onMouseLeave: handlePressEnd,
            onTouchStart: handlePressStart,
            onTouchEnd: handlePressEnd,
          } : {})}
          {...(isReady && activeAgents > 0 ? { whileTap: { scale: 0.95 } } : {})}
          className={cn(
            'relative flex items-center justify-center rounded-lg',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-red-500/50',
            sizeClasses[size],
            // Ready state
            isReady && activeAgents > 0 && [
              'bg-red-500/10 hover:bg-red-500/20',
              'text-red-500 hover:text-red-400',
              'cursor-pointer',
            ],
            // Disabled state (no active agents)
            isReady && activeAgents === 0 && [
              'bg-muted/50 text-muted-foreground/50',
              'cursor-not-allowed',
            ],
            // Triggered state
            isTriggered && [
              'bg-red-500 text-white',
              'animate-pulse',
            ],
            // Cooldown state
            isCooldown && [
              'bg-amber-500/20 text-amber-500',
              'cursor-not-allowed',
            ],
            // Pressing state
            isPressing && [
              'bg-red-500/30',
              'ring-2 ring-red-500',
            ]
          )}
          title={
            !isReady
              ? 'Kill Switch is not ready'
              : activeAgents === 0
                ? 'No active strategies'
                : 'Long press to emergency stop all'
          }
        >
          {/* Icon */}
          {isTriggered ? (
            <Loader2 className="animate-spin" size={iconSizes[size]} />
          ) : isCooldown ? (
            <AlertTriangle size={iconSizes[size]} />
          ) : (
            <XCircle size={iconSizes[size]} />
          )}
        </motion.button>

        {/* Optional label */}
        {showLabel && (
          <span
            className={cn(
              'ml-2 text-xs font-medium',
              isReady && activeAgents > 0 && 'text-red-500',
              (!isReady || activeAgents === 0) && 'text-muted-foreground'
            )}
          >
            {isTriggered
              ? 'Stopping...'
              : isCooldown
                ? 'Cooldown'
                : `STOP (${activeAgents})`}
          </span>
        )}

        {/* Active indicator dot */}
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
        pendingOrders={0} // TODO: Get from order store
      />
    </>
  )
}

export default KillSwitch
