/**
 * AI Chat API Route (Non-Streaming)
 *
 * 平台代理 AI 调用 - 使用平台的 OpenRouter API Key
 * 简化版，无订阅限制
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIRequest, AIResponse, AI_MODELS, SIMPLE_PRESETS } from '@/types/ai'

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 使用前端默认预设的模型作为后备默认值
const DEFAULT_MODEL = SIMPLE_PRESETS.balanced.defaultModel

// POST /api/ai/chat - 发送 AI 对话请求
export async function POST(request: NextRequest) {
  try {
    // 检查平台 API Key 配置
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
      console.error('OpenRouter API Key not configured')
      return NextResponse.json(
        { error: '服务暂不可用，请稍后再试' },
        { status: 503 }
      )
    }

    // 解析请求
    const body: AIRequest = await request.json()
    const {
      messages,
      model = DEFAULT_MODEL, // 使用前端配置的默认模型
      maxTokens = 4096,
      temperature = 0.7,
    } = body

    // 构建 OpenRouter 请求
    const startTime = Date.now()

    const openRouterResponse = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
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
      const errorData = await openRouterResponse.json().catch(() => ({}))
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'AI 服务暂时不可用' },
        { status: openRouterResponse.status }
      )
    }

    const data = await openRouterResponse.json()
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
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 服务异常' },
      { status: 500 }
    )
  }
}
