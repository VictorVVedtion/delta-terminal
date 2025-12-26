/**
 * Status API 路由
 *
 * 用户 AI 状态、配置、健康检查
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { orchestrator } from '../services/orchestrator.js'
import { AI_MODELS, TASK_TYPES, getModelsByTier, getModelsByCapability } from '../services/config.js'
import { skillRegistry } from '../skills/registry.js'

// =============================================================================
// 路由注册
// =============================================================================

export async function statusRoutes(fastify: FastifyInstance) {
  /**
   * GET /status - 获取用户 AI 状态
   */
  fastify.get('/status', async (request, reply) => {
    const userId = getUserId(request)
    const status = await orchestrator.getUserStatus(userId)

    return reply.send({
      success: true,
      data: status,
    })
  })

  /**
   * GET /config - 获取 AI 配置
   */
  fastify.get('/config', async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        models: Object.values(AI_MODELS),
        taskTypes: Object.values(TASK_TYPES),
        modelsByTier: {
          tier1: getModelsByTier('tier1'),
          tier2: getModelsByTier('tier2'),
          tier3: getModelsByTier('tier3'),
        },
        modelsByCapability: {
          reasoning: getModelsByCapability('reasoning'),
          coding: getModelsByCapability('coding'),
          agent: getModelsByCapability('agent'),
          fast: getModelsByCapability('fast'),
          cheap: getModelsByCapability('cheap'),
          chinese: getModelsByCapability('chinese'),
        },
      },
    })
  })

  /**
   * GET /skills - 获取可用技能列表
   */
  fastify.get('/skills', async (request, reply) => {
    const skills = skillRegistry.list()

    return reply.send({
      success: true,
      data: {
        skills: skills.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
        })),
        byCategory: {
          intelligence: skillRegistry.listByCategory('intelligence').map(s => s.id),
          action: skillRegistry.listByCategory('action').map(s => s.id),
          query: skillRegistry.listByCategory('query').map(s => s.id),
        },
      },
    })
  })

  /**
   * POST /skills/:skillId/execute - 执行技能
   */
  fastify.post<{
    Params: { skillId: string }
    Body: { params: Record<string, unknown> }
  }>('/skills/:skillId/execute', async (request, reply) => {
    const userId = getUserId(request)
    const { skillId } = request.params
    const { params } = request.body

    const result = await skillRegistry.execute(skillId, params, {
      userId,
      conversationId: '',
      sessionId: `session_${Date.now()}`,
      model: 'anthropic/claude-sonnet-4.5',
    })

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.error,
      })
    }

    return reply.send({
      success: true,
      data: result.data,
      usage: result.usage,
    })
  })

  /**
   * GET /health - 健康检查
   */
  fastify.get('/health', async (request, reply) => {
    const health = await orchestrator.healthCheck()

    const isHealthy = health.orchestrator && health.llm.healthy

    return reply.status(isHealthy ? 200 : 503).send({
      success: isHealthy,
      data: {
        orchestrator: health.orchestrator,
        llm: health.llm,
        timestamp: Date.now(),
      },
    })
  })
}

// =============================================================================
// 辅助函数
// =============================================================================

function getUserId(request: FastifyRequest): string {
  // TODO: 从 JWT 中解析
  return 'dev_user_001'
}
