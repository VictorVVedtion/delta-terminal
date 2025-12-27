/**
 * useAnalysis Hooks 使用示例
 * 
 * 这个文件展示如何使用分析相关的 hooks
 * 仅作为示例，实际使用时可以删除
 */

import { useAttributionAnalysis, useComparisonAnalysis,useSensitivityAnalysis } from './useAnalysis'

// 示例 1: 敏感度分析
function SensitivityExample() {
  const { data, isLoading, error, refetch } = useSensitivityAnalysis('strategy_123')

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!data) return null

  return (
    <div>
      <h2>敏感度分析</h2>
      <p>策略: {data.strategyName}</p>
      <p>交易对: {data.symbol}</p>
      <p>关键参数数量: {data.keyParameters.length}</p>
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}

// 示例 2: 归因分析
function AttributionExample() {
  const { data, isLoading, error, refetch } = useAttributionAnalysis('strategy_123')

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!data) return null

  return (
    <div>
      <h2>归因分析</h2>
      <p>策略: {data.strategyName}</p>
      <p>总盈亏: {data.totalPnL} USDT</p>
      <p>因子数量: {data.attributionBreakdown.length}</p>
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}

// 示例 3: 策略对比
function ComparisonExample() {
  const strategyIds = ['strategy_1', 'strategy_2', 'strategy_3']
  const { data, isLoading, error, refetch } = useComparisonAnalysis(strategyIds)

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>
  if (!data) return null

  return (
    <div>
      <h2>策略对比</h2>
      <p>对比策略数: {data.strategies.length}</p>
      <p>差异分析项: {data.differences.length}</p>
      <button onClick={() => refetch()}>刷新</button>
    </div>
  )
}

export { AttributionExample, ComparisonExample,SensitivityExample }
