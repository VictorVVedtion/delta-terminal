'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import React, { useState } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'

/**
 * 盈亏仪表盘组件
 * 基于 PRD S77 Sidebar 规格 - ② 盈亏仪表盘 (高度 80px)
 */

// Mock data for sparkline
const generateSparklineData = (isPositive: boolean) => {
  return Array.from({ length: 20 }, (_, i) => ({
    value: 100 + i * (isPositive ? 2 : -1) + Math.random() * 10 - 5
  }))
}

export function PnLPanel() {
  const { pnlDashboard } = useAgentStore()
  const isPositive = pnlDashboard.totalPnL >= 0
  const [data] = useState(() => generateSparklineData(isPositive))

  return (
    <div className="p-3 border-b border-border">
      <div
        className={cn(
          'relative rounded-lg p-3 overflow-hidden',
          'border',
          isPositive
            ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/50'
            : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/50'
        )}
      >
        {/* Background Sparkline */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                fill={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Content */}
        <div className="relative z-10">
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
    </div>
  )
}
