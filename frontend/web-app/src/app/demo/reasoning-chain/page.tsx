'use client'

/**
 * ReasoningChain Demo Page
 *
 * Demonstrates the AI reasoning chain visualization feature
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReasoningChainView } from '@/components/insight/ReasoningChainView'
import type { ReasoningChain, NodeAction } from '@/types/reasoning'

export default function ReasoningChainDemoPage() {
  const [chain, setChain] = React.useState<ReasoningChain>(mockReasoningChain)

  const handleNodeAction = (nodeId: string, action: NodeAction, input?: string) => {
    console.log('Node action:', { nodeId, action, input })

    // Update node status based on action
    setChain(prevChain => ({
      ...prevChain,
      nodes: prevChain.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            status: action === 'confirm' ? 'confirmed' : action === 'challenge' ? 'challenged' : action === 'skip' ? 'skipped' : node.status,
            interactions: [
              ...node.interactions,
              {
                action,
                timestamp: new Date().toISOString(),
                input,
              },
            ],
          }
        }
        return node
      }),
      confirmed_count: prevChain.nodes.filter(n => n.id === nodeId ? action === 'confirm' : n.status === 'confirmed').length,
    }))
  }

  const handleBranchSelect = (nodeId: string, branchId: string) => {
    console.log('Branch selected:', { nodeId, branchId })
    alert(`您选择了分支: ${branchId}\n这将探索其他策略可能性`)
  }

  const resetChain = () => {
    setChain(mockReasoningChain)
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">AI 推理链可视化演示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              这个演示展示了 <strong>AI 推理链</strong> 功能。当用户请求创建策略时，AI 会展示其完整的思考过程：
            </p>
            <ul>
              <li><strong>理解意图</strong> - AI 如何解读用户的请求</li>
              <li><strong>市场分析</strong> - AI 如何分析当前市场状态</li>
              <li><strong>决策推荐</strong> - AI 如何得出最终建议</li>
            </ul>
            <p>用户可以在任意步骤进行：</p>
            <ul>
              <li>✅ <strong>确认</strong> - 认同这一步的推理</li>
              <li>⚠️ <strong>质疑</strong> - 对这一步提出疑问</li>
              <li>✏️ <strong>修改</strong> - 调整这一步的参数</li>
              <li>⏭️ <strong>跳过</strong> - 忽略这一步继续</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={resetChain} variant="outline">
              重置推理链
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReasoningChainView
        chain={chain}
        displayMode="expanded"
        onNodeAction={handleNodeAction}
        onBranchSelect={handleBranchSelect}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">当前状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">已确认步骤:</span>
              <span className="font-medium">{chain.confirmed_count} / {chain.total_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">整体置信度:</span>
              <span className="font-medium">{Math.round(chain.overall_confidence * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">推理状态:</span>
              <span className="font-medium">
                {chain.status === 'in_progress' ? '进行中' :
                  chain.status === 'completed' ? '已完成' :
                  chain.status === 'needs_input' ? '需要输入' :
                  chain.status === 'modified' ? '已修改' : '已取消'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Mock Data
// =============================================================================

const mockReasoningChain: ReasoningChain = {
  id: 'chain-demo-1',
  user_input: '我想创建一个保守型BTC策略',
  nodes: [
    {
      id: 'node-1',
      type: 'understanding',
      title: '理解用户意图',
      content: `用户希望创建一个**保守型**的BTC交易策略。

关键要素识别：
• **风险偏好**: 保守型（低风险）
• **标的资产**: BTC
• **策略目标**: 稳健收益，风险可控

基于这些信息，我将推荐适合保守投资者的策略类型。`,
      confidence: 0.95,
      status: 'auto',
      evidence: [
        {
          type: 'pattern',
          label: '意图识别',
          value: '策略创建',
          significance: 'high',
        },
        {
          type: 'pattern',
          label: '风险偏好',
          value: '保守型',
          significance: 'high',
        },
      ],
      branches: [],
      interactions: [],
      available_actions: ['expand', 'collapse'],
      children: [],
      created_at: '2025-12-29T00:00:00Z',
      expanded: true,
      highlight: true,
    },
    {
      id: 'node-2',
      type: 'analysis',
      title: '当前市场状态分析',
      content: `BTC 市场分析（基于实时数据）：

**价格水平**
• 当前价格: $96,234
• 24h 涨跌: -2.3%
• 近期高点: $99,500 (支撑转阻力)
• 近期低点: $94,800 (当前支撑)

**技术指标**
• RSI(14): 32 → **超卖区域**
• MACD: 死叉，但开始收敛
• 布林带: 价格触及下轨

**市场情绪**
• 波动率: 中等 (适合趋势策略)
• 成交量: 近期放量下跌后缩量
• 恐慌贪婪指数: 35 (恐慌)

**结论**: 当前处于超卖状态，适合布局抄底策略。`,
      confidence: 0.88,
      status: 'pending',
      evidence: [
        {
          type: 'indicator',
          label: 'RSI',
          value: 32,
          significance: 'high',
        },
        {
          type: 'price_level',
          label: '当前价格',
          value: '$96,234',
          significance: 'high',
        },
        {
          type: 'volume',
          label: '成交量',
          value: '正常',
          significance: 'medium',
        },
      ],
      branches: [],
      interactions: [],
      available_actions: ['confirm', 'challenge', 'modify', 'skip'],
      children: [],
      created_at: '2025-12-29T00:00:00Z',
      expanded: false,
      highlight: false,
    },
    {
      id: 'node-3',
      type: 'decision',
      title: '策略类型决策',
      content: `基于**保守型**风险偏好和**超卖**市场状态，我推荐使用 **RSI 超卖抄底策略**。

**选择理由**：
✅ RSI < 35，符合超卖条件
✅ 历史回测胜率 78%（保守型策略中表现优异）
✅ 风险可控，止损明确
✅ 适合震荡/下跌市场布局

**风险控制措施**：
• 止损设置: **3%** (而非默认5%)
• 止盈设置: **5%**
• 仓位控制: **20%** (而非默认30%)
• 最大回撤: 严格限制在 8% 以内`,
      confidence: 0.92,
      status: 'pending',
      evidence: [
        {
          type: 'history',
          label: '历史胜率',
          value: '78%',
          significance: 'high',
        },
        {
          type: 'indicator',
          label: '夏普比率',
          value: 1.8,
          significance: 'medium',
        },
      ],
      branches: [
        {
          id: 'branch-1',
          label: '定投策略',
          description: '也可以考虑定期定额投资，分散入场时间风险',
          probability: 0.65,
          trade_offs: ['更分散风险', '收益相对较低', '需要更长周期'],
        },
        {
          id: 'branch-2',
          label: '网格策略',
          description: '在震荡区间内设置多个买卖网格',
          probability: 0.55,
          trade_offs: ['适合震荡行情', '趋势行情表现一般', '需要更多资金'],
        },
      ],
      interactions: [],
      available_actions: ['confirm', 'challenge', 'modify', 'skip', 'branch'],
      children: [],
      created_at: '2025-12-29T00:00:00Z',
      expanded: false,
      highlight: true,
    },
    {
      id: 'node-4',
      type: 'recommendation',
      title: '最终策略推荐',
      content: `**策略名称**: BTC 保守型 RSI 超卖策略

**核心参数**:
• 交易对: BTC/USDT
• 时间周期: 4小时
• 入场条件: RSI(14) < 35 且价格触及布林带下轨
• 出场条件: 止盈 5% 或 止损 3%
• 仓位: 每次开仓 20% 账户资金
• 最大持仓: 2 个仓位

**预期表现** (基于180天回测):
• 年化收益: **28.5%**
• 最大回撤: **-6.8%**
• 夏普比率: **1.8**
• 总交易次数: 42 次
• 胜率: **78%**

**风险提示**:
⚠️ 极端行情下止损可能无法精确执行
⚠️ 建议配合手动监控，关注市场重大新闻
⚠️ 首次运行建议使用 Paper Trading 模式测试`,
      confidence: 0.85,
      status: 'pending',
      evidence: [],
      branches: [],
      interactions: [],
      available_actions: ['confirm', 'modify', 'skip'],
      children: [],
      created_at: '2025-12-29T00:00:00Z',
      expanded: false,
      highlight: true,
    },
  ],
  status: 'in_progress',
  active_node_id: 'node-2',
  overall_confidence: 0.89,
  confirmed_count: 1,
  total_count: 4,
  created_at: '2025-12-29T00:00:00Z',
  updated_at: '2025-12-29T00:00:00Z',
}
