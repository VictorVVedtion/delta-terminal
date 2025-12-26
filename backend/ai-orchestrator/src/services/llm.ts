/**
 * LLM 代理服务
 *
 * 统一处理 OpenRouter API 调用，支持流式和非流式响应
 */

import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ThinkingStep,
  UsageStats,
} from '../types/index.js'
import { getModel, calculateCost } from './config.js'

// =============================================================================
// 思考步骤提取器 (从前端迁移)
// =============================================================================

class ThinkingStepExtractor {
  private stepPatterns = [
    { pattern: /^(首先|让我|先|OK|好的|理解|分析问题|看看|思考|了解)/i, title: '理解问题' },
    { pattern: /(数据|指标|价格|行情|趋势|市场|技术分析|基本面|K线|均线|MACD|RSI)/i, title: '分析数据' },
    { pattern: /(策略|方案|建议|推荐|参数|配置|设置|逻辑|规则)/i, title: '设计方案' },
    { pattern: /(风险|止损|止盈|仓位|资金管理|回撤|波动|安全)/i, title: '评估风险' },
    { pattern: /(因此|所以|总结|综上|最终|结论|建议|综合)/i, title: '生成结论' },
  ]

  private currentStep = 0
  private currentTitle = ''
  private currentContent = ''
  private stepStartTime = Date.now()
  private emittedSteps: Set<number> = new Set()
  private lastEmitLength = 0

  processChunk(reasoningChunk: string): ThinkingStep | null {
    this.currentContent += reasoningChunk

    const newStepInfo = this.detectNewStep(reasoningChunk)

    if (newStepInfo && this.currentStep > 0 && !this.emittedSteps.has(this.currentStep)) {
      const completedStep: ThinkingStep = {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent.slice(0, this.currentContent.length - reasoningChunk.length)),
        status: 'completed',
        duration: Date.now() - this.stepStartTime,
      }

      this.emittedSteps.add(this.currentStep)
      this.currentStep++
      this.currentTitle = newStepInfo.title
      this.currentContent = reasoningChunk
      this.stepStartTime = Date.now()
      this.lastEmitLength = 0

      return completedStep
    }

    if (this.currentStep === 0) {
      this.currentStep = 1
      this.currentTitle = newStepInfo?.title || '理解问题'
      this.stepStartTime = Date.now()
      this.lastEmitLength = reasoningChunk.length

      return {
        step: 1,
        title: this.currentTitle,
        content: this.getStepSummary(reasoningChunk),
        status: 'processing',
      }
    }

    const contentLengthSinceLastEmit = this.currentContent.length - this.lastEmitLength
    if (contentLengthSinceLastEmit >= 80) {
      this.lastEmitLength = this.currentContent.length
      return {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent),
        status: 'processing',
      }
    }

    return null
  }

  finalize(): ThinkingStep | null {
    if (this.currentStep > 0 && !this.emittedSteps.has(this.currentStep)) {
      this.emittedSteps.add(this.currentStep)
      return {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent),
        status: 'completed',
        duration: Date.now() - this.stepStartTime,
      }
    }
    return null
  }

  hasContent(): boolean {
    return this.currentContent.length > 0
  }

  private detectNewStep(chunk: string): { title: string } | null {
    const hasNewParagraph = chunk.includes('\n\n') || (chunk.includes('\n') && this.currentContent.length > 150)

    if (!hasNewParagraph && this.currentContent.length < 200) {
      return null
    }

    for (const { pattern, title } of this.stepPatterns) {
      if (pattern.test(chunk) && title !== this.currentTitle) {
        return { title }
      }
    }

    if (this.currentContent.length > 350) {
      const nextTitle = this.getDefaultTitle(this.currentStep + 1)
      if (nextTitle !== this.currentTitle) {
        return { title: nextTitle }
      }
    }

    return null
  }

  private getDefaultTitle(step: number): string {
    const defaultTitles = ['理解问题', '分析数据', '设计方案', '评估风险', '生成结论']
    return defaultTitles[Math.min(step - 1, defaultTitles.length - 1)] || '深入分析'
  }

  private getStepSummary(content: string): string {
    const trimmed = content.trim()
    if (trimmed.length <= 120) return trimmed

    const cutoff = trimmed.slice(0, 120)
    const lastPunctuation = Math.max(
      cutoff.lastIndexOf('。'),
      cutoff.lastIndexOf('？'),
      cutoff.lastIndexOf('！'),
      cutoff.lastIndexOf('. '),
      cutoff.lastIndexOf('? '),
      cutoff.lastIndexOf('! ')
    )

    if (lastPunctuation > 60) {
      return trimmed.slice(0, lastPunctuation + 1)
    }

    return cutoff.slice(0, 117) + '...'
  }
}

