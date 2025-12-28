# Loading Skeleton 快速参考

## 快速导入

```tsx
import {
  // Chat
  ChatSkeleton,
  FullChatSkeleton,

  // Card
  CardSkeleton,
  GridCardSkeleton,
  StrategyCardSkeleton,
  StatsCardSkeleton,

  // Table
  TableSkeleton,
  OrderBookSkeleton,
  TradeHistorySkeleton,

  // Chart
  ChartSkeleton,
  CandlestickSkeleton,
  DashboardChartSkeleton,
} from '@/components/loading'
```

## 常用场景速查表

| 场景 | 组件 | 代码 |
|------|------|------|
| 聊天消息 | `ChatSkeleton` | `<ChatSkeleton messages={3} animation="shimmer" />` |
| 策略卡片 | `StrategyCardSkeleton` | `<StrategyCardSkeleton animation="shimmer" />` |
| 策略列表 | `GridCardSkeleton` | `<GridCardSkeleton count={6} columns={3} animation="shimmer" />` |
| 数据表格 | `TableSkeleton` | `<TableSkeleton rows={5} columns={4} animation="shimmer" />` |
| 订单簿 | `OrderBookSkeleton` | `<OrderBookSkeleton rows={10} animation="shimmer" />` |
| K线图 | `CandlestickSkeleton` | `<CandlestickSkeleton height={400} showControls animation="shimmer" />` |
| 仪表盘 | `DashboardChartSkeleton` | `<DashboardChartSkeleton animation="shimmer" />` |
| 统计卡片 | `StatsCardSkeleton` | `<StatsCardSkeleton animation="shimmer" />` |

## 动画效果

```tsx
animation="shimmer"  // ✅ 推荐 - 专业闪光效果
animation="pulse"    // 脉冲动画
animation="none"     // 无动画
```

## 典型用法模式

### 模式 1: 条件渲染

```tsx
{isLoading ? (
  <ChatSkeleton messages={3} animation="shimmer" />
) : (
  <ActualContent data={data} />
)}
```

### 模式 2: 空状态处理

```tsx
if (isLoading) return <StrategyCardSkeleton />
if (!data) return <EmptyState />
return <StrategyCard data={data} />
```

### 模式 3: 数组映射

```tsx
{isLoading ? (
  Array.from({ length: 6 }).map((_, i) => (
    <StrategyCardSkeleton key={i} animation="shimmer" />
  ))
) : (
  strategies.map(s => <StrategyCard key={s.id} {...s} />)
)}
```

## 响应式网格

```tsx
// 1列 (移动端) → 2列 (平板) → 3列 (桌面)
<GridCardSkeleton count={6} columns={3} animation="shimmer" />

// 1列 (移动端) → 2列 (平板) → 4列 (桌面)
<GridCardSkeleton count={8} columns={4} animation="shimmer" />
```

## 自定义高度

```tsx
// 像素值
<ChartSkeleton height={300} />

// Tailwind class
<ChartSkeleton height="h-[400px]" />

// 字符串
<ChartSkeleton height="20rem" />
```

## 组合布局

### 交易面板

```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  <div className="lg:col-span-3">
    <CandlestickSkeleton height={500} showControls />
  </div>
  <div className="space-y-4">
    <OrderBookSkeleton rows={10} />
    <TradeHistorySkeleton rows={8} />
  </div>
</div>
```

### 仪表盘

```tsx
<div className="space-y-6">
  {/* 统计卡片 */}
  <div className="grid grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <StatsCardSkeleton key={i} />
    ))}
  </div>

  {/* 图表 */}
  <ChartSkeleton height={300} />

  {/* 表格 */}
  <TableSkeleton rows={5} columns={4} />
</div>
```

## 性能优化

```tsx
// ✅ 好: 限制数量
<GridCardSkeleton count={6} />

// ❌ 差: 过多骨架屏
<GridCardSkeleton count={50} />

// ✅ 好: 虚拟滚动 + 骨架屏
<VirtualList
  itemHeight={100}
  renderItem={renderItem}
  skeleton={<CardSkeleton />}
/>
```

## 可访问性

```tsx
<div aria-busy="true" aria-label="加载中">
  <ChatSkeleton messages={3} animation="shimmer" />
</div>
```

## 常见问题

**Q: 为什么推荐使用 shimmer 而不是 pulse?**
A: shimmer 动画视觉效果更专业,用户感知的加载时间更短。

**Q: 如何避免内容跳跃?**
A: 确保骨架屏的高度和布局与实际内容一致。

**Q: 可以自定义骨架屏颜色吗?**
A: 可以通过 `className` 覆盖样式: `<Skeleton className="bg-blue-500/20" />`

**Q: 如何处理部分加载?**
A: 将页面拆分成多个独立的加载区域,每个区域单独管理加载状态。

## 相关文件

- **完整文档**: `README.md`
- **使用示例**: `USAGE_EXAMPLES.tsx`
- **演示页面**: `SkeletonShowcase.tsx`
- **基础组件**: `../ui/skeleton.tsx`

---

💡 **提示**: 保持一致性 - 整个应用使用相同的动画效果和加载模式!
