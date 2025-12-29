'use client'

import React from 'react'
import { Activity, Radio, AlertTriangle } from 'lucide-react'
import { useSpiritStore } from '@/store/spiritStore'
import { cn } from '@/lib/utils'

export function SpiritStatusBar() {
  const { currentState, lastEvent, lastHeartbeat } = useSpiritStore()
  
  // Calculate latency (mock for now, or based on timestamp diff)
  const latency = lastEvent ? Date.now() - lastEvent.timestamp : 0
  const isAlive = Date.now() - lastHeartbeat < 15000

  const getStatusColor = () => {
    switch (currentState) {
      case 'dormant': return 'text-gray-500'
      case 'monitoring': return 'text-cyan-400'
      case 'analyzing': return 'text-purple-400'
      case 'executing': return 'text-green-400'
      case 'alerting': return 'text-orange-400 animate-pulse'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    if (!isAlive) return 'OFFLINE'
    
    switch (currentState) {
      case 'dormant': return 'Spirit Sleeping'
      case 'monitoring': return 'Monitoring Market'
      case 'analyzing': return 'Analyzing Signals'
      case 'executing': return 'Executing Strategy'
      case 'alerting': return 'RISK DETECTED'
      case 'error': return 'System Error'
      default: return 'Initializing...'
    }
  }

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md text-xs font-mono">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={cn("relative flex h-2 w-2")}>
          {isAlive && currentState !== 'dormant' && (
             <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", getStatusColor().replace('text-', 'bg-'))}></span>
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", isAlive ? getStatusColor().replace('text-', 'bg-') : 'bg-gray-600')}></span>
        </div>
        <span className={cn("font-bold uppercase", getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      <div className="h-3 w-[1px] bg-white/10" />

      {/* Activity */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {currentState === 'alerting' ? (
             <AlertTriangle className="h-3 w-3 text-orange-400" />
        ) : (
             <Activity className="h-3 w-3" />
        )}
        <span className="truncate max-w-[200px]">
          {lastEvent ? lastEvent.title : 'No recent activity'}
        </span>
      </div>

      {/* Latency (Visible only on desktop) */}
      <div className="hidden md:flex items-center gap-1.5 text-muted-foreground border-l border-white/10 pl-4">
        <Radio className="h-3 w-3" />
        <span>{latency > 0 && latency < 10000 ? `${latency}ms` : '--'}</span>
      </div>
    </div>
  )
}


