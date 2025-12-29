/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * InsightCard 使用示例
 *
 * 展示如何正确处理各种边缘情况和空状态
 *
 * NOTE: 此文件包含旧版类型结构，仅作为参考示例
 * TODO: 更新示例以匹配最新 InsightData 类型定义
 */

import type { InsightData } from '@/types/insight'

import { InsightCard } from './InsightCard'

// ============================================================================
// 示例 1: 正常的 Insight
// ============================================================================

const normalInsight: InsightData = {
  id: 'insight-1',
  type: 'strategy_create',
  explanation: '基于当前市场趋势，建议创建一个网格交易策略',
  params: [
    {
      key: 'grid_size',
      label: '网格数量',
      value: 10,
      level: 1,
      config: { type: 'number', min: 5, max: 50, precision: 0 },
    },
    {
      key: 'price_range',
      label: '价格区间',
      value: 5,
      level: 1,
      config: { type: 'number', unit: '%', precision: 1 },
    },
  ],
  impact: {
    confidence: 0.85,
    metrics: [
      {
        key: 'expectedReturn',
        label: '预期收益',
        value: 15.5,
        unit: '%',
        trend: 'up',
      },
      {
        key: 'winRate',
        label: '胜率',
        value: 68,
        unit: '%',
        trend: 'up',
      },
    ],
  },
  target: {
    symbol: 'BTC/USDT',
    name: '比特币',
  },
}

export function NormalInsightExample() {
  return (
    <InsightCard
      insight={normalInsight}
      status="pending"
      onExpand={() => console.log('展开')}
      onApprove={(params) => console.log('批准', params)}
      onReject={() => console.log('拒绝')}
    />
  )
}

// ============================================================================
// 示例 2: 缺少参数的 Insight (自动显示空状态)
// ============================================================================

const noParamsInsight: Insight = {
  id: 'insight-2',
  type: 'strategy_create',
  explanation: '建议创建一个新策略，但参数生成失败',
  params: [], // 空参数数组
  impact: {
    confidence: 0.6,
    metrics: [],
  },
}

export function NoParamsInsightExample() {
  return (
    <InsightCard insight={noParamsInsight} status="pending" onExpand={() => console.log('展开')} />
  )
}

// ============================================================================
// 示例 3: 缺少 Impact 的 Insight (仍然可以显示)
// ============================================================================

const noImpactInsight: Insight = {
  id: 'insight-3',
  type: 'strategy_modify',
  explanation: '建议调整止损位置',
  params: [
    {
      key: 'stop_loss',
      label: '止损位',
      value: 2.5,
      level: 1,
      config: { type: 'number', unit: '%', precision: 1 },
    },
  ],
  // impact: undefined, // 缺失
}

export function NoImpactInsightExample() {
  return (
    <InsightCard insight={noImpactInsight} status="pending" onExpand={() => console.log('展开')} />
  )
}

// ============================================================================
// 示例 4: 数值安全处理 - NaN/Infinity 防护
// ============================================================================

const unsafeNumbersInsight: Insight = {
  id: 'insight-4',
  type: 'backtest',
  explanation: '回测结果包含异常数值',
  params: [
    {
      key: 'leverage',
      label: '杠杆倍数',
      value: NaN, // 异常数值
      level: 1,
      config: { type: 'number', precision: 0 },
    },
  ],
  impact: {
    confidence: Infinity, // 异常置信度
    metrics: [
      {
        key: 'expectedReturn',
        label: '预期收益',
        value: -Infinity, // 异常收益
        unit: '%',
        trend: 'down',
      },
    ],
  },
}

export function UnsafeNumbersInsightExample() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">数值安全处理示例 (NaN/Infinity 会被安全处理为 0)</h3>
      <InsightCard
        insight={unsafeNumbersInsight}
        status="pending"
        onExpand={() => console.log('展开')}
      />
    </div>
  )
}

// ============================================================================
// 示例 5: Null Insight (自动显示空状态)
// ============================================================================

export function NullInsightExample() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Null Insight 示例</h3>
      <InsightCard
        insight={null as any} // 模拟 null insight
        status="pending"
        onExpand={() => console.log('展开')}
      />
    </div>
  )
}

// ============================================================================
// 示例 6: 紧凑模式
// ============================================================================

export function CompactInsightExample() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">紧凑模式</h3>
      <InsightCard
        insight={normalInsight}
        status="pending"
        compact
        onExpand={() => console.log('展开')}
      />
    </div>
  )
}

// ============================================================================
// 完整演示页面
// ============================================================================

export function InsightCardExamples() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-2xl font-bold">InsightCard 使用示例</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. 正常 Insight</h2>
        <NormalInsightExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. 缺少参数 (自动显示空状态)</h2>
        <NoParamsInsightExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. 缺少 Impact</h2>
        <NoImpactInsightExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. 异常数值处理</h2>
        <UnsafeNumbersInsightExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Null Insight</h2>
        <NullInsightExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. 紧凑模式</h2>
        <CompactInsightExample />
      </section>
    </div>
  )
}
