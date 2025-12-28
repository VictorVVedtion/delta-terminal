# API 客户端使用指南

统一的 API 客户端，提供标准化的错误处理、自动重试、请求取消等功能。

## 目录

- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [基础用法](#基础用法)
- [高级功能](#高级功能)
- [拦截器](#拦截器)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

---

## 快速开始

### 安装和导入

```typescript
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
```

### 第一个请求

```typescript
// GET 请求
const response = await apiClient.get('/users/123')

if (response.success && response.data) {
  console.log('用户数据:', response.data)
} else {
  console.error('请求失败:', response.error)
}
```

---

## 核心功能

### 1. 标准化响应格式

所有请求返回统一的响应格式:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

### 2. 自动错误处理

- 自动显示错误 Toast 通知
- 可自定义是否显示错误提示
- 支持自定义错误处理逻辑

### 3. 自动重试机制

- 指数退避算法
- 智能判断可重试错误 (网络错误、5xx 错误)
- 可配置最大重试次数

### 4. Token 自动刷新

- 401 错误自动触发 Token 刷新
- 刷新成功后自动重试原始请求
- 防止并发刷新

### 5. 请求取消

- 支持 AbortController
- 超时自动取消
- 组件卸载时取消请求

### 6. 拦截器系统

- 请求拦截器
- 响应拦截器
- 支持异步拦截器

---

## 基础用法

### GET 请求

```typescript
// 简单 GET
const response = await apiClient.get<User>('/users/123')

// 带查询参数
const response = await apiClient.get<User[]>('/users', {
  params: {
    role: 'admin',
    status: 'active',
    page: 1,
    limit: 20
  }
})
```

### POST 请求

```typescript
// 创建资源
const response = await apiClient.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
}, {
  showSuccessToast: true,
  successMessage: '用户创建成功'
})
```

### PUT 请求

```typescript
// 更新资源
const response = await apiClient.put<User>(`/users/${id}`, {
  name: 'Jane Doe'
}, {
  showSuccessToast: true,
  successMessage: '用户信息已更新'
})
```

### PATCH 请求

```typescript
// 部分更新
const response = await apiClient.patch<User>(`/users/${id}`, {
  status: 'inactive'
})
```

### DELETE 请求

```typescript
// 删除资源
const response = await apiClient.delete(`/users/${id}`, {
  showSuccessToast: true,
  successMessage: '用户已删除'
})
```

---

## 高级功能

### 自定义重试配置

```typescript
const response = await apiClient.get('/unstable-endpoint', {
  retry: true,           // 启用重试 (默认: true)
  maxRetries: 5         // 最大重试次数 (默认: 3)
})
```

### 禁用重试

```typescript
// 对于关键操作，禁用自动重试
const response = await apiClient.post('/critical-operation', data, {
  retry: false
})
```

### 自定义超时时间

```typescript
const response = await apiClient.post('/long-running-task', data, {
  timeout: 60000  // 60 秒超时 (默认: 30 秒)
})
```

### 静默请求

```typescript
// 不显示错误 Toast
const response = await apiClient.get('/health-check', {
  showErrorToast: false
})
```

### 请求取消

```typescript
const abortController = apiClient.createAbortController()

// 发起请求
const responsePromise = apiClient.get('/long-endpoint', {
  signal: abortController.signal
})

// 5 秒后取消
setTimeout(() => {
  abortController.abort()
}, 5000)

const response = await responsePromise
```

### React Hook 中使用 (自动取消)

```typescript
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const abortController = apiClient.createAbortController()

    async function fetchUser() {
      setLoading(true)
      const response = await apiClient.get<User>(`/users/${userId}`, {
        signal: abortController.signal,
        showErrorToast: false
      })

      if (response.success && response.data) {
        setUser(response.data)
      }
      setLoading(false)
    }

    fetchUser()

    // 组件卸载时取消请求
    return () => {
      abortController.abort()
    }
  }, [userId])

  return { user, loading }
}
```

### 批量请求

```typescript
const requests = [
  () => apiClient.get<User>('/users/1'),
  () => apiClient.get<User>('/users/2'),
  () => apiClient.get<User>('/users/3')
]

const results = await apiClient.batch(requests)

// 过滤成功的结果
const users = results
  .filter(r => r.success && r.data)
  .map(r => r.data as User)
```

---

## 拦截器

### 请求拦截器

```typescript
// 添加自定义 Header
const removeInterceptor = apiClient.addRequestInterceptor({
  onFulfilled: async (config) => {
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Custom-Header': 'value'
      }
    }
  },
  onRejected: (error) => {
    console.error('Request interceptor error:', error)
    return error
  }
})

// 使用完后移除拦截器
removeInterceptor()
```

### 响应拦截器

```typescript
// 日志记录
const removeInterceptor = apiClient.addResponseInterceptor({
  onFulfilled: async (response) => {
    console.log('Response:', {
      url: response.url,
      status: response.status
    })
    return response
  },
  onRejected: (error) => {
    console.error('Response error:', error)
    return error
  }
})
```

### 性能监控拦截器

```typescript
const timings = new Map<string, number>()

const requestInterceptor = apiClient.addRequestInterceptor({
  onFulfilled: async (config) => {
    const requestId = Math.random().toString(36)
    timings.set(requestId, Date.now())
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-Request-ID': requestId
      }
    }
  }
})

const responseInterceptor = apiClient.addResponseInterceptor({
  onFulfilled: async (response) => {
    const requestId = response.headers.get('X-Request-ID')
    if (requestId) {
      const startTime = timings.get(requestId)
      if (startTime) {
        console.log(`Request took ${Date.now() - startTime}ms`)
        timings.delete(requestId)
      }
    }
    return response
  }
})
```

---

## 错误处理

### 标准错误响应

```typescript
const response = await apiClient.get('/users/123')

if (!response.success) {
  // response.error 包含:
  // - code: 错误代码 (如 'NETWORK_ERROR', 'HTTP_404')
  // - message: 错误消息
  // - details: 详细信息 (可选)
  console.error(response.error.code, response.error.message)
}
```

### 常见错误代码

| 错误代码 | 说明 |
|---------|------|
| `NETWORK_ERROR` | 网络连接失败 |
| `TIMEOUT_ERROR` | 请求超时 |
| `TOKEN_EXPIRED` | Token 已过期 |
| `TOKEN_REFRESH_FAILED` | Token 刷新失败 |
| `HTTP_400` | 请求参数错误 |
| `HTTP_401` | 未授权 |
| `HTTP_403` | 禁止访问 |
| `HTTP_404` | 资源不存在 |
| `HTTP_500` | 服务器内部错误 |
| `UNKNOWN_ERROR` | 未知错误 |

### 自定义错误处理

```typescript
const response = await apiClient.get<User>('/users/123', {
  showErrorToast: false  // 禁用默认错误提示
})

if (!response.success) {
  switch (response.error?.code) {
    case 'TOKEN_EXPIRED':
      // 跳转到登录页
      window.location.href = '/login'
      break
    case 'NETWORK_ERROR':
      // 显示网络错误提示
      showNetworkErrorDialog()
      break
    case 'HTTP_404':
      // 显示资源不存在提示
      showNotFoundMessage()
      break
    default:
      // 其他错误
      console.error('Error:', response.error?.message)
  }
}
```

### 类型安全的错误处理

```typescript
const response = await apiClient.get<User>('/users/123')

// response.success 是类型守卫
if (response.success) {
  // TypeScript 知道 response.data 存在
  console.log(response.data.email)
} else {
  // TypeScript 知道 response.error 存在
  console.error(response.error.code, response.error.message)
}
```

---

## 最佳实践

### 1. 定义接口类型

```typescript
// types/user.ts
export interface User {
  id: string
  email: string
  name: string
}

// api/user.ts
import { apiClient } from '@/lib/api-client'
import type { User } from '@/types/user'

export async function getUser(id: string) {
  return apiClient.get<User>(`/users/${id}`)
}
```

### 2. 封装 API 服务

```typescript
// services/userService.ts
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import type { User } from '@/types/user'

export class UserService {
  async getUser(id: string): Promise<User | null> {
    const response = await apiClient.get<User>(`/users/${id}`)
    return response.data || null
  }

  async createUser(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/users', data, {
      showSuccessToast: true,
      successMessage: '用户创建成功'
    })
  }

  async updateUser(id: string, data: Partial<User>): Promise<boolean> {
    const response = await apiClient.put(`/users/${id}`, data, {
      showSuccessToast: true,
      successMessage: '用户更新成功'
    })
    return response.success
  }

  async deleteUser(id: string): Promise<boolean> {
    const response = await apiClient.delete(`/users/${id}`, {
      showSuccessToast: true,
      successMessage: '用户已删除'
    })
    return response.success
  }
}

export const userService = new UserService()
```

### 3. React Hook 封装

```typescript
// hooks/useUser.ts
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import type { User } from '@/types/user'

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = apiClient.createAbortController()

    async function fetchUser() {
      setLoading(true)
      setError(null)

      const response = await apiClient.get<User>(`/users/${userId}`, {
        signal: abortController.signal,
        showErrorToast: false
      })

      if (response.success && response.data) {
        setUser(response.data)
      } else if (response.error) {
        setError(response.error.message)
      }

      setLoading(false)
    }

    fetchUser()

    return () => {
      abortController.abort()
    }
  }, [userId])

  return { user, loading, error }
}
```

### 4. 表单提交

```typescript
async function handleSubmit(formData: CreateUserRequest) {
  const response = await apiClient.post<User>('/users', formData, {
    showSuccessToast: true,
    successMessage: '用户创建成功',
    retry: false  // 表单提交不自动重试
  })

  if (response.success && response.data) {
    // 跳转到用户详情页
    router.push(`/users/${response.data.id}`)
  }
}
```

### 5. 轮询状态

```typescript
async function pollStatus(taskId: string) {
  const maxAttempts = 30
  let attempts = 0

  while (attempts < maxAttempts) {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`, {
      showErrorToast: false,
      retry: false
    })

    if (response.success && response.data?.status !== 'pending') {
      return response.data
    }

    // 等待 2 秒后继续轮询
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++
  }

  throw new Error('轮询超时')
}
```

### 6. 初始化设置

```typescript
// app/providers.tsx
'use client'

