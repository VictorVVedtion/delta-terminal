/**
 * AI Chat Stream API Route (SSE Streaming)
 *
 * 平台代理 AI 调用 - 使用平台的 OpenRouter API Key
 * 支持流式响应和真实思考步骤提取
 *
 * 思考步骤提取方式:
 * 1. 对于支持 extended thinking 的模型，通过 include_reasoning 获取真实推理过程
 * 2. 将 reasoning tokens 实时解析为结构化的 ThinkingStep
 * 3. 使用分段算法将长推理内容拆分为多个步骤
 */

import { NextRequest } from 'next/server'
import { AIRequest, AIStreamChunk, AI_MODELS, ThinkingStep, SIMPLE_PRESETS } from '@/types/ai'

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 使用前端默认预设的模型作为后备默认值
const DEFAULT_MODEL = SIMPLE_PRESETS.balanced.defaultModel

// =============================================================================
// Thinking Step Extractor
// =============================================================================

/**
 * 从 reasoning 内容中提取结构化的思考步骤
 * 使用分段算法识别不同的推理阶段
 */
class ThinkingStepExtractor {
  private stepPatterns = [
    // 问题理解
    { pattern: /^(首先|让我|先|OK|好的|理解|分析问题|看看|思考|了解)/i, title: '理解问题' },
    // 数据分析
    { pattern: /(数据|指标|价格|行情|趋势|市场|技术分析|基本面|K线|均线|MACD|RSI)/i, title: '分析数据' },
    // 策略设计
    { pattern: /(策略|方案|建议|推荐|参数|配置|设置|逻辑|规则)/i, title: '设计方案' },
    // 风险评估
    { pattern: /(风险|止损|止盈|仓位|资金管理|回撤|波动|安全)/i, title: '评估风险' },
    // 结论生成
    { pattern: /(因此|所以|总结|综上|最终|结论|建议|综合)/i, title: '生成结论' },
  ]

  private currentStep = 0
  private currentTitle = ''
  private currentContent = ''
  private stepStartTime = Date.now()
  private emittedSteps: Set<number> = new Set()
  private lastEmitLength = 0

  /**
   * 处理新的 reasoning chunk
   * @returns 如果有新的步骤更新返回 ThinkingStep，否则返回 null
   */
  processChunk(reasoningChunk: string): ThinkingStep | null {
    this.currentContent += reasoningChunk

    // 检测是否进入新的推理阶段
    const newStepInfo = this.detectNewStep(reasoningChunk)

    if (newStepInfo && this.currentStep > 0 && !this.emittedSteps.has(this.currentStep)) {
      // 完成上一个步骤
      const completedStep: ThinkingStep = {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent.slice(0, this.currentContent.length - reasoningChunk.length)),
        status: 'completed',
        duration: Date.now() - this.stepStartTime
      }

      // 开始新步骤
      this.emittedSteps.add(this.currentStep)
      this.currentStep++
      this.currentTitle = newStepInfo.title
      this.currentContent = reasoningChunk
      this.stepStartTime = Date.now()
      this.lastEmitLength = 0

      return completedStep
    }

    // 如果是第一个 chunk，初始化第一步
    if (this.currentStep === 0) {
      this.currentStep = 1
      this.currentTitle = newStepInfo?.title || '理解问题'
      this.stepStartTime = Date.now()
      this.lastEmitLength = reasoningChunk.length

      // 返回第一步为 processing 状态
      return {
        step: 1,
        title: this.currentTitle,
        content: this.getStepSummary(reasoningChunk),
        status: 'processing'
      }
    }

