# Paper Trading 系统使用指南

> EPIC-008 Story 2: 虚拟账户与模拟订单系统

## 概述

Paper Trading 系统提供完整的虚拟资金管理和模拟订单执行功能，支持：

- 虚拟账户管理（余额、持仓）
- 模拟订单执行（市价单买入/卖出）
- 实时 P&L 计算（已实现/未实现盈亏）
- 交易统计（胜率、平均盈亏、总手续费）
- 状态持久化（localStorage）

---

## 快速开始

### 1. 初始化虚拟账户

```tsx
import { usePaperTrading } from '@/hooks/usePaperTrading'

function MyComponent() {
  const { initAccount, account } = usePaperTrading({ agentId: 'agent_1' })

  useEffect(() => {
    if (!account) {
      // 初始化 10000 USDT 虚拟资金
      initAccount('agent_1', 10000)
    }
  }, [account, initAccount])

  return <div>余额: {account?.currentBalance} USDT</div>
}
```

### 2. 执行买入操作

```tsx
const { buy, canBuy } = usePaperTrading({ agentId: 'agent_1' })

function handleBuy() {
  const symbol = 'BTC/USDT'
  const size = 0.1 // 0.1 BTC
  const currentPrice = 50000

  // 检查是否可以买入
  const check = canBuy(symbol, size, currentPrice)
  if (!check.can) {
    console.error(check.reason)
    return
  }

  // 执行买入
  const result = buy(symbol, size, currentPrice)
  if (result.success) {
    console.log('买入成功', result.trade)
  } else {
    console.error('买入失败', result.error)
  }
}
```

### 3. 执行卖出操作

```tsx
const { sell, canSell } = usePaperTrading({ agentId: 'agent_1' })

function handleSell() {
  const symbol = 'BTC/USDT'
  const size = 0.1
  const currentPrice = 51000

  // 检查是否可以卖出
  const check = canSell(symbol, size)
  if (!check.can) {
    console.error(check.reason)
    return
  }

  // 执行卖出
  const result = sell(symbol, size, currentPrice)
  if (result.success) {
    console.log('卖出成功', result.trade)
    console.log('已实现盈亏:', result.trade?.realizedPnl, 'USDT')
  }
}
```

### 4. 更新持仓价格

```tsx
const { updatePrice, account } = usePaperTrading({ agentId: 'agent_1' })

// 实时更新 BTC 价格
useEffect(() => {
  const ws = new WebSocket('wss://stream.binance.com/ws/btcusdt@ticker')

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    const price = parseFloat(data.c) // 最新成交价
    updatePrice('BTC/USDT', price)
  }

  return () => ws.close()
}, [updatePrice])

// 查看未实现盈亏
const btcPosition = account?.positions.find(p => p.symbol === 'BTC/USDT')
console.log('未实现盈亏:', btcPosition?.unrealizedPnl, 'USDT')
```

### 5. 查看账户统计

```tsx
const { stats } = usePaperTrading({ agentId: 'agent_1' })

return (
  <div>
    <div>总资产: {stats?.totalEquity} USDT</div>
    <div>总盈亏: {stats?.totalPnl} USDT ({stats?.totalPnlPercent}%)</div>
    <div>未实现盈亏: {stats?.unrealizedPnl} USDT</div>
    <div>已实现盈亏: {stats?.realizedPnl} USDT</div>
    <div>胜率: {stats?.winRate}%</div>
    <div>总交易次数: {stats?.totalTrades}</div>
    <div>总手续费: {stats?.totalFees} USDT</div>
  </div>
)
```

---

## API 参考

### usePaperTrading Hook

#### 参数

```typescript
interface UsePaperTradingOptions {
  accountId?: string        // 账户 ID
  agentId?: string          // Agent ID (自动查找账户)
  autoUpdatePrices?: boolean // 是否自动更新价格
  priceUpdateInterval?: number // 价格更新间隔 (ms)
}
```

#### 返回值

