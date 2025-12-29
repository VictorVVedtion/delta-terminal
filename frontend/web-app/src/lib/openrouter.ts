/**
 * OpenRouter Client - Delta Terminal
 *
 * OpenRouter API 客户端，支持流式响应和思考过程解析
 */

import type {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ThinkingStep
} from '@/types/ai';
import {
  AI_MODELS
} from '@/types/ai'

// ============================================================================
// Types
// ============================================================================

interface OpenRouterRequestBody {
  model: string
  messages: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[]
  stream?: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

interface OpenRouterResponse {
  id: string
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenRouterStreamChunk {
  id: string
  model: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }[]
}

// ============================================================================
// OpenRouter Client
// ============================================================================

export class OpenRouterClient {
  private baseUrl: string
  private apiKey: string
  private siteUrl: string
  private siteName: string

  constructor(config: {
    apiKey: string
    baseUrl?: string
    siteUrl?: string
    siteName?: string
  }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'
    this.siteUrl = config.siteUrl || 'https://delta-terminal.app'
    this.siteName = config.siteName || 'Delta Terminal'
  }

  /**
   * 发送聊天请求（非流式）
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const model = request.model || 'deepseek/deepseek-chat-v3-0324'
    const startTime = Date.now()

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(request, model, false))
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new OpenRouterError(
        error.error?.message || `Request failed with status ${response.status}`,
        response.status,
        error.error?.code
      )
    }

    const data: OpenRouterResponse = await response.json()
    const latency = Date.now() - startTime

    return this.parseResponse(data, model, latency)
  }

  /**
   * 发送聊天请求（流式）
   */
  async *chatStream(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || 'deepseek/deepseek-chat-v3-0324'
    const modelInfo = AI_MODELS[model]
    const supportsThinking = modelInfo.supportsThinking ?? false

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(request, model, true))
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      yield {
        type: 'error',
        data: {
          error: error.error?.message || `Request failed with status ${response.status}`
        }
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', data: { error: 'No response body' } }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let _fullContent = ''
    const thinkingSteps: ThinkingStep[] = []
    let currentThinkingStep: Partial<ThinkingStep> | null = null
    let isInThinkingBlock = false
    let thinkingBuffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            // 完成思考步骤
            if (currentThinkingStep && supportsThinking) {
              const completedStep: ThinkingStep = {
                ...currentThinkingStep,
                status: 'completed'
              } as ThinkingStep
              thinkingSteps.push(completedStep)
              yield {
                type: 'thinking',
                data: { thinking: completedStep }
              }
            }

            yield { type: 'done', data: {} }
            continue
          }

