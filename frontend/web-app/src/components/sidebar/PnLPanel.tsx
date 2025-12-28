'use client'

import { HelpCircle, TrendingDown,TrendingUp } from 'lucide-react'
import React from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'

/**
 * 盈亏仪表盘组件
 * 基于 PRD S77 Sidebar 规格 - ② 盈亏仪表盘 (高度 80px)
 */
export function PnLPanel() {
  const { pnlDashboard } = useAgentStore()
  const isPositive = pnlDashboard.totalPnL >= 0

  return (
    <div className="p-3 border-b border-border">
      <div
        className={cn(
          'rounded-lg p-3',
          'border',
          isPositive
            ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/50'
            : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/50'
        )}
      >
        {/* 标题 */}
        <div className="flex items-center gap-1.5 mb-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className="text-[10px] text-muted-foreground font-medium">
            总盈亏
          </span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  所有策略的累计盈亏总和，包括已实现和未实现的收益
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 主数值 */}
        <div
          className={cn(
            'text-xl font-bold font-mono',
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : ''}${pnlDashboard.totalPnL.toLocaleString()}
        </div>

        {/* 详细信息 */}
        <div
          className={cn(
            'text-xs mt-0.5',
            isPositive ? 'text-green-500/80' : 'text-red-500/80'
          )}
        >
          {isPositive ? '+' : ''}{pnlDashboard.totalPnLPercent.toFixed(1)}%
          <span className="text-muted-foreground mx-1">·</span>
          今日{' '}
          <span className={pnlDashboard.todayPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
            {pnlDashboard.todayPnL >= 0 ? '+' : ''}${pnlDashboard.todayPnL}
          </span>
        </div>
      </div>
    </div>
  )
}