import { apiClient } from '@/lib/api-client'
import { useEffect } from 'react'

export function ApiProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 从本地存储恢复 Token
    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (token) {
      apiClient.setToken(token)
    }
    if (refreshToken) {
      apiClient.setRefreshToken(refreshToken)
    }

    // 添加性能监控拦截器 (仅开发环境)
    if (process.env.NODE_ENV === 'development') {
      const cleanup = setupPerformanceMonitoring()
      return cleanup
    }
  }, [])

  return <>{children}</>
}
```

---

## 配置选项

### RequestConfig 完整选项

```typescript
interface RequestConfig extends RequestInit {
  // 查询参数
  params?: Record<string, string | number | boolean | undefined>

  // 是否启用自动重试 (默认: true)
  retry?: boolean

  // 最大重试次数 (默认: 3)
  maxRetries?: number

  // 是否显示错误 Toast (默认: true)
  showErrorToast?: boolean

  // 是否显示成功 Toast (默认: false)
  showSuccessToast?: boolean

  // 成功提示文本
  successMessage?: string

  // 请求超时时间 (ms, 默认: 30000)
  timeout?: number
}
```

---

## 常见问题

### Q: 如何在 Server Component 中使用?

A: Server Component 不支持 Toast 通知，需要禁用:

```typescript
const response = await apiClient.get('/data', {
  showErrorToast: false,
  showSuccessToast: false
})
```

### Q: 如何处理文件上传?

A: 需要自定义 Content-Type:

```typescript
const formData = new FormData()
formData.append('file', file)

const response = await apiClient.post('/upload', formData, {
  headers: {
    // 不设置 Content-Type，让浏览器自动设置
  }
})
```

### Q: 如何设置全局 Header?

A: 使用请求拦截器:

```typescript
apiClient.addRequestInterceptor({
  onFulfilled: async (config) => {
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-App-Version': '1.0.0'
      }
    }
  }
})
```

### Q: Token 过期后如何重新登录?

A: Token 刷新失败会自动清除 Token，可以监听错误:

```typescript
const response = await apiClient.get('/protected')

if (!response.success && response.error?.code === 'TOKEN_EXPIRED') {
  // 跳转到登录页
  window.location.href = '/login'
}
```

---

## 更新日志

### v1.0.0 (2025-12-28)

- 初始版本发布
- 支持 GET/POST/PUT/PATCH/DELETE 方法
- 自动错误处理和重试机制
- Token 自动刷新
- 拦截器系统
- 请求取消支持
