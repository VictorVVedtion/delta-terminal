/**
 * Skill Registry - 技能注册中心
 *
 * 基于 delta-terminal-complete-spec-v1.md 的 Skill 架构设计
 *
 * Skill 分类:
 * - Intelligence Skills: 智能理解类 (understand_intent, recommend_factors, explain_backtest)
 * - Action Skills: 写操作类 (create_strategy, modify_params, compile_strategy)
 * - Query Skills: 查询类 (get_strategy, get_backtest, get_position)
 */

import { z } from 'zod'
import type { SkillDefinition, SkillContext, SkillResult, SkillCategory } from '../types/index.js'
import { nlpClient } from '../services/nlp-client.js'
import { strategyClient } from '../services/strategy-client.js'
import { tradingClient } from '../services/trading-client.js'
import { backtestClient } from '../services/backtest-client.js'

// =============================================================================
// Skill Registry
// =============================================================================

class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map()

  /**
   * 注册技能
   */
  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Skill ${skill.id} already registered, overwriting`)
    }
    this.skills.set(skill.id, skill)
    console.log(`[SkillRegistry] Registered skill: ${skill.id} (${skill.category})`)
  }

  /**
   * 获取技能
   */
  get(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId)
  }

  /**
   * 执行技能
   */
  async execute(skillId: string, params: unknown, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(skillId)

    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      }
    }

    // 验证参数
    const validation = skill.parameters.safeParse(params)
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.error.message}`,
      }
    }

    // 执行技能
    try {
      return await skill.execute(validation.data, context)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Skill execution failed',
      }
    }
  }

  /**
   * 列出所有技能
   */
  list(): SkillDefinition[] {
    return Array.from(this.skills.values())
  }

  /**
   * 按类别列出技能
   */
  listByCategory(category: SkillCategory): SkillDefinition[] {
    return this.list().filter(s => s.category === category)
  }

  /**
   * 生成 Agent 工具定义 (用于 LLM function calling)
   */
  generateToolDefinitions(): Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }> {
    return this.list().map(skill => ({
      type: 'function' as const,
      function: {
        name: skill.id,
        description: skill.description,
        parameters: this.zodToJsonSchema(skill.parameters),
      },
    }))
  }

  /**
   * 将 Zod schema 转换为 JSON Schema (简化版)
   */
  private zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
    // 简化实现，实际应使用 zod-to-json-schema 库
    return {
      type: 'object',
      properties: {},
      required: [],
    }
  }
}

// 单例导出
export const skillRegistry = new SkillRegistry()

// =============================================================================
// 内置 Intelligence Skills
// =============================================================================

