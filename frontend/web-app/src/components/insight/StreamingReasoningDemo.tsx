'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { useReasoningStream } from '@/hooks/useReasoningStream'
import type { ReasoningChain, ReasoningNode } from '@/types/reasoning'

import { ReasoningChainView } from './ReasoningChainView'

/**
 * StreamingReasoningDemo - 流式推理链演示组件
 *
 * 演示如何使用 useReasoningStream Hook 和 ReasoningChainView 实现流式推理链展示
 */
export function StreamingReasoningDemo() {
  const [chain, setChain] = React.useState<ReasoningChain | null>(null)

  const { nodes, isStreaming, startStream, stopStream, reset, error } = useReasoningStream({
    onNodeAdded: (node) => {
      console.log('新节点添加:', node.title)
    },
    onComplete: (allNodes) => {
      console.log('推理链完成，共', allNodes.length, '个节点')
      // 构建完整的 ReasoningChain
      buildReasoningChain(allNodes)
    },
    onError: (err) => {
      console.error('推理链错误:', err)
    },
  })

  // 构建 ReasoningChain 对象
  const buildReasoningChain = (allNodes: ReasoningNode[]) => {
    const confirmedCount = allNodes.filter((n) => n.status === 'confirmed').length
    const overallConfidence =
      allNodes.reduce((sum, n) => sum + n.confidence, 0) / allNodes.length

    setChain({
      id: `chain_${Date.now()}`,
      user_input: '帮我分析 BTC 是否值得现在入场',
      nodes: allNodes,
      status: 'completed',
      total_count: allNodes.length,
      confirmed_count: confirmedCount,
      overall_confidence: overallConfidence,
      active_node_id: null,
      created_at: Date.now(),
    })
  }

  // 实时构建推理链 (用于流式展示)
  React.useEffect(() => {
    if (nodes.length > 0) {
      const confirmedCount = nodes.filter((n) => n.status === 'confirmed').length
      const overallConfidence = nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length

      setChain({
        id: `chain_${Date.now()}`,
        user_input: '帮我分析 BTC 是否值得现在入场',
        nodes: nodes,
        status: isStreaming ? 'in_progress' : 'completed',
        total_count: nodes.length,
        confirmed_count: confirmedCount,
        overall_confidence: overallConfidence,
        active_node_id: isStreaming ? nodes[nodes.length - 1]?.id : null,
        created_at: Date.now(),
      })
    }
  }, [nodes, isStreaming])

  const handleStart = () => {
    reset()
    startStream('帮我分析 BTC 是否值得现在入场', 'demo_user')
  }

  const handleNodeAction = (
    nodeId: string,
    action: 'confirm' | 'challenge' | 'modify' | 'skip',
    input?: string
  ) => {
    console.log(`节点 ${nodeId} 执行操作: ${action}`, input)
  }

  const handleBranchSelect = (nodeId: string, branchId: string) => {
    console.log(`节点 ${nodeId} 选择分支: ${branchId}`)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Button onClick={handleStart} disabled={isStreaming}>
          {isStreaming ? '正在思考...' : '开始推理'}
        </Button>
        {isStreaming && (
          <Button variant="outline" onClick={stopStream}>
            停止
          </Button>
        )}
        {chain && !isStreaming && (
          <Button variant="outline" onClick={reset}>
            重置
          </Button>
        )}
        {isStreaming && (
          <span className="text-sm text-muted-foreground">已接收 {nodes.length} 个节点</span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          错误: {error}
        </div>
      )}

      {chain && (
        <ReasoningChainView
          chain={chain}
          displayMode="expanded"
          defaultExpanded
          onNodeAction={handleNodeAction}
          onBranchSelect={handleBranchSelect}
        />
      )}

      {!chain && !isStreaming && (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          点击"开始推理"查看流式推理链效果
        </div>
      )}
    </div>
  )
}

export default StreamingReasoningDemo
