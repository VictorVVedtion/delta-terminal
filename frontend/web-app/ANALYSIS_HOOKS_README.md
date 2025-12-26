# 分析数据 API Hooks

## 概述

已创建用于获取分析数据的 API hooks，支持参数敏感度分析、归因分析和策略对比功能（EPIC-008）。

## 创建的文件

### 1. `/src/hooks/useAnalysis.ts`

包含三个主要 hooks：

#### `useSensitivityAnalysis(strategyId: string)`
获取策略的参数敏感度分析数据

**返回值:**
```typescript
{
  data: SensitivityInsightData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

**使用示例:**
```typescript
const { data, isLoading, error, refetch } = useSensitivityAnalysis('strategy_123')
```

#### `useAttributionAnalysis(strategyId: string)`
获取策略的盈亏归因分析数据

**返回值:**
```typescript
{
  data: AttributionInsightData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

**使用示例:**
```typescript
const { data, isLoading, error, refetch } = useAttributionAnalysis('strategy_123')
```

#### `useComparisonAnalysis(strategyIds: string[])`
获取多策略对比分析数据（支持2-4个策略）

**返回值:**
```typescript
{
  data: ComparisonInsightData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

**使用示例:**
```typescript
const { data, isLoading, error, refetch } = useComparisonAnalysis([
  'strategy_1',
  'strategy_2',
  'strategy_3'
])
```

### 2. `/src/lib/api.ts` 更新

添加了三个 API 方法：

```typescript
// 获取敏感度分析数据
apiClient.getSensitivityAnalysis(strategyId: string): Promise<unknown>

// 获取归因分析数据
apiClient.getAttributionAnalysis(strategyId: string): Promise<unknown>

// 获取策略对比分析数据
apiClient.getComparisonAnalysis(strategyIds: string[]): Promise<unknown>
```

## Mock 数据

当前实现使用 Mock 数据进行开发和测试：

- **敏感度分析**: 生成3个参数的影响曲线数据（快速均线、慢速均线、止损）
- **归因分析**: 生成5个因子的贡献数据（趋势跟踪、波段交易、止盈止损、手续费、滑点）
- **策略对比**: 生成2-4个策略的性能对比数据

Mock 数据包含：
- 完整的指标数据
- 30天历史数据点
- AI 分析洞察文本
- 可视化所需的所有字段

## 类型安全

所有 hooks 都完全类型化，使用 TypeScript 严格模式：

- 输入参数类型检查
- 返回值类型推断
- 错误处理类型安全

## 错误处理

每个 hook 都包含完整的错误处理：

- 参数验证（如 strategyId 不能为空）
- 网络错误捕获
- 友好的错误消息

## 加载状态

提供 `isLoading` 状态用于显示加载指示器：

```typescript
if (isLoading) return <Spinner />
```

## 数据刷新

每个 hook 都提供 `refetch` 函数用于手动刷新数据：

```typescript
<button onClick={() => refetch()}>刷新数据</button>
```

## 后续集成

当后端 API 准备就绪时，只需：

1. 取消注释 API 调用代码
2. 注释掉 Mock 数据生成代码
3. 更新 API 返回类型（从 `unknown` 到具体类型）

示例：
```typescript
// 当前 Mock 实现
await new Promise((resolve) => setTimeout(resolve, 800))
const mockData = generateMockSensitivityData(strategyId)

// 替换为真实 API
const data = await apiClient.getSensitivityAnalysis(strategyId)
```

## 依赖关系

- **类型定义**: `/src/types/insight.ts`
  - `SensitivityInsightData`
  - `AttributionInsightData`
  - `ComparisonInsightData`

- **API 客户端**: `/src/lib/api.ts`
  - `apiClient.getSensitivityAnalysis()`
  - `apiClient.getAttributionAnalysis()`
  - `apiClient.getComparisonAnalysis()`

## 测试

测试示例文件：`/src/hooks/__test_example__.tsx`

展示了如何在组件中使用这些 hooks。

## 相关文档

- [EPIC-008 分析功能规划](../../../docs/epics/EPIC-008-analysis-features.md)
- [InsightData 类型定义](../src/types/insight.ts)
- [API 客户端文档](../src/lib/api.ts)

---

**创建日期**: 2025-12-26
**状态**: ✅ 完成
**类型检查**: ✅ 通过
