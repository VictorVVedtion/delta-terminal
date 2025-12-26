/**
 * AI 编排服务 - 核心服务
 *
 * 统一协调权限检查、模型路由、LLM 调用、使用统计
 */

import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  AITaskType,
  UserStatus,
  UsageStats,
} from '../types/index.js'
import { quotaService } from './quota.js'
import { modelRouter } from './router.js'
import { llmProxy } from './llm.js'
import { getModel, TASK_TYPES } from './config.js'

// =============================================================================
// 编排请求/响应类型
// =============================================================================

export interface OrchestrateRequest {
  userId: string
  sessionId: string
  conversationId?: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  taskType?: AITaskType
  model?: string  // 用户指定的模型（可选）
  maxTokens?: number
  temperature?: number
  streaming?: boolean
  // 路由偏好
  preferChinese?: boolean
  preferSpeed?: boolean
  preferCost?: boolean
}

export interface OrchestrateResult {
  success: boolean
  response?: ChatResponse
  error?: string
  modelUsed: string
  routingDecision: {
    requestedModel?: string
    selectedModel: string
    reason: string
  }
}

// =============================================================================
// AI 编排服务
// =============================================================================

export class OrchestratorService {
  /**
   * 主入口 - 非流式调用
   */
  async orchestrate(request: OrchestrateRequest): Promise<OrchestrateResult> {
    const startTime = Date.now()

    try {
      // 1. 权限检查
      const accessCheck = await this.checkAccess(request.userId, request.model)
      if (!accessCheck.allowed) {
        return {
          success: false,
          error: accessCheck.reason,
          modelUsed: '',
          routingDecision: {
            requestedModel: request.model,
            selectedModel: '',
            reason: accessCheck.reason || '权限检查失败',
          },
        }
      }

      // 2. 模型路由
      const routing = this.routeModel(request, accessCheck.userStatus!)
      console.log(`[Orchestrator] Model routing: ${routing.selectedModel} (${routing.reason})`)

      // 3. 调用 LLM
      const chatRequest: ChatRequest = {
        messages: request.messages,
        model: routing.selectedModel,
        taskType: request.taskType,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        streaming: false,
      }

      const response = await llmProxy.chat(chatRequest)

      // 4. 记录使用量
      await quotaService.recordUsage(request.userId, response.usage)

      // 5. 返回结果
      return {
        success: true,
        response,
        modelUsed: routing.selectedModel,
        routingDecision: routing,
      }

    } catch (error) {
      console.error('[Orchestrator] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI 服务异常',
        modelUsed: '',
        routingDecision: {
          requestedModel: request.model,
          selectedModel: '',
          reason: '服务异常',
        },
      }
    }
  }

  /**
   * 流式调用入口 - 返回 AsyncGenerator
   */
  async *orchestrateStream(request: OrchestrateRequest): AsyncGenerator<StreamChunk> {
    try {
      // 1. 权限检查
      const accessCheck = await this.checkAccess(request.userId, request.model)
      if (!accessCheck.allowed) {
        yield {
          type: 'error',
          data: { error: accessCheck.reason || '权限检查失败' },
        }
        return
      }

      // 2. 模型路由
      const routing = this.routeModel(request, accessCheck.userStatus!)
      console.log(`[Orchestrator] Stream model routing: ${routing.selectedModel}`)

      // 3. 调用 LLM 流式接口
      const chatRequest: ChatRequest = {
        messages: request.messages,
        model: routing.selectedModel,
        taskType: request.taskType,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        streaming: true,
      }

      let lastUsage: UsageStats | undefined

      for await (const chunk of llmProxy.chatStream(chatRequest)) {
        // 捕获使用统计
        if (chunk.type === 'usage' && chunk.data.usage) {
          lastUsage = chunk.data.usage
        }
        yield chunk
      }

      // 4. 记录使用量
      if (lastUsage) {
        await quotaService.recordUsage(request.userId, lastUsage)
      }

    } catch (error) {
      console.error('[Orchestrator] Stream error:', error)
      yield {
        type: 'error',
        data: { error: error instanceof Error ? error.message : 'AI 服务异常' },
      }
    }
  }

  /**
   * 获取用户 AI 状态
   */
  async getUserStatus(userId: string): Promise<UserStatus> {
    return quotaService.getUserStatus(userId)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    orchestrator: boolean
    llm: { healthy: boolean; latency: number; models?: number }
  }> {
    const llmHealth = await llmProxy.healthCheck()
    return {
      orchestrator: true,
      llm: llmHealth,
    }
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  /**
   * 检查用户访问权限
   */
  private async checkAccess(
    userId: string,
    requestedModel?: string
  ): Promise<{ allowed: boolean; reason?: string; userStatus?: UserStatus }> {
    const userStatus = await quotaService.getUserStatus(userId)

    // 检查是否可以使用 AI
    if (!userStatus.limits.canUseAI) {
      return {
        allowed: false,
        reason: '已达到调用限制，请稍后再试或升级订阅',
      }
    }

    // 如果指定了模型，检查模型访问权限
    if (requestedModel) {
      const modelAccess = await quotaService.checkModelAccess(userId, requestedModel)
      if (!modelAccess.allowed) {
        return {
          allowed: false,
          reason: modelAccess.reason,
          userStatus,
        }
      }
    }

    return { allowed: true, userStatus }
  }

  /**
   * 模型路由决策
   */
  private routeModel(
    request: OrchestrateRequest,
    userStatus: UserStatus
  ): { requestedModel?: string; selectedModel: string; reason: string } {
    const taskType = request.taskType || 'chat'

    // 如果用户指定了模型且有权限，使用指定模型
    if (request.model) {
      const model = getModel(request.model)
      if (model) {
        // 验证模型是否适合任务
        const validation = modelRouter.validateModelForTask(request.model, taskType)
        if (validation.valid) {
          return {
            requestedModel: request.model,
            selectedModel: request.model,
            reason: validation.warnings.length > 0
              ? `用户指定 (警告: ${validation.warnings.join(', ')})`
              : '用户指定模型',
          }
        }
      }
    }

    // 使用自动路由
    const selectedModel = modelRouter.selectModel({
      taskType,
      userTier: userStatus.subscription.plan,
      preferChinese: request.preferChinese || false,
      preferSpeed: request.preferSpeed || false,
      preferCost: request.preferCost || false,
    })

    const taskConfig = TASK_TYPES[taskType]
    let reason = `任务类型 "${taskConfig.name}" 推荐`

    if (request.preferChinese) reason += '，中文优化'
    if (request.preferSpeed) reason += '，速度优先'
    if (request.preferCost) reason += '，成本优先'

    return {
      requestedModel: request.model,
      selectedModel,
      reason,
    }
  }
}

// 单例导出
export const orchestrator = new OrchestratorService()
