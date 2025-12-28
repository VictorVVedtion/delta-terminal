'use client'

import { Activity, AlertTriangle, CheckCircle2, Clock, Terminal } from 'lucide-react'
import { useSpiritStore, SpiritEvent } from '@/store/spiritStore'
import { cn } from '@/lib/utils'

function EventCard({ event }: { event: SpiritEvent }) {
  const getIcon = () => {
    switch (event.priority) {
      case 'p0': return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'p1': return <Terminal className="h-5 w-5 text-cyan-500" />
      case 'p2': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      default: return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getBorderColor = () => {
    switch (event.priority) {
      case 'p0': return 'border-red-500/50 bg-red-950/10'
      case 'p1': return 'border-cyan-500/50 bg-cyan-950/10'
      case 'p2': return 'border-green-500/50 bg-green-950/10'
      default: return 'border-border bg-card'
    }
  }

  return (
    <div className={cn("flex gap-4 p-4 rounded-lg border mb-3 transition-all", getBorderColor())}>
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{event.title}</h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground break-words">{event.content}</p>
        
        {/* Metadata Viewer (if any) */}
        {event.metadata && (
          <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono text-muted-foreground overflow-x-auto">
            {JSON.stringify(event.metadata, null, 2)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SpiritLogView() {
  const { history } = useSpiritStore()
  
  // Filter out heartbeats (p4) for the log view
  const logs = history.filter(e => e.priority !== 'p4')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spirit Activity Log</h1>
          <p className="text-muted-foreground">System decisions and autonomous actions history.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Stream
        </div>
      </div>

      <div className="space-y-6">
        {logs.length === 0 ? (
          <div className="text-center py-20 border rounded-lg border-dashed">
            <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No Activity Yet</h3>
            <p className="text-muted-foreground">Waiting for signals...</p>
          </div>
        ) : (
          <div className="relative border-l border-border ml-3 pl-8 pb-8 space-y-8">
             {logs.map((event) => (
               <div key={event.id} className="relative">
                 <div className="absolute -left-[41px] top-4 h-5 w-5 rounded-full border bg-background flex items-center justify-center">
                   <div className="h-2 w-2 rounded-full bg-primary" />
                 </div>
                 <EventCard event={event} />
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}

