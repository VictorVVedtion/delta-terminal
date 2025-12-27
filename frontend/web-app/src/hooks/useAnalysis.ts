/**
 * useAnalysis Hooks
 * EPIC-008: 参数敏感度分析、归因分析、策略对比
 *
 * 提供分析数据获取的 hooks，用于支持各种高级分析功能
 */

import { useCallback,useEffect, useState } from 'react'

import { apiClient as _apiClient } from '@/lib/api'
import type {
  AttributionInsightData,
  ComparisonInsightData,
  SensitivityInsightData,
} from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface UseAnalysisState<T> {
  /** 分析数据 */
  data: T | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: Error | null
}

export interface UseAnalysisReturn<T> extends UseAnalysisState<T> {
  /** 重新获取数据 */
  refetch: () => Promise<void>
}

// =============================================================================
// Mock Data Generators
// =============================================================================

/**
 * 生成 Mock 敏感度分析数据
 */
function generateMockSensitivityData(strategyId: string): SensitivityInsightData {
  return {
    id: `sensitivity_${strategyId}_${Date.now()}`,
    type: 'sensitivity',
    strategyName: '均线交叉策略',
    symbol: 'BTC/USDT',
    sensitivityMatrix: [
      {
        paramKey: 'fast_ma_period',
        paramLabel: '快速均线周期',
        impacts: [
          { paramValue: 5, totalReturn: 12.5, winRate: 45, maxDrawdown: 15, sharpeRatio: 1.2 },
          { paramValue: 10, totalReturn: 18.3, winRate: 52, maxDrawdown: 12, sharpeRatio: 1.5 },
          { paramValue: 15, totalReturn: 22.1, winRate: 58, maxDrawdown: 10, sharpeRatio: 1.8 },
          { paramValue: 20, totalReturn: 19.7, winRate: 55, maxDrawdown: 11, sharpeRatio: 1.6 },
          { paramValue: 25, totalReturn: 15.2, winRate: 48, maxDrawdown: 13, sharpeRatio: 1.3 },
        ],
      },
      {
        paramKey: 'slow_ma_period',
        paramLabel: '慢速均线周期',
        impacts: [
          { paramValue: 20, totalReturn: 14.2, winRate: 47, maxDrawdown: 14, sharpeRatio: 1.3 },
          { paramValue: 30, totalReturn: 19.5, winRate: 54, maxDrawdown: 11, sharpeRatio: 1.6 },
          { paramValue: 40, totalReturn: 22.1, winRate: 58, maxDrawdown: 10, sharpeRatio: 1.8 },
          { paramValue: 50, totalReturn: 20.3, winRate: 56, maxDrawdown: 11, sharpeRatio: 1.7 },
          { paramValue: 60, totalReturn: 16.8, winRate: 50, maxDrawdown: 12, sharpeRatio: 1.4 },
        ],
      },
      {
        paramKey: 'stop_loss',
        paramLabel: '止损百分比',
        impacts: [
          { paramValue: 2, totalReturn: 10.5, winRate: 42, maxDrawdown: 8, sharpeRatio: 1.1 },
          { paramValue: 3, totalReturn: 16.2, winRate: 50, maxDrawdown: 10, sharpeRatio: 1.5 },
          { paramValue: 4, totalReturn: 22.1, winRate: 58, maxDrawdown: 10, sharpeRatio: 1.8 },
          { paramValue: 5, totalReturn: 20.8, winRate: 57, maxDrawdown: 12, sharpeRatio: 1.7 },
          { paramValue: 6, totalReturn: 18.3, winRate: 54, maxDrawdown: 14, sharpeRatio: 1.5 },
        ],
      },
    ],
    keyParameters: [
      {
        paramKey: 'stop_loss',
        paramLabel: '止损百分比',
        impactScore: 92,
        sensitivity: 'high',
      },
      {
        paramKey: 'fast_ma_period',
        paramLabel: '快速均线周期',
        impactScore: 78,
        sensitivity: 'high',
      },
      {
        paramKey: 'slow_ma_period',
        paramLabel: '慢速均线周期',
        impactScore: 65,
        sensitivity: 'medium',
      },
    ],
    baseline: {
      totalReturn: 22.1,
      winRate: 58,
      maxDrawdown: 10,
      sharpeRatio: 1.8,
    },
    aiInsight:
      '敏感度分析显示：\n\n1. **止损百分比** 是影响策略表现的最关键参数（影响分数92），当前最优值为4%\n2. **快速均线周期** 在10-20之间表现较好，建议保持在15左右\n3. **慢速均线周期** 对策略影响相对较小，当前40的设置已接近最优\n\n建议优先调整止损参数以优化策略表现。',
    params: [],
    explanation: '参数敏感度分析完成，显示各参数对策略表现的影响程度',
    created_at: new Date().toISOString(),
  }
}

/**
 * 生成 Mock 归因分析数据
 */