```typescript
interface UsePaperTradingReturn {
  // 账户信息
  account: PaperAccount | null
  accountId: string | null
  stats: PaperAccountStats | null

  // 账户操作
  initAccount: (agentId: string, initialCapital: number) => string
  deleteAccount: (accountId: string) => void
  setActiveAccount: (accountId: string | null) => void

  // 交易操作
  buy: (symbol: string, size: number, currentPrice: number) => PlaceOrderResult
  sell: (symbol: string, size: number, currentPrice: number) => PlaceOrderResult
  closePosition: (positionId: string, currentPrice: number) => ClosePositionResult
  closeAllPositions: (currentPrices: Record<string, number>) => ClosePositionResult[]

  // 持仓更新
  updatePrice: (symbol: string, currentPrice: number) => void
  updateAllPrices: (priceMap: Record<string, number>) => void

  // 便捷方法
  getPositionBySymbol: (symbol: string) => PaperPosition | undefined
  hasPosition: (symbol: string) => boolean
  canBuy: (symbol: string, size: number, price: number) => { can: boolean; reason?: string }
  canSell: (symbol: string, size: number) => { can: boolean; reason?: string }

  // 状态
  loading: boolean
  error: string | null
}
```

---

## 数据结构

### PaperAccount

```typescript
interface PaperAccount {
  id: string
  agentId: string
  initialCapital: number        // 初始资金
  currentBalance: number         // 当前余额
  positions: PaperPosition[]     // 持仓列表
  trades: PaperTrade[]          // 交易记录
  createdAt: number
  updatedAt: number
}
```

### PaperPosition

```typescript
interface PaperPosition {
  id: string
  symbol: string                 // 交易对
  side: 'long' | 'short'        // 方向
  size: number                   // 持仓数量
  entryPrice: number             // 开仓均价
  currentPrice: number           // 当前市价
  unrealizedPnl: number          // 未实现盈亏 (USDT)
  unrealizedPnlPercent: number   // 未实现盈亏百分比
  openedAt: number
  updatedAt: number
}
```

### PaperTrade

```typescript
interface PaperTrade {
  id: string
  accountId: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  size: number
  price: number
  fee: number                    // 手续费 (USDT)
  feeRate: number                // 手续费率 (0.001 = 0.1%)
  total: number                  // 总成本/收益 (含手续费)
  realizedPnl?: number           // 已实现盈亏 (平仓时)
  timestamp: number
}
```

### PaperAccountStats

```typescript
interface PaperAccountStats {
  accountId: string
  totalEquity: number            // 总资产 (余额 + 持仓价值)
  totalPnl: number               // 总盈亏 (USDT)
  totalPnlPercent: number        // 总盈亏百分比
  unrealizedPnl: number          // 未实现盈亏
  realizedPnl: number            // 已实现盈亏
  totalTrades: number            // 总交易次数
  winTrades: number              // 盈利次数
  lossTrades: number             // 亏损次数
  winRate: number                // 胜率 (%)
  maxDrawdown: number            // 最大回撤 (%)
  avgWin: number                 // 平均盈利 (USDT)
  avgLoss: number                // 平均亏损 (USDT)
  totalFees: number              // 总手续费 (USDT)
}
```

---

## 交易规则

### 手续费

- 默认手续费率: **0.1% (Taker Fee)**
- 买入手续费: `订单金额 × 0.001`
- 卖出手续费: `订单金额 × 0.001`

### 最小订单金额

- 最小订单金额: **10 USDT**

### 盈亏计算

#### 未实现盈亏 (Long)

```
未实现盈亏 = (当前价格 - 开仓价格) × 持仓数量
盈亏百分比 = (未实现盈亏 / (开仓价格 × 持仓数量)) × 100
```

#### 已实现盈亏 (Long)

```
已实现盈亏 = (平仓价格 - 开仓价格) × 平仓数量 - 平仓手续费
```

---

## 状态持久化

Paper Trading 状态会自动持久化到 localStorage：

