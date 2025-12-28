# API 客户端迁移指南

从旧的 `api.ts` 迁移到新的统一 `api-client.ts`

---

## 为什么要迁移？

新的 API 客户端提供了以下优势：

1. **标准化响应格式**: 统一的 `{ success, data, error }` 结构
2. **更好的错误处理**: 自动显示 Toast 通知，支持自定义错误处理
3. **自动重试机制**: 智能重试网络错误和服务器错误
4. **请求取消支持**: 使用 AbortController 取消请求
5. **拦截器系统**: 灵活的请求/响应拦截器
6. **类型安全**: 更好的 TypeScript 类型推断

---

## 迁移步骤

### 1. 导入新的 API 客户端

**旧代码 (api.ts):**
```typescript
import { apiClient } from '@/lib/api'
```

**新代码 (api-client.ts):**
```typescript
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
```

---

### 2. 更新响应处理方式

#### GET 请求

**旧代码:**
```typescript
try {
  const user = await apiClient.getUser(userId)
  console.log(user) // 直接返回数据或抛出错误
} catch (error) {
  console.error('请求失败:', error)
}
```

**新代码:**
```typescript
const response = await apiClient.get<User>(`/users/${userId}`)

if (response.success && response.data) {
  console.log(response.data)
} else {
  console.error('请求失败:', response.error)
}
```

#### POST 请求

**旧代码:**
```typescript
try {
  const newUser = await apiClient.createUser(userData)
  console.log('创建成功:', newUser)
} catch (error) {
  alert('创建失败')
}
```

**新代码:**
```typescript
const response = await apiClient.post<User>('/users', userData, {
  showSuccessToast: true,
  successMessage: '用户创建成功'
})

if (response.success && response.data) {
  console.log('创建成功:', response.data)
}
// 错误会自动显示 Toast，无需手动处理
```

---

### 3. 迁移常见 API 方法

#### 用户 API

**旧代码:**
```typescript
// api.ts
async getCurrentUser(): Promise<WalletUser> {
  const result = await this.request<{ user: WalletUser }>('/auth/me')
  return result.user
}
```

**新代码:**
```typescript
async function getCurrentUser() {
  const response = await apiClient.get<{ user: User }>('/auth/me')
  return response.data?.user || null
}
```

#### 策略 API

**旧代码:**
```typescript
async getStrategies() {
  return this.request<Strategy[]>('/strategies')
}

async createStrategy(data: unknown) {
  return this.request<Strategy>('/strategies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

**新代码:**
```typescript
async function getStrategies() {
  const response = await apiClient.get<Strategy[]>('/strategies')
  return response.data || []
}

async function createStrategy(data: CreateStrategyRequest) {
  return apiClient.post<Strategy>('/strategies', data, {
    showSuccessToast: true,
    successMessage: '策略创建成功'
  })
}
```

#### 订单 API

**旧代码:**
```typescript
async getOrders(params?: {
  symbol?: string
  status?: string
  limit?: number
}) {
  return this.request<Order[]>('/orders',
    params ? { params: params as Record<string, string | number | boolean> } : {}
  )
}
```

**新代码:**
```typescript
async function getOrders(params?: {
  symbol?: string
  status?: string
  limit?: number
}) {
  const response = await apiClient.get<Order[]>('/orders', {
    params
  })
  return response.data || []
}
```

---

### 4. 迁移 Token 管理

**旧代码:**
```typescript
// 登录后设置 token
const result = await apiClient.walletLogin(address, signature)
apiClient.setToken(result.tokens.accessToken)
apiClient.setRefreshToken(result.tokens.refreshToken)
```

**新代码 (保持不变):**
```typescript
// Token 管理 API 保持兼容
const response = await apiClient.post<AuthResponse>('/auth/login', {
  walletAddress: address,
  signature
})

if (response.success && response.data) {
  apiClient.setToken(response.data.tokens.accessToken)
  apiClient.setRefreshToken(response.data.tokens.refreshToken)
}
```

---

### 5. 迁移错误处理

#### 简单错误处理

**旧代码:**
```typescript
try {
  const data = await apiClient.getUser(userId)
  setUser(data)
} catch (error) {
  toast({
    variant: 'destructive',
    title: '加载失败',
    description: error.message
  })
}
```

**新代码:**
```typescript
// 错误自动显示 Toast
const response = await apiClient.get<User>(`/users/${userId}`)

