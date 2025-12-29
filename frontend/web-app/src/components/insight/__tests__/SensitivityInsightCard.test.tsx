/**
 * SensitivityInsightCard 单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { SensitivityInsightCard } from '../SensitivityInsightCard'
import type { SensitivityInsightData } from '@/types/insight'

describe('SensitivityInsightCard', () => {
  const mockData: SensitivityInsightData = {
    id: 'test-sensitivity-1',
    type: 'sensitivity',
    strategyName: '网格交易策略',
    symbol: 'BTC/USDT',
    params: [],
    explanation: 'AI 参数敏感度分析结果',
    created_at: '2025-12-29T12:00:00Z',
    sensitivityMatrix: [
      {
        paramKey: 'grid_spacing',
        paramLabel: '网格间距',
        impacts: [
          {
            paramValue: 0.5,
            totalReturn: 12.5,
            winRate: 65,
            maxDrawdown: -8.2,
            sharpeRatio: 1.8,
          },
          {
            paramValue: 1.0,
            totalReturn: 15.3,
            winRate: 68,
            maxDrawdown: -10.5,
            sharpeRatio: 1.6,
          },
          {
            paramValue: 1.5,
            totalReturn: 18.1,
            winRate: 70,
            maxDrawdown: -12.8,
            sharpeRatio: 1.5,
          },
        ],
      },
      {
        paramKey: 'grid_count',
        paramLabel: '网格数量',
        impacts: [
          {
            paramValue: 10,
            totalReturn: 10.2,
            winRate: 62,
            maxDrawdown: -7.5,
            sharpeRatio: 1.4,
          },
          {
            paramValue: 20,
            totalReturn: 15.3,
            winRate: 68,
            maxDrawdown: -10.5,
            sharpeRatio: 1.6,
          },
          {
            paramValue: 30,
            totalReturn: 17.8,
            winRate: 71,
            maxDrawdown: -13.2,
            sharpeRatio: 1.5,
          },
        ],
      },
    ],
    keyParameters: [
      {
        paramKey: 'grid_spacing',
        paramLabel: '网格间距',
        impactScore: 85,
        sensitivity: 'high',
      },
      {
        paramKey: 'grid_count',
        paramLabel: '网格数量',
        impactScore: 72,
        sensitivity: 'medium',
      },
      {
        paramKey: 'initial_capital',
        paramLabel: '初始资金',
        impactScore: 45,
        sensitivity: 'low',
      },
    ],
    baseline: {
      totalReturn: 15.3,
      winRate: 68,
      maxDrawdown: -10.5,
      sharpeRatio: 1.6,
    },
    aiInsight:
      '参数敏感度分析显示，网格间距对策略收益影响最大，建议在 0.8%-1.2% 范围内调整以平衡收益和风险。网格数量也有显著影响，但需注意资金利用效率。',
  }

  it('应该正确渲染组件基本信息', () => {
    render(<SensitivityInsightCard data={mockData} />)

    expect(screen.getByText('参数敏感度分析')).toBeInTheDocument()
    expect(screen.getByText('网格交易策略 · BTC/USDT')).toBeInTheDocument()
    expect(screen.getByText('3 参数')).toBeInTheDocument()
  })

  it('应该在紧凑模式下截断 AI 洞察', () => {
    render(<SensitivityInsightCard data={mockData} compact />)

    const aiInsightText = screen.getByText(/参数敏感度分析显示/)
    expect(aiInsightText.textContent).toHaveLength(83) // 80 chars + "..."
  })

  it('应该显示关键参数影响条形图', () => {
    render(<SensitivityInsightCard data={mockData} />)

    expect(screen.getByText('关键参数影响')).toBeInTheDocument()
    expect(screen.getByText('网格间距')).toBeInTheDocument()
    expect(screen.getByText('网格数量')).toBeInTheDocument()
    expect(screen.getByText('高敏感')).toBeInTheDocument()
    expect(screen.getByText('中敏感')).toBeInTheDocument()
  })

  it('应该显示基准性能指标', () => {
    render(<SensitivityInsightCard data={mockData} />)

    expect(screen.getByText('基准性能')).toBeInTheDocument()
    expect(screen.getByText('收益率')).toBeInTheDocument()
    expect(screen.getByText('胜率')).toBeInTheDocument()
    expect(screen.getByText('最大回撤')).toBeInTheDocument()
    expect(screen.getByText('夏普比率')).toBeInTheDocument()
  })

  it('应该显示热力图', () => {
    render(<SensitivityInsightCard data={mockData} />)

    expect(screen.getByText('参数影响热力图')).toBeInTheDocument()
    // 检查热力图图例
    expect(screen.getByText('正向')).toBeInTheDocument()
    expect(screen.getByText('中性')).toBeInTheDocument()
    expect(screen.getByText('负向')).toBeInTheDocument()
  })

  it('应该在点击时触发展开回调', () => {
    const mockOnExpand = vi.fn()
    render(<SensitivityInsightCard data={mockData} onExpand={mockOnExpand} />)

    const card = screen.getByText('参数敏感度分析').closest('.cursor-pointer')
    fireEvent.click(card!)

    expect(mockOnExpand).toHaveBeenCalledTimes(1)
  })

  it('应该在紧凑模式下隐藏详细信息', () => {
    render(<SensitivityInsightCard data={mockData} compact />)

    expect(screen.queryByText('关键参数影响')).not.toBeInTheDocument()
    expect(screen.queryByText('参数影响热力图')).not.toBeInTheDocument()
    expect(screen.queryByText('基准性能')).not.toBeInTheDocument()
  })

  it('应该处理空的敏感度矩阵', () => {
    const emptyData = {
      ...mockData,
      sensitivityMatrix: [],
    }

    render(<SensitivityInsightCard data={emptyData} />)

    // 应该不显示热力图
    expect(screen.queryByText('参数影响热力图')).not.toBeInTheDocument()
  })

  it('应该正确显示影响分数', () => {
    render(<SensitivityInsightCard data={mockData} />)

    expect(screen.getByText('影响分数: 85')).toBeInTheDocument()
    expect(screen.getByText('影响分数: 72')).toBeInTheDocument()
  })

  it('应该在悬停时改变样式', () => {
    render(<SensitivityInsightCard data={mockData} />)

    const card = screen.getByText('参数敏感度分析').closest('.cursor-pointer')!

    // 触发鼠标悬停
    fireEvent.mouseEnter(card)

    // 检查是否有悬停指示器
    expect(card.querySelector('.bg-primary\\/\\[0\\.03\\]')).toBeInTheDocument()

    // 触发鼠标离开
    fireEvent.mouseLeave(card)
  })
})
