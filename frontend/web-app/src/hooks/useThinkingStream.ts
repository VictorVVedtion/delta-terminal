'use client'

import React from 'react'

import type {
  ThinkingEvent,
  ThinkingProcess,
  TodoItem,
  ToolCall,
  UseThinkingStreamReturn,
} from '@/types/thinking'

// =============================================================================
// Types
// =============================================================================

interface UseThinkingStreamOptions {
  /** WebSocket URL */
  wsUrl?: string
  /** 自动重连 */
  autoReconnect?: boolean
  /** 重连延迟 (ms) */
  reconnectDelay?: number
  /** 事件回调 */
  onEvent?: (event: ThinkingEvent) => void
  /** 完成回调 */
  onComplete?: (process: ThinkingProcess) => void
  /** 错误回调 */
  onError?: (error: string) => void
}

// =============================================================================
// Initial State
// =============================================================================

function createInitialProcess(processId: string, userMessage: string): ThinkingProcess {
  return {
    process_id: processId,
    user_message: userMessage,
    status: 'thinking',
    todos: [],
    tool_history: [],
    started_at: Date.now(),
  }
}

// =============================================================================
// Reducer
// =============================================================================

type ThinkingAction =
  | { type: 'START'; payload: { process_id: string; user_message: string } }
  | { type: 'UPDATE_TODOS'; payload: { todos: TodoItem[] } }
  | { type: 'TOOL_STARTED'; payload: { tool_name: string; description: string } }
  | { type: 'TOOL_COMPLETED'; payload: { tool_name: string; result_summary: string; success: boolean } }
  | { type: 'UPDATE_PROGRESS'; payload: { percentage: number; current_step?: string } }
  | { type: 'APPROVAL_REQUIRED'; payload: { action: string; context: Record<string, unknown> } }
  | { type: 'COMPLETED'; payload: { result_type: 'insight_data' | 'text_response'; insight_id?: string } }
  | { type: 'ERROR'; payload: { error: string } }
  | { type: 'RESET' }

function thinkingReducer(
  state: ThinkingProcess | null,
  action: ThinkingAction
): ThinkingProcess | null {
  switch (action.type) {
    case 'START':
      return createInitialProcess(action.payload.process_id, action.payload.user_message)

    case 'UPDATE_TODOS':
      if (!state) return null
      return {
        ...state,
        todos: action.payload.todos,
        status: 'thinking',
      }

    case 'TOOL_STARTED': {
      if (!state) return null
      const newTool: ToolCall = {
        tool_name: action.payload.tool_name,
        description: action.payload.description,
        started_at: Date.now(),
      }
      return {
        ...state,
        status: 'tool_calling',
        current_tool: newTool,
      }
    }

    case 'TOOL_COMPLETED': {
      if (!state) return null
      const completedTool: ToolCall = {
        ...state.current_tool!,
        completed_at: Date.now(),
        result_summary: action.payload.result_summary,
        success: action.payload.success,
      }
      // 使用解构来移除 current_tool，避免设置为 undefined
      const { current_tool: _removed, ...stateWithoutCurrentTool } = state
      return {
        ...stateWithoutCurrentTool,
        status: 'thinking' as const,
        tool_history: [...state.tool_history, completedTool],
      }
    }

    case 'UPDATE_PROGRESS':
      if (!state) return null
      return {
        ...state,
        progress: {
          percentage: action.payload.percentage,
          ...(action.payload.current_step ? { current_step: action.payload.current_step } : {}),
        },
      }

    case 'APPROVAL_REQUIRED':
      if (!state) return null
      return {
        ...state,
        status: 'approval_required',
        approval: {
          action: action.payload.action,
          context: action.payload.context,
        },
      }

    case 'COMPLETED':
      if (!state) return null
      return {
        ...state,
        status: 'completed',
        completed_at: Date.now(),
        result_type: action.payload.result_type,
        ...(action.payload.insight_id ? { insight_id: action.payload.insight_id } : {}),
      }

    case 'ERROR':
      if (!state) return null
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
      }

    case 'RESET':
      return null

    default:
      return state
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useThinkingStream(
  options: UseThinkingStreamOptions = {}
): UseThinkingStreamReturn {
  const {
    wsUrl,
    autoReconnect = true,
    reconnectDelay = 3000,
    onEvent,
    onComplete,
    onError,
  } = options

  const [thinkingState, dispatch] = React.useReducer(thinkingReducer, null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Derived states
  const isThinking = thinkingState !== null && !['completed', 'error', 'idle'].includes(thinkingState.status)
  const needsApproval = thinkingState?.status === 'approval_required'

  // ==========================================================================
  // WebSocket Connection
  // ==========================================================================

  const connectWebSocket = React.useCallback(() => {
    if (!wsUrl) {
      return
    }

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        // WebSocket connected
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ThinkingEvent
          handleEvent(data)
          onEvent?.(data)
        } catch (err) {
          console.error('[useThinkingStream] Failed to parse message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('[useThinkingStream] WebSocket error:', error)
      }

      ws.onclose = () => {
        wsRef.current = null

        // Auto reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, reconnectDelay)
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[useThinkingStream] Failed to connect:', err)
    }
  }, [wsUrl, autoReconnect, reconnectDelay, onEvent])

  // ==========================================================================
  // Event Handler
  // ==========================================================================

  const handleEvent = React.useCallback(
    (event: ThinkingEvent) => {
      switch (event.type) {
        case 'thinking.started':
          dispatch({
            type: 'START',
            payload: {
              process_id: event.data.process_id,
              user_message: event.data.user_message,
            },
          })
          break

        case 'thinking.todos_updated':
          dispatch({
            type: 'UPDATE_TODOS',
            payload: { todos: event.data.todos },
          })
          break

        case 'thinking.tool_started':
          dispatch({
            type: 'TOOL_STARTED',
            payload: {
              tool_name: event.data.tool_name,
              description: event.data.description,
            },
          })
          break

        case 'thinking.tool_completed':
          dispatch({
            type: 'TOOL_COMPLETED',
            payload: {
              tool_name: event.data.tool_name,
              result_summary: event.data.result_summary,
              success: event.data.success,
            },
          })
          break

        case 'thinking.progress_updated':
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: event.data.progress,
          })
          break

        case 'thinking.approval_required':
          dispatch({
            type: 'APPROVAL_REQUIRED',
            payload: {
              action: event.data.action,
              context: event.data.context,
            },
          })
          break

        case 'thinking.completed':
          dispatch({
            type: 'COMPLETED',
            payload: {
              result_type: event.data.result_type,
              ...(event.data.insight_id ? { insight_id: event.data.insight_id } : {}),
            },
          })
          if (thinkingState) {
            onComplete?.(thinkingState)
          }
          break

        case 'thinking.error':
          dispatch({
            type: 'ERROR',
            payload: { error: event.data.error },
          })
          onError?.(event.data.error)
          break
      }
    },
    [thinkingState, onComplete, onError]
  )

  // ==========================================================================
  // Actions
  // ==========================================================================

  const startThinking = React.useCallback(
    (userMessage: string) => {
      const processId = `proc_${Date.now()}`

      // Optimistic local update
      dispatch({
        type: 'START',
        payload: { process_id: processId, user_message: userMessage },
      })

      // Send to server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'thinking.start',
            data: { process_id: processId, user_message: userMessage },
          })
        )
      }
    },
    []
  )

  const cancelThinking = React.useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && thinkingState) {
      wsRef.current.send(
        JSON.stringify({
          type: 'thinking.cancel',
          data: { process_id: thinkingState.process_id },
        })
      )
    }
    dispatch({ type: 'RESET' })
  }, [thinkingState])

  const submitApproval = React.useCallback(
    (approved: boolean, reason?: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && thinkingState) {
        wsRef.current.send(
          JSON.stringify({
            type: 'thinking.approval_response',
            data: {
              process_id: thinkingState.process_id,
              approved,
              reason,
            },
          })
        )
      }
    },
    [thinkingState]
  )

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  React.useEffect(() => {
    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connectWebSocket])

  return {
    process: thinkingState,
    isThinking,
    needsApproval,
    startThinking,
    cancelThinking,
    submitApproval,
  }
}