// 意图识别
skillRegistry.register({
  id: 'understand_intent',
  name: '意图识别',
  category: 'intelligence',
  description: '分析用户输入，识别交易意图和关键参数',
  parameters: z.object({
    userInput: z.string().describe('用户的自然语言输入'),
    context: z.record(z.unknown()).optional().describe('额外上下文'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { userInput: string; context?: Record<string, unknown> }

    // 调用 NLP Processor 进行意图识别
    const result = await nlpClient.recognizeIntent(typedParams.userInput, typedParams.context)

    if (!result) {
      // 服务不可用时返回降级响应
      return {
        success: true,
        data: {
          intent: 'general_chat',
          confidence: 0.5,
          entities: {},
          reasoning: 'NLP service unavailable, defaulting to general chat',
          degraded: true,
        },
      }
    }

    return {
      success: true,
      data: {
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
        reasoning: result.reasoning,
      },
    }
  },
})

// 因子推荐
skillRegistry.register({
  id: 'recommend_factors',
  name: '因子推荐',
  category: 'intelligence',
  description: '基于用户意图推荐合适的交易因子',
  parameters: z.object({
    intent: z.string().describe('识别出的用户意图'),
    symbol: z.string().describe('交易对'),
    timeframe: z.string().optional().describe('时间周期'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { intent: string; symbol: string; timeframe?: string }

    // 基于意图和交易对推荐因子
    // 这里使用规则引擎，后续可接入 Factor Library 服务
    const factorRecommendations = getFactorRecommendations(
      typedParams.intent,
      typedParams.symbol,
      typedParams.timeframe
    )

    return {
      success: true,
      data: {
        recommendedFactors: factorRecommendations,
        reasoning: `Based on intent "${typedParams.intent}" for ${typedParams.symbol}`,
      },
    }
  },
})

// 回测解释
skillRegistry.register({
  id: 'explain_backtest',
  name: '回测解释',
  category: 'intelligence',
  description: '解释回测结果，分析策略表现',
  parameters: z.object({
    backtestId: z.string().describe('回测 ID'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { backtestId: string }
    const userId = context.userId || 'anonymous'

    // 调用回测服务获取解释
    const explanation = await backtestClient.explainBacktest(typedParams.backtestId, userId)

    if (!explanation.success || !explanation.explanation) {
      // 服务不可用时，尝试获取原始结果
      const result = await backtestClient.getBacktestResult(typedParams.backtestId, userId)

      if (result.success && result.result) {
        // 生成基础解释
        const metrics = result.result.metrics
        return {
          success: true,
          data: {
            summary: `策略回测完成，总收益率 ${metrics.totalReturnPercent.toFixed(2)}%`,
            keyMetrics: {
              totalReturn: metrics.totalReturn,
              sharpeRatio: metrics.sharpeRatio,
              maxDrawdown: metrics.maxDrawdownPercent,
              winRate: metrics.winRate,
            },
            suggestions: generateBacktestSuggestions(metrics),
          },
        }
      }

      return {
        success: false,
        error: explanation.error || 'Failed to explain backtest',
      }
    }

    return {
      success: true,
      data: explanation.explanation,
    }
  },
})

// =============================================================================
// 内置 Action Skills
// =============================================================================

// 创建策略
skillRegistry.register({
  id: 'create_strategy',
  name: '创建策略',
  category: 'action',
  description: '创建新的交易策略',
  parameters: z.object({
    name: z.string().describe('策略名称'),
    symbol: z.string().describe('交易对'),
    factors: z.array(z.object({
      id: z.string(),
      params: z.record(z.unknown()).optional(),
    })).describe('使用的因子'),
    entryConditions: z.array(z.string()).describe('入场条件'),
    exitConditions: z.array(z.string()).optional().describe('出场条件'),
    riskManagement: z.object({
      stopLoss: z.number().optional(),
      takeProfit: z.number().optional(),
      positionSize: z.number().optional(),
    }).optional().describe('风险管理配置'),
  }),
  execute: async (params, context) => {
    const typedParams = params as {
      name: string
      symbol: string
      factors: Array<{ id: string; params?: Record<string, unknown> }>
      entryConditions: string[]
      exitConditions?: string[]
      riskManagement?: {
        stopLoss?: number
        takeProfit?: number
        positionSize?: number
      }
    }
    const userId = context.userId || 'anonymous'

    // 调用 Strategy Service 创建策略
    const result = await strategyClient.createStrategy(
      {
        name: typedParams.name,
        symbol: typedParams.symbol,
        factors: typedParams.factors,
        entryConditions: typedParams.entryConditions,
        exitConditions: typedParams.exitConditions,
        riskManagement: typedParams.riskManagement,
      },
      userId
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create strategy',
      }
    }

    return {
      success: true,
      data: {
        strategyId: result.strategyId,
        strategy: result.strategy,
        status: 'created',
        message: `策略 "${typedParams.name}" 创建成功`,
      },
    }
  },
})

// 修改参数
skillRegistry.register({
  id: 'modify_params',
  name: '修改参数',
  category: 'action',
  description: '修改策略参数',
  parameters: z.object({
    strategyId: z.string().describe('策略 ID'),
    params: z.record(z.unknown()).describe('要修改的参数'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { strategyId: string; params: Record<string, unknown> }
    const userId = context.userId || 'anonymous'

    // 调用 Strategy Service 修改参数
    const result = await strategyClient.updateStrategy(
      typedParams.strategyId,
      userId,
      typedParams.params
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to modify params',
      }
    }

    return {
      success: true,
      data: {
        strategyId: typedParams.strategyId,
        status: 'updated',
        newVersion: result.newVersion,
        message: '策略参数已更新',
      },
    }
  },
})

// 编译策略
skillRegistry.register({
  id: 'compile_strategy',
  name: '编译策略',
  category: 'action',
  description: '编译策略生成 RuntimePlan',
  parameters: z.object({
    strategyId: z.string().describe('策略 ID'),
    version: z.number().optional().describe('策略版本'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { strategyId: string; version?: number }
    const userId = context.userId || 'anonymous'

    // 调用 Strategy Service 编译策略
    const result = await strategyClient.compileStrategy(
      typedParams.strategyId,
      userId,
      typedParams.version
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to compile strategy',
      }
    }

    return {
      success: true,
      data: {
        runtimePlanId: result.runtimePlanId,
        hash: result.hash,
        compiled: true,
        message: '策略编译成功',
      },
    }
  },
})

// 启动策略
skillRegistry.register({
  id: 'start_strategy',
  name: '启动策略',
  category: 'action',
  description: '启动已编译的策略',
  parameters: z.object({
    strategyId: z.string().describe('策略 ID'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { strategyId: string }
    const userId = context.userId || 'anonymous'

    const result = await strategyClient.startStrategy(typedParams.strategyId, userId)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to start strategy',
      }
    }

    return {
      success: true,
      data: {
        strategyId: typedParams.strategyId,
        status: result.status,
        message: result.message || '策略已启动',
      },
    }
  },
})

// 停止策略
skillRegistry.register({
  id: 'stop_strategy',
  name: '停止策略',
  category: 'action',
  description: '停止运行中的策略',
  parameters: z.object({
    strategyId: z.string().describe('策略 ID'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { strategyId: string }
    const userId = context.userId || 'anonymous'

    const result = await strategyClient.stopStrategy(typedParams.strategyId, userId)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to stop strategy',
      }
    }

    return {
      success: true,
      data: {
        strategyId: typedParams.strategyId,
        status: result.status,
        message: result.message || '策略已停止',
      },
    }
  },
})

// =============================================================================
// 内置 Query Skills
// =============================================================================

// 获取策略
skillRegistry.register({
  id: 'get_strategy',
  name: '获取策略',
  category: 'query',
  description: '获取策略详情',
  parameters: z.object({
    strategyId: z.string().describe('策略 ID'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { strategyId: string }
    const userId = context.userId || 'anonymous'

    const strategy = await strategyClient.getStrategy(typedParams.strategyId, userId)

    if (!strategy) {
      return {
        success: false,
        error: 'Strategy not found',
      }
    }

    return {
      success: true,
      data: {
        strategy,
      },
    }
  },
})

// 列出策略
skillRegistry.register({
  id: 'list_strategies',
  name: '列出策略',
  category: 'query',
  description: '列出用户的所有策略',
  parameters: z.object({
    status: z.enum(['all', 'active', 'paused', 'draft']).optional(),
    limit: z.number().optional(),
  }),
  execute: async (params, context) => {
    const typedParams = params as { status?: 'all' | 'active' | 'paused' | 'draft'; limit?: number }
    const userId = context.userId || 'anonymous'

    const result = await strategyClient.listStrategies(userId, {
      status: typedParams.status,
      limit: typedParams.limit,
    })

    return {
      success: result.success,
      data: {
        strategies: result.strategies,
        total: result.total,
      },
    }
  },
})

// 获取持仓
skillRegistry.register({
  id: 'get_position',
  name: '获取持仓',
  category: 'query',
  description: '获取当前持仓信息',
  parameters: z.object({
    symbol: z.string().optional().describe('交易对'),
  }),
  execute: async (params, context) => {
    const typedParams = params as { symbol?: string }
    const userId = context.userId || 'anonymous'

    const result = await tradingClient.getPositions(userId, typedParams.symbol)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get positions',
      }
    }

    return {
      success: true,
      data: {
        positions: result.positions,
      },
    }
  },
})

// 获取账户余额
skillRegistry.register({
  id: 'get_balance',
  name: '获取余额',
  category: 'query',
  description: '获取账户余额信息',
  parameters: z.object({}),
  execute: async (params, context) => {
    const userId = context.userId || 'anonymous'

    const result = await tradingClient.getBalance(userId)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get balance',
      }
    }

    return {
      success: true,
      data: {
        balances: result.balances,
      },
    }
  },
})

// =============================================================================
// AI 增强技能
// =============================================================================

// 策略优化建议
skillRegistry.register({
  id: 'optimize_strategy',
  name: '策略优化',
  category: 'intelligence',
  description: '分析策略表现并提供优化建议，包括参数调整、风险管理改进等',
  parameters: z.object({
    strategyId: z.string().describe('要优化的策略 ID'),
    optimizationFocus: z.enum(['params', 'risk', 'entry', 'exit', 'all']).optional().describe('优化重点'),
    context: z.record(z.unknown()).optional().describe('额外上下文（如市场数据、表现数据）'),
  }),
  execute: async (params, context) => {
    const typedParams = params as {
      strategyId: string
      optimizationFocus?: 'params' | 'risk' | 'entry' | 'exit' | 'all'
      context?: Record<string, unknown>
    }
    const userId = context.userId || 'anonymous'

    // 获取策略详情
    const strategy = await strategyClient.getStrategy(typedParams.strategyId, userId)

    if (!strategy) {
      return {
        success: false,
        error: 'Strategy not found',
      }
    }

    // 调用 NLP Processor 进行优化分析
    const nlpResponse = await nlpClient.chat({
      message: `分析以下策略并提供优化建议，重点关注 ${typedParams.optimizationFocus || 'all'}：
        策略名称：${strategy.name}
        交易对：${strategy.symbol}
        因子：${JSON.stringify(strategy.factors)}
        入场条件：${JSON.stringify(strategy.entryConditions)}
        风险管理：${JSON.stringify(strategy.riskManagement)}
        历史表现：${JSON.stringify(strategy.performance || {})}`,
      user_id: userId,
      context: {
        task: 'strategy_optimization',
        focus: typedParams.optimizationFocus,
        ...typedParams.context,
      },
    })

    if (!nlpResponse) {
      // 降级：基于规则生成优化建议
      return {
        success: true,
        data: {
          insightType: 'strategy_optimize',
          suggestions: generateOptimizationSuggestions(strategy),
          confidence: 0.6,
          degraded: true,
        },
      }
    }

    return {
      success: true,
      data: {
        insightType: 'strategy_optimize',
        message: nlpResponse.message,
        insight: nlpResponse.insight,
        suggestions: nlpResponse.suggested_actions,
        confidence: nlpResponse.confidence,
      },
    }
  },
})

// 回测建议
skillRegistry.register({
  id: 'suggest_backtest',
  name: '回测建议',
  category: 'intelligence',
  description: '根据策略配置推荐回测参数，并解读回测结果',
  parameters: z.object({
    strategyId: z.string().optional().describe('策略 ID'),
    strategyConfig: z.record(z.unknown()).optional().describe('策略配置'),
    backtestMode: z.enum(['setup', 'analyze']).optional().describe('模式：setup=配置回测，analyze=分析结果'),
    backtestResults: z.record(z.unknown()).optional().describe('回测结果（analyze 模式需要）'),
  }),
  execute: async (params, context) => {
    const typedParams = params as {
      strategyId?: string
      strategyConfig?: Record<string, unknown>
      backtestMode?: 'setup' | 'analyze'
      backtestResults?: Record<string, unknown>
    }

    if (typedParams.backtestMode === 'analyze' && typedParams.backtestResults) {
      // 分析回测结果
      return {
        success: true,
        data: {
          insightType: 'backtest_analysis',
          interpretation: analyzeBacktestResults(typedParams.backtestResults),
        },
      }
    }

    // 获取回测配置建议
    const config = typedParams.strategyConfig || {}
    const suggestion = await backtestClient.suggestBacktestConfig(config)

    if (suggestion.success && suggestion.suggestion) {
      return {
        success: true,
        data: {
          insightType: 'backtest_suggest',
          recommendedConfig: suggestion.suggestion,
        },
      }
    }

    // 降级：基于规则生成建议
    return {
      success: true,
      data: {
        insightType: 'backtest_suggest',
        recommendedConfig: {
          period: '6m',
          initialCapital: 10000,
          commission: 0.1,
          slippage: 0.05,
        },
        interpretation: '建议使用 6 个月的历史数据进行回测，涵盖多个市场周期',
        degraded: true,
      },
    }
  },
})

// 风险分析
skillRegistry.register({
  id: 'analyze_risk',
  name: '风险分析',
  category: 'intelligence',
  description: '分析投资组合和策略的风险状况，提供风险管理建议',
  parameters: z.object({
    portfolioId: z.string().optional().describe('投资组合 ID'),
    strategyIds: z.array(z.string()).optional().describe('要分析的策略 ID 列表'),
    analysisType: z.enum(['portfolio', 'strategy', 'market', 'comprehensive']).optional().describe('分析类型'),
  }),
  execute: async (params, context) => {
    const typedParams = params as {
      portfolioId?: string
      strategyIds?: string[]
      analysisType?: 'portfolio' | 'strategy' | 'market' | 'comprehensive'
    }
    const userId = context.userId || 'anonymous'

    // 获取风险指标
    const riskMetrics = await tradingClient.getRiskMetrics(userId)

    // 获取持仓信息
    const positions = await tradingClient.getPositions(userId)

    // 构建风险分析结果
    const riskLevel = riskMetrics.metrics?.riskLevel || 'medium'
    const recommendations = generateRiskRecommendations(
      riskMetrics.metrics,
      positions.positions,
      typedParams.analysisType
    )

    return {
      success: true,
      data: {
        insightType: 'risk_analysis',
        riskLevel,
        riskScore: calculateRiskScore(riskMetrics.metrics),
        metrics: riskMetrics.metrics || {
          portfolioValue: 0,
          totalExposure: 0,
          marginRate: 100,
          maxDrawdown: 0,
        },
        positions: positions.positions,
        recommendations,
        confidence: riskMetrics.success ? 0.88 : 0.6,
      },
    }
  },
})

// 市场情绪分析
skillRegistry.register({
  id: 'analyze_sentiment',
  name: '市场情绪分析',
  category: 'intelligence',
  description: '分析市场情绪和趋势，辅助交易决策',
  parameters: z.object({
    symbol: z.string().describe('交易对'),
    timeframe: z.string().optional().describe('时间周期'),
    sources: z.array(z.enum(['price', 'volume', 'social', 'news'])).optional().describe('数据来源'),
  }),
  execute: async (params, context) => {
    const typedParams = params as {
      symbol: string
      timeframe?: string
      sources?: Array<'price' | 'volume' | 'social' | 'news'>
    }

    // 获取市场数据
    const marketData = await tradingClient.getMarketData(typedParams.symbol)

    // 基于价格数据分析情绪
    const sentiment = analyzeSentiment(marketData.data)

    return {
      success: true,
      data: {
        symbol: typedParams.symbol,
        sentiment: sentiment.sentiment,
        fearGreedIndex: sentiment.fearGreedIndex,
        trendStrength: sentiment.trendStrength,
        signals: sentiment.signals,
        summary: sentiment.summary,
        timestamp: Date.now(),
      },
    }
  },
})

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 基于意图推荐因子
 */
function getFactorRecommendations(
  intent: string,
  symbol: string,
  timeframe?: string
): Array<{ id: string; name: string; confidence: number }> {
  const recommendations: Array<{ id: string; name: string; confidence: number }> = []

  // 基于意图类型推荐不同因子
  if (intent.includes('momentum') || intent.includes('趋势')) {
    recommendations.push(
      { id: 'rsi_14', name: 'RSI(14)', confidence: 0.9 },
      { id: 'macd_12_26_9', name: 'MACD(12,26,9)', confidence: 0.85 },
      { id: 'ema_20', name: 'EMA(20)', confidence: 0.8 }
    )
  } else if (intent.includes('grid') || intent.includes('网格')) {
    recommendations.push(
      { id: 'bollinger_20_2', name: 'Bollinger(20,2)', confidence: 0.9 },
      { id: 'atr_14', name: 'ATR(14)', confidence: 0.85 }
    )
  } else if (intent.includes('scalp') || intent.includes('短线')) {
    recommendations.push(
      { id: 'rsi_7', name: 'RSI(7)', confidence: 0.88 },
      { id: 'ema_9', name: 'EMA(9)', confidence: 0.85 },
      { id: 'volume_ma', name: 'Volume MA', confidence: 0.75 }
    )
  } else {
    // 默认推荐
    recommendations.push(
      { id: 'rsi_14', name: 'RSI(14)', confidence: 0.8 },
      { id: 'macd_12_26_9', name: 'MACD(12,26,9)', confidence: 0.75 },
      { id: 'ema_20', name: 'EMA(20)', confidence: 0.7 }
    )
  }

  return recommendations
}

/**
 * 生成回测建议
 */
function generateBacktestSuggestions(metrics: {
  sharpeRatio: number
  maxDrawdownPercent: number
  winRate: number
  profitFactor?: number
}): string[] {
  const suggestions: string[] = []

  if (metrics.sharpeRatio < 1) {
    suggestions.push('夏普比率偏低，建议优化策略参数或增加过滤条件')
  }
  if (metrics.maxDrawdownPercent < -15) {
    suggestions.push('最大回撤较大，建议收紧止损或降低仓位')
  }
  if (metrics.winRate < 50) {
    suggestions.push('胜率偏低，考虑优化入场条件')
  }
  if (suggestions.length === 0) {
    suggestions.push('策略表现良好，可考虑进行 Paper Trading 验证')
  }

  return suggestions
}

/**
 * 生成优化建议
 */
function generateOptimizationSuggestions(strategy: {
  riskManagement?: {
    stopLoss?: number
    takeProfit?: number
  }
  performance?: {
    winRate?: number
    sharpeRatio?: number
  }
}): Array<{ param: string; suggestion: string; reason: string }> {
  const suggestions: Array<{ param: string; suggestion: string; reason: string }> = []

  if (strategy.riskManagement?.stopLoss && strategy.riskManagement.stopLoss > 5) {
    suggestions.push({
      param: 'stopLoss',
      suggestion: '收紧止损至 3-5%',
      reason: '减少单次交易最大损失',
    })
  }

  if (strategy.performance?.winRate && strategy.performance.winRate < 50) {
    suggestions.push({
      param: 'entryConditions',
      suggestion: '增加趋势确认条件',
      reason: '提高入场准确率',
    })
  }

  return suggestions
}

/**
 * 分析回测结果
 */
function analyzeBacktestResults(results: Record<string, unknown>): string {
  const totalReturn = (results.totalReturn as number) || 0
  const sharpe = (results.sharpeRatio as number) || 0
  const maxDD = (results.maxDrawdown as number) || 0

  let interpretation = `回测结果分析：\n`
  interpretation += `- 总收益率 ${totalReturn.toFixed(2)}%：${totalReturn > 0 ? '盈利' : '亏损'}策略\n`
  interpretation += `- 夏普比率 ${sharpe.toFixed(2)}：${sharpe > 1 ? '风险调整收益良好' : '需要优化风险收益比'}\n`
  interpretation += `- 最大回撤 ${maxDD.toFixed(2)}%：${Math.abs(maxDD) < 10 ? '风控较好' : '回撤较大，注意风险管理'}`

  return interpretation
}

/**
 * 生成风险建议
 */
function generateRiskRecommendations(
  metrics?: {
    marginRate?: number
    maxDrawdown?: number
    totalExposure?: number
  },
  positions?: Array<{ symbol: string; unrealizedPnLPercent: number }>,
  analysisType?: string
): string[] {
  const recommendations: string[] = []

  if (metrics?.marginRate && metrics.marginRate < 150) {
    recommendations.push('保证金率偏低，建议降低仓位或追加保证金')
  }

  if (metrics?.maxDrawdown && Math.abs(metrics.maxDrawdown) > 15) {
    recommendations.push('最大回撤较大，建议设置每日止损限额')
  }

  if (positions && positions.length > 5) {
    recommendations.push('持仓分散，注意监控整体风险敞口')
  }

  if (recommendations.length === 0) {
    recommendations.push('当前风险状况良好，继续保持')
  }

  return recommendations
}

/**
 * 计算风险评分
 */
function calculateRiskScore(metrics?: {
  marginRate?: number
  maxDrawdown?: number
  volatility?: number
}): number {
  if (!metrics) return 50

  let score = 100

  // 保证金率影响
  if (metrics.marginRate) {
    if (metrics.marginRate < 100) score -= 30
    else if (metrics.marginRate < 150) score -= 15
    else if (metrics.marginRate < 200) score -= 5
  }

  // 最大回撤影响
  if (metrics.maxDrawdown) {
    const dd = Math.abs(metrics.maxDrawdown)
    if (dd > 20) score -= 25
    else if (dd > 10) score -= 15
    else if (dd > 5) score -= 5
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * 分析市场情绪
 */
function analyzeSentiment(marketData?: {
  price?: number
  change24h?: number
  changePercent24h?: number
  volume24h?: number
}): {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  fearGreedIndex: number
  trendStrength: number
  signals: Array<{ indicator: string; value: number; signal: string }>
  summary: string
} {
  if (!marketData) {
    return {
      sentiment: 'neutral',
      fearGreedIndex: 50,
      trendStrength: 0,
      signals: [],
      summary: '无法获取市场数据',
    }
  }

  const changePercent = marketData.changePercent24h || 0

  // 简化的情绪分析
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let fearGreedIndex = 50

  if (changePercent > 3) {
    sentiment = 'bullish'
    fearGreedIndex = 65 + Math.min(changePercent * 3, 25)
  } else if (changePercent < -3) {
    sentiment = 'bearish'
    fearGreedIndex = 35 - Math.min(Math.abs(changePercent) * 3, 25)
  }

  return {
    sentiment,
    fearGreedIndex: Math.round(fearGreedIndex),
    trendStrength: Math.min(Math.abs(changePercent) / 10, 1),
    signals: [
      { indicator: 'Price Change', value: changePercent, signal: sentiment },
    ],
    summary: `市场整体呈现${sentiment === 'bullish' ? '看涨' : sentiment === 'bearish' ? '看跌' : '中性'}情绪`,
  }
}
