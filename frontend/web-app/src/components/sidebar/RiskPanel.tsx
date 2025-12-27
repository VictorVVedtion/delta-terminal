'use client'

import { AlertTriangle, ChevronDown, Shield } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { type RiskOverview,useAgentStore } from '@/store/agent'
import { usePaperTradingStore } from '@/store/paperTrading'

/**
 * 风险概览组件
 * 基于 PRD S77 Sidebar 规格 - ④ 风险概览 (高度 60px，可折叠)
 *
 * 数据来源：
 * - Paper Trading 运行时 → 从 PaperTradingStore 计算真实数据
 * - 无 Paper Trading → 显示 AgentStore 中的 riskOverview (fallback)
 */

const RISK_COLORS = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
}

export function RiskPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { riskOverview: agentRiskOverview } = useAgentStore()
  const { accounts, getAccountStats } = usePaperTradingStore()

  // 从 Paper Trading 账户计算真实风险数据
  const riskOverview = useMemo<RiskOverview>(() => {
    // 没有 Paper Trading 账户时使用 fallback
    if (accounts.length === 0) {
      return agentRiskOverview
    }

    // 汇总所有 Paper Trading 账户数据
    let totalEquity = 0
    let totalExposure = 0
    let worstDrawdown = 0

    accounts.forEach((account) => {
      const stats = getAccountStats(account.id)
      if (stats) {
        totalEquity += stats.totalEquity
        worstDrawdown = Math.min(worstDrawdown, stats.maxDrawdown)
      }

      // 计算持仓敞口
      account.positions.forEach((pos) => {
        totalExposure += pos.size * pos.currentPrice
      })
    })

    // 计算保证金率 (总权益 / 总敞口 * 100)
    const marginRate = totalExposure > 0
      ? Math.round((totalEquity / totalExposure) * 100)
      : 0

    // 根据回撤程度判断风险等级
    let riskLevel: RiskOverview['riskLevel'] = 'low'
    if (worstDrawdown < -30) {
      riskLevel = 'critical'
    } else if (worstDrawdown < -20) {
      riskLevel = 'high'
    } else if (worstDrawdown < -10) {
      riskLevel = 'medium'
    }

    return {
      marginRate,
      totalExposure: Math.round(totalExposure),
      maxDrawdown: Math.abs(worstDrawdown),
      riskLevel,
    }
  }, [accounts, getAccountStats, agentRiskOverview])

  const riskColor = RISK_COLORS[riskOverview.riskLevel]
  const hasData = riskOverview.marginRate > 0 || riskOverview.totalExposure > 0

  return (
    <div className="border-t border-border">
      {/* 折叠头部 */}
      <button
        onClick={() => { setIsCollapsed(!isCollapsed); }}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
            风险概览
          </span>
          {/* 有 Paper Trading 数据时显示标签 */}
          {accounts.length > 0 && hasData && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary">
              PAPER
            </span>
          )}
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
          {/* 无数据提示 */}
          {!hasData ? (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              暂无持仓数据
            </div>
          ) : (
            <>
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
                  {riskOverview.marginRate > 0 ? `${riskOverview.marginRate}%` : '—'}
                </span>
              </div>

              {/* 总敞口 */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">总敞口</span>
                <span className="font-semibold font-mono">
                  {riskOverview.totalExposure > 0 ? `$${riskOverview.totalExposure.toLocaleString()}` : '—'}
                </span>
              </div>

              {/* 最大回撤 */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">最大回撤</span>
                <span className="font-mono text-red-500">
                  {riskOverview.maxDrawdown > 0 ? `-${riskOverview.maxDrawdown.toFixed(1)}%` : '—'}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
