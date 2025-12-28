# Loading Skeleton 组件库

Delta Terminal 的统一加载骨架屏组件库，提供一致的加载体验。

## 特性

- ✨ **多种动画效果**: `pulse` / `shimmer` / `none`
- 📱 **响应式设计**: 自适应各种屏幕尺寸
- 🎨 **匹配 UI 风格**: 与 RiverBit Design System 完美融合
- ⚙️ **高度可配置**: 支持自定义行数、列数、高度等
- 🚀 **性能优化**: 使用 CSS 动画,零 JavaScript 开销

## 快速开始

```tsx
import { ChatSkeleton, CardSkeleton, ChartSkeleton } from '@/components/loading'

// 聊天加载
<ChatSkeleton messages={3} animation="shimmer" />

// 卡片加载
<CardSkeleton hasImage hasFooter lines={3} />

// 图表加载
<ChartSkeleton height={300} showLegend />
```

## 组件列表

### 1. Chat 聊天骨架屏

#### ChatMessageSkeleton
单条聊天消息的加载状态。

```tsx
<ChatMessageSkeleton animation="shimmer" />
```

#### ChatSkeleton
多条聊天消息的加载状态。

```tsx
<ChatSkeleton
  messages={3}      // 显示 3 条消息
  animation="shimmer"
/>
```

#### FullChatSkeleton
完整聊天界面(包含头部和输入框)。

```tsx
<FullChatSkeleton
  messages={5}
  animation="shimmer"
/>
```

**使用场景**: AI 对话界面、客服聊天、策略咨询等

---

### 2. Card 卡片骨架屏

#### CardSkeleton
通用卡片加载状态。

```tsx
<CardSkeleton
  hasImage        // 显示图片占位符
  hasFooter       // 显示底部操作按钮
  lines={2}       // 内容行数
  animation="shimmer"
/>
```

#### GridCardSkeleton
卡片网格布局。

```tsx
<GridCardSkeleton
  count={6}       // 卡片数量
  columns={3}     // 列数 (1|2|3|4)
  hasImage={false}
  hasFooter={true}
  animation="shimmer"
/>
```

#### StrategyCardSkeleton
策略卡片专用(包含图标、指标、操作按钮)。

```tsx
<StrategyCardSkeleton animation="shimmer" />
```

#### StatsCardSkeleton
仪表盘统计卡片。

```tsx
<StatsCardSkeleton animation="shimmer" />
```

**使用场景**: 策略列表、Agent 展示、数据面板等

---

### 3. Table 表格骨架屏

#### TableSkeleton
通用表格加载状态。

```tsx
<TableSkeleton
  rows={5}           // 行数
  columns={4}        // 列数
  showHeader         // 显示表头
  showRowNumbers     // 显示行号
  animation="shimmer"
/>
```

#### OrderBookSkeleton
订单簿专用(包含买单/卖单区域)。

```tsx
<OrderBookSkeleton
  rows={10}          // 每侧显示的行数
  animation="shimmer"
/>
```

#### TradeHistorySkeleton
交易历史记录表格。

```tsx
<TradeHistorySkeleton
  rows={15}
  animation="shimmer"
/>
```

#### DataTableSkeleton
可自定义列宽的数据表格。

```tsx
<DataTableSkeleton
  rows={8}
  columns={5}
  columnWidths={['w-20', 'flex-1', 'flex-1', 'w-32', 'w-24']}
  animation="shimmer"
/>
```

**使用场景**: 订单列表、交易记录、持仓信息等

---

### 4. Chart 图表骨架屏

#### ChartSkeleton
通用图表加载状态。

```tsx
<ChartSkeleton
  height={300}      // 高度(px 或 tailwind class)
  showTitle         // 显示标题
  showLegend        // 显示图例
  animation="shimmer"
/>
```

#### LineChartSkeleton
折线图(带模拟数据点)。

```tsx
<LineChartSkeleton
  height={300}
  showTitle
  animation="shimmer"
/>
```

#### CandlestickSkeleton
K线图/蜡烛图(交易专用)。

```tsx
<CandlestickSkeleton
  height={400}
  showControls      // 显示时间周期控制器
  animation="shimmer"
/>
```

#### DashboardChartSkeleton
仪表盘图表组合(包含统计卡片 + 主图表 + 次级图表)。

