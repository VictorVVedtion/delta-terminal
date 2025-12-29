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
// Next.js Route Config (SSE requires Node.js runtime)
// =============================================================================
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

// 后端请求超时时间 (毫秒)
// LLM 响应通常需要 20-30 秒，设置 60 秒超时
const BACKEND_TIMEOUT = 60000

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  console.log('[A2UI Insight API] POST request received')
  console.log('[A2UI Insight API] NLP_PROCESSOR_URL:', NLP_PROCESSOR_URL)

  try {
    // 解析请求
    const body: InsightRequest = await request.json()
    console.log('[A2UI Insight API] Request body:', JSON.stringify(body).slice(0, 200))

    if (!body.message.trim()) {
      return Response.json({ success: false, error: '消息内容不能为空' }, { status: 400 })
    }

    // 检查后端服务配置
    if (!NLP_PROCESSOR_URL) {
      return Response.json(
        {
          success: false,
          error: '后端服务未配置，请设置 NLP_PROCESSOR_URL 环境变量',
        },
        { status: 503 }
      )
    }

    // 获取 JWT token (从请求头转发)
    const authHeader = request.headers.get('Authorization')

    // 构建后端请求
    // collectedParams 可能在 body 顶层或 context 中
    const collectedParams = body.collectedParams || body.context?.collectedParams || {}
    const isFollowUp = body.context?.isFollowUp || false
    // chatHistory 用于无 Redis 环境的对话上下文恢复
    const chatHistory = body.context?.chatHistory || []

    const backendRequest = {
      message: body.message,
      user_id: body.userId || 'anonymous',
      conversation_id: body.conversationId,
      context: {
        ...body.context,
        // 传递已收集的参数用于多步骤引导
        collected_params: collectedParams,
        // 传递多步骤引导标志
        isFollowUp: isFollowUp,
        // 传递对话历史用于上下文恢复 (Railway 无 Redis fallback)
        chatHistory: chatHistory,
      },
    }

    // 调用后端 NLP Processor (带超时)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) {
      headers.Authorization = authHeader
    }

    let backendResponse: Response
    try {
      backendResponse = await fetchWithTimeout(
        `${NLP_PROCESSOR_URL}/api/v1/chat/message`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(backendRequest),
        },
        BACKEND_TIMEOUT
      )
    } catch (error) {
      // 超时错误特殊处理
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[A2UI Insight API] Backend request timeout')
        return Response.json(
          {
            success: false,
            error: '后端服务响应超时，请稍后重试',
          },
          { status: 504 }
        )
      }
      // 网络连接错误
      console.error('[A2UI Insight API] Backend connection error:', error)
      return Response.json(
        {
          success: false,
          error: '无法连接后端服务，请检查服务是否运行',
        },
        { status: 503 }
      )
    }

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
// GET Handler (SSE Stream)
// =============================================================================

/**
 * SSE 流式推理链端点
 *
 * 接收 ?message=xxx 参数，返回 SSE 流
 */
export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams
  const message = searchParams.get('message')
  const userId = searchParams.get('userId') || 'anonymous'
  const conversationId = searchParams.get('conversationId')

  if (!message) {
    return Response.json({ error: '缺少 message 参数' }, { status: 400 })
  }

  if (!NLP_PROCESSOR_URL) {
    return Response.json({ error: '后端服务未配置' }, { status: 503 })
  }

  try {
    // 调用后端 SSE 端点
    const backendRequest = {
      message,
      user_id: userId,
      conversation_id: conversationId,
      context: {},
    }

    console.log('[SSE Route] Calling backend:', `${NLP_PROCESSOR_URL}/api/v1/chat/reasoning/stream`)

    const response = await fetch(`${NLP_PROCESSOR_URL}/api/v1/chat/reasoning/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequest),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('[SSE Route] Backend error:', response.status, errorText)
      throw new Error(`后端错误: ${response.status}`)
    }

    // 转发 SSE 流 (使用 ReadableStream 确保正确流式传输)
    if (!response.body) {
      throw new Error('后端未返回流式响应')
    }

    // 创建 TransformStream 来确保 SSE 事件正确转发
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const reader = response.body.getReader()

    // 异步转发流
    void (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            await writer.close()
            break
          }
          await writer.write(value)
        }
      } catch (error) {
        console.error('[SSE Route] Stream error:', error)
        await writer.abort(error as Error)
      }
    })()

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error) {
    console.error('[SSE Stream Error]:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : '流式请求失败' },
      { status: 500 }
    )
  }
}
