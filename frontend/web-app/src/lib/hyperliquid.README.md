# Hyperliquid 市场数据服务

> Hyperliquid API 客户端和 React Hooks - 实时价格数据订阅

## 概述

本模块提供与 Hyperliquid 交易所的数据连接功能，包括：

- ✅ 实时价格获取（所有资产）
- ✅ 单个/批量资产价格查询
- ✅ 智能缓存机制（3秒 TTL）
- ✅ 自动重试机制（最多3次）
- ✅ React Hook 支持（自动刷新）
- ✅ TypeScript 类型安全
- ✅ 错误处理和降级策略

## 快速开始

### 1. 基础用法

```tsx
import { useHyperliquidPrice } from '@/hooks/useHyperliquidPrice';

export function PriceDisplay() {
  const { prices, loading, error } = useHyperliquidPrice(['BTC', 'ETH']);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <p>BTC: ${prices.get('BTC')?.toFixed(2)}</p>
      <p>ETH: ${prices.get('ETH')?.toFixed(2)}</p>
    </div>
  );
}
```

### 2. 自定义刷新间隔

```tsx
const { prices } = useHyperliquidPrice(['BTC'], {
  refreshInterval: 10000, // 10秒刷新一次
});
```

### 3. 手动刷新

```tsx
const { prices, refresh } = useHyperliquidPrice(['BTC'], {
  enabled: false, // 禁用自动刷新
});

// 点击按钮时手动刷新
<button onClick={refresh}>刷新价格</button>
```

### 4. 错误处理

```tsx
const { prices, error } = useHyperliquidPrice(['BTC'], {
  onError: (error) => {
    console.error('获取价格失败:', error);
    // 可以在这里添加错误上报
  },
});
```

## API 参考

### Hook: `useHyperliquidPrice`

#### 参数

```typescript
useHyperliquidPrice(
  symbols: string[],           // 要监听的资产符号
  options?: {
    refreshInterval?: number;  // 刷新间隔（毫秒），默认 5000
    enabled?: boolean;         // 是否启用自动刷新，默认 true
    onError?: (error: Error) => void; // 错误回调
  }
)
```

#### 返回值

```typescript
{
  prices: Map<string, number>;  // 价格数据映射
  loading: boolean;             // 是否正在加载
  error: Error | null;          // 错误信息
  lastUpdate: number | null;    // 最后更新时间戳
  refresh: () => Promise<void>; // 手动刷新方法
}
```

### Hook: `useSingleAssetPrice`

获取单个资产价格的便捷 Hook：

```typescript
const { price, loading, error } = useSingleAssetPrice('BTC');
```

### 函数: `getAllMidPrices`

获取所有资产的中间价格：

```typescript
import { getAllMidPrices } from '@/lib/hyperliquid';

const prices = await getAllMidPrices();
// { BTC: "45000.50", ETH: "3000.25", ... }
```

### 函数: `getAssetPrice`

获取单个资产价格：

```typescript
import { getAssetPrice } from '@/lib/hyperliquid';

const btcPrice = await getAssetPrice('BTC');
// { symbol: 'BTC', price: 45000.5, timestamp: 1234567890 }
```

### 函数: `getBatchPrices`

批量获取多个资产价格：

```typescript
import { getBatchPrices } from '@/lib/hyperliquid';

const prices = await getBatchPrices(['BTC', 'ETH', 'SOL']);
// Map { 'BTC' => 45000.5, 'ETH' => 3000.25, 'SOL' => 100.75 }
```

### 工具函数: `formatPrice`

格式化价格显示：

```typescript
import { formatPrice } from '@/hooks/useHyperliquidPrice';

formatPrice(45000.5);                    // "$45000.50"
formatPrice(45000.5, { decimals: 0 });   // "$45001"
formatPrice(null, { fallback: 'N/A' });  // "N/A"
```

### 工具函数: `calculatePriceChange`

计算价格变化：

```typescript
import { calculatePriceChange } from '@/hooks/useHyperliquidPrice';

const { change, changePercent, isPositive } = calculatePriceChange(
  45500,  // 当前价格
  45000   // 之前价格
);
// { change: 500, changePercent: 1.11, isPositive: true }
```

