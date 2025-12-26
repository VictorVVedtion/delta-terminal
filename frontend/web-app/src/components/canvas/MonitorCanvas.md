# MonitorCanvas 组件文档

## 概述

`MonitorCanvas` 是 Delta Terminal A2UI 系统的监控模式组件，用于实时查看和管理运行中策略的状态。该组件提供完整的策略监控界面，包括实时盈亏、持仓详情、交易历史和性能指标。

**创建时间**: 2025-12-25
**状态**: ✅ 已完成
**文件路径**: `/src/components/canvas/MonitorCanvas.tsx`

---

## 功能特性

### 1. 策略状态头部
- ✅ 策略名称和交易对显示
- ✅ 运行状态 Badge (running/paused/stopped)
- ✅ 关闭按钮 (支持 Esc 快捷键)

### 2. 实时盈亏区
显示四个核心盈亏指标：
- **当日盈亏**: 今日累计盈亏
- **总盈亏**: 策略启动至今的总盈亏
- **浮动盈亏**: 当前持仓的未实现盈亏
- **已实现盈亏**: 已平仓交易的累计盈亏

颜色规则：
- 正值 → 绿色 (`text-green-500`)
- 负值 → 红色 (`text-red-500`)
- 零值 → 默认色 (`text-foreground`)

### 3. 当前持仓区
展示所有活跃持仓，每个持仓包含：
- 币种和数量
- 成本价和现价
- 浮动盈亏（金额 + 百分比）

特性：
- 支持滚动查看（最大高度 240px）
- 空状态提示 "暂无持仓"

### 4. 最近交易区
显示最近 5-10 笔交易记录，包括：
- 买入/卖出标识（绿色/红色 Badge）
- 交易对
- 成交价格、数量、手续费
- 已实现盈亏（如有）
- 交易时间

特性：
- 支持滚动查看（最大高度 300px）
- 自动限制显示 10 笔
- 空状态提示 "暂无交易记录"

### 5. 性能指标区
四个核心性能指标：
- **胜率**: 盈利交易 / 总交易，显示百分比
- **平均持仓**: 平均持仓时间（格式化字符串）
- **最大回撤**: 最大回撤百分比
- **总交易**: 总交易次数

颜色规则：
- 胜率 ≥60% → 绿色 (趋势向上)
- 胜率 40%-60% → 灰色 (中性)
- 胜率 <40% → 红色 (趋势向下)

额外显示：
- 盈利/亏损交易次数统计

### 6. 操作按钮区
根据策略状态显示不同操作：

**运行中 (running)**:
- 暂停策略 (黄色 warning)
- 修改参数 (outline)
- 停止策略 (红色 destructive)

**已暂停 (paused)**:
- 恢复运行 (绿色 success)
- 修改参数 (outline)
- 停止策略 (红色 destructive)

**已停止 (stopped)**:
- 已停止 (禁用状态)

---

## 类型定义

### MonitorCanvasProps

```typescript
interface MonitorCanvasProps {
  strategyId: string              // 策略唯一标识
  isOpen: boolean                 // 面板是否打开
  onClose: () => void            // 关闭回调
  onPause?: () => void           // 暂停策略回调
  onResume?: () => void          // 恢复策略回调
  onStop?: () => void            // 停止策略回调
  onModify?: () => void          // 修改参数回调
  strategy: StrategyInfo         // 策略基本信息
  pnl: PnLData                   // 盈亏数据
  positions: Position[]          // 当前持仓列表
  recentTrades: Trade[]          // 最近交易记录
  metrics: StrategyMetrics       // 性能指标
  isLoading?: boolean            // 加载状态
}
```

### 相关类型

```typescript
// 策略状态
type StrategyStatus = 'running' | 'paused' | 'stopped'

// 策略信息
interface StrategyInfo {
  name: string
  symbol: string
  status: StrategyStatus
  createdAt: string
  updatedAt?: string
}

// 盈亏数据
interface PnLData {
  daily: number       // 当日盈亏
  total: number       // 总盈亏
  unrealized: number  // 浮动盈亏
  realized: number    // 已实现盈亏
}

// 持仓信息
interface Position {
  symbol: string
  amount: number
  avgPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
}

// 交易记录
interface Trade {
  id: string
  timestamp: number
  symbol: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  fee: number
  realizedPnl?: number
}

// 性能指标
interface StrategyMetrics {
  winRate: number           // 胜率 (0-1)
  avgHoldTime: string       // 平均持仓时间
  maxDrawdown: number       // 最大回撤百分比
  totalTrades: number       // 总交易次数
  winningTrades: number     // 盈利交易次数
  losingTrades: number      // 亏损交易次数
}
```

---

## 使用示例

### 基础用法

```tsx
import { MonitorCanvas } from '@/components/canvas'

function StrategyMonitor() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        查看策略监控
      </button>

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
        positions={[
          {
            symbol: 'BTC/USDT',
            amount: 0.025,
            avgPrice: 95280.50,
            currentPrice: 96800.00,
            unrealizedPnl: 38.00,
            unrealizedPnlPercent: 1.59,
          },
        ]}
        recentTrades={[]}
        metrics={{
          winRate: 0.72,
          avgHoldTime: '2小时15分',
          maxDrawdown: 3.25,
          totalTrades: 128,
          winningTrades: 92,
          losingTrades: 36,
        }}
        onPause={() => console.log('暂停')}
        onResume={() => console.log('恢复')}
        onStop={() => console.log('停止')}
        onModify={() => console.log('修改')}
      />
    </>
  )
}
```

