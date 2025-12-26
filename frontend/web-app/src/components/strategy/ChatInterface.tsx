'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { InsightMessage } from '@/components/insight'
import { CanvasPanel } from '@/components/canvas'
import { DeployCanvas } from '@/components/canvas/DeployCanvas'
import { BacktestCanvas } from '@/components/canvas/BacktestCanvas'
import { MonitorCanvas } from '@/components/canvas/MonitorCanvas'
import { InsightCardLoading, useInsightLoadingState } from '@/components/thinking'
import { useDeployment } from '@/hooks/useDeployment'
import { useBacktest } from '@/hooks/useBacktest'
import { useMonitor } from '@/hooks/useMonitor'
import { useChat } from '@/hooks/useAI'
import { AIConfigPanel } from '@/components/ai'
import { generateSystemPrompt, extractInsightData, validateInsightData } from '@/lib/prompts/strategy-assistant'
import type { StrategyStatus } from '@/components/canvas/MonitorCanvas'
import type { InsightData, InsightParam, InsightCardStatus, InsightActionType } from '@/types/insight'
import type { DeployConfig } from '@/components/canvas/DeployCanvas'
import type { BacktestConfig } from '@/types/backtest'
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
  /** Story 2.3: Called when backtest is triggered */
  onBacktestRequest?: ((strategyId: string) => void) | undefined
  /** Story 2.3: Called when backtest completes */
  onBacktestComplete?: ((result: { passed: boolean; metrics: unknown }) => void) | undefined
  /** Story 3.3: Called when monitor is opened */
  onMonitorRequest?: ((agentId: string) => void) | undefined
  /** Story 3.3: Called when strategy status changes */
  onStrategyStatusChange?: ((agentId: string, status: StrategyStatus) => void) | undefined
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
  onBacktestRequest,
  onBacktestComplete,
  onMonitorRequest,
  onStrategyStatusChange,
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
  // AI Engine Integration
  // ==========================================================================

  // AI Chat Hook - 通过后端 API 代理调用
  const {
    sendStream,
    cancel: cancelAI,
    isLoading: isAILoading,
    streamContent,
    thinkingSteps,
    error: aiError,
    currentModel,
    canUseAI,
    disabledReason
  } = useChat({
    onSuccess: (response) => {
      console.log('[AI] Response received:', response.model, response.usage)
    },
    onError: (error) => {
      console.error('[AI] Error:', error.message)
    },
    onThinking: (step) => {
      console.log('[AI] Thinking step:', step.title)
    }
  })

  // AI 配置面板状态
  const [configPanelOpen, setConfigPanelOpen] = React.useState(false)

  // 组合加载状态
  const isThinking = isAILoading

  // 3 阶段加载状态管理
  // Note: thinkingProcess 需要完整的 ThinkingProcess 类型
  // 目前使用简化的 autoProgress 模式，不传递 thinkingProcess
  const { state: loadingState } = useInsightLoadingState(
    isThinking || isLoading,
    undefined // 使用自动进度模式
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

  // ==========================================================================
  // Story 2.3: Backtest State
  // ==========================================================================
  const [backtestOpen, setBacktestOpen] = React.useState(false)
  const [backtestStrategyId, setBacktestStrategyId] = React.useState<string>('')
  const [backtestInsight, setBacktestInsight] = React.useState<InsightData | null>(null)

  // ==========================================================================
  // Story 3.3: Monitor State
  // ==========================================================================
  const [monitorOpen, setMonitorOpen] = React.useState(false)
  const [monitorAgentId, setMonitorAgentId] = React.useState<string>('')

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

  // ==========================================================================
  // Story 2.3: useBacktest Hook
  // ==========================================================================
  const {
    state: backtestState,
    isRunning: isBacktestRunning,
    isPassed: _isBacktestPassed, // Reserved for future use
    startBacktest,
    pauseBacktest,
    resumeBacktest,
    cancelBacktest: stopBacktest,
    reset: resetBacktest,
  } = useBacktest({
    strategyId: backtestStrategyId,
    onSuccess: (result) => {
      // Add success message to chat
      const { metrics } = result
      const passed = metrics.totalReturn > 0 && metrics.maxDrawdown > -30 && metrics.winRate > 40
      const successMessage: Message = {
        id: `backtest_success_${Date.now()}`,
        role: 'assistant',
        content: `🎉 回测完成！

📊 **关键指标**
- 总收益率: ${metrics.totalReturn.toFixed(2)}%
- 年化收益率: ${metrics.annualizedReturn.toFixed(2)}%
- 最大回撤: ${metrics.maxDrawdown.toFixed(2)}%
- 夏普比率: ${metrics.sharpeRatio.toFixed(2)}
- 胜率: ${metrics.winRate.toFixed(2)}%
- 总交易次数: ${metrics.totalTrades}

${passed ? '✅ 策略通过回测验证，可以进行 Paper 部署。' : '⚠️ 策略未达到部署标准，建议优化参数。'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, successMessage])
      setBacktestOpen(false)
      onBacktestComplete?.({ passed, metrics })
    },
    onError: (error) => {
      // Add error message to chat
      const errorMessage: Message = {
        id: `backtest_error_${Date.now()}`,
        role: 'assistant',
        content: `❌ 回测失败\n\n${error.message}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      onBacktestComplete?.({ passed: false, metrics: null })
    },
  })

  // ==========================================================================
  // Story 3.3: useMonitor Hook
  // ==========================================================================
  // Use refs to store latest state for callbacks
  const monitorStateRef = React.useRef<{
    strategy: { name: string } | null
    pnl: { total: number } | null
    metrics: { winRate: number; totalTrades: number } | null
  }>({
    strategy: null,
    pnl: null,
    metrics: null,
  })

  const handleMonitorError = React.useCallback((error: Error) => {
    const errorMessage: Message = {
      id: `monitor_error_${Date.now()}`,
      role: 'assistant',
      content: `❌ 监控错误\n\n${error.message}`,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, errorMessage])
  }, [])

  const handleMonitorStatusChange = React.useCallback((status: StrategyStatus) => {
    const currentState = monitorStateRef.current
    const strategyName = currentState.strategy?.name || '策略'

    // Add status change message to chat
    let statusMessage: Message | null = null

    if (status === 'paused') {
      statusMessage = {
        id: `monitor_paused_${Date.now()}`,
        role: 'assistant',
        content: `⏸️ 策略 "${strategyName}" 已暂停运行。

当前状态：
- 持仓已保留，不会自动平仓
- 策略不会执行新的交易
- 可随时恢复运行

需要恢复运行吗？`,
        timestamp: Date.now(),
      }
    } else if (status === 'running') {
      statusMessage = {
        id: `monitor_resumed_${Date.now()}`,
        role: 'assistant',
        content: `▶️ 策略 "${strategyName}" 已恢复运行。

策略将继续按照设定的参数执行交易。`,
        timestamp: Date.now(),
      }
    } else if (status === 'stopped') {
      const pnl = currentState.pnl
      const metrics = currentState.metrics
      statusMessage = {
        id: `monitor_stopped_${Date.now()}`,
        role: 'assistant',
        content: `🛑 策略 "${strategyName}" 已停止。

最终统计：
- 总盈亏: ${pnl ? (pnl.total >= 0 ? '+' : '') + pnl.total.toFixed(2) : '0.00'} USDT
- 胜率: ${metrics ? (metrics.winRate * 100).toFixed(1) : '0.0'}%
- 总交易: ${metrics?.totalTrades ?? 0} 次

策略已完全停止，需要重新部署才能再次运行。`,
        timestamp: Date.now(),
      }
      // Close monitor canvas when stopped
      setMonitorOpen(false)
    }

    if (statusMessage) {
      setMessages((prev) => [...prev, statusMessage])
    }

    // Notify parent
    onStrategyStatusChange?.(monitorAgentId, status)
  }, [monitorAgentId, onStrategyStatusChange])

  const {
    state: monitorState,
    isRunning: _isMonitorRunning, // Reserved for future use
    isPaused: _isMonitorPaused,   // Reserved for future use
    pauseAgent,
    resumeAgent,
    stopAgent,
  } = useMonitor({
    agentId: monitorAgentId,
    enabled: monitorOpen,
    onStatusChange: handleMonitorStatusChange,
    onError: handleMonitorError,
  })

  // Keep ref in sync with latest state
  React.useEffect(() => {
    monitorStateRef.current = {
      strategy: monitorState.strategy,
      pnl: monitorState.pnl,
      metrics: monitorState.metrics,
    }
  }, [monitorState.strategy, monitorState.pnl, monitorState.metrics])

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
   * Trigger deployment or backtest canvas when insight contains actions
   */
  const handleInsightAction = React.useCallback((insight: InsightData, action: InsightActionType) => {
    if (action === 'deploy_paper' || action === 'deploy_live') {
      const strategyId = insight.target?.strategy_id || insight.id
      setDeployStrategyId(strategyId)
      setDeployMode(action === 'deploy_paper' ? 'paper' : 'live')
      setDeployOpen(true)
      onDeployRequest?.(action === 'deploy_paper' ? 'paper' : 'live', strategyId)
    } else if (action === 'run_backtest') {
      // Story 2.3: Handle backtest action
      const strategyId = insight.target?.strategy_id || insight.id
      setBacktestStrategyId(strategyId)
      setBacktestInsight(insight)
      setBacktestOpen(true)
      onBacktestRequest?.(strategyId)
    } else if (action === 'stop_agent') {
      // Story 3.3: Handle monitor/stop_agent action
      const agentId = insight.target?.agent_id || insight.target?.strategy_id || insight.id
      setMonitorAgentId(agentId)
      setMonitorOpen(true)
      onMonitorRequest?.(agentId)
    }
  }, [onDeployRequest, onBacktestRequest, onMonitorRequest])

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

  // ==========================================================================
  // Story 2.3: Backtest Handlers
  // ==========================================================================

  /**
   * Extract backtest config from insight
   */
  const extractBacktestConfig = React.useCallback((insight: InsightData): BacktestConfig => {
    const target = insight.target
    const params = insight.params || []

    // Extract config from insight params
    const getParamValue = <T,>(key: string, defaultValue: T): T => {
      const param = params.find(p => p.key === key)
      return param ? (param.value as T) : defaultValue
    }

    return {
      name: target?.name || '策略回测',
      symbol: target?.symbol || 'BTC/USDT',
      strategyType: 'custom',
      startDate: getParamValue('start_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || ''),
      endDate: getParamValue('end_date', new Date().toISOString().split('T')[0] || ''),
      initialCapital: getParamValue('initial_capital', 10000),
      feeRate: getParamValue('fee_rate', 0.1),
      slippage: getParamValue('slippage', 0.05),
      params: Object.fromEntries(
        params.map(p => [p.key, p.value])
      ),
    }
  }, [])

  /**
   * Handle backtest start from BacktestCanvas
   */
  const handleBacktestStart = React.useCallback(async () => {
    if (!backtestInsight) return

    const config = extractBacktestConfig(backtestInsight)
    try {
      await startBacktest(config)
    } catch {
      // Error handled in useBacktest onError callback
    }
  }, [backtestInsight, extractBacktestConfig, startBacktest])

  // Auto-start backtest when canvas opens
  React.useEffect(() => {
    if (backtestOpen && backtestInsight && backtestState.phase === 'idle') {
      handleBacktestStart()
    }
  }, [backtestOpen, backtestInsight, backtestState.phase, handleBacktestStart])

  /**
   * Handle backtest canvas close
   */
  const handleBacktestClose = React.useCallback(() => {
    if (isBacktestRunning) {
      stopBacktest()
    }
    setBacktestOpen(false)
    setBacktestInsight(null)
    resetBacktest()
  }, [isBacktestRunning, stopBacktest, resetBacktest])

  // ==========================================================================
  // Story 3.3: Monitor Handlers
  // ==========================================================================

  /**
   * Handle monitor canvas close
   */
  const handleMonitorClose = React.useCallback(() => {
    setMonitorOpen(false)
    setMonitorAgentId('')
  }, [])

  /**
   * Check if insight has deploy, backtest, or monitor actions and trigger corresponding canvas
   */
  React.useEffect(() => {
    // Auto-detect actions from insights
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.insight?.actions) {
      // Check for deploy actions
      const deployAction = lastMessage.insight.actions.find(
        (a): a is 'deploy_paper' | 'deploy_live' =>
          a === 'deploy_paper' || a === 'deploy_live'
      )
      if (deployAction) {
        handleInsightAction(lastMessage.insight, deployAction)
        return
      }

      // Check for backtest action
      const backtestAction = lastMessage.insight.actions.find(
        (a): a is 'run_backtest' => a === 'run_backtest'
      )
      if (backtestAction) {
        handleInsightAction(lastMessage.insight, backtestAction)
        return
      }

      // Story 3.3: Check for monitor/stop_agent action
      const monitorAction = lastMessage.insight.actions.find(
        (a): a is 'stop_agent' => a === 'stop_agent'
      )
      if (monitorAction) {
        handleInsightAction(lastMessage.insight, monitorAction)
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

    // 检查是否可以使用 AI
    if (!canUseAI) {
      setConfigPanelOpen(true)
      return
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)

    // 使用真实 AI 进行响应
    try {
      // 生成带上下文的 System Prompt
      const systemPrompt = generateSystemPrompt({
        marketData: { btcPrice: 42000, ethPrice: 2200 }
      })

      const finalContent = await sendStream(userInput, {
        systemPrompt,
        context: { marketData: { btcPrice: 42000, ethPrice: 2200 } }
      })

      // 检查是否有有效内容
      if (!finalContent) {
        throw new Error('AI 未返回有效内容')
      }

      // 从 AI 响应中提取 InsightData (A2UI 核心逻辑)
      const { textContent, insightData } = extractInsightData(finalContent)
      let insight: InsightData | undefined = undefined

      // 验证并构建 InsightData
      if (insightData && validateInsightData(insightData)) {
        // 构建基础对象
        const builtInsight: InsightData = {
          id: `insight_${Date.now()}`,
          type: insightData.type as InsightData['type'],
          params: (insightData.params as InsightParam[]) || [],
          explanation: textContent,
          created_at: new Date().toISOString(),
        }

        // 有条件添加可选字段
        if (insightData.target) {
          Object.assign(builtInsight, { target: insightData.target })
        }
        if (insightData.impact) {
          Object.assign(builtInsight, { impact: insightData.impact })
        }
        if (insightData.actions) {
          Object.assign(builtInsight, { actions: insightData.actions })
        }

        insight = builtInsight
        console.log('[A2UI] InsightData extracted:', builtInsight.type, builtInsight.params?.length, 'params')
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textContent, // 使用去掉 JSON 块的纯文本
        timestamp: Date.now(),
        insight,
        insightStatus: insight ? 'pending' : undefined,
      }
      setMessages((prev) => [...prev, aiMessage])

    } catch (error) {
      console.error('[ChatInterface] AI Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiError || '抱歉，AI 服务暂时不可用。请检查网络连接或 API Key 配置。',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = [
    '构建复杂逻辑',
    '创建一个简单的网格交易策略',
    '基于RSI指标的交易策略',
    '分析BTC当前趋势',
    '优化我的均线策略',
  ]

  return (
    <div className={cn(
      'flex flex-col h-full transition-all duration-300 ease-out',
      (canvasOpen || deployOpen || backtestOpen || monitorOpen) && 'lg:mr-[520px]',
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigPanelOpen(true)}
            className="h-8 w-8"
            title="AI 设置"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Badge variant={canUseAI ? 'success' : 'secondary'} className="gap-1">
            <div className={cn(
              'h-2 w-2 rounded-full',
              canUseAI ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            )} />
            {canUseAI ? (currentModel?.split('/')[1] || '在线') : (disabledReason || '不可用')}
          </Badge>
        </div>
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

      {/* Story 2.3: Backtest Canvas */}
      {backtestInsight && (
        <BacktestCanvas
          insight={backtestInsight}
          isOpen={backtestOpen}
          onClose={handleBacktestClose}
          onPause={pauseBacktest}
          onResume={resumeBacktest}
          onStop={stopBacktest}
          progress={backtestState.progress}
          status={
            backtestState.phase === 'running'
              ? 'running'
              : backtestState.phase === 'completed'
                ? 'completed'
                : backtestState.phase === 'failed'
                  ? 'failed'
                  : 'running'
          }
          metrics={{
            totalReturn: backtestState.result?.metrics.totalReturn ?? 0,
            winRate: backtestState.result?.metrics.winRate ?? 0,
            maxDrawdown: backtestState.result?.metrics.maxDrawdown ?? 0,
            sharpeRatio: backtestState.result?.metrics.sharpeRatio ?? 0,
            totalTrades: backtestState.result?.metrics.totalTrades ?? 0,
            winningTrades: Math.round((backtestState.result?.metrics.winRate ?? 0) * (backtestState.result?.metrics.totalTrades ?? 0) / 100),
            losingTrades: (backtestState.result?.metrics.totalTrades ?? 0) - Math.round((backtestState.result?.metrics.winRate ?? 0) * (backtestState.result?.metrics.totalTrades ?? 0) / 100),
            avgProfit: backtestState.result?.metrics.avgWin ?? 0,
            avgLoss: backtestState.result?.metrics.avgLoss ?? 0,
          }}
          trades={
            backtestState.result?.trades.map((t) => ({
              id: t.id,
              timestamp: new Date(t.entryTime).getTime(),
              type: t.side,
              symbol: t.symbol,
              price: t.entryPrice,
              quantity: t.quantity,
              pnl: t.pnl,
              pnlPercent: t.pnlPercent,
              status: 'closed' as const,
            })) ?? []
          }
          equityCurve={
            backtestState.result?.equity.map((e) => ({
              timestamp: new Date(e.date).getTime(),
              value: e.equity,
            })) ?? []
          }
        />
      )}

      {/* Story 3.3: Monitor Canvas */}
      {monitorOpen && monitorState.strategy && (
        <MonitorCanvas
          strategyId={monitorAgentId}
          isOpen={monitorOpen}
          onClose={handleMonitorClose}
          onPause={pauseAgent}
          onResume={resumeAgent}
          onStop={stopAgent}
          strategy={monitorState.strategy}
          pnl={monitorState.pnl || { daily: 0, total: 0, unrealized: 0, realized: 0 }}
          positions={monitorState.positions}
          recentTrades={monitorState.recentTrades}
          metrics={monitorState.metrics || {
            winRate: 0,
            avgHoldTime: '0h',
            maxDrawdown: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
          }}
          isLoading={monitorState.isLoading}
        />
      )}

      {/* AI Config Panel */}
      {configPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-background rounded-lg shadow-xl border">
            <AIConfigPanel onClose={() => setConfigPanelOpen(false)} />
          </div>
        </div>
      )}
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