if (response.success && response.data) {
  setUser(response.data)
}
```

#### 自定义错误处理

**旧代码:**
```typescript
try {
  await apiClient.deleteStrategy(id)
  toast({ title: '删除成功' })
} catch (error) {
  if (error.code === 'STRATEGY_IN_USE') {
    toast({ title: '策略正在使用中，无法删除' })
  } else {
    toast({ title: '删除失败' })
  }
}
```

**新代码:**
```typescript
const response = await apiClient.delete(`/strategies/${id}`, {
  showErrorToast: false, // 禁用默认错误提示
  showSuccessToast: true,
  successMessage: '策略已删除'
})

if (!response.success) {
  // 自定义错误处理
  if (response.error?.code === 'STRATEGY_IN_USE') {
    toast({
      variant: 'destructive',
      title: '策略正在使用中，无法删除'
    })
  } else {
    toast({
      variant: 'destructive',
      title: '删除失败',
      description: response.error?.message
    })
  }
}
```

---

### 6. 迁移 React Hook

**旧代码:**
```typescript
function useStrategy(strategyId: string) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchStrategy() {
      setLoading(true)
      try {
        const data = await apiClient.getStrategy(strategyId)
        setStrategy(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchStrategy()
  }, [strategyId])

  return { strategy, loading }
}
```

**新代码 (支持请求取消):**
```typescript
function useStrategy(strategyId: string) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = apiClient.createAbortController()

    async function fetchStrategy() {
      setLoading(true)
      setError(null)

      const response = await apiClient.get<Strategy>(
        `/strategies/${strategyId}`,
        {
          signal: abortController.signal,
          showErrorToast: false
        }
      )

      if (response.success && response.data) {
        setStrategy(response.data)
      } else if (response.error) {
        setError(response.error.message)
      }

      setLoading(false)
    }

    fetchStrategy()

    // 组件卸载时自动取消请求
    return () => {
      abortController.abort()
    }
  }, [strategyId])

  return { strategy, loading, error }
}
```

---

### 7. 迁移表单提交

**旧代码:**
```typescript
async function handleSubmit(data: FormData) {
  try {
    const result = await apiClient.createStrategy(data)
    toast({ title: '创建成功' })
    router.push(`/strategies/${result.id}`)
  } catch (error) {
    toast({
      variant: 'destructive',
      title: '创建失败',
      description: error.message
    })
  }
}
```

**新代码:**
```typescript
async function handleSubmit(data: FormData) {
  const response = await apiClient.post<Strategy>('/strategies', data, {
    showSuccessToast: true,
    successMessage: '策略创建成功',
    retry: false // 表单提交不自动重试
  })

  if (response.success && response.data) {
    router.push(`/strategies/${response.data.id}`)
  }
}
```

---

### 8. 迁移批量操作

**旧代码:**
```typescript
async function loadMultipleStrategies(ids: string[]) {
  const promises = ids.map(id => apiClient.getStrategy(id))
  const strategies = await Promise.all(promises)
  return strategies
}
```

**新代码:**
```typescript
async function loadMultipleStrategies(ids: string[]) {
  const requests = ids.map(id => () => apiClient.get<Strategy>(`/strategies/${id}`))
  const results = await apiClient.batch(requests)

  return results
    .filter(r => r.success && r.data)
    .map(r => r.data as Strategy)
}
```

---

## 完整迁移示例

### 旧的 API 服务 (api.ts)

```typescript
import { apiClient } from '@/lib/api'

export async function getStrategies() {
  return apiClient.getStrategies()
}

export async function createStrategy(data: CreateStrategyRequest) {
  return apiClient.createStrategy(data)
}

export async function deleteStrategy(id: string) {
  return apiClient.deleteStrategy(id)
}
```

### 新的 API 服务 (使用 api-client.ts)

```typescript
import { apiClient } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-client'
import type { Strategy, CreateStrategyRequest } from '@/types/strategy'

/**
 * 策略服务
 */
export class StrategyService {
  /**
   * 获取所有策略
   */
  async getStrategies(): Promise<Strategy[]> {
    const response = await apiClient.get<Strategy[]>('/strategies')
    return response.data || []
  }