### 实时数据集成

```tsx
import { useEffect, useState } from 'react'
import { MonitorCanvas } from '@/components/canvas'
import type { Position, Trade, PnLData } from '@/components/canvas'

function RealTimeMonitor({ strategyId }: { strategyId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pnl, setPnl] = useState<PnLData>({
    daily: 0,
    total: 0,
    unrealized: 0,
    realized: 0,
  })
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])

  // WebSocket 订阅实时数据
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:4000/strategy/${strategyId}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'pnl_update':
          setPnl(data.pnl)
          break
        case 'position_update':
          setPositions(data.positions)
          break
        case 'trade_update':
          setTrades((prev) => [data.trade, ...prev].slice(0, 10))
          break
      }
    }

    return () => ws.close()
  }, [strategyId])

  return (
    <MonitorCanvas
      strategyId={strategyId}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      // ... 其他 props
      pnl={pnl}
      positions={positions}
      recentTrades={trades}
    />
  )
}
```

### 操作回调处理

```tsx
import { MonitorCanvas } from '@/components/canvas'
import { apiClient } from '@/lib/api'

function StrategyControl({ strategyId }: { strategyId: string }) {
  const handlePause = async () => {
    try {
      await apiClient.pauseStrategy(strategyId)
      toast.success('策略已暂停')
    } catch (error) {
      toast.error('暂停失败')
    }
  }

  const handleStop = async () => {
    const confirmed = confirm('确定停止策略？此操作不可撤销')
    if (!confirmed) return

    try {
      await apiClient.stopStrategy(strategyId)
      toast.success('策略已停止')
    } catch (error) {
      toast.error('停止失败')
    }
  }

  const handleModify = () => {
    // 跳转到参数修改页面
    router.push(`/strategies/${strategyId}/edit`)
  }

  return (
    <MonitorCanvas
      // ... 其他 props
      onPause={handlePause}
      onStop={handleStop}
      onModify={handleModify}
    />
  )
}
```

---

## 设计规范

### RiverBit Glass Effect

组件遵循 RiverBit 设计系统的玻璃态效果：

```css
/* 主容器 */
bg-card/80 backdrop-blur-sm

/* 内部卡片 */
bg-card/80 backdrop-blur-sm border border-border
```

### 颜色系统

**盈亏颜色**:
- 盈利: `text-green-500`, `bg-green-500/5`, `border-green-500/20`
- 亏损: `text-red-500`, `bg-red-500/5`, `border-red-500/20`
- 中性: `text-foreground`, `bg-muted/50`, `border-border`

**状态 Badge**:
- 运行中: `variant="success"` (绿色)
- 已暂停: `variant="warning"` (黄色)
- 已停止: `variant="destructive"` (红色)

**操作按钮**:
- 暂停: `variant="warning"`
- 恢复: `variant="success"`
- 修改: `variant="outline"`
- 停止: `variant="destructive"`

### 响应式设计

```tsx
// 移动端全屏，桌面端 520px
'w-full sm:w-[520px]'

// 移动端显示遮罩
'lg:hidden' // 仅移动端
```

---

## 性能优化

### 滚动优化

```css
/* 列表使用瘦滚动条 */
scrollbar-thin

/* 限制高度防止性能问题 */
max-h-[240px]  /* 持仓列表 */
max-h-[300px]  /* 交易列表 */
```

### 数据限制

- 交易记录只显示最近 10 笔
- 持仓列表自动滚动，无数量限制
- 建议后端只返回必要数据

---

## 测试建议

### 单元测试

```typescript
describe('MonitorCanvas', () => {
  it('should display strategy name and status', () => {
    // 测试策略信息显示
  })

  it('should format PnL values correctly', () => {
    // 测试盈亏格式化
  })

  it('should handle pause/resume/stop actions', () => {
    // 测试操作按钮
  })

  it('should close on Escape key', () => {
    // 测试键盘快捷键
  })
})
```

### 集成测试

```typescript
describe('MonitorCanvas Integration', () => {
  it('should update PnL in real-time', () => {
    // 测试 WebSocket 数据更新
  })

  it('should add new trades to the list', () => {
    // 测试交易列表实时更新
  })

  it('should reflect position changes', () => {
    // 测试持仓变化
  })
})
```

---

## 已知限制

1. **时间格式**: 当前使用 `toLocaleString('zh-CN')`，需根据用户语言设置调整
2. **小数位数**: 价格和数量的小数位数硬编码，应根据交易对动态调整
3. **货币符号**: 未显示货币符号（USDT/USD），需后端提供配置
4. **时区**: 未处理时区转换，显示本地时间

---

## 未来改进

- [ ] 添加图表展示（PnL 曲线）
- [ ] 支持导出交易记录
- [ ] 添加风险指标（Sharpe Ratio, Sortino Ratio）
- [ ] 支持多策略对比
- [ ] 添加通知设置（盈亏预警）
- [ ] 移动端优化（手势操作）

---

## 相关文档

- [CanvasPanel 文档](./CanvasPanel.md) - Proposal 模式组件
- [BacktestCanvas 文档](./BacktestCanvas.md) - Backtest 模式组件
- [A2UI 设计文档](/docs/a2ui-design.md) - 整体设计理念
- [RiverBit 设计系统](/docs/riverbit-design.md) - 设计规范

---

**最后更新**: 2025-12-25
**维护者**: Delta Terminal 前端团队
