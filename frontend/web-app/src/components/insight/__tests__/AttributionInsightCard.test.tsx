/**
 * AttributionInsightCard 单元测试
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AttributionInsightCard } from '../AttributionInsightCard'
import type { AttributionInsightData } from '@/types/insight'

describe('AttributionInsightCard', () => {
  const mockData: AttributionInsightData = {
    id: 'test-attribution-1',
    type: 'attribution',
    strategyName: '趋势跟踪策略',
    symbol: 'ETH/USDT',
    params: [],
    explanation: 'AI 盈亏归因分析结果',
    created_at: '2025-12-29T12:00:00Z',
    attributionBreakdown: [
      {
        factor: '趋势跟踪',
        contribution: 1250.5,
        contributionPercent: 62.5,
        color: 'blue',
        description: '趋势行情捕捉',
      },
      {
        factor: '波段交易',
        contribution: 480.3,
        contributionPercent: 24.0,
        color: 'green',
        description: '震荡行情套利',
      },
      {
        factor: '止损',
        contribution: -180.2,
        contributionPercent: -9.0,
        color: 'red',
        description: '风险控制',
      },
      {
        factor: '手续费',
        contribution: -150.6,
        contributionPercent: -7.5,
        color: 'gray',
        description: '交易成本',
      },
      {
        factor: '滑点',
        contribution: -50.0,
        contributionPercent: -2.5,
        color: 'yellow',
        description: '执行损耗',
      },
    ],
    timeSeriesAttribution: [
      {
        timestamp: 1703001600000,
        factors: {
          趋势跟踪: 500.0,
          波段交易: 150.0,
          止损: -50.0,
          手续费: -30.0,
        },
      },
      {
        timestamp: 1703088000000,
        factors: {
          趋势跟踪: 1250.5,
          波段交易: 480.3,
          止损: -180.2,
          手续费: -150.6,
        },
      },
    ],
    totalPnL: 1350.0,
    period: {
      start: 1703001600000,
      end: 1703088000000,
    },
    aiInsight:
      '盈亏归因分析显示，趋势跟踪策略在本周期表现优异，贡献了 62.5% 的收益。波段交易也有不错的表现。止损和手续费是主要的负向因子，建议优化止损策略并考虑降低交易频率。',
  }

  it('应该正确渲染组件基本信息', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('盈亏归因分析')).toBeInTheDocument()
    expect(screen.getByText('趋势跟踪策略 · ETH/USDT')).toBeInTheDocument()
    expect(screen.getByText('$1,350.00')).toBeInTheDocument()
  })

  it('应该显示盈利状态的徽章', () => {
    render(<AttributionInsightCard data={mockData} />)

    const badge = screen.getByText('$1,350.00').closest('.gap-1')
    expect(badge).toHaveClass('bg-primary') // default variant for profitable
  })

  it('应该显示亏损状态的徽章', () => {
    const lossData = {
      ...mockData,
      totalPnL: -500.0,
    }

    render(<AttributionInsightCard data={lossData} />)

    const badge = screen.getByText('$-500.00').closest('.gap-1')
    expect(badge).toHaveClass('bg-destructive')
  })

  it('应该显示盈亏分解瀑布图', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('盈亏分解')).toBeInTheDocument()
    expect(screen.getByText('趋势跟踪')).toBeInTheDocument()
    expect(screen.getByText('波段交易')).toBeInTheDocument()
    expect(screen.getByText('止损')).toBeInTheDocument()
    expect(screen.getByText('手续费')).toBeInTheDocument()
  })

  it('应该显示正向贡献因子', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('正向贡献因子')).toBeInTheDocument()
    // 瀑布图中的趋势跟踪
    const trendFactors = screen.getAllByText('趋势跟踪')
    expect(trendFactors.length).toBeGreaterThan(0)
  })

  it('应该显示趋势分析', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('趋势分析')).toBeInTheDocument()
  })

  it('应该显示因子统计摘要', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('正向因子')).toBeInTheDocument()
    expect(screen.getByText('负向因子')).toBeInTheDocument()
    expect(screen.getByText('2 个')).toBeInTheDocument() // 2个正向因子
    expect(screen.getByText('3 个')).toBeInTheDocument() // 3个负向因子
  })

  it('应该在紧凑模式下截断内容', () => {
    render(<AttributionInsightCard data={mockData} compact />)

    const aiInsightText = screen.getByText(/盈亏归因分析显示/)
    expect(aiInsightText.textContent).toHaveLength(83) // 80 chars + "..."
  })

  it('应该在紧凑模式下隐藏详细分析', () => {
    render(<AttributionInsightCard data={mockData} compact />)

    expect(screen.queryByText('盈亏分解')).not.toBeInTheDocument()
    expect(screen.queryByText('正向贡献因子')).not.toBeInTheDocument()
    expect(screen.queryByText('趋势分析')).not.toBeInTheDocument()
  })

  it('应该在点击时触发展开回调', () => {
    const mockOnExpand = vi.fn()
    render(<AttributionInsightCard data={mockData} onExpand={mockOnExpand} />)

    const card = screen.getByText('盈亏归因分析').closest('.cursor-pointer')
    fireEvent.click(card!)

    expect(mockOnExpand).toHaveBeenCalledTimes(1)
  })

  it('应该处理空的时间序列数据', () => {
    const emptyData = {
      ...mockData,
      timeSeriesAttribution: [],
    }

    render(<AttributionInsightCard data={emptyData} />)

    expect(screen.getByText('暂无时间序列数据')).toBeInTheDocument()
  })

  it('应该正确格式化贡献金额', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('+$1,250.50')).toBeInTheDocument() // 趋势跟踪
    expect(screen.getByText('+$480.30')).toBeInTheDocument() // 波段交易
    expect(screen.getByText('$-180.20')).toBeInTheDocument() // 止损
  })

  it('应该显示贡献百分比', () => {
    render(<AttributionInsightCard data={mockData} />)

    expect(screen.getByText('62.5%')).toBeInTheDocument()
    expect(screen.getByText('24.0%')).toBeInTheDocument()
  })

  it('应该在悬停时改变样式', () => {
    render(<AttributionInsightCard data={mockData} />)

    const card = screen.getByText('盈亏归因分析').closest('.cursor-pointer')!

    fireEvent.mouseEnter(card)
    expect(card.querySelector('.bg-primary\\/\\[0\\.03\\]')).toBeInTheDocument()

    fireEvent.mouseLeave(card)
  })
})