          try {
            const chunk: OpenRouterStreamChunk = JSON.parse(data)
            const content = chunk.choices[0]?.delta?.content || ''

            if (content) {
              // 检测思考块
              if (supportsThinking) {
                const { processedContent, thinking } = this.processThinkingContent(
                  content,
                  isInThinkingBlock,
                  thinkingBuffer,
                  thinkingSteps.length
                )

                if (thinking) {
                  if (thinking.isStart) {
                    isInThinkingBlock = true
                    thinkingBuffer = ''
                    currentThinkingStep = {
                      step: thinkingSteps.length + 1,
                      title: '思考中...',
                      content: '',
                      status: 'processing'
                    }
                    yield {
                      type: 'thinking',
                      data: { thinking: currentThinkingStep as ThinkingStep }
                    }
                  }

                  if (thinking.content) {
                    thinkingBuffer += thinking.content
                    if (currentThinkingStep) {
                      currentThinkingStep.content = thinkingBuffer
                    }
                  }

                  if (thinking.isEnd) {
                    isInThinkingBlock = false
                    if (currentThinkingStep) {
                      currentThinkingStep.status = 'completed'
                      thinkingSteps.push(currentThinkingStep as ThinkingStep)
                      yield {
                        type: 'thinking',
                        data: { thinking: currentThinkingStep as ThinkingStep }
                      }
                      currentThinkingStep = null
                    }
                    thinkingBuffer = ''
                  }
                }

                if (processedContent && !isInThinkingBlock) {
                  _fullContent += processedContent
                  yield { type: 'content', data: { content: processedContent } }
                }
              } else {
                _fullContent += content
                yield { type: 'content', data: { content } }
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 获取模型列表
   */
  async getModels(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new OpenRouterError(`Failed to fetch models`, response.status)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * 获取使用量
   */
  async getUsage(): Promise<{ credits_used: number; credits_limit: number }> {
    const response = await fetch(`${this.baseUrl}/auth/key`, {
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new OpenRouterError(`Failed to fetch usage`, response.status)
    }

    return response.json()
  }

  // ==================== Private Methods ====================

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': this.siteUrl,
      'X-Title': this.siteName
    }
  }

  private buildRequestBody(
    request: AIRequest,
    model: string,
    stream: boolean
  ): OpenRouterRequestBody {
    return {
      model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7
    }
  }

  private parseResponse(
    data: OpenRouterResponse,
    model: string,
    latency: number
  ): AIResponse {
    const modelInfo = AI_MODELS[model]
    const inputPrice = modelInfo.inputPrice || 0
    const outputPrice = modelInfo.outputPrice || 0

    const inputTokens = data.usage.prompt_tokens || 0
    const outputTokens = data.usage.completion_tokens || 0
    const totalCost = (inputTokens * inputPrice + outputTokens * outputPrice) / 1000000

    const content = data.choices[0]?.message?.content || ''
    const { cleanContent, thinking } = this.extractThinking(content, modelInfo.supportsThinking)

    return {
      id: data.id,
      model: data.model,
      content: cleanContent,
      ...(thinking && { thinking }),
      usage: {
        inputTokens,
        outputTokens,
        totalCost
      },
      latency,
      finishReason: (data.choices[0]?.finish_reason as 'stop' | 'length') || 'stop'
    }
  }

  private extractThinking(
    content: string,
    supportsThinking?: boolean
  ): { cleanContent: string; thinking?: ThinkingStep[] } {
    if (!supportsThinking) {
      return { cleanContent: content }
    }

    // 匹配思考块：<thinking>...</thinking> 或 <think>...</think>
    const thinkingRegex = /<(thinking|think)>([\s\S]*?)<\/\1>/gi
    const matches = [...content.matchAll(thinkingRegex)]

    if (matches.length === 0) {
      return { cleanContent: content }
    }

    const thinking: ThinkingStep[] = matches.map((match, index) => ({
      step: index + 1,
      title: `思考步骤 ${index + 1}`,
      content: (match[2] ?? '').trim(),
      status: 'completed' as const
    }))

    const cleanContent = content.replace(thinkingRegex, '').trim()

    return { cleanContent, thinking }
  }

  private processThinkingContent(
    content: string,
    isInThinkingBlock: boolean,
    _buffer: string,
    _stepIndex: number
  ): {
    processedContent: string
    thinking?: {
      isStart?: boolean
      isEnd?: boolean
      content?: string
    }
  } {
    // 检测思考块开始
    const startMatch = content.match(/<(thinking|think)>/i)
    const endMatch = content.match(/<\/(thinking|think)>/i)

    if (startMatch && !isInThinkingBlock) {
      const beforeStart = content.slice(0, startMatch.index)
      const afterStart = content.slice((startMatch.index || 0) + startMatch[0].length)

      return {
        processedContent: beforeStart,
        thinking: {
          isStart: true,
          content: afterStart
        }
      }
    }

    if (endMatch && isInThinkingBlock) {
      const beforeEnd = content.slice(0, endMatch.index)
      const afterEnd = content.slice((endMatch.index || 0) + endMatch[0].length)

      return {
        processedContent: afterEnd,
        thinking: {
          isEnd: true,
          content: beforeEnd
        }
      }
    }

    if (isInThinkingBlock) {
      return {
        processedContent: '',
        thinking: { content }
      }
    }

    return { processedContent: content }
  }
}

// ============================================================================
// Error Class
// ============================================================================

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let clientInstance: OpenRouterClient | null = null

/**
 * 获取 OpenRouter 客户端实例
 */
export function getOpenRouterClient(apiKey?: string): OpenRouterClient {
  if (apiKey) {
    clientInstance = new OpenRouterClient({ apiKey })
  }

  if (!clientInstance) {
    throw new Error('OpenRouter client not initialized. Please provide an API key.')
  }

  return clientInstance
}

/**
 * 创建新的 OpenRouter 客户端
 */
export function createOpenRouterClient(config: {
  apiKey: string
  baseUrl?: string
}): OpenRouterClient {
  return new OpenRouterClient(config)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 计算调用成本
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelInfo = AI_MODELS[model]
  if (!modelInfo) return 0

  return (inputTokens * modelInfo.inputPrice + outputTokens * modelInfo.outputPrice) / 1000000
}

/**
 * 估算 token 数量（粗略估算）
 */
export function estimateTokens(text: string): number {
  // 英文大约 4 字符 = 1 token
  // 中文大约 1.5 字符 = 1 token
  const englishChars = text.replace(/[\u4e00-\u9fff]/g, '').length
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length

  return Math.ceil(englishChars / 4 + chineseChars / 1.5)
}

/**
 * 格式化成本显示
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}m` // 毫美元
  }
  return `$${cost.toFixed(4)}`
}
