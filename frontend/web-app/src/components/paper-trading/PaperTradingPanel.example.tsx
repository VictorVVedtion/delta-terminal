/**
 * PaperTradingPanel 使用示例
 *
 * 展示如何在部署流程中集成 PaperTradingPanel
 */

'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/button'

import { PaperTradingPanel } from './PaperTradingPanel'

export function PaperTradingPanelExample() {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Paper Trading Panel 示例</h1>

      <Button onClick={() => { setIsPanelOpen(true); }}>
        打开 Paper Trading 面板
      </Button>

      <PaperTradingPanel
        isOpen={isPanelOpen}
        onClose={() => { setIsPanelOpen(false); }}
        strategyId="strategy_test_123"
        strategyName="趋势跟踪策略"
        symbol="BTC/USDT"
      />
    </div>
  )
}

/**
 * 集成到部署流程的示例
 *
 * 在 DeployCanvas 的 onDeploy 回调中:
 *
 * ```tsx
 * const [showPaperPanel, setShowPaperPanel] = useState(false)
 * const [deployedStrategyId, setDeployedStrategyId] = useState<string | null>(null)
 *
 * const handleDeploy = async (config: DeployConfig) => {
 *   const result = await deploy(config)
 *
 *   if (result.success && config.mode === 'paper') {
 *     // Paper 部署成功,打开监控面板
 *     setDeployedStrategyId(result.agentId)
 *     setShowPaperPanel(true)
 *   }
 * }
 *
 * // 在组件中渲染
 * <PaperTradingPanel
 *   isOpen={showPaperPanel}
 *   onClose={() => setShowPaperPanel(false)}
 *   strategyId={deployedStrategyId || ''}
 *   strategyName="我的策略"
 *   symbol="BTC/USDT"
 * />
 * ```
 */