function generateMockAttributionData(strategyId: string): AttributionInsightData {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return {
    id: `attribution_${strategyId}_${Date.now()}`,
    type: 'attribution',
    strategyName: '均线交叉策略',
    symbol: 'BTC/USDT',
    attributionBreakdown: [
      {
        factor: '趋势跟踪',
        contribution: 3250,
        contributionPercent: 68,
        color: '#10b981',
        description: '成功捕捉主要趋势带来的收益',
      },
      {
        factor: '波段交易',
        contribution: 980,
        contributionPercent: 21,
        color: '#3b82f6',
        description: '区间震荡中的短线交易收益',
      },
      {
        factor: '止盈止损',
        contribution: 520,
        contributionPercent: 11,
        color: '#8b5cf6',
        description: '风控机制保护的利润',
      },
      {
        factor: '手续费',
        contribution: -180,
        contributionPercent: -4,
        color: '#ef4444',
        description: '交易手续费成本',
      },
      {
        factor: '滑点损失',
        contribution: -120,
        contributionPercent: -3,
        color: '#f59e0b',
        description: '市价单执行滑点',
      },
    ],
    timeSeriesAttribution: Array.from({ length: 30 }, (_, i) => {
      const timestamp = now - (29 - i) * dayMs
      const progress = i / 29
      return {
        timestamp,
        factors: {
          趋势跟踪: 3250 * progress * (0.8 + Math.random() * 0.4),
          波段交易: 980 * progress * (0.7 + Math.random() * 0.6),
          止盈止损: 520 * progress * (0.9 + Math.random() * 0.2),
          手续费: -180 * progress,
          滑点损失: -120 * progress,
        },
      }
    }),
    totalPnL: 4450,
    period: {
      start: now - 29 * dayMs,
      end: now,
    },
    aiInsight:
      '归因分析结果：\n\n1. **趋势跟踪** 是主要盈利来源（68%），策略在趋势行情中表现优异\n2. **波段交易** 贡献21%的收益，表明策略在震荡市场也有一定盈利能力\n3. **手续费和滑点** 合计损失7%，建议优化交易频率以降低成本\n\n总体而言，策略的盈利模式健康，建议保持当前交易逻辑。',
    params: [],
    explanation: '盈亏归因分析完成，展示各因子对总盈亏的贡献',
    created_at: new Date().toISOString(),
  }
}

/**
 * 生成 Mock 策略对比数据
 */
