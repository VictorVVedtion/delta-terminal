# BacktestCanvas 回测模式组件

## 概述

`BacktestCanvas` 是 Delta Terminal A2UI 系统中的回测模式组件，用于展示策略回测的实时进度、性能指标和交易历史。

## 功能特性

### 1. 回测进度区
- **进度条**: 实时显示回测进度 (0-100%)
- **状态指示**: 4种状态 - 运行中 / 已暂停 / 已完成 / 失败
- **状态文字**: 动态状态描述

### 2. 关键指标区（4宫格）
- **累计收益**: 总收益率百分比
- **胜率**: 获胜交易占比
- **最大回撤**: 最大资金回撤幅度
- **夏普比率**: 风险调整后收益指标

每个指标卡片包含：
- 图标标识
- 数值显示（带趋势色彩）
- 趋势方向指示（上涨/下跌）

### 3. 权益曲线区
- **SVG 实时绘制**: 展示回测期间的权益变化
- **起止点标记**: 清晰显示起始和当前权益
- **渐变填充**: 直观的面积图效果
- **动态颜色**: 盈利绿色 / 亏损红色

### 4. 交易记录列表
- **滚动列表**: 最多显示所有回测交易
- **交易详情**: 类型、时间、价格、盈亏
- **状态标记**: 持仓中 / 已平仓
- **盈亏高亮**: 正负收益不同颜色显示

### 5. 详细统计区
- 总交易次数
- 获胜交易数
- 亏损交易数
- 平均盈利百分比

### 6. 控制按钮
- **运行状态**: [暂停] [停止] 按钮
- **暂停状态**: [继续] [停止] 按钮
- **完成/失败状态**: [关闭] 按钮

## 组件接口

### Props

```typescript
interface BacktestCanvasProps {
  insight: InsightData            // 策略上下文
  isOpen: boolean                 // 面板是否打开
  onClose: () => void             // 关闭回调
  onPause?: () => void            // 暂停回调
  onResume?: () => void           // 继续回调
  onStop?: () => void             // 停止回调
  progress: number                // 进度 0-100
  status: BacktestStatus          // 状态
  metrics: BacktestMetrics        // 性能指标
  trades: BacktestTrade[]         // 交易记录
  equityCurve?: EquityCurvePoint[] // 权益曲线数据
}
```

### 类型定义

```typescript
type BacktestStatus = 'running' | 'paused' | 'completed' | 'failed'

interface BacktestMetrics {
  totalReturn: number      // 累计收益率 (%)
  winRate: number          // 胜率 (%)
  maxDrawdown: number      // 最大回撤 (%)
  sharpeRatio: number      // 夏普比率
  totalTrades?: number     // 总交易次数
  winningTrades?: number   // 获胜交易次数
  losingTrades?: number    // 亏损交易次数
  avgProfit?: number       // 平均盈利 (%)
  avgLoss?: number         // 平均亏损 (%)
}

interface BacktestTrade {
  id: string
  timestamp: number
  type: 'buy' | 'sell'
  symbol: string
  price: number
  quantity: number
  pnl?: number            // 盈亏
  pnlPercent?: number     // 盈亏百分比
  status: 'open' | 'closed'
}

interface EquityCurvePoint {
  timestamp: number
  value: number
}
```

## 使用示例

### 基础用法

```tsx
import { BacktestCanvas } from '@/components/canvas'

function MyPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  return (
    <BacktestCanvas
      insight={myInsight}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onPause={() => console.log('Paused')}
      onResume={() => console.log('Resumed')}
      onStop={() => console.log('Stopped')}
      progress={progress}
      status="running"
      metrics={{
        totalReturn: 15.8,
        winRate: 62.5,
        maxDrawdown: -8.2,
        sharpeRatio: 1.85,
      }}
      trades={[]}
      equityCurve={[]}
    />
  )
}
```

### 完整示例

参考 `BacktestCanvas.example.tsx` 文件获取完整的可运行示例。

## 设计规范

### RiverBit Glass Effect
- 背景: `bg-card/80 backdrop-blur-sm`
- 边框: `border-border`
- 半透明磨砂玻璃效果

### 颜色系统
- **盈利 / 上涨**: `text-green-500`, `bg-green-500/5`, `border-green-500/20`
- **亏损 / 下跌**: `text-red-500`, `bg-red-500/5`, `border-red-500/20`
- **中性**: `text-muted-foreground`, `bg-muted/50`

### 状态徽章
- 运行中: `variant="default"`
- 已暂停: `variant="secondary"`
- 已完成: `variant="outline"`
- 失败: `variant="destructive"`

## 响应式设计

- **移动端**: 全屏显示，带半透明遮罩
- **桌面端**: 固定宽度 600px，右侧滑出
- **滚动区域**: 内容区域可独立滚动，带自定义滚动条样式

## 键盘交互

- **ESC**: 关闭面板

## 性能优化

1. **虚拟化**: 交易列表使用原生滚动，适合中等数量数据
2. **SVG 优化**: 权益曲线使用轻量级 SVG 绘制
3. **条件渲染**: 仅在有数据时渲染图表和统计

## 依赖组件

- `Button` - 操作按钮
- `Badge` - 状态徽章
- `Progress` - 进度条
- `Card` - 卡片容器
- `lucide-react` - 图标库

## 文件路径

- 组件: `/src/components/canvas/BacktestCanvas.tsx`
- 导出: `/src/components/canvas/index.ts`
- 示例: `/src/components/canvas/BacktestCanvas.example.tsx`
- 文档: `/src/components/canvas/BacktestCanvas.README.md`

## 验收标准

✅ 回测进度条正常显示和更新
✅ 实时指标 4 宫格布局
✅ 交易列表可滚动
✅ 暂停/继续/停止按钮功能正常
✅ TypeScript 类型检查通过
✅ 符合 RiverBit 设计规范
✅ 权益曲线实时绘制
✅ 响应式布局支持移动端

## 后续改进

- [ ] 支持多策略对比回测
- [ ] 导出回测报告功能
- [ ] 更详细的交易统计图表
- [ ] 支持实时回测流式更新
- [ ] 添加回测参数调整面板

---

**创建日期**: 2025-12-25
**版本**: 1.0.0
**维护者**: Delta Terminal Frontend Team
