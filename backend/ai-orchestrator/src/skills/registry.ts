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
    // TODO: 调用 NLP Processor
    return {
      success: true,
      data: {
        intent: 'create_strategy',
        confidence: 0.85,
        entities: {
          symbol: 'BTC/USDT',
          indicator: 'RSI',
        },
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
    // TODO: 调用 Factor Library
    return {
      success: true,
      data: {
        recommendedFactors: [
          { id: 'rsi_14', name: 'RSI(14)', confidence: 0.9 },
          { id: 'macd_12_26_9', name: 'MACD(12,26,9)', confidence: 0.75 },
        ],
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
    // TODO: 调用回测服务获取结果并解释
    return {
      success: true,
      data: {
        summary: '策略在回测期间表现良好...',
        keyMetrics: {
          totalReturn: 15.3,
          sharpeRatio: 1.2,
          maxDrawdown: -8.5,
        },
        suggestions: ['建议增加止损位', '可考虑加入趋势过滤'],
      },
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
    // TODO: 调用 Strategy Service 创建策略
    return {
      success: true,
      data: {
        strategyId: `strategy_${Date.now()}`,
        status: 'created',
        message: '策略创建成功',
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
    // TODO: 调用 Strategy Service 修改参数
    return {
      success: true,
      data: {
        strategyId: params.strategyId,
        status: 'updated',
        newVersion: 2,
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
    // TODO: 调用编译服务
    return {
      success: true,
      data: {
        runtimePlanId: `plan_${Date.now()}`,
        hash: 'abc123...',
        compiled: true,
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
    // TODO: 调用 Strategy Service
    return {
      success: true,
      data: {
        strategy: {
          id: params.strategyId,
          name: '示例策略',
          status: 'active',
        },
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
    // TODO: 调用 Strategy Service
    return {
      success: true,
      data: {
        strategies: [],
        total: 0,
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
    // TODO: 调用交易服务
    return {
      success: true,
      data: {
        positions: [],
      },
    }
  },
})
