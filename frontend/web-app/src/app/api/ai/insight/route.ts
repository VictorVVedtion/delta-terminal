/**
 * AI Insight Generation API Route
 *
 * A2UI 核心 API: 调用后端 NLP Processor 生成结构化的 InsightData
 *
 * 流程:
 * 1. 接收用户消息
 * 2. 调用后端 /api/v1/chat/message 端点
 * 3. 返回包含 InsightData 的响应 (包括 ClarificationInsight)
 */

import type { NextRequest } from 'next/server'

// =============================================================================
// Types
// =============================================================================

interface InsightRequest {
  /** 用户消息 */
  message: string
  /** 用户 ID */
  userId?: string
  /** 对话 ID */
  conversationId?: string
  /** 上下文 */
  context?: Record<string, unknown>
  /** 已收集的澄清参数 (用于多步骤引导) */
  collectedParams?: Record<string, unknown>
}

interface BackendChatResponse {
  message: string
  conversation_id: string
  intent: string
  confidence: number
  extracted_params?: Record<string, unknown>
  suggested_actions?: string[]
  timestamp: string
  insight?: Record<string, unknown>
}

interface InsightResponse {
  success: boolean
  message: string
  conversationId: string
  intent: string
  confidence: number
  insight?: Record<string, unknown>
  suggestedActions?: string[]
  error?: string
}

// =============================================================================
// Configuration
// =============================================================================

// 后端 NLP Processor 服务地址
const NLP_PROCESSOR_URL = process.env.NLP_PROCESSOR_URL || process.env.AI_ORCHESTRATOR_URL

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 解析请求
    const body: InsightRequest = await request.json()

    if (!body.message.trim()) {
      return Response.json(
        { success: false, error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 检查后端服务配置
    if (!NLP_PROCESSOR_URL) {
      return Response.json(
        {
          success: false,
          error: '后端服务未配置，请设置 NLP_PROCESSOR_URL 环境变量'
        },
        { status: 503 }
      )
    }

    // 获取 JWT token (从请求头转发)
    const authHeader = request.headers.get('Authorization')

    // 构建后端请求
    const backendRequest = {
      message: body.message,
      user_id: body.userId || 'anonymous',
      conversation_id: body.conversationId,
      context: {
        ...body.context,
        // 传递已收集的参数用于多步骤引导
        collected_params: body.collectedParams,
      },
    }

    // 调用后端 NLP Processor
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) {
      headers.Authorization = authHeader
    }

    const backendResponse = await fetch(`${NLP_PROCESSOR_URL}/api/v1/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendRequest),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text().catch(() => '')
      console.error('[A2UI Insight API] Backend error:', backendResponse.status, errorText)

      return Response.json(
        {
          success: false,
          error: `后端服务错误: ${backendResponse.status}`,
        },
        { status: backendResponse.status }
      )
    }

    // 解析后端响应
    const backendData: BackendChatResponse = await backendResponse.json()

    // 转换为前端格式 (使用条件展开避免 exactOptionalPropertyTypes 问题)
    const response: InsightResponse = {
      success: true,
      message: backendData.message,
      conversationId: backendData.conversation_id,
      intent: backendData.intent,
      confidence: backendData.confidence,
      ...(backendData.insight && { insight: backendData.insight }),
      ...(backendData.suggested_actions && { suggestedActions: backendData.suggested_actions }),
    }

    return Response.json(response)
  } catch (error) {
    console.error('[A2UI Insight API] Error:', error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '请求处理失败',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET Handler (Health Check)
// =============================================================================

export async function GET(): Promise<Response> {
  const nlpUrl = NLP_PROCESSOR_URL

  return Response.json({
    service: 'A2UI Insight API',
    status: nlpUrl ? 'configured' : 'not_configured',
    backend: nlpUrl ? `${nlpUrl}/api/v1/chat/message` : null,
  })
}
