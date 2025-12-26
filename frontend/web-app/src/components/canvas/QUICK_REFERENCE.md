# MonitorCanvas 快速参考

## 一分钟上手

### 1. 导入组件
```tsx
import { MonitorCanvas } from '@/components/canvas'
import type { MonitorCanvasProps } from '@/components/canvas'
```

### 2. 最小使用示例
```tsx
<MonitorCanvas
  strategyId="strategy-001"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  strategy={{
    name: 'BTC 网格策略',
    symbol: 'BTC/USDT',
    status: 'running',
    createdAt: '2025-12-20T10:30:00Z',
  }}
  pnl={{
    daily: 256.78,
    total: 1823.45,
    unrealized: 128.50,
    realized: 1694.95,
  }}
  positions={[]}
  recentTrades={[]}
  metrics={{
    winRate: 0.72,
    avgHoldTime: '2小时15分',
    maxDrawdown: 3.25,
    totalTrades: 128,
    winningTrades: 92,
    losingTrades: 36,
  }}
/>
```

## 数据结构速查

### PnLData
```typescript
{
  daily: number,      // 当日盈亏
  total: number,      // 总盈亏
  unrealized: number, // 浮动盈亏
  realized: number    // 已实现盈亏
}
```

### Position
```typescript
{
  symbol: string,
  amount: number,
  avgPrice: number,
  currentPrice: number,
  unrealizedPnl: number,
  unrealizedPnlPercent: number
}
```

### Trade
```typescript
{
  id: string,
  timestamp: number,
  symbol: string,
  side: 'buy' | 'sell',
  price: number,
  amount: number,
  fee: number,
  realizedPnl?: number  // 可选
}
```

### StrategyMetrics
```typescript
{
  winRate: number,           // 0-1
  avgHoldTime: string,       // 如 "2小时15分"
  maxDrawdown: number,       // 百分比
  totalTrades: number,
  winningTrades: number,
  losingTrades: number
}
```

## 回调函数

```tsx
onPause={() => {
  // 暂停策略
}}

onResume={() => {
  // 恢复运行
}}

onStop={() => {
  // 停止策略（建议添加确认）
  if (confirm('确定停止？')) {
    // 执行停止
  }
}}

onModify={() => {
  // 跳转到参数修改页面
  router.push(`/strategies/${id}/edit`)
}}
```

## 状态对应的按钮

| 状态 | 显示的按钮 |
|------|-----------|
| running | 暂停策略、修改参数、停止策略 |
| paused  | 恢复运行、修改参数、停止策略 |
| stopped | 已停止（禁用） |

## 颜色系统

| 场景 | 正值 | 负值 | 零值 |
|------|------|------|------|
| PnL | `text-green-500` | `text-red-500` | `text-foreground` |
| 背景 | `bg-green-500/5` | `bg-red-500/5` | `bg-muted/50` |
| 边框 | `border-green-500/20` | `border-red-500/20` | `border-border` |

## 常见问题

### Q: 如何限制交易记录数量？
A: 组件自动截取前 10 条，无需手动处理。

### Q: 如何格式化时间？
A: 组件内部使用 `toLocaleString('zh-CN')`，自动格式化。

### Q: 如何更新实时数据？
A: 通过 WebSocket 更新 props，组件会自动重新渲染。

### Q: 如何自定义小数位数？
A: 当前版本固定小数位，需修改组件内的 `formatCurrency` 函数。

## 完整示例代码

参见：
- `MonitorCanvas.example.tsx` - 完整演示
- `MonitorCanvas.md` - 详细文档
- `MONITOR_IMPLEMENTATION.md` - 实现总结
