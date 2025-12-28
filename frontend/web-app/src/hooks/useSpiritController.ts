import { useMemo } from 'react'

import type { Agent } from '@/store/agent'
import type { InsightData } from '@/types/insight'

export type SpiritState = 'idle' | 'computing' | 'creation' | 'warning' | 'action' | 'speaking' | 'thinking'

interface SpiritVisuals {
    state: SpiritState
    colors: {
        primary: string
        secondary: string
    }
    intensity: number
    turbulence: number
}

const STATE_CONFIGS: Record<SpiritState, SpiritVisuals> = {
    idle: {
        state: 'idle',
        colors: { primary: '#00ffff', secondary: '#ff00ff' }, // Cyan/Magenta (Default Cyberpunk)
        intensity: 0.5,
        turbulence: 0.1
    },
    computing: { // Reasoning / Deep Thinking
        state: 'computing',
        colors: { primary: '#2563eb', secondary: '#60a5fa' }, // Deep Blue / Neon Blue
        intensity: 1.2,
        turbulence: 0.5
    },
    thinking: { // Generic Loading
        state: 'thinking',
        colors: { primary: '#a855f7', secondary: '#fbbf24' }, // Purple / Amber
        intensity: 1.0,
        turbulence: 0.3
    },
    speaking: { // Text streaming
        state: 'speaking',
        colors: { primary: '#00ffff', secondary: '#ffffff' }, // Cyan / White
        intensity: 1.1,
        turbulence: 0.2
    },
    creation: { // Strategy Creation / Success
        state: 'creation',
        colors: { primary: '#fbbf24', secondary: '#c084fc' }, // Gold / Purple
        intensity: 1.5,
        turbulence: 0.2
    },
    warning: { // Risk Alerts
        state: 'warning',
        colors: { primary: '#ef4444', secondary: '#f97316' }, // Red / Orange
        intensity: 1.8,
        turbulence: 2.0 // Very jagged
    },
    action: { // Trade Signals / Execution
        state: 'action',
        colors: { primary: '#10b981', secondary: '#34d399' }, // Emerald / Green
        intensity: 1.4,
        turbulence: 0.8
    }
}

/**
 * Derives the Spirit Orb's visual state from the latest AI insight/message
 */
export function useSpiritController(
    insight: InsightData | undefined,
    isThinking: boolean,
    agent?: Agent | null
): SpiritVisuals {
    return useMemo(() => {
        // 1. Priority: Hard Loading State
        if (isThinking) {
            return STATE_CONFIGS.computing
        }

        // 2. Priority: Insight Type
        if (insight) {
            switch (insight.type) {
                case 'risk_alert':
                    return STATE_CONFIGS.warning
                case 'strategy_create':
                case 'strategy_modify':
                    return STATE_CONFIGS.creation
                case 'trade_signal':
                    return STATE_CONFIGS.action
                case 'clarification':
                    return STATE_CONFIGS.speaking
                case 'backtest':
                case 'sensitivity':
                case 'attribution':
                case 'comparison':
                    return STATE_CONFIGS.computing // Analytical work
                default:
                    // Fallthrough to idle/agent state
                    break
            }
        }

        // 3. Agent Flavoring (Idle State Modulation)
        if (agent?.traits) {
            const baseState = { ...STATE_CONFIGS.idle }
            const traits = agent.traits

            // Archetype Base Colors
            if (agent.archetype === 'research_analyst') {
                baseState.colors = { primary: '#10b981', secondary: '#2dd4bf' } // Emerald/Teal
            }

            // Trait Modulation

            // Risk Aversion (0 = Degen/Red-Orange, 1 = Safe/Blue-Cyan)
            const risk = traits.risk_aversion ?? 0.5
            if (risk < 0.3) {
                // Degen: Shift towards warmer/energetic
                baseState.colors.secondary = '#f59e0b' // Amber
                baseState.turbulence += 0.2
            } else if (risk > 0.7) {
                // Safe: Shift towards cooler/calm
                baseState.colors.primary = '#3b82f6' // Blue
                baseState.turbulence = Math.max(0.05, baseState.turbulence - 0.05)
            }

            // Decisiveness (High = Higher Intensity)
            const decisiveness = traits.decisiveness ?? 0.5
            baseState.intensity += (decisiveness - 0.5) * 0.4

            // Creativity (High = More Turbulence/Variation)
            const creativity = traits.creativity ?? 0.5
            baseState.turbulence += (creativity - 0.5) * 0.2

            return baseState
        }

        // 4. Default
        return STATE_CONFIGS.idle
    }, [insight, isThinking, agent])
}
