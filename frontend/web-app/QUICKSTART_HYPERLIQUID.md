# Hyperliquid 市场数据服务 - 快速开始

> 5 分钟上手指南 🚀

---

## 📦 安装

无需安装！所有代码已经创建完成，直接使用即可。

---

## 🎯 基础用法

### 1️⃣ 最简单的例子

```tsx
import { useHyperliquidPrice, formatPrice } from '@/hooks/useHyperliquidPrice';

function MyComponent() {
  const { prices, loading, error } = useHyperliquidPrice(['BTC', 'ETH']);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <p>BTC: {formatPrice(prices.get('BTC'))}</p>
      <p>ETH: {formatPrice(prices.get('ETH'))}</p>
    </div>
  );
}
```

### 2️⃣ 添加手动刷新

```tsx
function MyComponent() {
  const { prices, loading, refresh } = useHyperliquidPrice(['BTC']);

  return (
    <div>
      <p>BTC: {formatPrice(prices.get('BTC'))}</p>
      <button onClick={refresh} disabled={loading}>
        {loading ? '刷新中...' : '刷新'}
      </button>
    </div>
  );
}
```

### 3️⃣ 自定义刷新间隔

```tsx
function MyComponent() {
  // 每 10 秒刷新一次
  const { prices } = useHyperliquidPrice(['BTC'], {
    refreshInterval: 10000,
  });

  return <div>BTC: {formatPrice(prices.get('BTC'))}</div>;
}
```

### 4️⃣ 禁用自动刷新（手动控制）

```tsx
function MyComponent() {
  const { prices, refresh } = useHyperliquidPrice(['BTC'], {
    enabled: false, // 禁用自动刷新
  });

  return (
    <div>
      <p>BTC: {prices.get('BTC') ? formatPrice(prices.get('BTC')) : '--'}</p>
      <button onClick={refresh}>获取最新价格</button>
    </div>
  );
}
```

### 5️⃣ 错误处理

```tsx
function MyComponent() {
  const { prices, error } = useHyperliquidPrice(['BTC'], {
    onError: (error) => {
      console.error('价格获取失败:', error);
      // 可以在这里添加错误上报
    },
  });

  if (error) {
    return (
      <div className="text-red-500">
        无法获取价格，请稍后重试
      </div>
    );
  }

  return <div>BTC: {formatPrice(prices.get('BTC'))}</div>;
}
```

---

## 🔧 API 直接调用

不使用 Hook，直接调用 API：

```typescript
import { getBatchPrices, getAssetPrice } from '@/lib/hyperliquid';

// 批量获取
const prices = await getBatchPrices(['BTC', 'ETH', 'SOL']);
console.log(prices.get('BTC')); // 88727.5

// 单个获取
const btcData = await getAssetPrice('BTC');
console.log(btcData);
// { symbol: 'BTC', price: 88727.5, timestamp: 1234567890 }
```

---

## 🎨 工具函数

### 格式化价格

```typescript
import { formatPrice } from '@/hooks/useHyperliquidPrice';

formatPrice(88727.5);                    // "$88727.50"
formatPrice(88727.5, { decimals: 0 });   // "$88728"
formatPrice(null, { fallback: 'N/A' });  // "N/A"
```

### 计算价格变化

```typescript
import { calculatePriceChange } from '@/hooks/useHyperliquidPrice';

const { change, changePercent, isPositive } = calculatePriceChange(
  88727.5,  // 当前价格
  88000     // 之前价格
);

console.log(change);        // 727.5
console.log(changePercent); // 0.83
console.log(isPositive);    // true
```

---

## 📊 Hook 返回值

```typescript
const {
  prices,      // Map<string, number> - 价格映射
  loading,     // boolean - 加载状态
  error,       // Error | null - 错误信息
  lastUpdate,  // number | null - 最后更新时间戳
  refresh,     // () => Promise<void> - 手动刷新方法
} = useHyperliquidPrice(['BTC', 'ETH']);
```

---

## ⚙️ 配置选项

```typescript
useHyperliquidPrice(['BTC'], {
  refreshInterval: 5000,        // 刷新间隔（毫秒），默认 5000
  enabled: true,                // 是否启用自动刷新，默认 true
  onError: (error) => { ... },  // 错误回调
});
```

---

## 🧪 测试 API 连接

运行测试脚本验证 API 连接：

```bash
node scripts/test-hyperliquid.ts
```

预期输出：
```
🚀 开始测试 Hyperliquid API...
✅ API 连接成功
📊 获取到 487 个资产价格
✅ BTC 价格: $88727.50
✅ ETH 价格: $2970.75
✅ 响应时间: 131ms
✅ 成功率: 5/5 (100%)
🎉 所有测试通过！
```

---

## 📖 完整示例

查看完整示例代码：

```bash
src/components/HyperliquidPriceDisplay.example.tsx
```

包含 5 个示例：
1. 基础价格显示
2. 带刷新按钮
3. 自定义刷新间隔
4. 手动刷新模式
5. 完整示例页面

---

## 🔍 支持的资产

Hyperliquid 支持 **487 个**交易对，包括：

- BTC, ETH, SOL, AVAX, MATIC, LINK, UNI, AAVE...
- 所有主流加密货币
- 使用大写符号（如 'BTC'，而非 'btc'）

---

## ⚡ 性能建议

### ✅ 推荐做法

```typescript
// 批量获取多个资产
const prices = await getBatchPrices(['BTC', 'ETH', 'SOL']);
```

### ❌ 不推荐做法

```typescript
// 多次单独获取（会增加请求次数）
const btc = await getAssetPrice('BTC');
const eth = await getAssetPrice('ETH');
const sol = await getAssetPrice('SOL');
```

### 🎯 刷新间隔建议

- **实时交易**: 5 秒
- **监控仪表板**: 30 秒
- **报表展示**: 禁用自动刷新

---

## 🐛 常见问题

### Q: 价格不更新？

**A**: 检查：
1. 网络连接是否正常
2. 浏览器控制台是否有错误
3. 尝试手动调用 `refresh()`

### Q: 如何获取更多资产？

**A**: 在数组中添加更多符号：
```typescript
const { prices } = useHyperliquidPrice([
  'BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'
]);
```

### Q: 如何清除缓存？

**A**: 导入并调用：
```typescript
import { clearPriceCache } from '@/lib/hyperliquid';
clearPriceCache();
```

---

## 📚 更多文档

- **详细文档**: `src/lib/hyperliquid.README.md`
- **Story 文档**: `docs/stories/1.2.hyperliquid-market-data.story.md`
- **实现总结**: `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 就这么简单！

现在你已经可以：

- ✅ 获取实时价格
- ✅ 自动刷新价格
- ✅ 处理错误
- ✅ 格式化显示

**开始使用吧！** 🚀

---

**需要帮助？** 查看完整文档或运行测试脚本！
