'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { InsightMessage } from '@/components/insight'
import { CanvasPanel } from '@/components/canvas'
import { DeployCanvas } from '@/components/canvas/DeployCanvas'
import { InsightCardLoading, useInsightLoadingState } from '@/components/thinking'
import { useMockThinkingStream } from '@/hooks/useThinkingStream'
import { useDeployment } from '@/hooks/useDeployment'
import type { InsightData, InsightParam, InsightCardStatus, InsightActionType } from '@/types/insight'
import type { DeployConfig } from '@/components/canvas/DeployCanvas'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** A2UI: InsightData for structured AI responses */
  insight?: InsightData | undefined
  /** A2UI: Status of the insight card */
  insightStatus?: InsightCardStatus | undefined
}

interface ChatInterfaceProps {
  onStrategyGenerated?: ((strategy: unknown) => void) | undefined
  /** A2UI: Called when user wants to expand insight to Canvas */
  onInsightExpand?: ((insight: InsightData) => void) | undefined
  /** A2UI: Called when user approves an insight */
  onInsightApprove?: ((insight: InsightData, params: InsightParam[]) => void) | undefined
  /** A2UI: Called when user rejects an insight */
  onInsightReject?: ((insight: InsightData) => void) | undefined
  /** Story 1.3: Called when deployment is triggered */
  onDeployRequest?: ((mode: 'paper' | 'live', strategyId: string) => void) | undefined
  /** Story 1.3: Called when deployment completes */
  onDeployComplete?: ((result: { success: boolean; message: string }) => void) | undefined
}

// =============================================================================
// ChatInterface Component - ChatGPT-style full-width chat
// =============================================================================

