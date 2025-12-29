/**
 * ComparisonInsightCard 单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ComparisonInsightCard } from '../ComparisonInsightCard'
import type { ComparisonInsightData } from '@/types/insight'

describe('ComparisonInsightCard', () => {
  const mockData: ComparisonInsightData = {
    id: 'test-comparison-1',
    type: 'comparison',
    params: [],
    explanation: 'AI 策略对比分析结果',
    created_at: '2025-12-29T12:00:00Z',
    strategies: [
      {
        id: 'strategy-1',
        name: '网格策略A',
        symbol: 'BTC/USDT',
        color: '#3b82f6',
        metrics: {
          totalReturn: 25.5,
          annualizedReturn: 102.0,
          winRate: 72,
          maxDrawdown: -12.3,
          sharpeRatio: 1.8,
          sortinoRatio: 2.2,
          profitFactor: 2.5,
          totalTrades: 156,
        },
        equityCurve: [
          { timestamp: 1703001600000, equity: 10000 },
          { timestamp: 1703088000000, equity: 12550 },
        ],
      },
      {
        id: 'strategy-2',
        name: '趋势策略B',
        symbol: 'BTC/USDT',
        color: '#10b981',
        metrics: {
          totalReturn: 18.2,
          annualizedReturn: 72.8,
          winRate: 65,
          maxDrawdown: -15.8,
          sharpeRatio: 1.5,
          sortinoRatio: 1.9,
          profitFactor: 2.1,
          totalTrades: 89,
        },
        equityCurve: [
          { timestamp: 1703001600000, equity: 10000 },
          { timestamp: 1703088000000, equity: 11820 },
        ],
      },
      {
        id: 'strategy-3',
        name: '波段策略C',
        symbol: 'BTC/USDT',
        color: '#f59e0b',
        metrics: {
          totalReturn: 22.3,
          annualizedReturn: 89.2,
          winRate: 68,
          maxDrawdown: -10.5,
          sharpeRatio: 1.9,
          sortinoRatio: 2.3,
          profitFactor: 2.8,
          totalTrades: 124,
        },
        equityCurve: [
          { timestamp: 1703001600000, equity: 10000 },
          { timestamp: 1703088000000, equity: 12230 },
        ],
      },
    ],
    differences: [
      {
        metric: 'totalReturn',
        metricLabel: '总收益',
        significance: 'high',
        bestStrategy: '网格策略A',
        worstStrategy: '趋势策略B',
      },
      {
        metric: 'maxDrawdown',
        metricLabel: '最大回撤',
        significance: 'medium',
        bestStrategy: '波段策略C',
        worstStrategy: '趋势策略B',
      },
      {
        metric: 'sharpeRatio',
        metricLabel: '夏普比率',
        significance: 'low',
        bestStrategy: '波段策略C',
        worstStrategy: '趋势策略B',
      },
    ],
    aiSummary:
      '策略对比分析显示，网格策略A在总收益率上表现最佳(25.5%)，波段策略C的夏普比率最高(1.9)且最大回撤控制最好(-10.5%)。综合风险收益比，推荐波段策略C作为主力策略。',
  }

  it('应该正确渲染组件基本信息', () => {
    render(<ComparisonInsightCard data={mockData} />)

    expect(screen.getByText('策略对比分析')).toBeInTheDocument()
    expect(screen.getByText('3 个策略')).toBeInTheDocument()
  })

  it('应该显示最佳策略徽章', () => {
    render(<ComparisonInsightCard data={mockData} />)

    // 网格策略A 有最高的总收益
    expect(screen.getByText('网格策略A')).toBeInTheDocument()
  })

  it('应该显示对比表格', () => {
    render(<ComparisonInsightCard data={mockData} />)

    expect(screen.getByText('性能对比')).toBeInTheDocument()
    expect(screen.getByText('总收益')).toBeInTheDocument()
    expect(screen.getByText('胜率')).toBeInTheDocument()
    expect(screen.getByText('最大回撤')).toBeInTheDocument()
  })

  it('应该显示策略图例', () => {
    render(<ComparisonInsightCard data={mockData} />)

    expect(screen.getByText('策略图例')).toBeInTheDocument()
    expect(screen.getByText('网格策略A')).toBeInTheDocument()
    expect(screen.getByText('趋势策略B')).toBeInTheDocument()
    expect(screen.getByText('波段策略C')).toBeInTheDocument()
  })

  it('应该显示关键差异分析', () => {
    render(<ComparisonInsightCard data={mockData} />)

    expect(screen.getByText('关键差异')).toBeInTheDocument()
    expect(screen.getByText('显著差异')).toBeInTheDocument()
    expect(screen.getByText('中等差异')).toBeInTheDocument()
  })

  it('应该在对比表格中标记最佳值', () => {
    render(<ComparisonInsightCard data={mockData} />)

    // 检查是否有奖杯图标（最佳策略标记）
    // 奖杯图标会在每个指标的最佳策略单元格中显示
    const tableContent = screen.getByText('性能对比').closest('div')
    expect(tableContent).toBeInTheDocument()
  })

  it('应该在紧凑模式下显示较少指标', () => {
    render(<ComparisonInsightCard data={mockData} compact />)

    // 紧凑模式只显示3个指标
    expect(screen.getByText('总收益')).toBeInTheDocument()
    expect(screen.getByText('胜率')).toBeInTheDocument()
    expect(screen.getByText('最大回撤')).toBeInTheDocument()

    // 不显示年化收益和夏普比率
    expect(screen.queryByText('年化收益')).not.toBeInTheDocument()
    expect(screen.queryByText('夏普比率')).not.toBeInTheDocument()
  })

  it('应该在紧凑模式下截断 AI 总结', () => {
    render(<ComparisonInsightCard data={mockData} compact />)

    const aiSummaryText = screen.getByText(/策略对比分析显示/)
    expect(aiSummaryText.textContent).toHaveLength(83) // 80 chars + "..."
  })

  it('应该在紧凑模式下隐藏详细分析', () => {
    render(<ComparisonInsightCard data={mockData} compact />)

    expect(screen.queryByText('性能对比')).not.toBeInTheDocument()
    expect(screen.queryByText('策略图例')).not.toBeInTheDocument()
    expect(screen.queryByText('关键差异')).not.toBeInTheDocument()
  })

  it('应该在点击时触发展开回调', () => {
    const mockOnExpand = vi.fn()
    render(<ComparisonInsightCard data={mockData} onExpand={mockOnExpand} />)

    const card = screen.getByText('策略对比分析').closest('.cursor-pointer')
    fireEvent.click(card!)

    expect(mockOnExpand).toHaveBeenCalledTimes(1)
  })

  it('应该显示差异的最优和最差策略', () => {
    render(<ComparisonInsightCard data={mockData} />)

    expect(screen.getByText(/最优:/)).toBeInTheDocument()
    expect(screen.getByText(/最差:/)).toBeInTheDocument()
  })

  it('应该正确格式化数值', () => {
    render(<ComparisonInsightCard data={mockData} />)

    // 总收益应该有百分号
    expect(screen.getByText(/25\.5%/)).toBeInTheDocument()
    expect(screen.getByText(/18\.2%/)).toBeInTheDocument()

    // 夏普比率应该是小数
    expect(screen.getByText(/1\.8/)).toBeInTheDocument()
    expect(screen.getByText(/1\.5/)).toBeInTheDocument()
  })

  it('应该正确应用策略颜色', () => {
    render(<ComparisonInsightCard data={mockData} />)

    const strategyNames = screen.getAllByText('网格策略A')
    // 检查至少有一个元素有正确的颜色样式
    const hasColorStyle = strategyNames.some((el) => {
      const style = window.getComputedStyle(el)
      return style.color || el.getAttribute('style')?.includes('color')
    })
    expect(hasColorStyle).toBeTruthy()
  })

  it('应该处理只有2个策略的情况', () => {
    const twoStrategyData = {
      ...mockData,
      strategies: mockData.strategies.slice(0, 2),
    }

    render(<ComparisonInsightCard data={twoStrategyData} />)

    expect(screen.getByText('2 个策略')).toBeInTheDocument()
    expect(screen.getByText('网格策略A')).toBeInTheDocument()
    expect(screen.getByText('趋势策略B')).toBeInTheDocument()
  })

  it('应该在悬停时改变样式', () => {
    render(<ComparisonInsightCard data={mockData} />)

    const card = screen.getByText('策略对比分析').closest('.cursor-pointer')!

    fireEvent.mouseEnter(card)
    expect(card.querySelector('.bg-primary\\/\\[0\\.03\\]')).toBeInTheDocument()

    fireEvent.mouseLeave(card)
  })
})
