'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAgentStore } from '@/store/agent'

export function GlobalAgentStatus() {
    const agents = useAgentStore((state) => state.agents)
    // Check if any agent is active/thinking (mock logic for now, real logic would check thinking status)
    const activeCount = agents.filter(a => a.status === 'live' || a.status === 'paper').length

    // Simulation: We assume if there are active agents, the system is "alive"
    // Ideally, we'd hook into a global "thinking" state store
    const isThinking = activeCount > 0

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--rb-cyan))]/5 border border-[hsl(var(--rb-cyan))]/20">
            <div className="relative flex items-center justify-center w-4 h-4">
                {isThinking && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[hsl(var(--rb-cyan))]"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--rb-cyan))]" />
            </div>
            <span className="text-xs font-medium text-[hsl(var(--rb-cyan))] font-mono">
                {activeCount} AGENTS ONLINE
            </span>

            {/* Mini data stream decoration */}
            <div className="hidden md:flex gap-0.5 ml-2">
                {[1, 2, 3].map(i => (
                    <motion.div
                        key={i}
                        className="w-0.5 h-2 bg-[hsl(var(--rb-cyan))]/40"
                        animate={{ height: ['4px', '12px', '4px'] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                ))}
            </div>
        </div>
    )
}