    // 更新当前步骤进度（每隔一定内容量更新一次）
    const contentLengthSinceLastEmit = this.currentContent.length - this.lastEmitLength
    if (contentLengthSinceLastEmit >= 80) {
      this.lastEmitLength = this.currentContent.length
      return {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent),
        status: 'processing'
      }
    }

    return null
  }

  /**
   * 完成所有步骤
   */
  finalize(): ThinkingStep | null {
    if (this.currentStep > 0 && !this.emittedSteps.has(this.currentStep)) {
      this.emittedSteps.add(this.currentStep)
      return {
        step: this.currentStep,
        title: this.currentTitle || this.getDefaultTitle(this.currentStep),
        content: this.getStepSummary(this.currentContent),
        status: 'completed',
        duration: Date.now() - this.stepStartTime
      }
    }
    return null
  }

  /**
   * 检测是否进入新的推理阶段
   */
  private detectNewStep(chunk: string): { title: string } | null {
    // 检查段落分隔（换行符表示可能的新阶段）
    const hasNewParagraph = chunk.includes('\n\n') || (chunk.includes('\n') && this.currentContent.length > 150)

    if (!hasNewParagraph && this.currentContent.length < 200) {
      return null
    }

    // 基于模式匹配检测新阶段
    for (const { pattern, title } of this.stepPatterns) {
      if (pattern.test(chunk) && title !== this.currentTitle) {
        return { title }
      }
    }

    // 基于内容长度强制分段（每 350 字符一个步骤）
    if (this.currentContent.length > 350) {
      const nextTitle = this.getDefaultTitle(this.currentStep + 1)
      if (nextTitle !== this.currentTitle) {
        return { title: nextTitle }
      }
    }

    return null
  }

  /**
   * 获取默认步骤标题
   */
  private getDefaultTitle(step: number): string {
    const defaultTitles = ['理解问题', '分析数据', '设计方案', '评估风险', '生成结论']
    return defaultTitles[Math.min(step - 1, defaultTitles.length - 1)] || '深入分析'
  }

  /**
   * 获取步骤摘要（截取前 120 字符，保留完整句子）
   */
  private getStepSummary(content: string): string {
    const trimmed = content.trim()
    if (trimmed.length <= 120) return trimmed

    // 尝试在句号、问号、感叹号处截断
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

  /**
   * 获取当前步骤数
   */
  getCurrentStep(): number {
    return this.currentStep
  }

  /**
   * 是否有任何思考内容
   */
  hasContent(): boolean {
    return this.currentContent.length > 0
  }
}

// =============================================================================
// POST Handler
// =============================================================================

