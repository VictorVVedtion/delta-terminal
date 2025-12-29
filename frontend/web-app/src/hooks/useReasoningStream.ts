'use client'

import React from 'react'

import type { ReasoningNode } from '@/types/reasoning'

// =============================================================================
// Types
// =============================================================================

interface UseReasoningStreamOptions {
  /** 完成回调 */
  onComplete?: (nodes: ReasoningNode[]) => void
  /** 错误回调 */
  onError?: (error: string) => void
  /** 节点新增回调 */
  onNodeAdded?: (node: ReasoningNode) => void
}

interface UseReasoningStreamReturn {
  /** 推理节点列表 */
  nodes: ReasoningNode[]
  /** 是否正在流式接收 */
  isStreaming: boolean
  /** 开始流式接收推理链 */
  startStream: (message: string, userId?: string) => Promise<void>
  /** 停止流式接收 */
  stopStream: () => void
  /** 重置状态 */
  reset: () => void
  /** 错误信息 */
  error: string | null
}

// =============================================================================
// SSE Parser (for POST-based SSE using fetch)
// =============================================================================

interface SSEEvent {
  event: string
  data: string
}

/**
 * 解析 SSE 数据块
 */
function parseSSEChunk(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = []
  const lines = chunk.split('\n')
  let currentEvent = ''
  let currentData = ''

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim()
    } else if (line === '' && currentEvent && currentData) {
      events.push({ event: currentEvent, data: currentData })
      currentEvent = ''
      currentData = ''
    }
  }

  return events
}

// =============================================================================
// Hook
// =============================================================================

export function useReasoningStream(
  options: UseReasoningStreamOptions = {}
): UseReasoningStreamReturn {
  const { onComplete, onError, onNodeAdded } = options

  const [nodes, setNodes] = React.useState<ReasoningNode[]>([])
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // ==========================================================================
  // Start Stream (使用 fetch + ReadableStream 支持 POST)
  // ==========================================================================

  const startStream = React.useCallback(
    async (message: string, userId = 'anonymous') => {
      // 清理之前的连接
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // 重置状态
      setNodes([])
      setError(null)
      setIsStreaming(true)

      // 创建 AbortController
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // 后端 SSE 端点 URL (直接调用后端，绕过 Next.js 代理)
      const NLP_URL = process.env.NEXT_PUBLIC_NLP_PROCESSOR_URL || 'http://localhost:8001'
      const url = `${NLP_URL}/api/v1/chat/reasoning/stream`

      try {
        console.log('[Reasoning Stream] Starting POST SSE to:', url)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message,
            user_id: userId,
            context: {},
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // 读取流
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log('[Reasoning Stream] Stream ended')
            break
          }

          // 解码并追加到缓冲区
          buffer += decoder.decode(value, { stream: true })

          // 解析 SSE 事件
          const events = parseSSEChunk(buffer)

          for (const sseEvent of events) {
            try {
              const data = JSON.parse(sseEvent.data)

              switch (sseEvent.event) {
                case 'start':
                  console.log('[Reasoning Stream] Started:', data.message)
                  break

                case 'node':
                  const nodeData = data as ReasoningNode
                  setNodes((prev) => [...prev, nodeData])
                  onNodeAdded?.(nodeData)
                  console.log('[Reasoning Stream] Node:', nodeData.type, nodeData.id)
                  break

                case 'done':
                  console.log('[Reasoning Stream] Completed:', data.message)
                  setIsStreaming(false)
                  setNodes((currentNodes) => {
                    onComplete?.(currentNodes)
                    return currentNodes
                  })
                  return

                case 'error':
                  const errorMsg = data.error || '推理链生成失败'
                  setError(errorMsg)
                  setIsStreaming(false)
                  onError?.(errorMsg)
                  return
              }
            } catch (parseErr) {
              console.error('[Reasoning Stream] Failed to parse event:', sseEvent, parseErr)
            }
          }

          // 清理已处理的事件
          const lastDoubleNewline = buffer.lastIndexOf('\n\n')
          if (lastDoubleNewline !== -1) {
            buffer = buffer.slice(lastDoubleNewline + 2)
          }
        }

        // 流结束后的处理
        setIsStreaming(false)
        setNodes((currentNodes) => {
          onComplete?.(currentNodes)
          return currentNodes
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[Reasoning Stream] Aborted')
          return
        }

        const errorMsg = err instanceof Error ? err.message : '流式请求失败'
        console.error('[Reasoning Stream] Error:', errorMsg)
        setError(errorMsg)
        setIsStreaming(false)
        onError?.(errorMsg)
      }
    },
    [onComplete, onError, onNodeAdded]
  )

  // ==========================================================================
  // Stop Stream
  // ==========================================================================

  const stopStream = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const reset = React.useCallback(() => {
    stopStream()
    setNodes([])
    setError(null)
  }, [stopStream])

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    nodes,
    isStreaming,
    startStream,
    stopStream,
    reset,
    error,
  }
}

export default useReasoningStream
