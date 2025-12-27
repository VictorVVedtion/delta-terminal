'use client'

/**
 * DeployCanvas Example
 *
 * Demonstrates Paper and Live deployment modes with all features.
 */

import React from 'react'

import { Button } from '@/components/ui/button'

import type { BacktestSummary, DeployConfig, PaperPerformance } from './DeployCanvas';
import { DeployCanvas } from './DeployCanvas'

// =============================================================================
// Mock Data
// =============================================================================

const mockBacktestResult: BacktestSummary = {
  passed: true,
  expectedReturn: 24.5,
  maxDrawdown: 8.2,
  winRate: 68,
}

const mockPaperPerformance: PaperPerformance = {
  runningDays: 10,
  requiredDays: 7,
  pnl: 680.5,
  pnlPercent: 6.8,
}

// =============================================================================
// Example Component
// =============================================================================

export function DeployCanvasExample() {
  const [mode, setMode] = React.useState<'paper' | 'live'>('paper')
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleDeploy = async (config: DeployConfig) => {
    setIsLoading(true)
    console.log('Deploying with config:', config)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsLoading(false)
    setIsOpen(false)
    alert(`Successfully deployed to ${config.mode} mode with $${config.capital}`)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">DeployCanvas Demo</h2>

      <div className="flex gap-4">
        <Button
          onClick={() => {
            setMode('paper')
            setIsOpen(true)
          }}
          variant="outline"
          className="border-[hsl(var(--rb-yellow))] text-[hsl(var(--rb-yellow))]"
        >
          Open Paper Deploy
        </Button>

        <Button
          onClick={() => {
            setMode('live')
            setIsOpen(true)
          }}
          variant="outline"
          className="border-[hsl(var(--rb-green))] text-[hsl(var(--rb-green))]"
        >
          Open Live Deploy
        </Button>
      </div>

      <DeployCanvas
        strategyId="strategy_001"
        strategyName="RSI 反弹策略"
        symbol="BTC/USDT"
        mode={mode}
        backtestResult={mockBacktestResult}
        paperPerformance={mode === 'live' ? mockPaperPerformance : undefined}
        isOpen={isOpen}
        onDeploy={handleDeploy}
        onCancel={() => { setIsOpen(false); }}
        isLoading={isLoading}
      />
    </div>
  )
}

export default DeployCanvasExample