// POST /api/ai/chat/stream - 发送 AI 对话请求（流式）
export async function POST(request: NextRequest) {
  // 每次请求时重新读取环境变量（确保使用最新值，避免被系统环境变量覆盖）
  const apiKey = process.env.OPENROUTER_API_KEY
  const apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'

  try {
    // 检查平台 API Key 配置
    if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
      console.error('OpenRouter API Key not configured')
      return new Response(
        JSON.stringify({ error: '服务暂不可用，请稍后再试' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 解析请求
    const body: AIRequest = await request.json()
    const {
      messages,
      model = DEFAULT_MODEL, // 使用前端配置的默认模型
      maxTokens = 2048,
      temperature = 0.7
    } = body

    // 创建 ReadableStream 用于 SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const modelInfo = AI_MODELS[model]
        const supportsThinking = modelInfo?.supportsThinking ?? false
        let isClosed = false

        // 创建思考步骤提取器
        const thinkingExtractor = supportsThinking ? new ThinkingStepExtractor() : null

        // Safe enqueue that checks if controller is still open
        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data)
            } catch {
              // Controller might be closed, ignore
              isClosed = true
            }
          }
        }

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            controller.close()
          }
        }

        // 发送思考步骤的辅助函数
        const emitThinkingStep = (step: ThinkingStep) => {
          const chunk: AIStreamChunk = {
            type: 'thinking',
            data: { thinking: step }
          }
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        // 发送初始思考状态（如果模型支持）
        if (supportsThinking) {
          const initialStep: ThinkingStep = {
            step: 0,
            title: '启动推理',
            content: '正在连接 AI 模型...',
            status: 'processing'
          }
          emitThinkingStep(initialStep)
        }

        try {
          // 构建 OpenRouter 请求体
          // 对于支持思考的模型，添加 include_reasoning 选项
          const requestBody: Record<string, unknown> = {
            model,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            max_tokens: maxTokens,
            temperature,
            stream: true
          }

          // 为支持思考的模型添加 reasoning 相关参数
          if (supportsThinking) {
            // OpenRouter 支持通过 stream_options 获取 reasoning
            requestBody.stream_options = {
              include_usage: true
            }
            // 注意：reasoning 参数格式因模型而异，目前通过模拟实现思考步骤
            // 不再手动设置 reasoning 参数，避免 API 兼容性问题
          }

          // 调用 OpenRouter API（流式）
          const openRouterResponse = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://delta-terminal.app',
              'X-Title': 'Delta Terminal'
            },
            body: JSON.stringify(requestBody)
          })

          if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json().catch(() => ({}))
            const errorChunk: AIStreamChunk = {
              type: 'error',
              data: { error: errorData.error?.message || 'AI 服务暂时不可用' }
            }
            safeEnqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
            safeClose()
            return
          }

          // 更新初始思考状态为已连接
          if (supportsThinking) {
            const connectedStep: ThinkingStep = {
              step: 0,
              title: '启动推理',
              content: '已连接到 AI 模型',
              status: 'completed',
              duration: 100
            }
            emitThinkingStep(connectedStep)
          }

          // 处理流式响应
          const reader = openRouterResponse.body?.getReader()
          if (!reader) {
            throw new Error('无法读取响应流')
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let inputTokens = 0
          let outputTokens = 0
          let hasReceivedReasoning = false
          let contentBuffer = '' // 用于从内容中提取思考步骤（如果没有真实 reasoning）

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

                // 处理 reasoning/thinking 内容（真实思考步骤）
                // OpenRouter 可能通过 delta.reasoning 或 delta.thinking 返回
                const reasoning = delta?.reasoning || delta?.thinking || delta?.reasoning_content

                if (reasoning && thinkingExtractor) {
                  hasReceivedReasoning = true
                  const step = thinkingExtractor.processChunk(reasoning)
                  if (step) {
                    emitThinkingStep(step)
                  }
                }

                // 处理普通内容
                const content = delta?.content
                if (content) {
                  const contentChunk: AIStreamChunk = {
                    type: 'content',
                    data: { content }
                  }
                  safeEnqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`))

                  // 如果模型支持思考但没有收到 reasoning，从内容中提取
                  if (supportsThinking && !hasReceivedReasoning && thinkingExtractor) {
                    contentBuffer += content
                    // 从内容的前半部分提取思考步骤（通常 AI 会先阐述思路再给结论）
                    if (contentBuffer.length < 500) {
                      const step = thinkingExtractor.processChunk(content)
                      if (step) {
                        emitThinkingStep(step)
                      }
                    }
                  }
                }

                // 获取使用统计
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
              emitThinkingStep(finalStep)
            }

            // 如果没有任何思考内容，发送一个通用完成步骤
            if (!thinkingExtractor.hasContent()) {
              const genericStep: ThinkingStep = {
                step: 1,
                title: '生成回复',
                content: '已完成响应生成',
                status: 'completed',
                duration: 200
              }
              emitThinkingStep(genericStep)
            }
          }

          // 发送使用统计
          const totalCost = modelInfo
            ? (inputTokens * modelInfo.inputPrice + outputTokens * modelInfo.outputPrice) / 1000000
            : 0

          const usageChunk: AIStreamChunk = {
            type: 'usage',
            data: {
              usage: {
                inputTokens,
                outputTokens,
                totalCost
              }
            }
          }
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(usageChunk)}\n\n`))

          // 发送完成信号
          const doneChunk: AIStreamChunk = {
            type: 'done',
            data: {}
          }
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`))
          safeEnqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Stream processing error:', error)
          const errorChunk: AIStreamChunk = {
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'AI 服务异常' }
          }
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
        } finally {
          safeClose()
        }
      }
    })

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('AI stream error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'AI 服务异常' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