  /**
   * 创建策略
   */
  async createStrategy(data: CreateStrategyRequest): Promise<ApiResponse<Strategy>> {
    return apiClient.post<Strategy>('/strategies', data, {
      showSuccessToast: true,
      successMessage: '策略创建成功',
      retry: false
    })
  }

  /**
   * 删除策略
   */
  async deleteStrategy(id: string): Promise<boolean> {
    const response = await apiClient.delete(`/strategies/${id}`, {
      showSuccessToast: true,
      successMessage: '策略已删除'
    })
    return response.success
  }

  /**
   * 更新策略
   */
  async updateStrategy(id: string, data: Partial<Strategy>): Promise<ApiResponse<Strategy>> {
    return apiClient.put<Strategy>(`/strategies/${id}`, data, {
      showSuccessToast: true,
      successMessage: '策略更新成功'
    })
  }

  /**
   * 启动策略
   */
  async startStrategy(id: string): Promise<boolean> {
    const response = await apiClient.post(`/strategies/${id}/start`, {}, {
      showSuccessToast: true,
      successMessage: '策略已启动'
    })
    return response.success
  }

  /**
   * 停止策略
   */
  async stopStrategy(id: string): Promise<boolean> {
    const response = await apiClient.post(`/strategies/${id}/stop`, {}, {
      showSuccessToast: true,
      successMessage: '策略已停止'
    })
    return response.success
  }
}

export const strategyService = new StrategyService()
```

---

## 迁移清单

使用此清单确保完整迁移：

- [ ] 更新导入语句 (`api.ts` → `api-client.ts`)
- [ ] 更新响应处理 (try-catch → success 检查)
- [ ] 添加 Toast 配置 (`showSuccessToast`, `successMessage`)
- [ ] 更新错误处理 (使用 `response.error`)
- [ ] 在 React Hook 中添加请求取消 (AbortController)
- [ ] 表单提交禁用自动重试 (`retry: false`)
- [ ] 更新类型定义 (`ApiResponse<T>`)
- [ ] 测试所有 API 调用
- [ ] 更新相关文档

---

## 常见问题

### Q: 是否需要一次性迁移所有代码？

A: 不需要。新的 API 客户端与旧客户端可以共存。建议逐步迁移：
1. 先迁移新功能
2. 再逐步重构旧代码

### Q: 如何处理不需要 Toast 的场景？

A: 使用 `showErrorToast: false`:

```typescript
const response = await apiClient.get('/health', {
  showErrorToast: false,
  showSuccessToast: false
})
```

### Q: 如何在 Server Component 中使用？

A: Server Component 不支持 Toast，需要禁用:

```typescript
const response = await apiClient.get('/data', {
  showErrorToast: false,
  showSuccessToast: false
})
```

### Q: 旧的 API 方法还能使用吗？

A: 可以。旧的 `api.ts` 中的特定业务方法（如 `walletLogin`, `chatA2UI`）可以继续使用，也可以逐步迁移到新客户端。

---

## 性能优化建议

### 1. 使用服务层封装

```typescript
// services/strategyService.ts
export const strategyService = new StrategyService()

// 在组件中使用
import { strategyService } from '@/services/strategyService'

const strategies = await strategyService.getStrategies()
```

### 2. 批量请求优化

```typescript
// 使用 batch 方法并行请求
const requests = ids.map(id => () => apiClient.get(`/strategies/${id}`))
const results = await apiClient.batch(requests)
```

### 3. 请求缓存

```typescript
// 可以在服务层添加缓存
const cache = new Map()

async function getCachedStrategy(id: string) {
  if (cache.has(id)) {
    return cache.get(id)
  }

  const response = await apiClient.get<Strategy>(`/strategies/${id}`)
  if (response.success && response.data) {
    cache.set(id, response.data)
    return response.data
  }

  return null
}
```

---

## 下一步

完成迁移后，建议：

1. 查阅 [API_CLIENT_README.md](./API_CLIENT_README.md) 了解更多高级功能
2. 查看 [api-client.example.ts](./api-client.example.ts) 获取更多示例
3. 运行测试确保功能正常
4. 更新团队文档

---

**迁移支持**: 如有问题请查阅文档或联系开发团队
