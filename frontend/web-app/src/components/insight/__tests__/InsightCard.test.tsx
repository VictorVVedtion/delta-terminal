/**
 * InsightCard 组件测试
 * 测试 AI 洞察卡片的渲染、交互和快速批准功能
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import InsightCard from '../InsightCard'
import type { InsightData, InsightParam, InsightType } from '@/types/insight'

// =============================================================================
// Test Data
// =============================================================================

const createMockParam = (overrides: Partial<InsightParam> = {}): InsightParam => ({
  key: 'rsi_period',
  label: 'RSI 周期',
  type: 'slider' as const,
  value: 14,
  level: 1,
  config: { min: 5, max: 30, step: 1 },
  description: 'RSI 指标计算周期',
  ...overrides,
})

const createMockInsight = (overrides: Partial<InsightData> = {}): InsightData => ({
  id: 'insight-1',
  type: 'strategy_create' as InsightType,
  explanation: '基于 RSI 超卖信号的买入策略，适合震荡市场',
  params: [
    createMockParam(),
    createMockParam({ key: 'oversold_threshold', label: '超卖阈值', value: 30 }),
    createMockParam({ key: 'position_size', label: '仓位大小', value: 20, level: 2 }),
  ],
  impact: {
    confidence: 0.85,
    metrics: [
      { key: 'expectedReturn', label: '预期收益', value: '15%', unit: '', trend: 'up' as const },
      { key: 'winRate', label: '胜率', value: '65%', unit: '', trend: 'up' as const },
    ],
  },
  target: {
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
  },
  created_at: new Date().toISOString(),
  ...overrides,
})

// =============================================================================
// Tests
// =============================================================================

describe('InsightCard', () => {
  const mockOnApprove = vi.fn()
  const mockOnReject = vi.fn()
  const mockOnExpand = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders insight card with basic info', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      // Check title
      expect(screen.getByText('创建新策略')).toBeInTheDocument()
      // Check target
      expect(screen.getByText(/BTC\/USDT/)).toBeInTheDocument()
      // Check confidence
      expect(screen.getByText('85% 置信度')).toBeInTheDocument()
    })

    it('renders key parameters (level 1 only)', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      // Level 1 params should be visible
      expect(screen.getByText('RSI 周期:')).toBeInTheDocument()
      expect(screen.getByText('超卖阈值:')).toBeInTheDocument()
      // Level 2 param should NOT be visible in preview
      expect(screen.queryByText('仓位大小:')).not.toBeInTheDocument()
    })

    it('renders compact mode with truncated explanation', () => {
      const insight = createMockInsight({
        explanation: '这是一段非常长的解释文字，用于测试在紧凑模式下文本会被正确截断显示...',
      })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          compact={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      // Compact mode shows truncated text
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
    })

    it('renders approved status badge', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="approved"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('已批准')).toBeInTheDocument()
    })

    it('renders rejected status badge', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="rejected"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('已拒绝')).toBeInTheDocument()
    })
  })

  describe('Quick Approve Button', () => {
    it('renders quick approve button when status is pending', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('快速批准')).toBeInTheDocument()
    })

    it('does not render quick approve button in compact mode', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          compact={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.queryByText('快速批准')).not.toBeInTheDocument()
    })

    it('does not render quick approve button when approved', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="approved"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.queryByText('快速批准')).not.toBeInTheDocument()
    })

    it('calls onApprove with params when quick approve clicked', async () => {
      const user = userEvent.setup()
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      const quickApproveBtn = screen.getByText('快速批准')
      await user.click(quickApproveBtn)

      expect(mockOnApprove).toHaveBeenCalledTimes(1)
      expect(mockOnApprove).toHaveBeenCalledWith(insight.params)
    })

    // Note: Radix UI Tooltip uses Portal which doesn't render properly in JSDOM
    // This behavior is tested via E2E tests instead
    it.skip('shows tooltip preview on hover (requires E2E)', async () => {
      const user = userEvent.setup()
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      const quickApproveBtn = screen.getByText('快速批准')
      await user.hover(quickApproveBtn)

      // Wait for tooltip to appear (tooltip has 300ms delay)
      await waitFor(
        () => {
          expect(screen.getByText('将使用以下参数：')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Reject Button', () => {
    it('calls onReject when reject button clicked', async () => {
      const user = userEvent.setup()
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      const rejectBtn = screen.getByText('拒绝')
      await user.click(rejectBtn)

      expect(mockOnReject).toHaveBeenCalledTimes(1)
    })
  })

  describe('Expand Action', () => {
    it('renders "调参后批准" button', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('调参后批准')).toBeInTheDocument()
    })

    it('calls onExpand when card clicked', async () => {
      const user = userEvent.setup()
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      // Click on the card itself (not buttons)
      const card = screen.getByText('创建新策略').closest('[class*="Card"]')
      if (card) {
        await user.click(card)
        expect(mockOnExpand).toHaveBeenCalled()
      }
    })
  })

  describe('Insight Types', () => {
    it('renders strategy_modify type correctly', () => {
      const insight = createMockInsight({ type: 'strategy_modify' as InsightType })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('修改策略')).toBeInTheDocument()
    })

    it('renders risk_alert type correctly', () => {
      const insight = createMockInsight({ type: 'risk_alert' as InsightType })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('风险警告')).toBeInTheDocument()
    })

    it('renders trade_signal type correctly', () => {
      const insight = createMockInsight({ type: 'trade_signal' as InsightType })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('交易信号')).toBeInTheDocument()
    })

    it('falls back to strategy_create for unknown types', () => {
      const insight = createMockInsight({ type: 'unknown_type' as InsightType })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      // Falls back to strategy_create
      expect(screen.getByText('创建新策略')).toBeInTheDocument()
    })
  })

  describe('Metrics Display', () => {
    it('renders impact metrics with trend indicators', () => {
      const insight = createMockInsight()
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.getByText('预期收益')).toBeInTheDocument()
      expect(screen.getByText('15%')).toBeInTheDocument()
      expect(screen.getByText('胜率')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('does not render metrics when not provided', () => {
      const insight = createMockInsight({ impact: undefined })
      render(
        <InsightCard
          insight={insight}
          status="pending"
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onExpand={mockOnExpand}
        />
      )

      expect(screen.queryByText('预期收益')).not.toBeInTheDocument()
    })
  })
})
