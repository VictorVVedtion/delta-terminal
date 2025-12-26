/**
 * AI Config API Route
 *
 * 管理 AI 配置，包括模型选择、任务配置等
 * 注意：API Key 不在这里存储，由前端安全存储
 */

import { NextRequest, NextResponse } from 'next/server'
import { AI_MODELS, TASK_TYPES, SIMPLE_PRESETS } from '@/types/ai'

// GET /api/ai/config - 获取可用模型和配置选项
export async function GET(_request: NextRequest) {
  try {
    // 返回所有可用的模型、任务类型和预设
    return NextResponse.json({
      success: true,
      data: {
        models: Object.values(AI_MODELS).map(model => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          tier: model.tier,
          capabilities: model.capabilities,
          contextLength: model.contextLength,
          inputPrice: model.inputPrice,
          outputPrice: model.outputPrice,
          supportsStreaming: model.supportsStreaming,
          supportsThinking: model.supportsThinking,
          description: model.description,
          icon: model.icon
        })),
        taskTypes: Object.values(TASK_TYPES).map(task => ({
          type: task.type,
          name: task.name,
          description: task.description,
          priority: task.priority,
          recommendedModel: task.recommendedModel,
          alternativeModels: task.alternativeModels,
          icon: task.icon
        })),
        presets: Object.values(SIMPLE_PRESETS).map(preset => ({
          preset: preset.preset,
          name: preset.name,
          description: preset.description,
          defaultModel: preset.defaultModel,
          estimatedCostPerCall: preset.estimatedCostPerCall,
          icon: preset.icon
        })),
        // 模型分组
        modelsByTier: {
          tier1: Object.values(AI_MODELS).filter(m => m.tier === 'tier1'),
          tier2: Object.values(AI_MODELS).filter(m => m.tier === 'tier2'),
          tier3: Object.values(AI_MODELS).filter(m => m.tier === 'tier3')
        },
        // 模型按能力分组
        modelsByCapability: {
          reasoning: Object.values(AI_MODELS).filter(m => m.capabilities.includes('reasoning')),
          coding: Object.values(AI_MODELS).filter(m => m.capabilities.includes('coding')),
          agent: Object.values(AI_MODELS).filter(m => m.capabilities.includes('agent')),
          fast: Object.values(AI_MODELS).filter(m => m.capabilities.includes('fast')),
          cheap: Object.values(AI_MODELS).filter(m => m.capabilities.includes('cheap')),
          chinese: Object.values(AI_MODELS).filter(m => m.capabilities.includes('chinese'))
        }
      }
    })
  } catch (error) {
    console.error('Error fetching AI config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI config' },
      { status: 500 }
    )
  }
}

// POST /api/ai/config - 验证配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, simple, advanced, settings } = body

    const errors: string[] = []

    // 验证模式
    if (mode && !['simple', 'advanced'].includes(mode)) {
      errors.push('Invalid mode. Must be "simple" or "advanced"')
    }

    // 验证简单模式预设
    if (simple?.preset && !SIMPLE_PRESETS[simple.preset as keyof typeof SIMPLE_PRESETS]) {
      errors.push(`Invalid preset: ${simple.preset}`)
    }

    // 验证自定义模型
    if (simple?.customModel && !AI_MODELS[simple.customModel]) {
      errors.push(`Invalid custom model: ${simple.customModel}`)
    }

    // 验证高级模式任务模型
    if (advanced?.taskModels) {
      for (const [taskType, model] of Object.entries(advanced.taskModels)) {
        if (!TASK_TYPES[taskType as keyof typeof TASK_TYPES]) {
          errors.push(`Invalid task type: ${taskType}`)
        }
        if (!AI_MODELS[model as string]) {
          errors.push(`Invalid model for ${taskType}: ${model}`)
        }
      }
    }

    // 验证设置
    if (settings) {
      if (settings.temperature !== undefined) {
        if (settings.temperature < 0 || settings.temperature > 2) {
          errors.push('Temperature must be between 0 and 2')
        }
      }
      if (settings.maxTokens !== undefined) {
        if (settings.maxTokens < 1 || settings.maxTokens > 128000) {
          errors.push('Max tokens must be between 1 and 128000')
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration is valid'
    })
  } catch (error) {
    console.error('Error validating AI config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate AI config' },
      { status: 500 }
    )
  }
}
