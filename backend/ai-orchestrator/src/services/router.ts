/**
 * 模型路由服务
 *
 * 根据任务类型、用户配置、负载等因素选择最佳模型
 */

import type { AITaskType, ModelRoutingConfig, SubscriptionPlan } from '../types/index.js'
import { AI_MODELS, TASK_TYPES, getModel } from './config.js'

// =============================================================================
// 模型路由服务
// =============================================================================

export class ModelRouterService {
  /**
   * 根据配置选择最佳模型
   */
  selectModel(config: ModelRoutingConfig): string {
    const taskConfig = TASK_TYPES[config.taskType]

    // 1. 如果用户是 free 计划，使用便宜的模型
    if (config.userTier === 'free') {
      return this.selectCheapModel(config)
    }

    // 2. 如果优先成本，选择便宜模型
    if (config.preferCost) {
      return this.selectCheapModel(config)
    }

    // 3. 如果优先速度，选择快速模型
    if (config.preferSpeed) {
      return this.selectFastModel(config)
    }

    // 4. 如果优先中文，选择中文优化模型
    if (config.preferChinese) {
      return this.selectChineseModel(config)
    }

    // 5. 默认使用任务推荐模型
    return taskConfig.recommendedModel
  }

  /**
   * 根据任务类型获取推荐模型
   */
  getRecommendedModel(taskType: AITaskType): string {
    return TASK_TYPES[taskType].recommendedModel
  }

  /**
   * 获取备选模型列表
   */
  getAlternativeModels(taskType: AITaskType): string[] {
    return TASK_TYPES[taskType].alternativeModels
  }

  /**
   * 验证模型是否适合任务
   */
  validateModelForTask(modelId: string, taskType: AITaskType): { valid: boolean; warnings: string[] } {
    const model = getModel(modelId)
    const taskConfig = TASK_TYPES[taskType]
    const warnings: string[] = []

    if (!model) {
      return { valid: false, warnings: ['模型不存在'] }
    }

    // 检查模型是否在推荐列表中
    const isRecommended = modelId === taskConfig.recommendedModel ||
      taskConfig.alternativeModels.includes(modelId)

    if (!isRecommended) {
      warnings.push(`模型 ${model.name} 不是此任务的推荐模型`)
    }

    // 特定任务的能力检查
    if (taskType === 'reasoning' && !model.supportsThinking) {
      warnings.push('此模型不支持思考过程可视化')
    }

    if (taskType === 'agent' && !model.capabilities.includes('agent')) {
      warnings.push('此模型可能不适合 Agent 任务')
    }

    return { valid: true, warnings }
  }

  /**
   * 获取模型的流式支持信息
   */
  getStreamingSupport(modelId: string): { streaming: boolean; thinking: boolean } {
    const model = getModel(modelId)
    if (!model) {
      return { streaming: false, thinking: false }
    }
    return {
      streaming: model.supportsStreaming,
      thinking: model.supportsThinking,
    }
  }

  // =============================================================================
  // 私有选择方法
  // =============================================================================

  private selectCheapModel(config: ModelRoutingConfig): string {
    // 按价格排序，选择最便宜的
    const cheapModels = Object.values(AI_MODELS)
      .filter(m => m.capabilities.includes('cheap') || m.tier === 'tier2' || m.tier === 'tier3')
      .sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice))

    // 如果优先中文
    if (config.preferChinese) {
      const chineseCheap = cheapModels.find(m => m.capabilities.includes('chinese'))
      if (chineseCheap) return chineseCheap.id
    }

    return cheapModels[0]?.id || 'openai/gpt-4o-mini'
  }

  private selectFastModel(config: ModelRoutingConfig): string {
    const fastModels = Object.values(AI_MODELS)
      .filter(m => m.capabilities.includes('fast'))

    // 如果优先中文
    if (config.preferChinese) {
      const chineseFast = fastModels.find(m => m.capabilities.includes('chinese'))
      if (chineseFast) return chineseFast.id
    }

    return fastModels[0]?.id || 'anthropic/claude-3.5-haiku'
  }

  private selectChineseModel(config: ModelRoutingConfig): string {
    const chineseModels = Object.values(AI_MODELS)
      .filter(m => m.capabilities.includes('chinese'))

    // 根据任务优先级选择
    const taskConfig = TASK_TYPES[config.taskType]

    if (taskConfig.priority === 'intelligence') {
      // 选择推理能力强的中文模型
      const reasoningChinese = chineseModels.find(m => m.capabilities.includes('reasoning'))
      if (reasoningChinese) return reasoningChinese.id
    }

    if (taskConfig.priority === 'cost') {
      // 选择便宜的中文模型
      const cheapChinese = chineseModels
        .sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice))
      return cheapChinese[0]?.id || 'deepseek/deepseek-chat'
    }

    return chineseModels[0]?.id || 'deepseek/deepseek-chat'
  }
}

// 单例导出
export const modelRouter = new ModelRouterService()
