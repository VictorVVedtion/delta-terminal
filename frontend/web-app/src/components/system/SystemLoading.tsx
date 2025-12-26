'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function SystemLoading({ 
  message = "INITIALIZING SYSTEM...", 
  onComplete 
}: { 
  message?: string
  onComplete?: () => void 
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          onComplete?.()
          return 100
        }
        return prev + 2
      })
    }, 20)
    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 border-4 border-[hsl(var(--rb-cyan))] rounded-full opacity-20"
        />
        <motion.div
          className="absolute inset-0 border-4 border-t-[hsl(var(--rb-cyan))] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[hsl(var(--rb-cyan))]">
          {progress}%
        </div>
      </div>
      
      <div className="space-y-1 text-center">
        <h3 className="text-sm font-medium tracking-widest text-[hsl(var(--rb-cyan))] animate-pulse">
          {message}
        </h3>
        <p className="text-[10px] text-muted-foreground font-mono">
          ESTABLISHING NEURAL LINK...
        </p>
      </div>
    </div>
  )
}
