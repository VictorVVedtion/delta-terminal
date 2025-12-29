/**
 * API 客户端单元测试
 * 测试统一 API 客户端的核心功能
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ApiClient, ApiError } from '../api-client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create mock headers
const createMockHeaders = (contentType: string | null = 'application/json') => ({
  get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
})

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  notify: vi.fn(),
}))

describe('ApiClient', () => {
  let client: ApiClient

  beforeEach(() => {
    client = new ApiClient('http://localhost:3000')
    mockFetch.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // 基础功能测试
  // ===========================================================================

  describe('基础 HTTP 方法', () => {
    it('GET 请求成功', async () => {
      const mockData = { id: '1', name: 'Test User' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: createMockHeaders(),
        json: async () => mockData,
      })

      const response = await client.get('/users/1')

      expect(response.success).toBe(true)
      expect(response.data).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('POST 请求成功', async () => {
      const mockData = { id: '1', name: 'New User' }
      const postData = { name: 'New User' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: createMockHeaders(),
        json: async () => mockData,
      })

      const response = await client.post('/users', postData)

      expect(response.success).toBe(true)
      expect(response.data).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      )
    })

    it('PUT 请求成功', async () => {
      const mockData = { id: '1', name: 'Updated User' }
      const putData = { name: 'Updated User' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: createMockHeaders(),
        json: async () => mockData,
      })

      const response = await client.put('/users/1', putData)

      expect(response.success).toBe(true)
      expect(response.data).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      )
    })

    it('DELETE 请求成功', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: createMockHeaders(null), // 204 No Content 通常没有 content-type
        json: async () => null,
      })

      const response = await client.delete('/users/1')

      expect(response.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  // ===========================================================================
  // 错误处理测试
  // ===========================================================================

  describe('错误处理', () => {
    it('处理 404 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: createMockHeaders(),
        json: async () => ({ code: 'NOT_FOUND', message: '资源不存在' }),
      })

      const response = await client.get('/users/999')

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe('NOT_FOUND')
      expect(response.error?.status).toBe(404)
    })

    it('处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'))

      const response = await client.get('/users/1')

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe('NETWORK_ERROR')
    })

    it('处理服务器错误 (500)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: createMockHeaders(),
        json: async () => ({ code: 'SERVER_ERROR', message: '服务器错误' }),
      })

      const response = await client.get('/users/1')

      expect(response.success).toBe(false)
      expect(response.error?.status).toBe(500)
    })
  })

  // ===========================================================================
  // ApiError 类测试
  // ===========================================================================

  describe('ApiError', () => {
    it('创建 ApiError 实例', () => {
      const error = new ApiError('Test error', 'TEST_ERROR', 400, { detail: 'test' })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.name).toBe('ApiError')
    })

    it('ApiError 默认状态码为 500', () => {
      const error = new ApiError('Test error', 'TEST_ERROR')

      expect(error.status).toBe(500)
    })
  })
})
