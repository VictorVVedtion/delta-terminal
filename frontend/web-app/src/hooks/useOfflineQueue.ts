/**
 * useOfflineQueue - 离线请求队列 Hook
 *
 * 功能:
 * - 离线时缓存请求到队列
 * - 恢复在线时自动重试
 * - localStorage 持久化
 * - 请求优先级和过期时间
 *
 * @module S45 网络断线处理
 */

import { useCallback, useEffect, useRef,useState } from 'react'

import { useOnlineStatus } from './useOnlineStatus'

export interface QueuedRequest {
  /** 唯一标识 */
  id: string
  /** 请求 URL */
  url: string
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 请求体 */
  body: unknown | undefined
  /** 请求头 */
  headers: Record<string, string> | undefined
  /** 优先级 (1-10, 10 最高) */
  priority: number
  /** 创建时间 */
  createdAt: number
  /** 过期时间 (毫秒时间戳) */
  expiresAt: number
  /** 重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
  /** 请求类型标签 */
  tag: string | undefined
}

export interface UseOfflineQueueOptions {
  /** 存储 key */
  storageKey?: string
  /** 默认过期时间 (毫秒), 默认 1 小时 */
  defaultTTL?: number
  /** 最大队列长度, 默认 100 */
  maxQueueSize?: number
  /** 默认最大重试次数, 默认 3 */
  defaultMaxRetries?: number
  /** 重试间隔 (毫秒), 默认 1000 */
  retryInterval?: number
  /** 请求成功回调 */
  onSuccess?: (request: QueuedRequest, response: Response) => void
  /** 请求失败回调 */
  onError?: (request: QueuedRequest, error: Error) => void
  /** 队列处理完成回调 */
  onQueueProcessed?: (processed: number, failed: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<UseOfflineQueueOptions, 'onSuccess' | 'onError' | 'onQueueProcessed'>> = {
  storageKey: 'delta-offline-queue',
  defaultTTL: 60 * 60 * 1000, // 1 hour
  maxQueueSize: 100,
  defaultMaxRetries: 3,
  retryInterval: 1000,
}

export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const { isConnected } = useOnlineStatus()

  const [queue, setQueue] = useState<QueuedRequest[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)

  // 从 localStorage 加载队列
  useEffect(() => {
    try {
      const stored = localStorage.getItem(config.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedRequest[]
        // 过滤掉已过期的请求
        const valid = parsed.filter(req => req.expiresAt > Date.now())
        setQueue(valid)
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error)
    }
  }, [config.storageKey])

  // 保存队列到 localStorage
  const saveQueue = useCallback(
    (newQueue: QueuedRequest[]) => {
      try {
        localStorage.setItem(config.storageKey, JSON.stringify(newQueue))
      } catch (error) {
        console.error('[OfflineQueue] Failed to save queue:', error)
      }
    },
    [config.storageKey]
  )

  // 添加请求到队列
  const enqueue = useCallback(
    (
      url: string,
      method: QueuedRequest['method'],
      body?: unknown,
      opts?: {
        headers?: Record<string, string>
        priority?: number
        ttl?: number
        maxRetries?: number
        tag?: string
      }
    ): string => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const now = Date.now()

      const request: QueuedRequest = {
        id,
        url,
        method,
        body,
        headers: opts?.headers,
        priority: opts?.priority ?? 5,
        createdAt: now,
        expiresAt: now + (opts?.ttl ?? config.defaultTTL),
        retryCount: 0,
        maxRetries: opts?.maxRetries ?? config.defaultMaxRetries,
        tag: opts?.tag,
      }

      setQueue(prev => {
        // 按优先级排序 (高优先级在前)
        const newQueue = [...prev, request]
          .sort((a, b) => b.priority - a.priority)
          .slice(0, config.maxQueueSize)

        saveQueue(newQueue)
        return newQueue
      })

      return id
    },
    [config.defaultTTL, config.defaultMaxRetries, config.maxQueueSize, saveQueue]
  )

  // 从队列移除请求
  const dequeue = useCallback(
    (id: string) => {
      setQueue(prev => {
        const newQueue = prev.filter(req => req.id !== id)
        saveQueue(newQueue)
        return newQueue
      })
    },
    [saveQueue]
  )

  // 清空队列
  const clearQueue = useCallback(() => {
    setQueue([])
    localStorage.removeItem(config.storageKey)
  }, [config.storageKey])

  // 清除指定 tag 的请求
  const clearByTag = useCallback(
    (tag: string) => {
      setQueue(prev => {
        const newQueue = prev.filter(req => req.tag !== tag)
        saveQueue(newQueue)
        return newQueue
      })
    },
    [saveQueue]
  )

  // 执行单个请求
  const executeRequest = useCallback(
    async (request: QueuedRequest): Promise<Response> => {
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        ...(request.body !== undefined && { body: JSON.stringify(request.body) }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    },
    []
  )

  // 处理队列
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0 || !isConnected) {
      return
    }

    processingRef.current = true
    setIsProcessing(true)

    let processed = 0
    let failed = 0
    const now = Date.now()

    for (const request of [...queue]) {
      // 跳过已过期的请求
      if (request.expiresAt < now) {
        dequeue(request.id)
        continue
      }

      try {
        const response = await executeRequest(request)
        dequeue(request.id)
        processed++
        options.onSuccess?.(request, response)
      } catch (error) {
        // 增加重试计数
        if (request.retryCount < request.maxRetries) {
          setQueue(prev => {
            const newQueue = prev.map(req =>
              req.id === request.id ? { ...req, retryCount: req.retryCount + 1 } : req
            )
            saveQueue(newQueue)
            return newQueue
          })
        } else {
          // 达到最大重试次数，移除请求
          dequeue(request.id)
          failed++
          options.onError?.(request, error as Error)
        }

        // 重试间隔
        await new Promise(resolve => setTimeout(resolve, config.retryInterval))
      }
    }

    processingRef.current = false
    setIsProcessing(false)

    if (processed > 0 || failed > 0) {
      options.onQueueProcessed?.(processed, failed)
    }
  }, [
    queue,
    isConnected,
    dequeue,
    executeRequest,
    saveQueue,
    config.retryInterval,
    options,
  ])

  // 恢复在线时自动处理队列
  useEffect(() => {
    if (isConnected && queue.length > 0 && !isProcessing) {
      void processQueue()
    }
  }, [isConnected, queue.length, isProcessing, processQueue])

  return {
    /** 队列中的请求列表 */
    queue,
    /** 队列长度 */
    queueLength: queue.length,
    /** 是否正在处理队列 */
    isProcessing,
    /** 添加请求到队列 */
    enqueue,
    /** 从队列移除请求 */
    dequeue,
    /** 清空队列 */
    clearQueue,
    /** 清除指定 tag 的请求 */
    clearByTag,
    /** 手动触发队列处理 */
    processQueue,
  }
}

export default useOfflineQueue
