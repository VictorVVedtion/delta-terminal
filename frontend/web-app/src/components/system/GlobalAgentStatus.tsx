'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import React from 'react'

import { useAgentStore } from '@/store/agent'

export function GlobalAgentStatus() {
    const agents = useAgentStore((state) => state.agents)
    // Check if any agent is active/thinking (mock logic for now, real logic would check thinking status)
    const activeCount = agents.filter(a => a.status === 'live' || a.status === 'paper').length

    // Simulation: We assume if there are active agents, the system is "alive"
    // Ideally, we'd hook into a global "thinking" state store
    const isThinking = activeCount > 0

    return (
        <div className="flex items-center gap-1.5">
            <div className="relative flex items-center justify-center w-3.5 h-3.5">
                {isThinking && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-emerald-500"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
                <Sparkles className="w-3 h-3 text-emerald-500" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
                <span className="text-emerald-500 font-mono">{activeCount}</span> Agent
            </span>
        </div>
    )
}
