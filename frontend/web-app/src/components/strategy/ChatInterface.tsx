'use client'

import { motion } from 'framer-motion'
import {
  BarChart2,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Coins,
  Globe,
  Library,
  type LucideIcon,
  MessageSquare,
  Microscope,
  Network,
  Rocket,
  Scale,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  Terminal,
  User,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React from 'react'

import { AIConfigPanel } from '@/components/ai/AIConfigPanel'
import { AttributionCanvas } from '@/components/canvas/AttributionCanvas'
import { BacktestCanvas } from '@/components/canvas/BacktestCanvas'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'
import { ComparisonCanvas } from '@/components/canvas/ComparisonCanvas'
import type { DeployConfig } from '@/components/canvas/DeployCanvas'
import { DeployCanvas } from '@/components/canvas/DeployCanvas'
import type { StrategyStatus } from '@/components/canvas/MonitorCanvas'
import { MonitorCanvas } from '@/components/canvas/MonitorCanvas'
import { SensitivityCanvas } from '@/components/canvas/SensitivityCanvas'
import { VersionHistoryCanvas } from '@/components/canvas/VersionHistoryCanvas'
import { InsightMessage, ReasoningChainView } from '@/components/insight'
import { EmergencyActions } from '@/components/intervention/EmergencyActions'
import { SpiritBeam } from '@/components/spirit/SpiritBeam'
import { SpiritOrb } from '@/components/spirit/SpiritOrb'
import { InsightCardLoading, useInsightLoadingState } from '@/components/thinking'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { notify, notifyWarning } from '@/components/ui/use-toast'
import { MAX_MESSAGE_LENGTH, useA2UIInsight } from '@/hooks/useA2UIInsight'
import { useBacktest } from '@/hooks/useBacktest'
import { useDeployment } from '@/hooks/useDeployment'
import { useMonitor } from '@/hooks/useMonitor'
import { useReasoningStream } from '@/hooks/useReasoningStream'
import { useSpiritController } from '@/hooks/useSpiritController'
import type { StrategyTemplate } from '@/lib/templates/strategies'
import { cn } from '@/lib/utils'
import { useMarketStore } from '@/store'
import { type Agent, useAgentStore } from '@/store/agent'
import { useAIStore } from '@/store/ai'
import { useAnalysisStore } from '@/store/analysis'
import { useModeStore } from '@/store/mode'
import { usePaperTradingStore } from '@/store/paperTrading'
import type { SimplePreset } from '@/types/ai'
import { SIMPLE_PRESETS } from '@/types/ai'
import type { BacktestConfig } from '@/types/backtest'
import type {
  AttributionInsightData,
  BacktestInsightData,
  ClarificationAnswer,
  ClarificationInsight,
  ComparisonInsightData,
  InsightActionType,
  InsightCardStatus,
  InsightData,
  InsightParam,
  SensitivityInsightData,
} from '@/types/insight'
import { isClarificationInsight } from '@/types/insight'
import type { EmergencyAction } from '@/types/intervention'
import type { NodeAction } from '@/types/reasoning'
import type { ResearchReport } from '@/types/research'

import { TemplateSelector } from './TemplateSelector'

const ICON_MAP: Record<string, LucideIcon> = {
  Brain,
  Sparkles,
  Zap,
  Rocket,
  Wind,
  Target,
  Coins,
  Library,
  Globe,
  Network,
  Bot,
  Terminal,
  Search,
  BarChart2,
  MessageSquare,
  Scale,
  Microscope,
}

// =============================================================================
// Trading Spirit Persona
// =============================================================================

const SPIRIT_CONFIG = {
  name: 'Delta',
  greeting: `我是 **Delta**，帮你把交易想法变成自动执行的规则。

告诉我你的想法，比如：

> "在 BTC 跌到支撑位时买入"

我会帮你：**想法 → 规则 → 验证 → 执行**`,
}

// Research Mode Persona
const RESEARCH_CONFIG = {
  name: 'Delta Research',
  greeting: `**Delta Research** - 深度分析模式

在把想法变成规则之前，先搞清楚市场在发生什么。

> "BTC 现在是什么阶段？适合做什么策略？"

我会帮你分析，然后你带着清晰的想法去创建规则。`,
}

// =============================================================================
// Intent Classification - 区分探索性请求和行动性请求
// =============================================================================

type UserIntent = 'exploratory' | 'action'

/**
 * 分类用户意图：探索性 (分析/了解) vs 行动性 (创建策略/执行)
 *
 * 探索性请求：用户想了解市场情况、获取分析、寻求建议
 * 行动性请求：用户想创建策略、执行交易、设置规则
 *
 * 优先级顺序（从高到低）:
 * 1. 否定句检测 → exploratory
 * 2. 高优先级探索性模式（想了解、想知道）→ exploratory
 * 3. 问号结尾（除非包含显式动作词）→ exploratory
 * 4. 行动性模式匹配 → action
 * 5. 探索性模式匹配 → exploratory
 * 6. 默认规则
 */
function classifyIntent(message: string): UserIntent {
  const normalizedMessage = message.toLowerCase().trim()

  // ===== 第一优先级：否定句检测 =====
  // "不要买"、"别做"、"取消" 等否定表达不应触发动作
  const negationPattern = /^(不要|别|不|取消|停止|暂停)/
  if (negationPattern.test(normalizedMessage)) {
    // 否定句通常是在表达不想做某事，应该询问用户真正意图
    return 'exploratory'
  }

  // ===== 第二优先级：高优先级探索性模式 =====
  // 这些模式即使包含其他动作关键词，也应该判定为探索性
  const highPriorityExploratory = [
    /(想|要|希望)?(了解|知道|学习|理解|明白)/, // "我想了解网格策略"
    /^(什么是|为什么|如何理解)/, // "什么是RSI"
    /(是什么|什么意思|怎么理解)/, // "RSI是什么"
    /(多少|几|几个|几点|什么时候)/, // "RSI多少" "价格多少"
    /(超买|超卖).{0,5}(了吗|吗|没|是不是)/, // "超买了吗"
  ]

  for (const pattern of highPriorityExploratory) {
    if (pattern.test(normalizedMessage)) {
      return 'exploratory'
    }
  }

  // ===== 第三优先级：问号快速路径 =====
  // 问号结尾的疑问句大概率是探索性，除非包含显式动作词
  if (/[?？]$/.test(normalizedMessage)) {
    // 只有非常明确的行动请求才覆盖问号判定
    const explicitActionWithQuestion = /(帮我|给我|替我).{0,15}(做|创建|设置|买|卖|开|平)/
    if (!explicitActionWithQuestion.test(normalizedMessage)) {
      return 'exploratory'
    }
  }

  // ===== 第四优先级：行动性模式 =====
  const actionPatterns = [
    // 中文创建/执行动词（句首）
    /^(创建|做|买入?|卖出?|开|平仓?|设置|配置|执行|部署|启动|运行)/,
    // 中文祈使句
    /帮我(做|创建|设置|配置|生成|建立|验证|买|卖|开|平)/,
    /给我(一个|做|生成|创建)(策略|规则)/,
    /(帮我|给我|替我).{0,10}(买|卖|做|创建|设置)/,
    // 条件式表达
    /(在|当).{2,30}(时|的时候|就|后).*(买|卖|开|平)/,
    /(在|当).{2,30}(买|卖|开多|开空|做多|做空)/,
    /如果.{2,20}(就|则|时).*(买|卖|开|平)/,
    // 直接交易动作（非问句）
    /.{0,20}(跌|涨|突破|回调|反弹).{0,15}(买入|卖出|开仓|平仓)/,
    // 具体交易指令
    /^(止损|止盈|加仓|减仓|做空|做多|开多|开空)/,
    // 策略类型 + 明确动作意图
    /(做|创建|设置|配置|启动).{0,5}(网格|定投|马丁|套利)/,
    // 明确的策略创建意图
    /想(做|创建|设置|配置|执行)(?!.*(了解|知道|学))/,
    /不知道(参数|怎么设)/,

    // ===== 英文支持 =====
    /^(buy|sell|long|short|open|close)\s/i,
    /^(create|make|set|setup|execute|run|deploy)\s/i,
    /(help me|please)\s.*(buy|sell|create|set)/i,
    /\b(buy|sell|long|short)\s+(btc|eth|sol|bnb)/i,
  ]

  for (const pattern of actionPatterns) {
    if (pattern.test(normalizedMessage)) {
      return 'action'
    }
  }

  // ===== 第五优先级：探索性模式 =====
  const exploratoryPatterns = [
    // 疑问式
    /\?$|？$/,
    /^(什么是|为什么|如何|怎么|怎样|哪个|哪些)/,
    /(是什么|怎么样|什么情况|什么阶段|什么趋势)/,
    /(适合什么|该怎么|应该|建议|推荐)/,
    // 分析/了解动词
    /^(分析|了解|查看|看看|告诉我|解释|说明|介绍)/,
    /(分析一下|看一下|了解一下)/,
    // 市场状态查询
    /(现在|目前|当前).{0,10}(怎么样|情况|状态|走势|趋势|价格)/,
    /(行情|市场|价格).{0,10}(怎么样|如何|怎样)/,
    // 观点/预测请求
    /(你觉得|你认为|你怎么看)/,
    // 指标查询
    /(rsi|macd|kdj|ema|sma|ma|布林|均线).{0,10}(多少|是|怎么|如何)/i,

    // ===== 英文探索性 =====
    /^(what|why|how|when|which|where)\s/i,
    /\b(analysis|analyze|trend|outlook|forecast)\b/i,
    /\b(what is|how to|how does)\b/i,
  ]

  for (const pattern of exploratoryPatterns) {
    if (pattern.test(normalizedMessage)) {
      return 'exploratory'
    }
  }

  // ===== 默认规则 =====
  // 短消息倾向于探索性（用户可能在询问）
  // 长消息倾向于行动性（用户在描述需求）
  if (normalizedMessage.length < 15) {
    return 'exploratory'
  }

  return 'action'
}

/**
 * 格式化探索性响应
 * 将 InsightData 转换为用户友好的纯文本分析报告
 */
function formatExploratoryResponse(insight: InsightData, fallbackMessage: string): string {
  // 优先使用 explanation
  if (insight.explanation) {
    let response = insight.explanation

    // 如果有参数，添加关键信息摘要
    if (insight.params && insight.params.length > 0) {
      const keyParams = insight.params
        .filter((p) => p.value !== undefined && p.value !== null && p.value !== '')
        .slice(0, 5) // 最多显示 5 个关键参数

      if (keyParams.length > 0) {
        response += '\n\n**关键信息**：\n'
        keyParams.forEach((p) => {
          response += `• **${p.label}**: ${p.value}\n`
        })
      }
    }

    // 添加行动建议提示
    response += '\n\n---\n💡 *如果你想基于这个分析创建策略，可以告诉我具体的入场和出场条件。*'

    return response
  }

  // 如果没有 explanation，使用 fallback
  return fallbackMessage || '我理解了你的问题，让我为你分析一下...'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** A2UI: InsightData for structured AI responses */
  insight?: InsightData | undefined
  /** A2UI: Status of the insight card */
  insightStatus?: InsightCardStatus | undefined
  /** Multiple insights (for batch operations) */
  insights?: InsightData[] | undefined
  insightStatuses?: InsightCardStatus[] | undefined
  researchReport?: ResearchReport | undefined
  isResearchProgress?: boolean
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
  // Active Agent State (Story 1.3: Trait-Based Flavoring)
  // ==========================================================================
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agent')
  const { addAgent, agents, updatePnLDashboard } = useAgentStore()

  const activeAgent = React.useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId])

  // ==========================================================================
  // Mode & Persona State
  // ==========================================================================
  const { currentMode } = useModeStore()
  const isResearchMode = currentMode === 'research'
  const persona = isResearchMode ? RESEARCH_CONFIG : SPIRIT_CONFIG

  // ==========================================================================
  // Agent Store - 连接 InsightCard 批准 → Agent 创建
  // ==========================================================================
  // const { addAgent, agents, updatePnLDashboard } = useAgentStore() // Moved up for Active Agent logic

  // ==========================================================================
  // Market & Paper Trading Store - 真实数据源
  // ==========================================================================
  const { getMarket } = useMarketStore()
  const { accounts: paperAccounts } = usePaperTradingStore()

  // 获取市场数据上下文 (真实数据 + fallback)
  const getMarketContext = React.useCallback(() => {
    const btcData = getMarket('BTC/USDT')
    const ethData = getMarket('ETH/USDT')
    return {
      btcPrice: btcData?.price ?? 0, // 0 表示无数据，AI 会忽略
      ethPrice: ethData?.price ?? 0,
      btcChange24h: btcData?.change24h ?? 0,
      ethChange24h: ethData?.change24h ?? 0,
    }
  }, [getMarket])

  // 获取总初始资本 (从 paper trading 账户汇总)
  const getTotalInitialCapital = React.useCallback(() => {
    if (paperAccounts.length === 0) return 0 // 无账户时返回 0
    return paperAccounts.reduce((sum, acc) => sum + acc.initialCapital, 0)
  }, [paperAccounts])

  // ==========================================================================
  // State
  // ==========================================================================
  // Initialize with welcome message
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: persona.greeting,
      timestamp: Date.now() - 60000,
    },
  ])
  const lastModeRef = React.useRef<string>(currentMode)

  // Re-initialize messages when mode changes
  React.useEffect(() => {
    if (lastModeRef.current !== currentMode) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: persona.greeting,
          timestamp: Date.now() - 60000,
        },
      ])
      lastModeRef.current = currentMode
    }
  }, [currentMode, persona.greeting])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // ==========================================================================
  // AI Engine Integration - A2UI 统一路径 (仅 NLP Processor)
  // ==========================================================================

  // A2UI Insight Hook - NLP Processor 是 InsightData 的唯一来源
  const {
    sendMessage: sendToNLP,
    insight: _nlpInsight,
    isLoading: isNLPLoading,
    error: nlpError,
    conversationId: _conversationId,
    intent: _intent,
    confidence: _confidence,
    message: nlpMessage,
    collectedParams,
    reset: _resetNLP,
  } = useA2UIInsight()

  // AI 可用性 - 简化检查，NLP Processor 始终可用
  const canUseAI = true
  const disabledReason: string | null = null

  // AI 配置面板状态
  const [configPanelOpen, setConfigPanelOpen] = React.useState(false)
  const [presetMenuOpen, setPresetMenuOpen] = React.useState(false)

  // EPIC-010 S10.3: 策略模板选择器状态
  const [templateSelectorOpen, setTemplateSelectorOpen] = React.useState(false)

  // AI Store - 模型切换
  const { config, setSimplePreset } = useAIStore()
  const currentPreset = config.simple.preset
  const currentPresetConfig = SIMPLE_PRESETS[currentPreset]

  // 加载状态 (仅 NLP Processor)
  const isThinking = isNLPLoading

  // 3 阶段加载状态管理
  // Note: thinkingProcess 需要完整的 ThinkingProcess 类型
  // 目前使用简化的 autoProgress 模式，不传递 thinkingProcess
  const { state: loadingState } = useInsightLoadingState(
    isThinking || isLoading,
    undefined // 使用自动进度模式
  )

  // ==========================================================================
  // A2UI 2.0: SSE 流式推理链
  // ==========================================================================
  const {
    nodes: streamingNodes,
    isStreaming,
    startStream,
    stopStream,
    reset: resetStream,
    error: _streamError,
  } = useReasoningStream({
    onComplete: (nodes) => {
      console.log('[ChatInterface] Reasoning stream completed with', nodes.length, 'nodes')
    },
    onError: (error) => {
      console.error('[ChatInterface] Reasoning stream error:', error)
      notifyWarning('推理链生成失败', { description: error })
    },
    onNodeAdded: (node) => {
      console.log('[ChatInterface] Reasoning node added:', node.type, node.id)
    },
  })

  // A2UI: Canvas state
  const [canvasOpen, setCanvasOpen] = React.useState(false)
  const [canvasInsight, setCanvasInsight] = React.useState<InsightData | null>(null)
  const [canvasLoading, setCanvasLoading] = React.useState(false)
  // Canvas backtest state - 用于 CanvasPanel 中的回测功能
  const [canvasBacktesting, setCanvasBacktesting] = React.useState(false)
  const [canvasBacktestPassed, setCanvasBacktestPassed] = React.useState<boolean | undefined>(
    undefined
  )
  const [canvasBacktestResult, setCanvasBacktestResult] =
    React.useState<BacktestInsightData | null>(null)

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

  // ==========================================================================
  // EPIC-008 & EPIC-009: Analysis Canvas State (使用全局 store)
  // ==========================================================================
  const {
    sensitivityOpen,
    sensitivityData,
    openSensitivityAnalysis,
    closeSensitivityAnalysis,
    attributionOpen,
    attributionData,
    openAttributionAnalysis,
    closeAttributionAnalysis,
    comparisonOpen,
    comparisonData,
    openComparisonAnalysis,
    closeComparisonAnalysis,
    versionHistoryOpen,
    versionStrategyId,
    versionStrategyName,
    closeVersionHistory,
    emergencyActionsOpen,
    emergencyStrategyId,
    closeEmergencyActions,
  } = useAnalysisStore()

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

  // Story 1.3: Spirit Neural Link (Reactive Orb)
  const lastMessageWithInsight = messages
    .slice()
    .reverse()
    .find((m) => m.insight)
  const {
    state: orbState,
    colors: orbColors,
    turbulence: orbTurbulence,
    intensity: orbIntensity,
  } = useSpiritController(lastMessageWithInsight?.insight, isLoading || isThinking, activeAgent)

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

  const handleMonitorStatusChange = React.useCallback(
    (status: StrategyStatus) => {
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
    },
    [monitorAgentId, onStrategyStatusChange]
  )

  const {
    state: monitorState,
    isRunning: _isMonitorRunning, // Reserved for future use
    isPaused: _isMonitorPaused, // Reserved for future use
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
  const handleInsightExpand = React.useCallback(
    (insight: InsightData) => {
      setCanvasInsight(insight)
      setCanvasOpen(true)
      onInsightExpand?.(insight)
    },
    [onInsightExpand]
  )

  // A2UI: Handle Canvas close
  const handleCanvasClose = React.useCallback(() => {
    setCanvasOpen(false)
    setCanvasInsight(null)
    setCanvasLoading(false)
    // 重置回测状态
    setCanvasBacktesting(false)
    setCanvasBacktestPassed(undefined)
    setCanvasBacktestResult(null)
  }, [])

  // A2UI: Handle Canvas backtest - 在 CanvasPanel 中运行回测
  const handleCanvasBacktest = React.useCallback(
    async (insight: InsightData, params: InsightParam[]) => {
      setCanvasBacktesting(true)
      setCanvasBacktestResult(null)

      try {
        // 生成回测任务 ID
        const jobId = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

        // 提取目标信息
        const symbol = insight.target?.symbol || 'BTC/USDT'
        const timeframe = (params.find((p) => p.key === 'timeframe')?.value as string) || '1h'

        // 从参数提取回测天数，或根据 timeframe 设置合理默认值
        const backtestDaysParam = params.find((p) => p.key === 'backtestDays')?.value as number
        let backtestDays = backtestDaysParam || 90 // 默认 90 天

        // 如果没有明确指定，根据 timeframe 调整
        if (!backtestDaysParam) {
          switch (timeframe) {
            case '1m':
            case '5m':
              backtestDays = 7 // 分钟级别用 7 天
              break
            case '15m':
            case '30m':
              backtestDays = 30 // 15/30 分钟用 30 天
              break
            case '1h':
            case '4h':
              backtestDays = 90 // 小时级别用 90 天
              break
            case '1d':
              backtestDays = 365 // 日线用 1 年
              break
            default:
              backtestDays = 90
          }
        }

        // 提取初始资金
        const initialCapital =
          (params.find((p) => p.key === 'investment')?.value as number) ||
          (params.find((p) => p.key === 'initialCapital')?.value as number) ||
          10000

        // 调用回测 API
        const response = await fetch('/api/backtest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            config: {
              strategyName: insight.target?.name || '策略回测',
              strategyDescription: insight.explanation || 'AI 生成的交易策略',
              symbol,
              timeframe,
              startDate: Date.now() - backtestDays * 24 * 60 * 60 * 1000,
              endDate: Date.now(),
              initialCapital,
              parameters: params.map((p) => ({
                name: p.key,
                value: p.value,
                type: p.type,
              })),
            },
          }),
        })

        if (!response.ok) {
          throw new Error('回测请求失败')
        }

        const result = (await response.json()) as BacktestInsightData

        // 保存回测结果
        setCanvasBacktestResult(result)

        // 判断回测是否通过 (基于夏普比率和总收益)
        const passed = result.stats.sharpeRatio >= 0.5 && result.stats.totalReturn > 0
        setCanvasBacktestPassed(passed)

        if (passed) {
          notify('success', '回测通过', {
            description: `收益率 ${result.stats.totalReturn.toFixed(1)}%，夏普比率 ${result.stats.sharpeRatio.toFixed(2)}`,
            source: 'ChatInterface',
          })
        } else {
          notify('warning', '回测未通过', {
            description: `收益率 ${result.stats.totalReturn.toFixed(1)}%，建议调整参数后重试`,
            source: 'ChatInterface',
          })
        }
      } catch (error) {
        setCanvasBacktestPassed(false)
        notify('error', '回测失败', {
          description: error instanceof Error ? error.message : '请检查网络连接',
          source: 'ChatInterface',
        })
      } finally {
        setCanvasBacktesting(false)
      }
    },
    []
  )

  // A2UI: Handle insight approval (from Canvas or InsightCard)
  // 连接完整流程: InsightCard 批准 → 创建 Agent
  const handleInsightApprove = React.useCallback(
    (insight: InsightData, params: InsightParam[]) => {
      // Show loading state if Canvas is open
      if (canvasOpen) {
        setCanvasLoading(true)
      }

      // 立即执行批准逻辑（无模拟延迟）
      // Update the message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.insight?.id === insight.id
            ? { ...msg, insightStatus: 'approved' as InsightCardStatus }
            : msg
        )
      )

      // =========================================================================
      // 核心: 根据 InsightType 执行不同的批准逻辑
      // =========================================================================
      const now = Date.now()
      let confirmContent = ''

      switch (insight.type) {
        case 'strategy_create':
        case 'strategy_modify': {
          // 创建/修改策略 → 添加到 AgentStore
          const newAgent: Agent = {
            id: `agent_${now}`,
            name: insight.target?.name ?? '新策略',
            symbol: insight.target?.symbol ?? 'BTC/USDT',
            status: 'shadow', // 新创建的策略默认为 shadow 模式
            pnl: 0,
            pnlPercent: 0,
            trades: 0,
            winRate: 0,
            createdAt: now,
            updatedAt: now,
            backtestId: insight.id,
          }
          addAgent(newAgent)

          // 重新计算 PnL 仪表盘
          const allAgents = [...agents, newAgent]
          const totalPnL = allAgents.reduce((sum, a) => sum + a.pnl, 0)
          const totalCapital = getTotalInitialCapital() || 10000
          const totalPnLPercent = totalCapital > 0 ? (totalPnL / totalCapital) * 100 : 0

          updatePnLDashboard({
            totalPnL,
            totalPnLPercent,
            todayPnL: allAgents
              .filter((a) => a.updatedAt > now - 24 * 60 * 60 * 1000)
              .reduce((sum, a) => sum + a.pnl, 0),
            todayPnLPercent: 0,
            weekPnL: allAgents
              .filter((a) => a.updatedAt > now - 7 * 24 * 60 * 60 * 1000)
              .reduce((sum, a) => sum + a.pnl, 0),
            monthPnL: totalPnL,
          })

          confirmContent = `✅ 策略已批准并创建！您可以在左侧边栏查看新创建的 Agent。\n\n使用的参数：\n${params.map((p) => `• ${p.label}: ${String(p.value)}${p.config.unit ?? ''}`).join('\n')}`
          break
        }

        case 'trade_signal': {
          // 交易信号 → 记录确认（实际下单需要集成交易引擎）
          const direction = (insight as unknown as { direction?: string }).direction ?? 'unknown'
          const symbol = insight.target?.symbol ?? 'BTC/USDT'
          confirmContent = `✅ 交易信号已确认！\n\n• 交易对: ${symbol}\n• 方向: ${direction === 'long' ? '做多' : direction === 'short' ? '做空' : '平仓'}\n\n⚠️ 请在交易面板执行实际下单操作。`
          notify('success', '交易信号已确认', { description: `${symbol} ${direction}` })
          break
        }

        case 'risk_alert': {
          // 风险警告 → 确认已知悉
          const alertType = (insight as unknown as { alertType?: string }).alertType ?? '风险提醒'
          confirmContent = `✅ 风险警告已确认！\n\n• 类型: ${alertType}\n• 操作: 已记录确认\n\n请根据建议采取相应的风险缓解措施。`
          notify('warning', '风险警告已确认', { description: alertType })
          break
        }

        case 'comparison': {
          // 策略对比 → 记录选择
          confirmContent = `✅ 策略对比结果已确认！\n\n对比分析已保存，您可以根据结果调整策略配置。`
          break
        }

        case 'batch_adjust': {
          // 批量调整 → 应用到多个策略
          const affectedCount = params.length
          confirmContent = `✅ 批量调整已应用！\n\n• 影响参数: ${affectedCount} 个\n• 调整内容:\n${params.map((p) => `  • ${p.label}: ${String(p.value)}${p.config.unit ?? ''}`).join('\n')}`
          notify('success', '批量调整已应用', { description: `${affectedCount} 个参数已更新` })
          break
        }

        default:
          // 其他类型的通用确认
          confirmContent = `✅ 操作已确认！\n\n使用的参数：\n${params.map((p) => `• ${p.label}: ${String(p.value)}${p.config.unit ?? ''}`).join('\n')}`
      }

      // Close Canvas and reset loading
      setCanvasLoading(false)
      setCanvasOpen(false)
      setCanvasInsight(null)

      // Add confirmation message
      const confirmMessage: Message = {
        id: `confirm_${now}`,
        role: 'assistant',
        content: confirmContent,
        timestamp: now,
      }
      setMessages((prev) => [...prev, confirmMessage])

      // Notify parent
      onInsightApprove?.(insight, params)
    },
    [canvasOpen, onInsightApprove, addAgent, agents, updatePnLDashboard, getTotalInitialCapital]
  )

  // A2UI: Handle insight rejection (from Canvas or InsightCard)
  const handleInsightReject = React.useCallback(
    (insight: InsightData) => {
      // Update the message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.insight?.id === insight.id
            ? { ...msg, insightStatus: 'rejected' as InsightCardStatus }
            : msg
        )
      )

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
      setMessages((prev) => [...prev, rejectMessage])

      // Notify parent
      onInsightReject?.(insight)
    },
    [onInsightReject]
  )

  // ==========================================================================
  // A2UI 2.0: Reasoning Chain Interaction Handlers
  // ==========================================================================

  /**
   * Handle user interaction with reasoning chain nodes
   * Actions: confirm, challenge, modify, expand, collapse, skip
   */
  const handleReasoningNodeAction = React.useCallback(
    async (insight: InsightData, nodeId: string, action: NodeAction, input?: string) => {
      console.log('[ChatInterface] Reasoning node action:', { nodeId, action, input })

      // Visual feedback based on action
      if (action === 'confirm') {
        notify('success', '已确认', { description: '已确认推理步骤' })
      } else if (action === 'challenge') {
        // User is challenging this reasoning step
        // Add a follow-up message asking for clarification
        const challengeMessage: Message = {
          id: `challenge_${Date.now()}`,
          role: 'user',
          content: input || '我对这个判断有疑问',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, challengeMessage])

        // Send challenge to backend for re-evaluation
        try {
          setIsLoading(true)
          const result = await sendToNLP(input || '请解释这个推理步骤', {
            isChallenge: true,
            challengedNodeId: nodeId,
            insightId: insight.id,
            reasoningChain: insight.reasoning_chain,
          })

          if (result) {
            const responseMessage: Message = {
              id: `challenge_response_${Date.now()}`,
              role: 'assistant',
              content: result.explanation || '让我重新解释这个推理...',
              timestamp: Date.now(),
              insight: result,
              insightStatus: 'pending',
            }
            setMessages((prev) => [...prev, responseMessage])
          }
        } catch (error) {
          console.error('[ChatInterface] Challenge error:', error)
          notifyWarning('处理失败', { description: '无法处理您的质疑，请重试' })
        } finally {
          setIsLoading(false)
        }
      } else if (action === 'skip') {
        notify('info', '已跳过', { description: '跳过此推理步骤' })
      }

      // Update local reasoning chain state if needed
      // This could be used to track confirmed/challenged nodes
    },
    [sendToNLP]
  )

  /**
   * Handle user selecting an alternative reasoning branch
   * When user wants to explore a different strategy perspective
   */
  const handleReasoningBranchSelect = React.useCallback(
    async (insight: InsightData, nodeId: string, branchId: string) => {
      console.log('[ChatInterface] Reasoning branch selected:', { nodeId, branchId })

      // Find the branch label for display
      const node = insight.reasoning_chain?.nodes.find((n) => n.id === nodeId)
      const branch = node?.branches.find((b) => b.id === branchId)
      const branchLabel = branch?.label || branchId

      notify('info', '探索新分支', { description: `正在探索「${branchLabel}」策略角度...` })

      // Send branch selection to backend to regenerate with this perspective
      try {
        setIsLoading(true)

        const result = await sendToNLP(`我想使用「${branchLabel}」策略角度`, {
          isBranchSelection: true,
          selectedBranchId: branchId,
          selectedNodeId: nodeId,
          insightId: insight.id,
          strategyPerspective: branchId,
        })

        if (result) {
          const branchMessage: Message = {
            id: `branch_${Date.now()}`,
            role: 'assistant',
            content: result.explanation || `好的，让我按照「${branchLabel}」角度重新分析...`,
            timestamp: Date.now(),
            insight: result,
            insightStatus: 'pending',
          }
          setMessages((prev) => [...prev, branchMessage])
        }
      } catch (error) {
        console.error('[ChatInterface] Branch selection error:', error)
        notifyWarning('分支选择失败', { description: '无法切换到该策略角度，请重试' })
      } finally {
        setIsLoading(false)
      }
    },
    [sendToNLP]
  )

  // ==========================================================================
  // EPIC-010 S10.2: Clarification Answer Handler
  // ==========================================================================
  const handleClarificationAnswer = React.useCallback(
    async (insight: ClarificationInsight, answer: ClarificationAnswer) => {
      // Update message status to answered
      setMessages((prev) =>
        prev.map((msg) =>
          msg.insight?.id === insight.id
            ? { ...msg, insightStatus: 'approved' as InsightCardStatus }
            : msg
        )
      )

      // Build answer text for display
      // selectedOptions is string[] of option IDs, we need to find their labels
      const answerText = answer.customText
        ? answer.customText
        : answer.selectedOptions
            .map((optId) => insight.options.find((opt) => opt.id === optId)?.label || optId)
            .join('、')

      // Add user's answer as a message
      const answerMessage: Message = {
        id: `clarification_answer_${Date.now()}`,
        role: 'user',
        content: answerText,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, answerMessage])

      // Send answer to backend (NLP Processor) and continue the conversation
      try {
        setIsLoading(true)

        // =======================================================================
        // 阶段 1: 通过 NLP Processor 继续多步骤引导
        // =======================================================================
        console.log('[ChatInterface] Clarification: Sending answer to NLP Processor...')

        // 构建对话历史 (用于无 Redis 环境的上下文恢复)
        const chatHistory = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }))

        const nlpResult = await sendToNLP(answerText, {
          isFollowUp: true,
          previousQuestion: insight.question,
          category: insight.category,
          collectedParams: collectedParams,
          marketData: getMarketContext(),
          chatHistory,
        })

        // 如果 NLP 返回另一个 ClarificationInsight，继续引导
        if (nlpResult && isClarificationInsight(nlpResult)) {
          console.log('[ChatInterface] NLP returned another ClarificationInsight:', nlpResult)

          const nextClarificationMessage: Message = {
            id: `clarification_${Date.now()}`,
            role: 'assistant',
            content: nlpResult.question,
            timestamp: Date.now(),
            insight: nlpResult,
            insightStatus: 'pending',
          }
          setMessages((prev) => [...prev, nextClarificationMessage])
          setIsLoading(false)
          return // 等待下一个回答
        }

        // 如果 NLP 返回其他类型的 InsightData，直接使用
        if (nlpResult) {
          console.log('[ChatInterface] NLP returned final InsightData:', nlpResult)

          const nlpInsightMessage: Message = {
            id: `nlp_insight_${Date.now()}`,
            role: 'assistant',
            content: nlpResult.explanation || nlpMessage,
            timestamp: Date.now(),
            insight: nlpResult,
            insightStatus: 'pending',
          }
          setMessages((prev) => [...prev, nlpInsightMessage])
          setIsLoading(false)
          return
        }

        // =======================================================================
        // NLP Processor 未返回结构化数据 - 显示纯文本回复
        // A2UI 优化: 所有 InsightData 必须来自 NLP Processor，不再双重调用 LLM
        // =======================================================================
        console.log('[ChatInterface] Clarification: NLP did not return InsightData after answer')

        const fallbackMessage: Message = {
          id: `text_${Date.now()}`,
          role: 'assistant',
          content:
            nlpMessage ||
            '感谢你的回答！我正在处理你的需求，但目前无法生成完整的策略建议。请尝试提供更多细节。',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, fallbackMessage])
      } catch (error) {
        console.error('[ChatInterface] Failed to send clarification answer:', error)
        notify('error', '发送回答失败', {
          description: '请稍后重试',
          source: 'ChatInterface',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [sendToNLP, collectedParams, nlpMessage, getMarketContext]
  )

  // ==========================================================================
  // EPIC-010 S10.3: Template Selection Handler
  // ==========================================================================
  const handleTemplateSelect = React.useCallback(
    (template: StrategyTemplate, insight: InsightData) => {
      // Add template info message
      const templateMessage: Message = {
        id: `template_${Date.now()}`,
        role: 'assistant',
        content: `📚 已加载「${template.name}」模板\n\n${template.description}\n\n适用场景：${template.marketConditions.join('、')}\n\n你可以在侧边面板中调整参数，或直接批准创建策略。`,
        timestamp: Date.now(),
        insight,
        insightStatus: 'pending',
      }
      setMessages((prev) => [...prev, templateMessage])

      // Auto-expand Canvas for parameter adjustment
      setCanvasInsight(insight)
      setCanvasOpen(true)

      // Close template selector
      setTemplateSelectorOpen(false)
    },
    []
  )

  // ==========================================================================
  // Story 1.3: Deployment Handlers
  // ==========================================================================

  /**
   * Trigger deployment or backtest canvas when insight contains actions
   */
  const handleInsightAction = React.useCallback(
    (insight: InsightData, action: InsightActionType) => {
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
      } else if (action === 'modify_params') {
        // Handle modify_params: Open canvas for parameter editing
        setCanvasInsight(insight)
        setCanvasOpen(true)
        notify('info', '参数修改', {
          description: '请在侧边面板中调整策略参数',
          source: 'ChatInterface',
        })
      }
    },
    [onDeployRequest, onBacktestRequest, onMonitorRequest]
  )

  /**
   * Handle deploy from DeployCanvas
   */
  const handleDeploy = React.useCallback(
    async (config: DeployConfig) => {
      setDeployLoading(true)
      try {
        await deploy(config)
      } catch {
        // Error handled in useDeployment onError callback
      }
    },
    [deploy]
  )

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
      const param = params.find((p) => p.key === key)
      return param ? (param.value as T) : defaultValue
    }

    return {
      name: target?.name || '策略回测',
      symbol: target?.symbol || 'BTC/USDT',
      strategyType: 'custom',
      startDate: getParamValue(
        'start_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || ''
      ),
      endDate: getParamValue('end_date', new Date().toISOString().split('T')[0] || ''),
      initialCapital: getParamValue('initial_capital', 10000),
      feeRate: getParamValue('fee_rate', 0.1),
      slippage: getParamValue('slippage', 0.05),
      params: Object.fromEntries(params.map((p) => [p.key, p.value])),
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
      void handleBacktestStart()
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

  // ==========================================================================
  // EPIC-008 & EPIC-009: Analysis Canvas Handlers
  // (使用全局 store 的 close handlers，open handlers 在 AgentList 中触发)
  // ==========================================================================

  const handleEmergencyAction = React.useCallback(
    async (action: EmergencyAction) => {
      notifyWarning(`紧急操作: ${action}`, { description: '操作已记录，等待执行' })
      // TODO: Integrate with actual emergency action API
      closeEmergencyActions()
    },
    [closeEmergencyActions]
  )

  /**
   * Check if insight has deploy, backtest, or monitor actions and trigger corresponding canvas
   * EPIC-008: Also auto-trigger analysis canvas based on insight type
   */
  React.useEffect(() => {
    // Guard: exit early if no messages
    if (messages.length === 0) return

    // Auto-detect actions from insights
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.insight?.actions) {
      // Check for deploy actions
      const deployAction = lastMessage.insight.actions.find(
        (a): a is 'deploy_paper' | 'deploy_live' => a === 'deploy_paper' || a === 'deploy_live'
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

    // EPIC-008: Auto-trigger analysis canvas based on insight type
    if (lastMessage.insight) {
      const insight = lastMessage.insight

      // Sensitivity analysis
      if (insight.type === 'sensitivity') {
        const data = insight as SensitivityInsightData
        openSensitivityAnalysis(data)
        return
      }

      // Attribution analysis
      if (insight.type === 'attribution') {
        const data = insight as AttributionInsightData
        openAttributionAnalysis(data)
        return
      }

      // Comparison analysis
      if (insight.type === 'comparison') {
        const data = insight as ComparisonInsightData
        openComparisonAnalysis(data)
        return
      }
    }
  }, [
    messages,
    handleInsightAction,
    openSensitivityAnalysis,
    openAttributionAnalysis,
    openComparisonAnalysis,
  ])

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

    // ==========================================================================
    // A2UI 2.0: 启动 SSE 流式推理链 (与 NLP 请求并行)
    // ==========================================================================
    resetStream() // 重置之前的流式状态
    void startStream(userInput) // 启动 SSE 流接收推理节点
    console.log('[ChatInterface] SSE reasoning stream started')

    try {
      // =======================================================================
      // 阶段 1: 调用 NLP Processor 检测意图完整性
      // =======================================================================
      console.log('[ChatInterface] Phase 1: Sending to NLP Processor for intent analysis...')

      // 构建对话历史 (用于无 Redis 环境的上下文恢复)
      const chatHistory = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      // =======================================================================
      // 意图分类: 探索性 (分析/了解) vs 行动性 (创建策略/执行)
      // =======================================================================
      const userIntent = classifyIntent(userInput)
      console.log(`[ChatInterface] User intent classified as: ${userIntent}`)

      const nlpResult = await sendToNLP(userInput, {
        marketData: getMarketContext(),
        chatHistory,
        // 传递意图给后端，便于未来优化
        userIntent,
      })

      // 如果 NLP Processor 返回 ClarificationInsight，直接显示澄清问题卡片
      // (无论意图类型，澄清问题总是需要显示)
      if (nlpResult && isClarificationInsight(nlpResult)) {
        console.log('[ChatInterface] NLP returned ClarificationInsight:', nlpResult)

        const clarificationMessage: Message = {
          id: `clarification_${Date.now()}`,
          role: 'assistant',
          content: nlpResult.question,
          timestamp: Date.now(),
          insight: nlpResult,
          insightStatus: 'pending',
        }
        setMessages((prev) => [...prev, clarificationMessage])
        setIsLoading(false)
        return // 等待用户回答澄清问题，不继续调用 LLM
      }

      // 如果 NLP Processor 返回 InsightData
      if (nlpResult) {
        console.log('[ChatInterface] NLP returned InsightData:', nlpResult, 'Intent:', userIntent)

        // =======================================================================
        // 探索性意图: 返回纯文本分析，不显示 InsightCard
        // 用户只是想了解情况，不需要审批/执行操作
        // =======================================================================
        if (userIntent === 'exploratory') {
          console.log(
            '[ChatInterface] 🔥🔥🔥 EXPLORATORY BRANCH ENTERED v2 - will return text, NOT InsightCard 🔥🔥🔥'
          )
          // 从 InsightData 提取分析内容，格式化为 Markdown
          const analysisContent = formatExploratoryResponse(nlpResult, nlpMessage)
          console.log(
            '[ChatInterface] 📝 Formatted analysis content:',
            analysisContent.substring(0, 100) + '...'
          )

          const analysisMessage: Message = {
            id: `analysis_${Date.now()}`,
            role: 'assistant',
            content: analysisContent,
            timestamp: Date.now(),
            // 不设置 insight，确保显示为纯文本
          }
          setMessages((prev) => [...prev, analysisMessage])
          setIsLoading(false)
          return
        }

        // =======================================================================
        // 行动性意图: 显示 InsightCard，需要用户审批
        // =======================================================================
        const nlpInsightMessage: Message = {
          id: `nlp_insight_${Date.now()}`,
          role: 'assistant',
          content: nlpResult.explanation || nlpMessage,
          timestamp: Date.now(),
          insight: nlpResult,
          insightStatus: 'pending',
        }
        setMessages((prev) => [...prev, nlpInsightMessage])
        setIsLoading(false)
        return
      }

      // =======================================================================
      // NLP Processor 未返回结构化数据 - 显示纯文本回复
      // A2UI 优化: 所有 InsightData 必须来自 NLP Processor，不再双重调用 LLM
      // =======================================================================
      console.log('[ChatInterface] NLP did not return InsightData, using text response')

      // 使用 NLP 返回的消息作为回复
      const fallbackContent =
        nlpMessage ||
        (nlpError
          ? `⚠️ **AI 服务连接异常**\n\n${nlpError}\n\n**可能的原因：**\n• 后端 NLP 服务未启动\n• API 地址配置错误\n• 网络连接问题\n\n请联系管理员或稍后重试。`
          : '我理解了你的需求！让我来帮你分析一下。\n\n**请提供更多细节，例如：**\n• 📈 交易什么币种？(如 BTC/USDT)\n• 📊 使用什么指标？(如 RSI、MACD、均线)\n• 🎯 入场和出场条件是什么？\n• 💰 预期的风险收益比？\n\n这样我可以为你生成更精准的策略建议！')
      const fallbackMessage: Message = {
        id: `text_${Date.now()}`,
        role: 'assistant',
        content: fallbackContent,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } catch (error) {
      console.error('[ChatInterface] AI Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nlpError || '抱歉，AI 服务暂时不可用。请检查网络连接或后端服务配置。',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      // 停止 SSE 流
      stopStream()
      console.log('[ChatInterface] SSE reasoning stream stopped')
    }
  }

  // 快速提示：分为探索性（分析）和行动性（策略）两类
  const quickPrompts = [
    // 探索性请求 - 返回分析报告
    'BTC 现在是什么行情？',
    '分析一下 ETH 的趋势',
    // 行动性请求 - 返回策略卡片
    '在 BTC 跌到支撑位时买入',
    '帮我做一个网格策略',
  ]

  return (
    <div
      className={cn(
        'chat-interface flex h-full flex-col transition-all duration-300 ease-out',
        (canvasOpen || deployOpen || backtestOpen || monitorOpen) && 'lg:mr-[520px]'
      )}
    >
      {/* Chat Header */}
      <header className="relative flex items-center justify-between overflow-hidden border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
        {/* Spirit Beam Effect (Projecting downwards) */}
        <SpiritBeam isActive={isLoading || isThinking} color={orbColors.primary} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SpiritOrb
              className="pointer-events-none h-8 w-8"
              state={orbState as any} // Cast to match SpiritOrb specific string literals
              primaryColor={orbColors.primary}
              secondaryColor={orbColors.secondary}
              turbulence={orbTurbulence}
              intensity={orbIntensity}
            />
            <h1 className="font-semibold">Delta AI</h1>
            {/* 模型快速切换下拉菜单 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPresetMenuOpen(!presetMenuOpen)
                }}
                className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-sm">
                  {(() => {
                    const Icon = ICON_MAP[currentPresetConfig.icon] || Sparkles
                    return <Icon className="h-4 w-4" />
                  })()}
                </span>
                <span className="text-xs">{currentPresetConfig.name}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
              {presetMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setPresetMenuOpen(false)
                    }}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover py-1 shadow-lg">
                    <div className="mb-1 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                      选择 AI 模型预设
                    </div>
                    {(Object.keys(SIMPLE_PRESETS) as SimplePreset[]).map((preset) => {
                      const presetConfig = SIMPLE_PRESETS[preset]
                      const isActive = preset === currentPreset
                      return (
                        <button
                          key={preset}
                          onClick={() => {
                            setSimplePreset(preset)
                            setPresetMenuOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary/50',
                            isActive && 'bg-primary/10'
                          )}
                        >
                          <span className="text-lg">
                            {(() => {
                              const Icon = ICON_MAP[presetConfig.icon] || Sparkles
                              return <Icon className="h-5 w-5" />
                            })()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{presetConfig.name}</span>
                              {isActive && <Check className="h-3 w-3 text-primary" />}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {presetConfig.defaultModel.split('/')[1]}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                    <div className="mt-1 border-t border-border pt-1">
                      <button
                        onClick={() => {
                          setPresetMenuOpen(false)
                          setConfigPanelOpen(true)
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-secondary/50"
                      >
                        <Settings2 className="h-4 w-4" />
                        <span className="text-sm">高级设置...</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setConfigPanelOpen(true)
            }}
            className="h-8 w-8"
            title="AI 设置"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Badge variant={canUseAI ? 'success' : 'secondary'} className="gap-1">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                canUseAI ? 'animate-pulse bg-green-400' : 'bg-gray-400'
              )}
            />
            {canUseAI ? currentPresetConfig.defaultModel.split('/')[1] : disabledReason || '不可用'}
          </Badge>
        </div>
      </header>

      {/* Messages Area */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.map((message) =>
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
                onClarificationAnswer={handleClarificationAnswer}
                onReasoningNodeAction={handleReasoningNodeAction}
                onReasoningBranchSelect={handleReasoningBranchSelect}
              />
            ) : (
              <ChatMessage key={message.id} message={message} />
            )
          )}
          {/* S71: 流式渲染 - 3 阶段加载 + A2UI 2.0 SSE 推理链 */}
          {(isLoading || isThinking || isStreaming) && (
            <div className="flex gap-3">
              {/* AI Avatar */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                <SpiritOrb
                  className="h-8 w-8"
                  state="thinking"
                  primaryColor="#a855f7"
                  secondaryColor="#fbbf24"
                />
              </div>
              {/* A2UI 2.0: SSE 流式推理链 + InsightCard 加载 */}
              <div className="max-w-xl flex-1 space-y-3">
                {/* 流式推理链展示 - 当有节点时显示 */}
                {streamingNodes.length > 0 && (
                  <ReasoningChainView
                    chain={{
                      id: `stream_${Date.now()}`,
                      user_input: input || '',
                      nodes: streamingNodes,
                      status: isStreaming ? 'in_progress' : 'completed',
                      overall_confidence: 0.85,
                      confirmed_count: 0,
                      total_count: streamingNodes.length,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }}
                    displayMode="expanded"
                    className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                  />
                )}
                {/* InsightCard 3 阶段加载: skeleton → thinking → filling */}
                <InsightCardLoading state={loadingState} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts - 显示直到有足够对话 */}
      {messages.length <= 3 && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {messages.length === 1 ? '快速开始:' : '继续探索:'}
            </div>
            {/* EPIC-010 S10.3: Template Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTemplateSelectorOpen(true)
              }}
              className="gap-1.5 text-xs hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="h-3 w-3" />
              从模板开始
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(prompt)
                }}
                className="text-xs hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <motion.div
              className="relative flex-1"
              initial={false}
              animate={{
                scale: input.trim() ? 1.01 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                }}
                placeholder="描述你想要的交易策略..."
                disabled={isLoading || isThinking}
                maxLength={MAX_MESSAGE_LENGTH}
                className={cn(
                  'h-12 w-full rounded-xl px-4 pr-12',
                  'border border-border bg-card',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'disabled:opacity-50',
                  'transition-all duration-200',
                  'shadow-sm focus:shadow-lg', // Add shadow on focus
                  input.length > MAX_MESSAGE_LENGTH * 0.9 && 'border-yellow-500 focus:ring-yellow-500/50'
                )}
              />
              {/* 字符计数显示 */}
              {input.length > 0 && (
                <div
                  className={cn(
                    'absolute bottom-full right-2 mb-1 rounded-md px-2 py-0.5 text-xs transition-colors',
                    input.length > MAX_MESSAGE_LENGTH * 0.9
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {input.length} / {MAX_MESSAGE_LENGTH}
                </div>
              )}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <MagneticButton
                  type="submit"
                  size="icon"
                  disabled={
                    isLoading ||
                    isThinking ||
                    !input.trim() ||
                    input.length > MAX_MESSAGE_LENGTH
                  }
                  className="h-8 w-8 rounded-lg"
                  springConfig={{ stiffness: 200, damping: 10, mass: 0.5 }}
                >
                  <Send className="h-4 w-4" />
                </MagneticButton>
              </div>
            </motion.div>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
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
        onReject={(insight) => {
          handleInsightReject(insight)
        }}
        onBacktest={handleCanvasBacktest}
        isLoading={canvasLoading}
        isBacktesting={canvasBacktesting}
        backtestPassed={canvasBacktestPassed}
        backtestResult={canvasBacktestResult}
      />

      {/* Story 1.3: Deploy Canvas */}
      <DeployCanvas
        strategyId={deployStrategyId}
        strategyName={
          messages.find((m) => m.insight?.target?.strategy_id === deployStrategyId)?.insight?.target
            ?.name
        }
        symbol={
          messages.find((m) => m.insight?.target?.strategy_id === deployStrategyId)?.insight?.target
            ?.symbol
        }
        mode={deployMode}
        backtestResult={
          backtestResult || { passed: true, expectedReturn: 0, maxDrawdown: 0, winRate: 0 }
        }
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
            winningTrades: Math.round(
              ((backtestState.result?.metrics.winRate ?? 0) *
                (backtestState.result?.metrics.totalTrades ?? 0)) /
                100
            ),
            losingTrades:
              (backtestState.result?.metrics.totalTrades ?? 0) -
              Math.round(
                ((backtestState.result?.metrics.winRate ?? 0) *
                  (backtestState.result?.metrics.totalTrades ?? 0)) /
                  100
              ),
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
          metrics={
            monitorState.metrics || {
              winRate: 0,
              avgHoldTime: '0h',
              maxDrawdown: 0,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
            }
          }
          isLoading={monitorState.isLoading}
        />
      )}

      {/* EPIC-008: Sensitivity Analysis Canvas */}
      {sensitivityData && (
        <SensitivityCanvas
          data={sensitivityData}
          isOpen={sensitivityOpen}
          onClose={closeSensitivityAnalysis}
        />
      )}

      {/* EPIC-008: Attribution Analysis Canvas */}
      {attributionData && (
        <AttributionCanvas
          data={attributionData}
          isOpen={attributionOpen}
          onClose={closeAttributionAnalysis}
        />
      )}

      {/* EPIC-008: Comparison Analysis Canvas */}
      {comparisonData && (
        <ComparisonCanvas
          data={comparisonData}
          isOpen={comparisonOpen}
          onClose={closeComparisonAnalysis}
        />
      )}

      {/* EPIC-009: Version History Canvas */}
      {versionStrategyId && (
        <VersionHistoryCanvas
          strategyId={versionStrategyId}
          strategyName={versionStrategyName}
          isOpen={versionHistoryOpen}
          onClose={closeVersionHistory}
        />
      )}

      {/* EPIC-009: Emergency Actions Panel */}
      {emergencyActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">紧急操作</h3>
              <Button variant="ghost" size="sm" onClick={closeEmergencyActions}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <EmergencyActions
              agentId={emergencyStrategyId}
              strategyStatus="running"
              onAction={handleEmergencyAction}
            />
          </div>
        </div>
      )}

      {/* AI Config Panel */}
      {configPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border bg-background shadow-xl">
            <AIConfigPanel
              onClose={() => {
                setConfigPanelOpen(false)
              }}
            />
          </div>
        </div>
      )}

      {/* EPIC-010 S10.3: Template Selector Modal */}
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => {
          setTemplateSelectorOpen(false)
        }}
        onSelect={handleTemplateSelect}
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
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('max-w-[85%] flex-1', isUser && 'flex justify-end')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3',
            isUser ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'
          )}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          <div
            className={cn(
              'mt-2 text-xs',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
