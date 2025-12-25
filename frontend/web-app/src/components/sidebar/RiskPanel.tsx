'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'
import { ChevronDown, AlertTriangle, Shield } from 'lucide-react'

/**
 * 风险概览组件
 * 基于 PRD S77 Sidebar 规格 - ④ 风险概览 (高度 60px，可折叠)
 */

const RISK_COLORS = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
}

export function RiskPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { riskOverview } = useAgentStore()

  const riskColor = RISK_COLORS[riskOverview.riskLevel]

  return (
    <div className="border-t border-border">
      {/* 折叠头部 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
            风险概览
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform',
            isCollapsed && '-rotate-90'
          )}
        />
      </button>

      {/* 内容 */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-2">
          {/* 保证金率 */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">保证金率</span>
            <span
              className={cn(
                'font-semibold font-mono',
                riskOverview.marginRate > 150
                  ? 'text-green-500'
                  : riskOverview.marginRate > 100
                    ? 'text-yellow-500'
                    : 'text-red-500'
              )}
            >
              {riskOverview.marginRate}%
            </span>
          </div>

          {/* 总敞口 */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">总敞口</span>
            <span className="font-semibold font-mono">
              ${riskOverview.totalExposure.toLocaleString()}
            </span>
          </div>

          {/* 最大回撤 */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">最大回撤</span>
            <span className="font-mono text-red-500">
              -{riskOverview.maxDrawdown}%
            </span>
          </div>

          {/* 风险等级指示器 */}
          {riskOverview.riskLevel !== 'low' && (
            <div
              className={cn(
                'flex items-center gap-1.5 mt-1 p-2 rounded',
                'bg-muted/50'
              )}
            >
              <AlertTriangle className={cn('h-3 w-3', riskColor)} />
              <span className={cn('text-[10px] font-medium', riskColor)}>
                {riskOverview.riskLevel === 'critical' && '风险等级: 严重'}
                {riskOverview.riskLevel === 'high' && '风险等级: 高'}
                {riskOverview.riskLevel === 'medium' && '风险等级: 中等'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