```tsx
<DashboardChartSkeleton animation="shimmer" />
```

#### MiniChartSkeleton
迷你图表(Sparkline 风格)。

```tsx
<MiniChartSkeleton
  width={100}
  height={40}
  animation="shimmer"
/>
```

**使用场景**: PnL 曲线、市场行情、回测结果等

---

## 动画类型

### `animation="pulse"`
平滑的脉冲动画(默认 Tailwind)。

```tsx
<ChatSkeleton animation="pulse" />
```

### `animation="shimmer"`
闪光扫过效果(推荐,更专业)。

```tsx
<ChatSkeleton animation="shimmer" />
```

### `animation="none"`
无动画(静态占位符)。

```tsx
<ChatSkeleton animation="none" />
```

---

## 实际使用示例

### 场景 1: 策略列表页面

```tsx
'use client'

import { useStrategies } from '@/hooks/useStrategies'
import { GridCardSkeleton, StrategyCardSkeleton } from '@/components/loading'

export function StrategyList() {
  const { strategies, isLoading } = useStrategies()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StrategyCardSkeleton key={i} animation="shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {strategies.map(strategy => (
        <StrategyCard key={strategy.id} strategy={strategy} />
      ))}
    </div>
  )
}
```

### 场景 2: 聊天界面

```tsx
'use client'

import { useChat } from '@/hooks/useChat'
import { FullChatSkeleton } from '@/components/loading'

export function ChatInterface() {
  const { messages, isLoading } = useChat()

  if (isLoading && messages.length === 0) {
    return <FullChatSkeleton messages={3} animation="shimmer" />
  }

  return (
    <div className="chat-interface">
      {/* Chat content */}
    </div>
  )
}
```

### 场景 3: 交易面板

```tsx
'use client'

import { useMarketData } from '@/hooks/useMarketData'
import {
  CandlestickSkeleton,
  OrderBookSkeleton,
  TradeHistorySkeleton
} from '@/components/loading'

export function TradingPanel() {
  const { data, isLoading } = useMarketData('BTC/USDT')

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 主图表 */}
        <div className="lg:col-span-3">
          <CandlestickSkeleton height={500} showControls />
        </div>

        {/* 侧边栏 */}
        <div className="space-y-4">
          <OrderBookSkeleton rows={10} />
          <TradeHistorySkeleton rows={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Real data */}
    </div>
  )
}
```

### 场景 4: 仪表盘

```tsx
'use client'

import { useDashboard } from '@/hooks/useDashboard'
import { DashboardChartSkeleton } from '@/components/loading'

export function Dashboard() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return <DashboardChartSkeleton animation="shimmer" />
  }

  return (
    <div className="space-y-6">
      {/* Stats cards, charts, etc. */}
    </div>
  )
}
```

---

## 自定义样式

所有骨架屏组件支持 `className` prop 用于自定义样式:

```tsx
<ChatSkeleton
  className="bg-muted/50 border border-dashed"
  animation="shimmer"
/>
```

---

## 性能优化建议

1. **优先使用 shimmer 动画**: 视觉效果更专业,用户感知加载时间更短
2. **合理控制骨架数量**: 避免一次渲染过多骨架屏(建议 ≤ 20 个)
3. **懒加载长列表**: 结合虚拟滚动库(如 `react-window`)
4. **避免嵌套动画**: 一个容器内只使用一种动画类型

---

## 设计原则

- **内容优先**: 骨架形状应匹配实际内容布局
- **渐进式披露**: 从大框架到细节逐步加载
- **一致性**: 整个应用使用统一的动画效果
- **可访问性**: 添加 `aria-busy="true"` 和 `aria-label`

---

## 技术实现

所有骨架屏基于 `/components/ui/skeleton.tsx` 基础组件构建:

```tsx
// Base Skeleton component
export function Skeleton({
  className,
  animation = 'pulse'
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' && 'skeleton-shimmer',
        className,
      )}
    />
  )
}
```

Shimmer 动画定义在 `globals.css`:

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

---

## 相关资源

- [Shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton)
- [RiverBit Design System](../../app/globals.css)
- [Delta Terminal CLAUDE.md](../../../CLAUDE.md)

---

**最后更新**: 2025-12-28
**维护者**: Delta Terminal 前端团队