export function ChatInterface({
  onStrategyGenerated: _onStrategyGenerated,
  onInsightExpand,
  onInsightApprove,
  onInsightReject,
  onDeployRequest,
  onDeployComplete,
}: ChatInterfaceProps) {
  // ==========================================================================
  // State
  // ==========================================================================
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是 Delta AI，你的智能交易助手。我可以帮你：\n\n1. 创建自定义交易策略\n2. 分析市场趋势\n3. 优化现有策略\n4. 回答交易相关问题\n\n请告诉我你想做什么？',
      timestamp: Date.now() - 60000,
    },
  ])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // ==========================================================================
  // S71: Thinking Stream (流式渲染)
  // ==========================================================================
  // 开发环境使用 Mock，生产环境使用真实 WebSocket
  const {
    process: thinkingProcess,
    isThinking,
    startThinking,
    cancelThinking: _cancelThinking, // 预留取消功能
  } = useMockThinkingStream()

  // 3 阶段加载状态管理
  const { state: loadingState } = useInsightLoadingState(
    isThinking || isLoading,
    thinkingProcess ?? undefined
  )

  // A2UI: Canvas state
  const [canvasOpen, setCanvasOpen] = React.useState(false)
  const [canvasInsight, setCanvasInsight] = React.useState<InsightData | null>(null)
  const [canvasLoading, setCanvasLoading] = React.useState(false)

  // ==========================================================================
  // Story 1.3: Deployment State
  // ==========================================================================
  const [deployOpen, setDeployOpen] = React.useState(false)
  const [deployMode, setDeployMode] = React.useState<'paper' | 'live'>('paper')
  const [deployStrategyId, setDeployStrategyId] = React.useState<string>('')
  const [deployLoading, setDeployLoading] = React.useState(false)

  // useDeployment hook for API integration
  const {
    state: deployState,
    backtestResult,
    paperPerformance,
    deploy,
    reset: resetDeployment,
  } = useDeployment({
    strategyId: deployStrategyId,
    onSuccess: (result) => {
      // Add success message to chat
      const successMessage: Message = {
        id: `deploy_success_${Date.now()}`,
        role: 'assistant',
        content: `🚀 ${deployMode === 'paper' ? 'Paper' : 'Live'} 部署成功！\n\n${result.message}\n\nAgent ID: ${result.agentId}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, successMessage])
      setDeployOpen(false)
      setDeployLoading(false)
      resetDeployment()
      onDeployComplete?.({ success: true, message: result.message })
    },
    onError: (error) => {
      // Add error message to chat
      const errorMessage: Message = {
        id: `deploy_error_${Date.now()}`,
        role: 'assistant',
        content: `❌ 部署失败\n\n${error.toUserMessage()}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setDeployLoading(false)
      onDeployComplete?.({ success: false, message: error.message })
    },
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ==========================================================================
  // A2UI Handlers
  // ==========================================================================

  // A2UI: Handle insight expand to Canvas
  const handleInsightExpand = React.useCallback((insight: InsightData) => {
    setCanvasInsight(insight)
    setCanvasOpen(true)
    onInsightExpand?.(insight)
  }, [onInsightExpand])

  // A2UI: Handle Canvas close
  const handleCanvasClose = React.useCallback(() => {
    setCanvasOpen(false)
    setCanvasInsight(null)
    setCanvasLoading(false)
  }, [])

  // A2UI: Handle insight approval (from Canvas or InsightCard)
  const handleInsightApprove = React.useCallback((insight: InsightData, params: InsightParam[]) => {
    // Show loading state if Canvas is open
    if (canvasOpen) {
      setCanvasLoading(true)
    }

    // Simulate async approval process
    setTimeout(() => {
      // Update the message status
      setMessages(prev => prev.map(msg =>
        msg.insight?.id === insight.id
          ? { ...msg, insightStatus: 'approved' as InsightCardStatus }
          : msg
      ))

      // Close Canvas and reset loading
      setCanvasLoading(false)
      setCanvasOpen(false)
      setCanvasInsight(null)

      // Add confirmation message
      const confirmMessage: Message = {
        id: `confirm_${Date.now()}`,
        role: 'assistant',
        content: `✅ 策略已批准并创建！您可以在策略列表中查看和管理此策略。\n\n使用的参数：\n${params.map(p => `• ${p.label}: ${p.value}${p.config.unit || ''}`).join('\n')}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, confirmMessage])

      // Notify parent
      onInsightApprove?.(insight, params)
    }, 800)
  }, [canvasOpen, onInsightApprove])

  // A2UI: Handle insight rejection (from Canvas or InsightCard)
  const handleInsightReject = React.useCallback((insight: InsightData) => {
    // Update the message status
    setMessages(prev => prev.map(msg =>
      msg.insight?.id === insight.id
        ? { ...msg, insightStatus: 'rejected' as InsightCardStatus }
        : msg
    ))

    // Close Canvas if open
    setCanvasOpen(false)
    setCanvasInsight(null)

    // Add rejection message
    const rejectMessage: Message = {
      id: `reject_${Date.now()}`,
      role: 'assistant',
      content: '已拒绝此策略建议。您可以告诉我您想要调整的方向，我会重新为您生成策略提案。',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, rejectMessage])

    // Notify parent
    onInsightReject?.(insight)
  }, [onInsightReject])

  // ==========================================================================
  // Story 1.3: Deployment Handlers
  // ==========================================================================

  /**
   * Trigger deployment canvas when insight contains deploy actions
   */
  const handleInsightAction = React.useCallback((insight: InsightData, action: InsightActionType) => {
    if (action === 'deploy_paper' || action === 'deploy_live') {
      const strategyId = insight.target?.strategy_id || insight.id
      setDeployStrategyId(strategyId)
      setDeployMode(action === 'deploy_paper' ? 'paper' : 'live')
      setDeployOpen(true)
      onDeployRequest?.(action === 'deploy_paper' ? 'paper' : 'live', strategyId)
    }
  }, [onDeployRequest])

  /**
   * Handle deploy from DeployCanvas
   */
  const handleDeploy = React.useCallback(async (config: DeployConfig) => {
    setDeployLoading(true)
    try {
      await deploy(config)
    } catch {
      // Error handled in useDeployment onError callback
    }
  }, [deploy])

  /**
   * Handle deploy canvas close
   */
  const handleDeployCancel = React.useCallback(() => {
    setDeployOpen(false)
    setDeployLoading(false)
    resetDeployment()
  }, [resetDeployment])

  /**
   * Check if insight has deploy actions and trigger deploy canvas
   */
  React.useEffect(() => {
    // Auto-detect deploy actions from insights
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.insight?.actions) {
      const deployAction = lastMessage.insight.actions.find(
        (a): a is 'deploy_paper' | 'deploy_live' =>
          a === 'deploy_paper' || a === 'deploy_live'
      )
      if (deployAction) {
        handleInsightAction(lastMessage.insight, deployAction)
      }
    }
  }, [messages, handleInsightAction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)

    // S71: 启动思考流程
    startThinking(userInput)

    // 模拟AI响应 - A2UI: 返回 InsightData
    setTimeout(() => {
      // 模拟 InsightData 结构 - 展示 A2UI 完整功能
      const mockInsight: InsightData = {
        id: `insight_${Date.now()}`,
        type: 'strategy_create',
        target: {
          strategy_id: 'new',
          name: 'RSI 反转策略',
          symbol: 'BTC/USDT',
        },
        params: [
          {
            key: 'risk_level',
            label: '风险等级',
            type: 'heatmap_slider',
            value: 50,
            level: 1,
            config: {
              min: 0,
              max: 100,
              step: 1,
              heatmap_zones: [
                { start: 0, end: 33, color: 'green', label: '保守' },
                { start: 33, end: 66, color: 'gray', label: '中性' },
                { start: 66, end: 100, color: 'red', label: '激进' },
              ],
            },
            description: '选择交易风险偏好',
          },
          {
            key: 'symbol',
            label: '交易对',
            type: 'select',
            value: 'BTC/USDT',
            level: 1,
            config: {
              options: [
                { value: 'BTC/USDT', label: 'BTC/USDT' },
                { value: 'ETH/USDT', label: 'ETH/USDT' },
                { value: 'SOL/USDT', label: 'SOL/USDT' },
              ],
            },
          },
          {
            key: 'position_size',
            label: '仓位大小',
            type: 'slider',
            value: 10,
            level: 1,
            config: {
              min: 1,
              max: 50,
              step: 1,
              unit: '%',
              precision: 0,
            },
            description: '单笔交易仓位占总资金比例',
          },
          {
            key: 'stop_loss',
            label: '止损点',
            type: 'slider',
            value: 3,
            level: 1,
            config: {
              min: 0.5,
              max: 10,
              step: 0.5,
              unit: '%',
              precision: 1,
            },
            constraints: [
              {
                type: 'dependency',
                related_param: 'take_profit',
                rule: '< take_profit',
                message: '止损必须小于止盈',
              },
            ],
          },
          {
            key: 'take_profit',
            label: '止盈点',
            type: 'slider',
            value: 9,
            level: 1,
            config: {
              min: 1,
              max: 20,
              step: 0.5,
              unit: '%',
              precision: 1,
            },
            constraints: [
              {
                type: 'dependency',
                related_param: 'stop_loss',
                rule: '> stop_loss',
                message: '止盈必须大于止损',
              },
            ],
          },
          {
            key: 'timeframe',
            label: '时间周期',
            type: 'button_group',
            value: '4h',
            level: 1,
            config: {
              options: [
                { value: '1h', label: '1小时' },
                { value: '4h', label: '4小时' },
                { value: '1d', label: '1天' },
              ],
            },
          },
        ],
        impact: {
          metrics: [
            {
              key: 'expectedReturn',
              label: '预期收益',
              value: 12.5,
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
            {
              key: 'maxDrawdown',
              label: '最大回撤',
              value: 6.2,
              unit: '%',
              trend: 'down',
            },
          ],
          confidence: 0.78,
          sample_size: 90,
        },
        explanation: '根据您的描述，我建议使用 RSI 反转策略。该策略在 RSI 低于 30 时买入，高于 70 时卖出。基于过去 90 天的回测数据，预期年化收益约 12.5%，胜率约 68%。',
        created_at: new Date().toISOString(),
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockInsight.explanation,
        timestamp: Date.now(),
        insight: mockInsight,
        insightStatus: 'pending',
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const quickPrompts = [
    '创建一个简单的网格交易策略',
    '基于RSI指标的交易策略',
    '分析BTC当前趋势',
    '优化我的均线策略',
  ]

  return (
    <div className={cn(
      'flex flex-col h-full transition-all duration-300 ease-out',
      (canvasOpen || deployOpen) && 'lg:mr-[520px]',
    )}>
      {/* Chat Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">Delta AI 策略助手</h1>
            <p className="text-xs text-muted-foreground">
              使用 AI 创建和管理你的交易策略
            </p>
          </div>
        </div>
        <Badge variant="success" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          在线
        </Badge>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            // A2UI: Use InsightMessage for messages with InsightData
            message.insight ? (
              <InsightMessage
                key={message.id}
                insight={message.insight}
                status={message.insightStatus}
                timestamp={message.timestamp}
                onExpand={handleInsightExpand}
                onApprove={handleInsightApprove}
                onReject={handleInsightReject}
              />
            ) : (
              <ChatMessage key={message.id} message={message} />
            )
          ))}
          {/* S71: 流式渲染 - 3 阶段加载 */}
          {(isLoading || isThinking) && (
            <div className="flex gap-3">
              {/* AI Avatar */}
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              {/* InsightCard 3 阶段加载: skeleton → thinking → filling */}
              <div className="flex-1 max-w-xl">
                <InsightCardLoading state={loadingState} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div className="text-xs text-muted-foreground mb-2">快速开始:</div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(prompt)}
                className="text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="描述你想要的交易策略..."
                disabled={isLoading || isThinking}
                className={cn(
                  'w-full h-12 px-4 pr-12 rounded-xl',
                  'bg-card border border-border',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                  'disabled:opacity-50',
                  'transition-all duration-200',
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || isThinking || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Delta AI 可能会产生错误。请核实重要信息。
          </p>
        </div>
      </div>

      {/* A2UI: Canvas Panel - ChatGPT style sliding sidebar */}
      <CanvasPanel
        insight={canvasInsight}
        isOpen={canvasOpen}
        onClose={handleCanvasClose}
        onApprove={handleInsightApprove}
        onReject={(insight) => handleInsightReject(insight)}
        isLoading={canvasLoading}
      />

      {/* Story 1.3: Deploy Canvas */}
      <DeployCanvas
        strategyId={deployStrategyId}
        strategyName={messages.find(m => m.insight?.target?.strategy_id === deployStrategyId)?.insight?.target?.name}
        symbol={messages.find(m => m.insight?.target?.strategy_id === deployStrategyId)?.insight?.target?.symbol}
        mode={deployMode}
        backtestResult={backtestResult || { passed: true, expectedReturn: 0, maxDrawdown: 0, winRate: 0 }}
        paperPerformance={paperPerformance || undefined}
        isOpen={deployOpen}
        onDeploy={handleDeploy}
        onCancel={handleDeployCancel}
        isLoading={deployLoading || deployState.phase === 'deploying'}
      />
    </div>
  )
}

// =============================================================================
// ChatMessage Component
// =============================================================================

interface ChatMessageProps {
  message: Message
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary' : 'bg-muted',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 max-w-[85%]', isUser && 'flex justify-end')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border',
          )}
        >
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
          <div
            className={cn(
              'text-xs mt-2',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
