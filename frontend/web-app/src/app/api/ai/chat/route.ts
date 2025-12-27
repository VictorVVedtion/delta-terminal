/**
 * AI Chat API Route (Non-Streaming)
 *
 * 支持两种模式:
 * 1. 后端编排模式 (推荐) - 通过 AI_ORCHESTRATOR_URL 转发到后端 AI Orchestrator 服务
 * 2. 直接调用模式 - 直接调用 OpenRouter API (当后端不可用时的降级方案)
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import type { AIRequest, AIResponse} from '@/types/ai';
import { AI_MODELS, SIMPLE_PRESETS } from '@/types/ai'

// Type definitions for API responses
interface OpenRouterResponse {
  id?: string
  choices?: {
    message?: { content?: string }
    finish_reason?: string
  }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string }
}

const _OPENROUTER_API_URL = process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1'
const _OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 使用前端默认预设的模型作为后备默认值
const DEFAULT_MODEL = SIMPLE_PRESETS.balanced.defaultModel

/**
 * 代理请求到后端 AI Orchestrator 服务
 */
async function proxyToOrchestrator(
  orchestratorUrl: string,
  body: AIRequest,
  authHeader: string | null
): Promise<NextResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 转发 JWT token 进行身份验证
  if (authHeader) {
    headers.Authorization = authHeader
  }

  const orchestratorResponse = await fetch(`${orchestratorUrl}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: body.messages,
      model: body.model,
      taskType: body.taskType,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      streaming: false,
    }),
  })

  if (!orchestratorResponse.ok) {
    const errorText = await orchestratorResponse.text().catch(() => '')
    throw new Error(`Orchestrator error: ${orchestratorResponse.status} - ${errorText}`)
  }

  const data = await orchestratorResponse.json() as AIResponse
  return NextResponse.json(data)
}

// POST /api/ai/chat - 发送 AI 对话请求
export async function POST(request: NextRequest) {
  // 每次请求时重新读取环境变量
  const orchestratorUrl = process.env.AI_ORCHESTRATOR_URL
  const apiKey = process.env.OPENROUTER_API_KEY
  const apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'

  // 先读取请求体（只能读取一次）
  let body: AIRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: '无效的请求格式' },
      { status: 400 }
    )
  }

  // ==========================================================================
  // 模式 1: 后端编排服务 (优先)
  // ==========================================================================
  if (orchestratorUrl) {
    try {
      const authHeader = request.headers.get('Authorization')
      return await proxyToOrchestrator(orchestratorUrl, body, authHeader)
    } catch {
      // 降级到直接调用模式
    }
  }

  // ==========================================================================
  // 模式 2: 直接调用 OpenRouter (降级方案)
  // ==========================================================================
  try {
    // 检查平台 API Key 配置
    if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
      return NextResponse.json(
        { error: '服务暂不可用，请稍后再试' },
        { status: 503 }
      )
    }

    const {
      messages,
      model = DEFAULT_MODEL,
      maxTokens = 2048,
      temperature = 0.7,
    } = body

    // 构建 OpenRouter 请求
    const startTime = Date.now()

    const openRouterResponse = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://delta-terminal.app',
        'X-Title': 'Delta Terminal'
      },
      body: JSON.stringify({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: maxTokens,
        temperature,
        stream: false
      })
    })

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({})) as OpenRouterResponse
      return NextResponse.json(
        { error: errorData.error?.message ?? 'AI 服务暂时不可用' },
        { status: openRouterResponse.status }
      )
    }

    const data = await openRouterResponse.json() as OpenRouterResponse
    const latency = Date.now() - startTime

    // 计算成本（仅用于统计）
    const modelInfo = AI_MODELS[model]
    const inputTokens = data.usage?.prompt_tokens || 0
    const outputTokens = data.usage?.completion_tokens || 0
    const totalCost = modelInfo
      ? (inputTokens * modelInfo.inputPrice + outputTokens * modelInfo.outputPrice) / 1000000
      : 0

    // 构建响应
    const response: AIResponse = {
      id: data.id || `chat_${Date.now()}`,
      model,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        inputTokens,
        outputTokens,
        totalCost
      },
      latency,
      finishReason: data.choices?.[0]?.finish_reason === 'stop' ? 'stop' : 'length'
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 服务异常' },
      { status: 500 }
    )
  }
}