// =============================================================================
// Mock Hook (for development without WebSocket)
// =============================================================================

export function useMockThinkingStream(): UseThinkingStreamReturn {
  const [thinkingState, dispatch] = React.useReducer(thinkingReducer, null)

  const isThinking = thinkingState !== null && !['completed', 'error', 'idle'].includes(thinkingState.status)
  const needsApproval = thinkingState?.status === 'approval_required'

  const startThinking = React.useCallback((userMessage: string) => {
    const processId = `mock_${Date.now()}`

    // Start
    dispatch({
      type: 'START',
      payload: { process_id: processId, user_message: userMessage },
    })

    // Simulate todo updates
    setTimeout(() => {
      dispatch({
        type: 'UPDATE_TODOS',
        payload: {
          todos: [
            { id: '1', description: '理解用户意图', status: 'completed' },
            { id: '2', description: '检索因子库', status: 'in_progress' },
            { id: '3', description: '评估风控约束', status: 'pending' },
            { id: '4', description: '生成策略配置', status: 'pending' },
          ],
        },
      })
    }, 500)

    // Simulate tool call
    setTimeout(() => {
      dispatch({
        type: 'TOOL_STARTED',
        payload: {
          tool_name: 'get_factor_library',
          description: '正在检索适合的因子...',
        },
      })
    }, 1000)

    // Simulate tool completion
    setTimeout(() => {
      dispatch({
        type: 'TOOL_COMPLETED',
        payload: {
          tool_name: 'get_factor_library',
          result_summary: '找到 3 个相关因子: RSI, MACD, Bollinger',
          success: true,
        },
      })
    }, 2000)

    // Update todos
    setTimeout(() => {
      dispatch({
        type: 'UPDATE_TODOS',
        payload: {
          todos: [
            { id: '1', description: '理解用户意图', status: 'completed' },
            { id: '2', description: '检索因子库', status: 'completed' },
            { id: '3', description: '评估风控约束', status: 'completed' },
            { id: '4', description: '生成策略配置', status: 'in_progress' },
          ],
        },
      })
    }, 2500)

    // Complete
    setTimeout(() => {
      dispatch({
        type: 'COMPLETED',
        payload: {
          result_type: 'insight_data',
          insight_id: 'insight_mock_001',
        },
      })
    }, 3500)
  }, [])

  const cancelThinking = React.useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const submitApproval = React.useCallback(
    (approved: boolean, _reason?: string) => {
      if (approved) {
        dispatch({
          type: 'COMPLETED',
          payload: { result_type: 'insight_data' },
        })
      } else {
        dispatch({ type: 'RESET' })
      }
    },
    []
  )

  return {
    process: thinkingState,
    isThinking,
    needsApproval,
    startThinking,
    cancelThinking,
    submitApproval,
  }
}

export default useThinkingStream
