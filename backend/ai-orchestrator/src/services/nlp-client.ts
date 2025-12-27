/**
 * NLP Processor 客户端服务
 *
 * 与 Python NLP Processor 服务通信
 * 获取意图识别、InsightData 生成等功能
 */

import type { InsightData } from '../types/index.js'

// =============================================================================
// 配置
// =============================================================================

const NLP_PROCESSOR_URL = process.env.NLP_PROCESSOR_URL || 'http://localhost:8001'

// =============================================================================
// NLP Processor 响应类型
// =============================================================================

export interface NLPChatRequest {
  message: string
  user_id: string
  conversation_id?: string
  context?: Record<string, unknown>
}

export interface NLPChatResponse {
  message: string
  conversation_id: string
  intent: string
  confidence: number
  extracted_params?: Record<string, unknown>
  suggested_actions?: string[]
  timestamp: string
  insight?: InsightData
}

export interface NLPIntentResponse {
  intent: string
  confidence: number
  entities: Record<string, unknown>
  reasoning?: string
}

export interface NLPParseStrategyRequest {
  description: string
  user_id: string
  context?: Record<string, unknown>
}

export interface NLPParseStrategyResponse {
  success: boolean
  strategy?: Record<string, unknown>
  errors?: string[]
  warnings?: string[]
  suggestions?: string[]
  confidence: number
}

// =============================================================================
// NLP 客户端服务
// =============================================================================

export class NLPClientService {
  private baseUrl: string
  private isAvailable: boolean | null = null

  constructor() {
    this.baseUrl = NLP_PROCESSOR_URL
  }

  /**
   * 检查 NLP Processor 服务是否可用
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      this.isAvailable = response.ok
      return {
        healthy: response.ok,
        latency: Date.now() - start,
      }
    } catch {
      this.isAvailable = false
      return {
        healthy: false,
        latency: Date.now() - start,
      }
    }
  }

  /**
   * 发送聊天消息，获取 AI 响应（含 InsightData）
   */
  async chat(request: NLPChatRequest): Promise<NLPChatResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as Record<string, unknown>
        console.error('[NLPClient] Chat error:', error)
        return null
      }

      return await response.json() as NLPChatResponse
    } catch (error) {
      console.error('[NLPClient] Chat failed:', error)
      return null
    }
  }

  /**
   * 意图识别
   */
  async recognizeIntent(
    text: string,
    context?: Record<string, unknown>
  ): Promise<NLPIntentResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chat/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, context }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return null
      }

      return await response.json() as NLPIntentResponse
    } catch (error) {
      console.error('[NLPClient] Intent recognition failed:', error)
      return null
    }
  }

  /**
   * 解析策略描述
   */
  async parseStrategy(request: NLPParseStrategyRequest): Promise<NLPParseStrategyResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/parse/strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        return null
      }

      return await response.json() as NLPParseStrategyResponse
    } catch (error) {
      console.error('[NLPClient] Parse strategy failed:', error)
      return null
    }
  }

  /**
   * 检查服务是否可用（使用缓存）
   */
  async isServiceAvailable(): Promise<boolean> {
    if (this.isAvailable === null) {
      const health = await this.healthCheck()
      this.isAvailable = health.healthy
    }
    return this.isAvailable
  }

  /**
   * 重置可用性缓存
   */
  resetAvailabilityCache(): void {
    this.isAvailable = null
  }
}

// 单例导出
export const nlpClient = new NLPClientService()
