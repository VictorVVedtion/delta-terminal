'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { A2UILayout } from '@/components/layout/A2UILayout'
import { Button } from '@/components/ui/button'
import { InsightCard } from '@/components/insight/InsightCard'
import { ResearchProgress, ResearchReportCard } from '@/components/research'
import { useModeStore, MODE_CONFIGS } from '@/store/mode'
import { useResearchStore } from '@/store/research'
import { useInsightStore } from '@/store/insight'
import { useAIStore } from '@/store/ai'
import { cn } from '@/lib/utils'
import { Send, Sparkles, Mic, Paperclip, MoreHorizontal, FlaskConical, ChevronDown, ChevronLeft, Check, Settings2 } from 'lucide-react'
import { SIMPLE_PRESETS, AI_MODELS, type SimplePreset } from '@/types/ai'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InsightData, InsightParam, InsightCardStatus, ImpactMetricKey } from '@/types/insight'
import type { ResearchReport, ResearchStepId } from '@/types/research'

/**
 * Chat 主页面 - A2UI 统一交互界面
 * 基于 PRD S77 - ChatGPT Style 全宽对话界面
 * RiverBit Design System
 */

// =============================================================================
// Types
// =============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** Single insight (for backward compatibility and simple cases) */
  insight?: InsightData | undefined
  insightStatus?: InsightCardStatus | undefined
  /** Multiple insights (for batch operations) */
  insights?: InsightData[] | undefined
  insightStatuses?: InsightCardStatus[] | undefined
  researchReport?: ResearchReport | undefined
  isResearchProgress?: boolean
}

interface ChatPageProps {
  onExpandInsight?: (insight: InsightData) => void
}

// =============================================================================
// Trading Spirit Persona
// =============================================================================

const SPIRIT_CONFIG = {
  name: 'Trading Spirit',
  icon: '🔮',
  greeting: `你好！我是 **Trading Spirit**，你的智能交易伙伴。

我可以帮你：
- 📈 创建和优化交易策略
- 🔍 分析市场趋势和信号
- ⚡ 快速部署 Paper/Live 交易
- 🛡️ 设置风控规则和预警

告诉我你的交易想法，我会将其转化为可执行的策略！`,
}

// Research Mode Persona
const RESEARCH_CONFIG = {
  name: 'Research Analyst',
  icon: '🔬',
  greeting: `你好！我是 **Research Analyst**，使用 Claude Opus 进行深度研究。

**深度研究模式**将从多个维度综合分析：
- 📈 技术面分析 (K线形态、指标信号)
- ⛓️ 链上数据 (巨鲸动向、资金流向)
- 🌍 宏观事件 (政策动态、行业新闻)
- 😊 市场情绪 (社媒热度、恐慌贪婪指数)

告诉我你想研究的标的，我会生成一份详尽的分析报告！`,
}

// =============================================================================
// Mock Research Report Generator
// =============================================================================