## 高级用法

### 缓存控制

```typescript
import { clearPriceCache } from '@/lib/hyperliquid';

// 清除缓存以强制重新获取
clearPriceCache();
```

### 连接验证

```typescript
import { validateConnection } from '@/lib/hyperliquid';

const isConnected = await validateConnection();
if (!isConnected) {
  console.error('无法连接到 Hyperliquid API');
}
```

## 性能优化

### 1. 智能缓存

- 默认缓存时间：3秒
- 避免频繁请求同一数据
- 支持过期缓存降级（API 失败时使用）

### 2. 批量请求

优先使用 `getBatchPrices` 而非多次调用 `getAssetPrice`：

```typescript
// ❌ 不推荐
const btc = await getAssetPrice('BTC');
const eth = await getAssetPrice('ETH');

// ✅ 推荐
const prices = await getBatchPrices(['BTC', 'ETH']);
```

### 3. 合理的刷新间隔

根据实际需求设置刷新间隔：

```typescript
// 实时交易（5秒）
useHyperliquidPrice(['BTC'], { refreshInterval: 5000 });

// 监控仪表板（30秒）
useHyperliquidPrice(['BTC'], { refreshInterval: 30000 });

// 报表展示（不自动刷新）
useHyperliquidPrice(['BTC'], { enabled: false });
```

## 错误处理

### 常见错误类型

1. **网络错误**
   ```
   请求超时，请检查网络连接
   ```

2. **API 错误**
   ```
   API 请求失败: 500 Internal Server Error
   ```

3. **数据解析错误**
   ```
   无法解析 BTC 的价格: invalid
   ```

### 错误处理策略

```typescript
const { prices, error } = useHyperliquidPrice(['BTC'], {
  onError: (error) => {
    if (error.message.includes('超时')) {
      // 网络超时处理
      toast.error('网络连接超时，请检查网络');
    } else if (error.message.includes('API 请求失败')) {
      // API 错误处理
      toast.error('服务暂时不可用');
    } else {
      // 其他错误
      console.error('未知错误:', error);
    }
  },
});
```

## 测试

运行测试：

```bash
pnpm test src/lib/__tests__/hyperliquid.test.ts
```

测试覆盖：

- ✅ 价格获取功能
- ✅ 缓存机制
- ✅ 错误处理
- ✅ 重试逻辑
- ✅ 数据验证

## 示例

完整示例请参考：`src/components/HyperliquidPriceDisplay.example.tsx`

包含以下示例：

1. 基础价格显示
2. 带刷新按钮的价格显示
3. 自定义刷新间隔
4. 手动刷新模式
5. 完整示例页面

## 技术细节

### API 端点

- **URL**: `https://api.hyperliquid.xyz/info`
- **方法**: `POST`
- **请求体**: `{ "type": "allMids" }`
- **无需**: API Key

### 配置参数

```typescript
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';
const DEFAULT_TIMEOUT = 10000;     // 10 秒超时
const MAX_RETRIES = 3;             // 最多重试 3 次
const RETRY_DELAY = 1000;          // 重试延迟 1 秒
const CACHE_TTL = 3000;            // 缓存 3 秒
const DEFAULT_REFRESH_INTERVAL = 5000; // 默认刷新间隔 5 秒
```

### 类型定义

完整类型定义请参考：`src/types/hyperliquid.ts`

## 注意事项

1. **资产符号大小写**：使用大写符号（如 'BTC'，而非 'btc'）
2. **刷新间隔**：建议不低于 5 秒，避免过度请求
3. **错误处理**：始终处理 `error` 状态，提供用户友好提示
4. **缓存机制**：了解缓存 TTL，避免数据过期误用

## 未来改进

- [ ] WebSocket 实时推送支持
- [ ] 更多市场数据类型（深度、K线等）
- [ ] 历史价格查询
- [ ] 价格告警功能
- [ ] 性能监控和分析

## 相关文档

- [Hyperliquid API 文档](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [项目架构文档](../../../../CLAUDE.md)
- [前端开发规范](../../CLAUDE.md)

---

**最后更新**: 2025-12-26
**维护者**: Delta Terminal 开发团队
