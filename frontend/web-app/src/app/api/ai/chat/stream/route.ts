/**
 * AI Chat Stream API Route (SSE Streaming)
 *
 * 平台代理 AI 调用 - 使用平台的 OpenRouter API Key
 * 简化版，无订阅限制，支持流式响应
 */

import { NextRequest } from 'next/server'
import { AIRequest, AIStreamChunk, AI_MODELS, ThinkingStep } from '@/types/ai'

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// POST /api/ai/chat/stream - 发送 AI 对话请求（流式）
export async function POST(request: NextRequest) {
  try {
    // 检查平台 API Key 配置
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
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
      model = 'deepseek/deepseek-v3.2',
      maxTokens = 4096,
      temperature = 0.7
    } = body

    // 创建 ReadableStream 用于 SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const modelInfo = AI_MODELS[model]
        const supportsThinking = modelInfo?.supportsThinking ?? false

        // 发送思考步骤（如果模型支持）
        if (supportsThinking) {
          const thinkingSteps: ThinkingStep[] = [
            {
              step: 1,
              title: '理解问题',
              content: '分析用户输入，识别关键意图...',
              status: 'processing'
            }
          ]

          const firstStep = thinkingSteps[0]
          const thinkingChunk: AIStreamChunk = {
            type: 'thinking',
            data: firstStep ? { thinking: firstStep } : {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingChunk)}\n\n`))
        }

        try {
          // 调用 OpenRouter API（流式）
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
              stream: true
            })
          })

          if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json().catch(() => ({}))
            const errorChunk: AIStreamChunk = {
              type: 'error',
              data: { error: errorData.error?.message || 'AI 服务暂时不可用' }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
            controller.close()
            return
          }

          // 更新思考步骤
          if (supportsThinking) {
            const thinkingUpdate: AIStreamChunk = {
              type: 'thinking',
              data: {
                thinking: {
                  step: 1,
                  title: '理解问题',
                  content: '分析用户输入，识别关键意图...',
                  status: 'completed',
                  duration: 150
                }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingUpdate)}\n\n`))

            const thinkingStep2: AIStreamChunk = {
              type: 'thinking',
              data: {
                thinking: {
                  step: 2,
                  title: '生成回复',
                  content: '组织语言，构建响应内容...',
                  status: 'processing'
                }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingStep2)}\n\n`))
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
                const content = parsed.choices?.[0]?.delta?.content

                if (content) {
                  const contentChunk: AIStreamChunk = {
                    type: 'content',
                    data: { content }
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`))
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
          if (supportsThinking) {
            const thinkingComplete: AIStreamChunk = {
              type: 'thinking',
              data: {
                thinking: {
                  step: 2,
                  title: '生成回复',
                  content: '组织语言，构建响应内容...',
                  status: 'completed',
                  duration: 200
                }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingComplete)}\n\n`))
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(usageChunk)}\n\n`))

          // 发送完成信号
          const doneChunk: AIStreamChunk = {
            type: 'done',
            data: {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneChunk)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Stream processing error:', error)
          const errorChunk: AIStreamChunk = {
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'AI 服务异常' }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
        } finally {
          controller.close()
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