// =============================================================================
// LLM 代理服务
// =============================================================================

export class LLMProxyService {
  private apiUrl: string
  private apiKey: string

  constructor() {
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
  }

  /**
   * 非流式调用
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now()
    const model = request.model || 'anthropic/claude-sonnet-4.5'
    const modelInfo = getModel(model)

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://delta-terminal.app',
        'X-Title': 'Delta Terminal',
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || 2048,
        temperature: request.temperature || 0.7,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `API Error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage || {}

    const usageStats: UsageStats = {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      totalCost: modelInfo ? calculateCost(modelInfo, usage.prompt_tokens || 0, usage.completion_tokens || 0) : 0,
      model,
      timestamp: Date.now(),
    }

    return {
      id: data.id || `chat_${Date.now()}`,
      model,
      content,
      usage: usageStats,
      latency: Date.now() - startTime,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
    }
  }

  /**
   * 流式调用 - 返回 AsyncGenerator
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || 'anthropic/claude-sonnet-4.5'
    const modelInfo = getModel(model)
    const supportsThinking = modelInfo?.supportsThinking ?? false

    const thinkingExtractor = supportsThinking ? new ThinkingStepExtractor() : null

    // 发送初始思考状态
    if (supportsThinking) {
      yield {
        type: 'thinking',
        data: {
          thinking: {
            step: 0,
            title: '启动推理',
            content: '正在连接 AI 模型...',
            status: 'processing',
          },
        },
      }
    }

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://delta-terminal.app',
        'X-Title': 'Delta Terminal',
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || 2048,
        temperature: request.temperature || 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      yield {
        type: 'error',
        data: { error: error.error?.message || 'AI 服务暂时不可用' },
      }
      return
    }

    // 更新连接状态
    if (supportsThinking) {
      yield {
        type: 'thinking',
        data: {
          thinking: {
            step: 0,
            title: '启动推理',
            content: '已连接到 AI 模型',
            status: 'completed',
            duration: 100,
          },
        },
      }
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', data: { error: '无法读取响应流' } }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let inputTokens = 0
    let outputTokens = 0
    let hasReceivedReasoning = false
    let contentBuffer = ''

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
          if (data === '[DONE]') continue
          if (!data) continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta

            // 处理 reasoning
            const reasoning = delta?.reasoning || delta?.thinking || delta?.reasoning_content
            if (reasoning && thinkingExtractor) {
              hasReceivedReasoning = true
              const step = thinkingExtractor.processChunk(reasoning)
              if (step) {
                yield { type: 'thinking', data: { thinking: step } }
              }
            }

            // 处理内容
            const content = delta?.content
            if (content) {
              yield { type: 'content', data: { content } }

              // 从内容中提取思考步骤
              if (supportsThinking && !hasReceivedReasoning && thinkingExtractor) {
                contentBuffer += content
                if (contentBuffer.length < 500) {
                  const step = thinkingExtractor.processChunk(content)
                  if (step) {
                    yield { type: 'thinking', data: { thinking: step } }
                  }
                }
              }
            }

            // 使用统计
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || inputTokens
              outputTokens = parsed.usage.completion_tokens || outputTokens
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 完成思考步骤
      if (thinkingExtractor) {
        const finalStep = thinkingExtractor.finalize()
        if (finalStep) {
          yield { type: 'thinking', data: { thinking: finalStep } }
        }

        if (!thinkingExtractor.hasContent()) {
          yield {
            type: 'thinking',
            data: {
              thinking: {
                step: 1,
                title: '生成回复',
                content: '已完成响应生成',
                status: 'completed',
                duration: 200,
              },
            },
          }
        }
      }

      // 发送使用统计
      const usageStats: UsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        totalCost: modelInfo ? calculateCost(modelInfo, inputTokens, outputTokens) : 0,
        model,
        timestamp: Date.now(),
      }

      yield { type: 'usage', data: { usage: usageStats } }
      yield { type: 'done', data: {} }

    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 检查 API 连接状态
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; models?: number }> {
    const start = Date.now()
    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      })

      if (!response.ok) {
        return { healthy: false, latency: Date.now() - start }
      }

      const data = await response.json()
      return {
        healthy: true,
        latency: Date.now() - start,
        models: data.data?.length || 0,
      }
    } catch {
      return { healthy: false, latency: Date.now() - start }
    }
  }
}

// 单例导出
export const llmProxy = new LLMProxyService()
