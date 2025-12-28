'use client'

import React, { useCallback } from 'react'

import { CanvasPanel } from '@/components/canvas/CanvasPanel'
import { FunctionalSidebar } from '@/components/sidebar'
import { notify } from '@/lib/notification'
import { cn } from '@/lib/utils'
import { useInsightStore } from '@/store/insight'
import type { BacktestInsightData, InsightData, InsightParam } from '@/types/insight'

import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'

/**
 * A2UI 布局组件
 * 基于 PRD S77 规范: Sidebar + Full Chat + Slide Canvas (ChatGPT Style)
 *
 * 布局结构:
 * ┌─────────────────────────────────────────────────┐
 * │  Header: Logo | Status | KILL | Avatar          │
 * ├──────────────────┬──────────────────────────────┤
 * │ Sidebar (260px)  │     Main Content (Chat)      │
 * │                  │                              │
 * │ [模式选择器]     │     children (全宽聊天)      │
 * │ [盈亏仪表盘]     │                              │
 * │ [Agent列表]      │                              │
 * │ [风险概览]       │              Canvas ────────→│
 * │ [历史对话]       │              (滑出面板)      │
 * └──────────────────┴──────────────────────────────┘
 * ┌─────────────────────────────────────────────────┐
 * │  Mobile Bottom Nav (仅移动端)                   │
 * └─────────────────────────────────────────────────┘
 *
 * Canvas 状态由全局 useInsightStore 管理，子组件通过 store.openCanvas() 触发
 */

interface A2UILayoutProps {
  children: React.ReactNode
  /** 是否显示 Sidebar (默认 true) */
  showSidebar?: boolean
}

export function A2UILayout({ children, showSidebar = true }: A2UILayoutProps) {
  // 使用全局 store 管理 Canvas 状态
  const {
    activeInsight,
    canvasOpen,
    closeCanvas,
    setInsightStatus,
    isBacktesting,
    backtestPassed,
    backtestResult,
    setBacktesting,
    setBacktestPassed,
    setBacktestResult,
    isLoading,
  } = useInsightStore()

  // Canvas 关闭处理
  const handleCloseCanvas = useCallback(() => {
    closeCanvas()
  }, [closeCanvas])

  // 批准处理
  const handleApprove = useCallback((_insight: InsightData, _params: InsightParam[]) => {
    if (activeInsight) {
      setInsightStatus(activeInsight.id, 'approved')
      notify('success', '策略已批准', {
        description: `${activeInsight.target?.name || '策略'} 已进入执行队列`,
        source: 'A2UILayout',
      })
      handleCloseCanvas()
    }
  }, [activeInsight, setInsightStatus, handleCloseCanvas])

  // 拒绝处理
  const handleReject = useCallback(() => {
    if (activeInsight) {
      setInsightStatus(activeInsight.id, 'rejected')
      notify('info', '策略已拒绝', {
        description: `${activeInsight.target?.name || '策略'} 已被拒绝`,
        source: 'A2UILayout',
      })
      handleCloseCanvas()
    }
  }, [activeInsight, setInsightStatus, handleCloseCanvas])

  // 回测处理
  const handleBacktest = useCallback(async (insight: InsightData, params: InsightParam[]) => {
    setBacktesting(true)
    setBacktestResult(null)

    try {
      // 生成回测任务 ID
      const jobId = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // 提取目标信息
      const symbol = insight.target?.symbol || 'BTC/USDT'
      const timeframe = params.find(p => p.key === 'timeframe')?.value as string || '1h'

      // 调用回测 API
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          config: {
            strategyName: insight.target?.name || '策略回测',
            strategyDescription: insight.explanation || 'AI 生成的交易策略',
            symbol,
            timeframe,
            startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
            endDate: Date.now(),
            initialCapital: 10000,
            parameters: params.map(p => ({
              name: p.key,
              value: p.value,
              type: p.type,
            })),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('回测请求失败')
      }

      const result = await response.json() as BacktestInsightData

      // 保存回测结果
      setBacktestResult(result)

      // 判断回测是否通过 (基于夏普比率和总收益)
      const passed = result.stats.sharpeRatio >= 0.5 && result.stats.totalReturn > 0
      setBacktestPassed(passed)

      if (passed) {
        notify('success', '回测通过', {
          description: `收益率 ${result.stats.totalReturn.toFixed(1)}%，夏普比率 ${result.stats.sharpeRatio.toFixed(2)}`,
          source: 'A2UILayout',
        })
      } else {
        notify('warning', '回测未通过', {
          description: `收益率 ${result.stats.totalReturn.toFixed(1)}%，建议调整参数后重试`,
          source: 'A2UILayout',
        })
      }
    } catch (error) {
      setBacktestPassed(false)
      notify('error', '回测失败', {
        description: error instanceof Error ? error.message : '请检查网络连接',
        source: 'A2UILayout',
      })
    } finally {
      setBacktesting(false)
    }
  }, [setBacktesting, setBacktestPassed, setBacktestResult])

  // ESC 键关闭 Canvas
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canvasOpen) {
        handleCloseCanvas()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
  }, [canvasOpen, handleCloseCanvas])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="flex relative">
        {/* Sidebar - 桌面端显示 */}
        {showSidebar && (
          <div className="hidden md:block">
            <FunctionalSidebar />
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-4rem)]',
            showSidebar && 'md:ml-[260px]', // Sidebar 宽度
            'pb-[100px] md:pb-0', // 移动端底部导航空间
            'transition-all duration-300',
            // Canvas 打开时收缩主内容区
            canvasOpen && 'lg:mr-[480px]'
          )}
        >
          {/* 子组件直接渲染，Canvas 通过 store.openCanvas() 触发 */}
          {children}
        </main>

        {/* Canvas Panel - 滑出面板，监听 store 状态 */}
        <CanvasPanel
          insight={activeInsight}
          isOpen={canvasOpen}
          onClose={handleCloseCanvas}
          onApprove={handleApprove}
          onReject={handleReject}
          onBacktest={handleBacktest}
          isLoading={isLoading}
          isBacktesting={isBacktesting}
          backtestPassed={backtestPassed}
          backtestResult={backtestResult}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}

export default A2UILayout
