'use client'

import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const LOADING_STEPS = [
  'INITIALIZING SYSTEM',
  'ESTABLISHING NEURAL LINK',
  'LOADING MARKET DATA',
  'SYNCHRONIZING AGENTS',
  'READY'
]

export function SystemLoading({ 
  onComplete 
}: { 
  onComplete?: () => void 
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Total duration approx 2.5s
    const totalSteps = LOADING_STEPS.length - 1
    const stepDuration = 500
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(() => onComplete?.(), 500)
          return 100
        }
        return prev + 1
      })
    }, 25)

    const stepTimer = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= totalSteps) {
          clearInterval(stepTimer)
          return totalSteps
        }
        return prev + 1
      })
    }, stepDuration)

    return () => {
      clearInterval(timer)
      clearInterval(stepTimer)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="relative w-24 h-24 mb-8">
        {/* Logo Animation */}
        <motion.div
          className="absolute inset-0 bg-primary/20 rounded-xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180],
            borderRadius: ["20%", "50%", "20%"]
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity
          }}
        />
        <motion.div
          className="absolute inset-4 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-3xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          Δ
        </motion.div>
      </div>
      
      <div className="w-64 space-y-4">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
          <motion.div 
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {LOADING_STEPS.slice(0, -1).map((step, index) => {
            const isActive = index === currentStepIndex
            const isCompleted = index < currentStepIndex
            
            return (
              <div 
                key={step}
                className={`flex items-center gap-3 text-xs transition-colors duration-300 ${
                  isActive ? 'text-primary font-medium' : 
                  isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/30'
                }`}
              >
                <div className={`w-4 h-4 flex items-center justify-center`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </div>
                {step}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
