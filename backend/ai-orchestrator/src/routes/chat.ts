/**
 * Chat API 路由
 *
 * 处理 AI 对话请求，包括流式和非流式
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { orchestrator, type OrchestrateRequest } from '../services/orchestrator.js'
import { ChatRequestSchema } from '../types/index.js'

// =============================================================================
// 请求类型
// =============================================================================

interface ChatBody {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  model?: string
  taskType?: 'scan' | 'analysis' | 'execution' | 'chat' | 'reasoning' | 'agent'
  maxTokens?: number
  temperature?: number
  streaming?: boolean
  preferChinese?: boolean
  preferSpeed?: boolean
  preferCost?: boolean
}

// =============================================================================
// 路由注册
// =============================================================================

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /chat - 非流式对话
   */
  fastify.post<{ Body: ChatBody }>('/chat', async (request, reply) => {
    const userId = getUserId(request)

    // 验证请求体
    const validation = ChatRequestSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: `Invalid request: ${validation.error.message}`,
      })
    }

    const orchestrateRequest: OrchestrateRequest = {
      userId,
      sessionId: `session_${Date.now()}`,
      messages: request.body.messages,
      taskType: request.body.taskType,
      model: request.body.model,
      maxTokens: request.body.maxTokens,
      temperature: request.body.temperature,
      streaming: false,
      preferChinese: request.body.preferChinese,
      preferSpeed: request.body.preferSpeed,
      preferCost: request.body.preferCost,
    }

    const result = await orchestrator.orchestrate(orchestrateRequest)

    if (!result.success) {
      return reply.status(500).send({
        success: false,
        error: result.error,
      })
    }

    return reply.send({
      success: true,
      data: result.response,
      routing: result.routingDecision,
    })
  })

  /**
   * POST /chat/stream - 流式对话 (SSE)
   */
  fastify.post<{ Body: ChatBody }>('/chat/stream', async (request, reply) => {
    const userId = getUserId(request)

    // 验证请求体
    const validation = ChatRequestSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: `Invalid request: ${validation.error.message}`,
      })
    }

    const orchestrateRequest: OrchestrateRequest = {
      userId,
      sessionId: `session_${Date.now()}`,
      messages: request.body.messages,
      taskType: request.body.taskType,
      model: request.body.model,
      maxTokens: request.body.maxTokens,
      temperature: request.body.temperature,
      streaming: true,
      preferChinese: request.body.preferChinese,
      preferSpeed: request.body.preferSpeed,
      preferCost: request.body.preferCost,
    }

    // 设置 SSE 响应头
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    // 流式输出
    try {
      for await (const chunk of orchestrator.orchestrateStream(orchestrateRequest)) {
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
      reply.raw.write('data: [DONE]\n\n')
    } catch (error) {
      const errorChunk = {
        type: 'error',
        data: { error: error instanceof Error ? error.message : 'Stream error' },
      }
      reply.raw.write(`data: ${JSON.stringify(errorChunk)}\n\n`)
    } finally {
      reply.raw.end()
    }
  })
}

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 从请求中提取用户 ID
 * 实际应用中应该从 JWT token 中解析
 */
function getUserId(request: FastifyRequest): string {
  // TODO: 从 JWT 中解析用户 ID
  // const token = request.headers.authorization?.replace('Bearer ', '')
  // const payload = jwt.verify(token, JWT_SECRET)
  // return payload.userId

  // 开发阶段使用默认用户
  return 'dev_user_001'
}