function generateMockComparisonData(strategyIds: string[]): ComparisonInsightData {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

  const strategies = strategyIds.slice(0, 4).map((id, index) => ({
    id,
    name: `策略 ${String.fromCharCode(65 + index)}`, // A, B, C, D
    symbol: 'BTC/USDT',
    color: colors[index] || '#3b82f6', // 提供默认颜色
    metrics: {
      totalReturn: 15 + Math.random() * 20,
      annualizedReturn: 25 + Math.random() * 30,
      winRate: 45 + Math.random() * 20,
      maxDrawdown: 8 + Math.random() * 10,
      sharpeRatio: 1.2 + Math.random() * 1.0,
      sortinoRatio: 1.5 + Math.random() * 1.2,
      profitFactor: 1.8 + Math.random() * 0.8,
      totalTrades: Math.floor(50 + Math.random() * 100),
    },
    equityCurve: Array.from({ length: 30 }, (_, i) => {
      const timestamp = now - (29 - i) * dayMs
      const progress = i / 29
      const volatility = 0.05 + Math.random() * 0.05
      const trend = 1 + (15 + Math.random() * 20) * progress * 0.01
      const noise = 1 + (Math.random() - 0.5) * volatility
      return {
        timestamp,
        equity: 10000 * trend * noise,
      }
    }),
  }))

  // 找出各指标的最佳和最差策略
  const metricKeys: (keyof typeof strategies[0]['metrics'])[] = [
    'totalReturn',
    'winRate',
    'maxDrawdown',
    'sharpeRatio',
  ]

  const metricLabelMap: Record<string, string> = {
    totalReturn: '总收益率',
    winRate: '胜率',
    maxDrawdown: '最大回撤',
    sharpeRatio: '夏普比率',
  }

  const differences = metricKeys.map((metric) => {
    const values = strategies.map((s) => ({
      name: s.name,
      value: s.metrics[metric],
    }))

    const sorted = [...values].sort((a, b) => {
      // maxDrawdown 越小越好
      return metric === 'maxDrawdown' ? a.value - b.value : b.value - a.value
    })

    const firstValue = sorted[0]?.value ?? 0
    const lastValue = sorted[sorted.length - 1]?.value ?? 0
    const range = Math.abs(firstValue - lastValue)
    const avgValue = values.reduce((sum, v) => sum + v.value, 0) / values.length
    const significance: 'high' | 'medium' | 'low' =
      range / avgValue > 0.3 ? 'high' : range / avgValue > 0.15 ? 'medium' : 'low'

    return {
      metric: metric.toString(),
      metricLabel: metricLabelMap[metric] || metric.toString(),
      significance,
      bestStrategy: sorted[0]?.name || '未知',
      worstStrategy: sorted[sorted.length - 1]?.name || '未知',
    }
  })

  const totalReturnBest = differences.find((d) => d.metric === 'totalReturn')?.bestStrategy || '未知'
  const maxDrawdownBest = differences.find((d) => d.metric === 'maxDrawdown')?.bestStrategy || '未知'
  const winRateBest = differences.find((d) => d.metric === 'winRate')?.bestStrategy || '未知'

  return {
    id: `comparison_${Date.now()}`,
    type: 'comparison',
    strategies,
    differences,
    aiSummary: `策略对比分析：\n\n1. **收益表现**：${totalReturnBest} 表现最佳，总收益率领先\n2. **稳定性**：${maxDrawdownBest} 的回撤控制最好，风险最低\n3. **胜率**：${winRateBest} 的交易胜率最高\n\n建议根据风险偏好选择合适的策略组合。`,
    params: [],
    explanation: '策略对比分析完成，展示多个策略的性能差异',
    created_at: new Date().toISOString(),
  }
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * useSensitivityAnalysis - 获取参数敏感度分析
 *
 * @param strategyId 策略 ID
 * @returns 分析数据、加载状态、错误信息和重新获取函数
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useSensitivityAnalysis('strategy_123')
 *
 * if (isLoading) return <div>加载中...</div>
 * if (error) return <div>错误: {error.message}</div>
 * if (!data) return null
 *
 * return <SensitivityCanvas insight={data} />
 * ```
 */
export function useSensitivityAnalysis(
  strategyId: string
): UseAnalysisReturn<SensitivityInsightData> {
  const [state, setState] = useState<UseAnalysisState<SensitivityInsightData>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!strategyId) {
      setState({
        data: null,
        isLoading: false,
        error: new Error('策略 ID 不能为空'),
      })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // TODO: 连接真实 API
      // const data = await apiClient.getSensitivityAnalysis(strategyId)

      // 使用 Mock 数据
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockData = generateMockSensitivityData(strategyId)

      setState({
        data: mockData,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error
            : new Error('获取敏感度分析数据失败'),
      })
    }
  }, [strategyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    ...state,
    refetch: fetchData,
  }
}

/**
 * useAttributionAnalysis - 获取盈亏归因分析
 *
 * @param strategyId 策略 ID
 * @returns 分析数据、加载状态、错误信息和重新获取函数
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useAttributionAnalysis('strategy_123')
 *
 * if (isLoading) return <div>加载中...</div>
 * if (error) return <div>错误: {error.message}</div>
 * if (!data) return null
 *
 * return <AttributionCanvas insight={data} />
 * ```
 */
export function useAttributionAnalysis(
  strategyId: string
): UseAnalysisReturn<AttributionInsightData> {
  const [state, setState] = useState<UseAnalysisState<AttributionInsightData>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!strategyId) {
      setState({
        data: null,
        isLoading: false,
        error: new Error('策略 ID 不能为空'),
      })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // TODO: 连接真实 API
      // const data = await apiClient.getAttributionAnalysis(strategyId)

      // 使用 Mock 数据
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockData = generateMockAttributionData(strategyId)

      setState({
        data: mockData,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error
            : new Error('获取归因分析数据失败'),
      })
    }
  }, [strategyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    ...state,
    refetch: fetchData,
  }
}

/**
 * useComparisonAnalysis - 获取多策略对比分析
 *
 * @param strategyIds 策略 ID 列表 (2-4个)
 * @returns 分析数据、加载状态、错误信息和重新获取函数
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useComparisonAnalysis([
 *   'strategy_1',
 *   'strategy_2',
 *   'strategy_3'
 * ])
 *
 * if (isLoading) return <div>加载中...</div>
 * if (error) return <div>错误: {error.message}</div>
 * if (!data) return null
 *
 * return <ComparisonCanvas insight={data} />
 * ```
 */
export function useComparisonAnalysis(
  strategyIds: string[]
): UseAnalysisReturn<ComparisonInsightData> {
  const [state, setState] = useState<UseAnalysisState<ComparisonInsightData>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!strategyIds || strategyIds.length < 2) {
      setState({
        data: null,
        isLoading: false,
        error: new Error('至少需要2个策略进行对比'),
      })
      return
    }

    if (strategyIds.length > 4) {
      setState({
        data: null,
        isLoading: false,
        error: new Error('最多支持对比4个策略'),
      })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // TODO: 连接真实 API
      // const data = await apiClient.getComparisonAnalysis(strategyIds)

      // 使用 Mock 数据
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const mockData = generateMockComparisonData(strategyIds)

      setState({
        data: mockData,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error
            : new Error('获取对比分析数据失败'),
      })
    }
  }, [strategyIds])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    ...state,
    refetch: fetchData,
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  useSensitivityAnalysis,
  useAttributionAnalysis,
  useComparisonAnalysis,
}
