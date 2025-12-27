/**
 * AI Usage API Route
 *
 * 获取 OpenRouter 使用量统计
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { AI_MODELS } from '@/types/ai'

// Type definitions for OpenRouter API responses
interface OpenRouterKeyResponse {
  data?: {
    usage?: number
    limit?: number | null
    rate_limit?: {
      requests?: number
      interval?: string
    }
  }
}

interface OpenRouterStatsResponse {
  data?: unknown
}

interface CostEstimateBody {
  model?: string
  inputTokens?: number
  outputTokens?: number
  callsPerDay?: number
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

// GET /api/ai/usage - 获取使用量统计
export async function GET(request: NextRequest) {
  try {
    // 从 header 获取 API Key
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'API Key is required' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.slice(7)

    // 获取 OpenRouter 账户信息
    const keyResponse = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!keyResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch usage data' },
        { status: keyResponse.status }
      )
    }

    const keyData = await keyResponse.json() as OpenRouterKeyResponse

    // 获取模型使用统计（如果可用）
    // 注意：OpenRouter 的统计 API 可能需要额外权限
    let generationStats: OpenRouterStatsResponse | null = null
    try {
      const statsResponse = await fetch(`${OPENROUTER_API_URL}/generation/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (statsResponse.ok) {
        generationStats = await statsResponse.json() as OpenRouterStatsResponse
      }
    } catch {
      // 统计 API 可能不可用，忽略错误
    }

    const usage = keyData.data?.usage ?? 0
    const limit = keyData.data?.limit ?? null

    return NextResponse.json({
      success: true,
      data: {
        account: {
          creditsUsed: usage,
          creditsLimit: limit,
          remaining: limit !== null ? limit - usage : null
        },
        rateLimit: {
          requests: keyData.data?.rate_limit?.requests ?? null,
          interval: keyData.data?.rate_limit?.interval ?? null
        },
        generationStats: generationStats?.data ?? null
      }
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}

// POST /api/ai/usage/estimate - 估算成本
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CostEstimateBody
    const { model, inputTokens, outputTokens, callsPerDay } = body

    const modelInfo = model ? AI_MODELS[model] : undefined
    if (!model || !modelInfo) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing model' },
        { status: 400 }
      )
    }
    const input = inputTokens || 500
    const output = outputTokens || 300
    const calls = callsPerDay || 100

    // 计算单次调用成本
    const costPerCall = (input * modelInfo.inputPrice + output * modelInfo.outputPrice) / 1000000

    // 计算每日/周/月成本
    const daily = costPerCall * calls
    const weekly = daily * 7
    const monthly = daily * 30

    return NextResponse.json({
      success: true,
      data: {
        model: {
          id: modelInfo.id,
          name: modelInfo.name,
          inputPrice: modelInfo.inputPrice,
          outputPrice: modelInfo.outputPrice
        },
        estimate: {
          inputTokens: input,
          outputTokens: output,
          callsPerDay: calls,
          costPerCall: parseFloat(costPerCall.toFixed(6)),
          daily: parseFloat(daily.toFixed(4)),
          weekly: parseFloat(weekly.toFixed(4)),
          monthly: parseFloat(monthly.toFixed(2))
        },
        comparison: Object.values(AI_MODELS)
          .filter(m => m.tier === modelInfo.tier)
          .map(m => ({
            id: m.id,
            name: m.name,
            costPerCall: parseFloat(
              ((input * m.inputPrice + output * m.outputPrice) / 1000000).toFixed(6)
            ),
            monthlyEstimate: parseFloat(
              (((input * m.inputPrice + output * m.outputPrice) / 1000000) * calls * 30).toFixed(2)
            )
          }))
          .sort((a, b) => a.costPerCall - b.costPerCall)
      }
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to estimate cost' },
      { status: 500 }
    )
  }
}