function generateMockResearchReport(symbol: string): ResearchReport {
  return {
    id: `report_${Date.now()}`,
    title: `${symbol} 深度研究报告`,
    symbol,
    summary: `综合技术面、链上数据和宏观事件分析，${symbol} 当前处于短期超卖反弹窗口期。技术指标显示 RSI 进入超卖区域，链上大户持仓稳定，宏观环境中性偏多。建议在回调支撑位附近逐步建仓。`,
    sections: [
      {
        title: '技术面分析',
        icon: '📈',
        content: `K线形态呈现下跌楔形，RSI(14) 当前值 28，处于超卖区间。MACD 柱状图收窄，有金叉迹象。布林带收窄，预示波动率即将扩大。关键支撑位 $95,000，阻力位 $102,000。`,
        metrics: [
          { key: 'rsi', label: 'RSI(14)', value: 28, trend: 'down' as const },
          { key: 'support', label: '支撑位', value: '$95,000', significance: 'high' as const },
          { key: 'resistance', label: '阻力位', value: '$102,000', significance: 'medium' as const },
        ],
      },
      {
        title: '链上数据',
        icon: '⛓️',
        content: `过去7天，巨鲸地址净流入 12,500 BTC，显示大户在逢低吸筹。交易所净流出持续，表明投资者倾向于长期持有。资金费率维持中性，期货市场杠杆水平健康。`,
        metrics: [
          { key: 'whale', label: '巨鲸净流入', value: '+12,500 BTC', trend: 'up' as const },
          { key: 'exchange', label: '交易所余额', value: '-3.2%', trend: 'up' as const, significance: 'high' as const },
        ],
      },
      {
        title: '宏观事件',
        icon: '🌍',
        content: `美联储近期态度偏鸽，市场预期明年降息概率上升。ETF 资金持续净流入，机构配置需求稳定。无重大监管风险事件。`,
        metrics: [
          { key: 'etf', label: 'ETF 净流入', value: '$520M/周', trend: 'up' as const },
        ],
      },
      {
        title: '市场情绪',
        icon: '😊',
        content: `恐慌贪婪指数 35 (恐慌区间)，社媒热度下降 20%，表明市场情绪降温。历史数据显示，该情绪水平往往对应短期底部区域。`,
        metrics: [
          { key: 'fng', label: '恐慌贪婪指数', value: 35, trend: 'down' as const },
          { key: 'social', label: '社媒热度', value: '-20%', trend: 'down' as const },
        ],
      },
    ],
    recommendation: {
      action: 'buy',
      strength: 'moderate',
      rationale: '技术面超卖反弹信号明确，链上大户持仓稳定，宏观环境支持。建议在支撑位附近分批建仓，设置止损于 $93,000 下方。',
      timeframe: '1-2 周',
      risks: [
        '宏观事件突发可能导致短期剧烈波动',
        '若跌破 $93,000 支撑位，需及时止损',
        '杠杆仓位需控制在总资金 20% 以内',
      ],
    },
    confidence: 0.78,
    createdAt: new Date().toISOString(),
  }
}

// =============================================================================
// Mock InsightData Generator
// =============================================================================

function generateMockInsight(userMessage: string): InsightData {
  const isModify = userMessage.includes('修改') || userMessage.includes('调整')
  const isRisk = userMessage.includes('风险') || userMessage.includes('止损')

  const params: InsightParam[] = [
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
    },
    {
      key: 'position_size',
      label: '仓位大小',
      type: 'slider',
      value: 20,
      level: 1,
      config: {
        min: 5,
        max: 100,
        step: 5,
        unit: '%',
      },
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 3,
      level: 1,
      config: {
        min: 1,
        max: 10,
        step: 0.5,
        unit: '%',
      },
      constraints: [
        {
          type: 'dependency',
          related_param: 'take_profit',
          rule: 'stop_loss < take_profit',
          message: '止损必须小于止盈',
          severity: 'error',
        },
      ],
    },
    {
      key: 'take_profit',
      label: '止盈',
      type: 'slider',
      value: 9,
      level: 1,
      config: {
        min: 2,
        max: 30,
        step: 0.5,
        unit: '%',
      },
    },
    {
      key: 'timeframe',
      label: '时间周期',
      type: 'button_group',
      value: '15m',
      level: 2,
      config: {
        options: [
          { label: '5m', value: '5m' },
          { label: '15m', value: '15m' },
          { label: '1h', value: '1h' },
          { label: '4h', value: '4h' },
        ],
      },
    },
    {
      key: 'leverage',
      label: '杠杆倍数',
      type: 'select',
      value: '5',
      level: 2,
      config: {
        options: [
          { label: '1x', value: '1' },
          { label: '3x', value: '3' },
          { label: '5x', value: '5' },
          { label: '10x', value: '10' },
        ],
      },
    },
  ]

  return {
    id: `insight_${Date.now()}`,
    type: isModify ? 'strategy_modify' : isRisk ? 'risk_alert' : 'strategy_create',
    target: {
      strategy_id: isModify ? 'existing_strategy' : 'new',
      name: 'RSI 超卖反弹策略',
      symbol: 'BTC/USDT',
    },
    params,
    impact: {
      metrics: [
        { key: 'sharpeRatio' as ImpactMetricKey, label: '夏普比率', value: 1.8, old_value: 1.2, unit: '', trend: 'up' as const },
        { key: 'maxDrawdown' as ImpactMetricKey, label: '最大回撤', value: 12, old_value: 15, unit: '%', trend: 'up' as const },
        { key: 'winRate' as ImpactMetricKey, label: '胜率', value: 68, old_value: 55, unit: '%', trend: 'up' as const },
      ],
      confidence: 0.85,
      sample_size: 120,
    },
    explanation: `基于 RSI 指标的超卖反弹策略。当 RSI 低于 30 时入场做多，结合 MACD 确认趋势。

**核心逻辑:**
1. RSI(14) < 30 触发关注
2. MACD 金叉确认入场
3. 动态止损跟踪

**预期表现:** 回测显示夏普比率 1.8，最大回撤 12%。`,
    created_at: new Date().toISOString(),
  }
}