```typescript
// 存储键
localStorage['paper-trading-storage']

// 存储内容
{
  state: {
    accounts: PaperAccount[],
    activeAccountId: string | null
  },
  version: 0
}
```

### 清除持久化数据

```typescript
const { reset } = usePaperTradingStore()
reset()
```

---

## 最佳实践

### 1. 实时价格更新

建议使用 WebSocket 实时更新持仓价格：

```tsx
useEffect(() => {
  if (!account) return

  const symbols = account.positions.map(p => p.symbol)
  const ws = connectToExchangeWebSocket(symbols)

  ws.onPriceUpdate((symbol, price) => {
    updatePrice(symbol, price)
  })

  return () => ws.close()
}, [account, updatePrice])
```

### 2. 批量更新价格

如果持有多个币种，使用批量更新提升性能：

```tsx
const priceMap = {
  'BTC/USDT': 50000,
  'ETH/USDT': 3000,
  'SOL/USDT': 100
}

updateAllPrices(priceMap)
```

### 3. 错误处理

始终检查交易结果：

```tsx
const result = buy('BTC/USDT', 0.1, 50000)

if (!result.success) {
  // 显示错误提示
  toast.error(result.error)
  return
}

// 成功后的处理
toast.success('买入成功')
```

### 4. 交易前验证

使用 `canBuy`/`canSell` 提前验证：

```tsx
const check = canBuy('BTC/USDT', 0.1, 50000)

if (!check.can) {
  // 禁用买入按钮
  return <Button disabled>{check.reason}</Button>
}

return <Button onClick={handleBuy}>买入</Button>
```

---

## 示例场景

### 场景 1: 简单买卖

```tsx
// 初始化账户
const accountId = initAccount('agent_1', 10000)

// 买入 BTC
buy('BTC/USDT', 0.1, 50000)
// 余额: 10000 - 5000 - 5 = 4995 USDT
// 持仓: 0.1 BTC @ 50000

// 卖出 BTC (盈利)
sell('BTC/USDT', 0.1, 51000)
// 余额: 4995 + 5100 - 5.1 = 10089.9 USDT
// 已实现盈亏: 89.9 USDT
```

### 场景 2: 部分平仓

```tsx
// 买入 1 BTC
buy('BTC/USDT', 1, 50000)

// 部分卖出 0.5 BTC
sell('BTC/USDT', 0.5, 51000)
// 剩余持仓: 0.5 BTC @ 50000

// 再卖出 0.5 BTC
sell('BTC/USDT', 0.5, 52000)
// 持仓完全平仓
```

### 场景 3: 多币种持仓

```tsx
// 买入多个币种
buy('BTC/USDT', 0.1, 50000)
buy('ETH/USDT', 2, 3000)
buy('SOL/USDT', 50, 100)

// 批量更新价格
updateAllPrices({
  'BTC/USDT': 51000,
  'ETH/USDT': 3100,
  'SOL/USDT': 105
})

// 查看总未实现盈亏
console.log(stats?.unrealizedPnl)
```

---

## 故障排除

### 问题 1: 余额不足

**错误**: "余额不足"

**原因**: 可用余额 < 订单金额 + 手续费

**解决**: 检查 `account.currentBalance` 是否足够

### 问题 2: 持仓不足

**错误**: "持仓不足"

**原因**: 尝试卖出的数量 > 当前持仓数量

**解决**: 使用 `getPositionBySymbol` 检查持仓数量

### 问题 3: 订单金额不足

**错误**: "订单金额不足 10 USDT"

**原因**: 订单总金额 < 10 USDT

**解决**: 增加订单数量或选择价格更高的币种

---

## 后续改进

- [ ] 支持限价单
- [ ] 支持止损/止盈
- [ ] 历史权益曲线数据
- [ ] 更精确的最大回撤计算
- [ ] 滑点模拟
- [ ] 杠杆交易支持

---

**最后更新**: 2025-12-26
**维护者**: Delta Terminal 开发团队
