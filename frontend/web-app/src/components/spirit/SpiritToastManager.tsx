'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSpiritStore } from '@/store/spiritStore'
import { useSpiritPreferences } from '@/store/spiritPreferences'

export function SpiritToastManager() {
  const { lastEvent } = useSpiritStore()
  const { notifications, soundEnabled } = useSpiritPreferences()
  const processedEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!lastEvent || lastEvent.id === processedEventIdRef.current) return

    processedEventIdRef.current = lastEvent.id

    // Play sound if enabled (mock)
    if (soundEnabled && lastEvent.priority !== 'p4') {
      // playSound(lastEvent.priority)
    }

    // Handle different priorities based on preferences
    switch (lastEvent.priority) {
      case 'p0': // Critical
        if (notifications.p0) {
          toast.error(lastEvent.title, {
            description: lastEvent.content,
            duration: Infinity,
            className: 'border-red-500 bg-red-950/20'
          })
        }
        break;

      case 'p1': // High
        if (notifications.p1) {
          toast.success(lastEvent.title, {
            description: lastEvent.content,
            duration: 8000,
            className: 'border-cyan-500 bg-cyan-950/20'
          })
        }
        break;

      case 'p2': // Normal
        if (notifications.p2) {
          toast.info(lastEvent.title, {
            description: lastEvent.content,
            duration: 5000
          })
        }
        break;
    }
  }, [lastEvent, notifications, soundEnabled])

  return null
}