// =============================================================================
// Chat Page Component
// =============================================================================

export default function ChatPage({ onExpandInsight }: ChatPageProps) {
  const router = useRouter()
  const { currentMode } = useModeStore()
  const modeConfig = MODE_CONFIGS[currentMode]

  // AI Store - 实际的模型选择
  const { config, setSimplePreset, setCustomModel } = useAIStore()
  const currentPreset = config.simple.preset
  const currentPresetConfig = SIMPLE_PRESETS[currentPreset]
  // 获取实际使用的模型信息
  const actualModelId = config.simple.customModel || currentPresetConfig.defaultModel
  const actualModelInfo = AI_MODELS[actualModelId]

  // Research store
  const {
    currentSession,
    startResearch,
    updateStepStatus,
    setStepResult,
    advanceToNextStep,
    completeResearch,
    getProgress,
  } = useResearchStore()

  // Insight store for Canvas integration
  const { openCanvas, setInsightStatus } = useInsightStore()

  // Determine persona based on mode
  const isResearchMode = currentMode === 'research'
  const persona = isResearchMode ? RESEARCH_CONFIG : SPIRIT_CONFIG

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastModeRef = useRef(currentMode)
  const isInitializedRef = useRef(false)

  // Initialize messages based on mode - Fixed: removed messages.length dependency
  useEffect(() => {
    // Mode change: reset messages
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
      isInitializedRef.current = true
      return
    }

    // Initial load: set welcome message only once
    if (!isInitializedRef.current) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: persona.greeting,
          timestamp: Date.now() - 60000,
        },
      ])
      isInitializedRef.current = true
    }
  }, [currentMode, persona.greeting]) // Removed messages.length from dependencies

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom, currentSession])

  // Handle expand to Canvas - use layout's handler or fallback to store
  const handleExpandToCanvas = useCallback((insight: InsightData) => {
    if (onExpandInsight) {
      onExpandInsight(insight)
    } else {
      openCanvas(insight)
    }
  }, [onExpandInsight, openCanvas])

  // Handle insight status change (single insight)
  const handleInsightStatusChange = useCallback((messageId: string, status: InsightCardStatus, insightId?: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, insightStatus: status } : msg
      )
    )
    if (insightId) {
      setInsightStatus(insightId, status)
    }
  }, [setInsightStatus])

  // Handle insight status change (multiple insights)
  const handleMultiInsightStatusChange = useCallback((messageId: string, index: number, status: InsightCardStatus, insightId?: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg
        const statuses = [...(msg.insightStatuses || [])]
        statuses[index] = status
        return { ...msg, insightStatuses: statuses }
      })
    )
    if (insightId) {
      setInsightStatus(insightId, status)
    }
  }, [setInsightStatus])

  // Simulate research progress
  const simulateResearchProgress = useCallback(async (symbol: string) => {
    const stepIds: ResearchStepId[] = ['technical', 'onchain', 'macro', 'sentiment', 'correlation', 'synthesis']

    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i] as ResearchStepId

      updateStepStatus(stepId, 'running', 0)

      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        updateStepStatus(stepId, 'running', progress)
      }

      setStepResult(stepId, {
        summary: `${stepId === 'technical' ? '技术面分析完成，RSI 处于超卖区间' :
          stepId === 'onchain' ? '链上数据显示巨鲸净流入' :
          stepId === 'macro' ? '宏观环境中性偏多' :
          stepId === 'sentiment' ? '市场情绪处于恐慌区间' :
          stepId === 'correlation' ? 'BTC 与主流资产相关性正常' :
          '综合分析完成，建议逢低布局'}`,
        confidence: 0.75 + Math.random() * 0.2,
      })

      if (i < stepIds.length - 1) {
        advanceToNextStep()
      }

      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    const report = generateMockResearchReport(symbol)
    completeResearch(report)

    return report
  }, [updateStepStatus, setStepResult, advanceToNextStep, completeResearch])

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Handle research mode differently
    if (isResearchMode) {
      const symbolMatch = input.match(/BTC|ETH|SOL|XRP|DOGE|ADA/i)
      const symbol = symbolMatch ? symbolMatch[0].toUpperCase() : 'BTC'

      const progressMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `开始对 ${symbol} 进行深度研究分析...`,
        timestamp: Date.now(),
        isResearchProgress: true,
      }
      setMessages((prev) => [...prev, progressMessage])

      startResearch(symbol, input.trim())
      setIsLoading(false)

      const report = await simulateResearchProgress(symbol)

      const reportMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        role: 'assistant',
        content: `${symbol} 深度研究报告已生成！`,
        timestamp: Date.now(),
        researchReport: report,
      }
      setMessages((prev) => [...prev, reportMessage])
    } else {
      // Regular chat mode
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check if this should generate multiple InsightCards (batch mode)
      const shouldGenerateBatch =
        input.toLowerCase().includes('批量') ||
        input.toLowerCase().includes('多个') ||
        input.toLowerCase().includes('全部')

      // Check if this should generate a single InsightCard
      const shouldGenerateInsight =
        input.toLowerCase().includes('策略') ||
        input.toLowerCase().includes('交易') ||
        input.toLowerCase().includes('买入') ||
        input.toLowerCase().includes('做多') ||
        input.toLowerCase().includes('rsi') ||
        input.toLowerCase().includes('macd') ||
        input.toLowerCase().includes('均线')  // 支持均线关键词

      if (shouldGenerateBatch) {
        const insights = [
          generateMockInsight('BTC RSI 策略'),
          generateMockInsight('ETH MACD 策略'),
          generateMockInsight('SOL 动量策略'),
        ]
        insights.forEach((insight, i) => {
          insight.id = `insight_${Date.now()}_${i}`
          insight.target = {
            strategy_id: `batch_strategy_${i}`,
            symbol: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'][i] || 'BTC/USDT',
            name: ['RSI 超卖反弹策略', 'MACD 趋势跟踪策略', '动量突破策略'][i] || '策略',
          }
        })

        const aiMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: `我为你生成了 3 个策略方案，分别针对不同的交易对和市场条件。你可以单独审核每个策略：`,
          timestamp: Date.now(),
          insights,
          insightStatuses: ['pending', 'pending', 'pending'],
        }

        setMessages((prev) => [...prev, aiMessage])
      } else {
        const aiMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: shouldGenerateInsight
            ? `我帮你分析了 BTC 的走势，发现 RSI 进入超卖区间，这可能是一个不错的入场机会。

下面是我为你设计的策略方案，你可以调整参数后批准执行：`
            : `好的，我来帮你分析一下。${input} 是一个很好的问题。在加密货币交易中，我们需要综合考虑多个因素...

如果你想创建具体的交易策略，可以告诉我你的想法，比如"帮我创建一个 RSI 策略"。`,
          timestamp: Date.now(),
          insight: shouldGenerateInsight ? generateMockInsight(input) : undefined,
          insightStatus: shouldGenerateInsight ? 'pending' : undefined,
        }

        setMessages((prev) => [...prev, aiMessage])
      }
      setIsLoading(false)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <A2UILayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* 返回按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/strategies')
                }
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground -ml-1"
              title="返回"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isResearchMode ? 'bg-purple-500/20' : 'bg-primary/20'
            )}>
              <span className="text-xl">{persona.icon}</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">{persona.name}</h1>
              <p className="text-xs text-muted-foreground">
                {modeConfig.icon} {modeConfig.name}
              </p>
            </div>
          </div>

          {/* 模型快速切换器 - 显眼位置 */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30"
                >
                  <span className="text-base">{currentPresetConfig.icon}</span>
                  <span className="text-xs font-medium">
                    {actualModelInfo?.name || currentPresetConfig.name}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  选择 AI 模型预设
                </div>
                <DropdownMenuSeparator />
                {Object.entries(SIMPLE_PRESETS).map(([key, preset]) => {
                  const presetModelInfo = AI_MODELS[preset.defaultModel]
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => {
                        setSimplePreset(key as SimplePreset)
                        setCustomModel(undefined as unknown as string) // 清除自定义模型
                      }}
                      className="flex items-start gap-3 py-2.5 cursor-pointer"
                    >
                      <span className="text-lg mt-0.5">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{preset.name}</span>
                          {currentPreset === key && !config.simple.customModel && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {presetModelInfo?.name || preset.defaultModel}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        ~${preset.estimatedCostPerCall.toFixed(3)}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/settings?tab=ai')}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>高级模型设置</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isResearchMode && currentSession && currentSession.status === 'researching' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <FlaskConical className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                <span className="text-xs font-medium text-purple-400">{getProgress()}%</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 max-w-3xl mx-auto',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  message.role === 'assistant'
                    ? isResearchMode ? 'bg-purple-500/20 text-purple-400' : 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.role === 'assistant' ? (
                  <span className="text-sm">{persona.icon}</span>
                ) : (
                  <span className="text-xs font-medium">你</span>
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 space-y-3',
                  message.role === 'user' && 'text-right'
                )}
              >
                {/* Text Bubble */}
                <div
                  className={cn(
                    'inline-block px-4 py-2.5 rounded-2xl max-w-full',
                    message.role === 'assistant'
                      ? 'bg-card/80 backdrop-blur-sm border border-border/50 text-left'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Research Progress */}
                {message.isResearchProgress && currentSession && (
                  <div className="text-left">
                    <ResearchProgress
                      steps={currentSession.steps}
                      currentStepIndex={currentSession.currentStepIndex}
                      overallProgress={getProgress()}
                      className="mt-3 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 max-w-md"
                    />
                  </div>
                )}

                {/* Research Report */}
                {message.researchReport && (
                  <div className="text-left">
                    <ResearchReportCard
                      report={message.researchReport}
                      className="mt-3 max-w-lg"
                    />
                  </div>
                )}

                {/* Single InsightCard */}
                {message.insight && !message.insights && (
                  <div className="text-left mt-3 max-w-md">
                    <InsightCard
                      insight={message.insight}
                      status={message.insightStatus || 'pending'}
                      onExpand={() => handleExpandToCanvas(message.insight!)}
                      onApprove={() => {
                        handleInsightStatusChange(message.id, 'approved', message.insight?.id)
                      }}
                      onReject={() => {
                        handleInsightStatusChange(message.id, 'rejected', message.insight?.id)
                      }}
                    />
                  </div>
                )}

                {/* Multiple InsightCards */}
                {message.insights && message.insights.length > 0 && (
                  <div className="text-left mt-3 space-y-3">
                    {message.insights.map((insight, index) => (
                      <div key={insight.id} className="max-w-md">
                        <InsightCard
                          insight={insight}
                          status={message.insightStatuses?.[index] || 'pending'}
                          onExpand={() => handleExpandToCanvas(insight)}
                          onApprove={() => {
                            handleMultiInsightStatusChange(message.id, index, 'approved', insight.id)
                          }}
                          onReject={() => {
                            handleMultiInsightStatusChange(message.id, index, 'rejected', insight.id)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isResearchMode ? 'bg-purple-500/20' : 'bg-primary/20'
              )}>
                <span className="text-sm">{persona.icon}</span>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {isResearchMode ? (
                    <FlaskConical className="h-4 w-4 text-purple-400 animate-pulse" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isResearchMode ? '正在准备深度研究...' : '正在思考...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-2">
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isResearchMode
                  ? '输入研究标的，如 "分析 BTC 走势" 或 "研究 ETH 投资价值"...'
                  : '输入消息，描述你的交易想法...'
                }
                className={cn(
                  'flex-1 bg-transparent border-0 resize-none',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-0',
                  'min-h-[36px] max-h-[120px] py-2'
                )}
                rows={1}
              />

              {/* Voice button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {isResearchMode
                ? 'Research Analyst 使用 Claude Opus 进行深度分析，结果仅供参考'
                : 'Trading Spirit 可能会出错，请在执行前验证重要信息'
              }
            </p>
          </div>
        </div>
      </div>
    </A2UILayout>
  )
}
