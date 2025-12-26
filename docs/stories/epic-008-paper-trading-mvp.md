# EPIC-008: Paper Trading MVP - Brownfield Enhancement

## Epic Goal

实现基础的 Paper Trading（模拟交易）功能，让用户能够使用虚拟资金在 Hyperliquid 市场数据上进行模拟交易，验证策略效果而不承担真实资金风险。

## Epic Description

### Existing System Context

- **Current relevant functionality**:
  - DeployCanvas 已支持 Paper 模式 UI 配置
  - RiskSettings 组件已实现风险参数设置
  - useDeployment Hook 已有部署流程框架
  - Agent Store 支持 virtualCapital 字段
  - Monitor Store 已定义监控数据结构

- **Technology stack**:
  - Frontend: Next.js 15, React 19, TypeScript, Zustand
  - UI: TailwindCSS, Shadcn/ui, Canvas 组件系统
  - Data: Hyperliquid REST/WebSocket API

- **Integration points**:
  - DeployCanvas → Paper Trading Engine
  - Agent Store → 虚拟账户状态
  - Monitor Store → 实时 P&L 数据

### Enhancement Details

- **What's being added**:
  1. Hyperliquid 市场数据服务（价格获取）
  2. 虚拟账户系统（余额、持仓管理）
  3. 模拟订单执行引擎（买入/卖出）
  4. Paper Trading 监控面板集成

- **How it integrates**:
  - 复用现有 DeployCanvas Paper 模式触发
  - 扩展 Agent Store 管理虚拟账户状态
  - 通过 Monitor Store 显示实时数据
  - 使用现有 A2UI 模式展示交易结果

- **Success criteria**:
  - 用户可以从 DeployCanvas 启动 Paper Trading
  - 能够执行模拟买入/卖出操作
  - 实时显示虚拟持仓和未实现盈亏
  - 价格数据来自 Hyperliquid 真实市场

---

## Stories

### Story 1: Hyperliquid 市场数据服务

**目标**: 建立与 Hyperliquid 的数据连接，获取实时价格

**范围**:
- 创建 Hyperliquid API 客户端
- 实现价格查询接口
- 支持主流交易对（BTC, ETH 等）
- 前端价格显示组件

**验收标准**:
- [ ] 能够获取 BTC-PERP, ETH-PERP 实时价格
- [ ] 价格更新延迟 < 5 秒
- [ ] API 错误有友好提示
- [ ] 价格数据可在 UI 中显示

**技术要点**:
- Hyperliquid Info API: `https://api.hyperliquid.xyz/info`
- 使用 POST 请求获取 mid price
- 无需 API Key（公开数据）

---

### Story 2: 虚拟账户与模拟订单系统

**目标**: 实现虚拟资金管理和模拟订单执行

**范围**:
- 虚拟账户状态管理（余额、持仓）
- 模拟市价单执行逻辑
- 持仓 P&L 实时计算
- 与现有 DeployCanvas 集成

**验收标准**:
- [ ] 从 DeployCanvas 启动后初始化虚拟账户
- [ ] 支持模拟买入/卖出市价单
- [ ] 持仓数据正确更新
- [ ] 未实现盈亏根据实时价格计算
- [ ] 账户状态持久化（localStorage/Zustand persist）

**技术要点**:
- 扩展 Agent Store 或创建 PaperTradingStore
- 订单执行使用当前 Hyperliquid mid price
- 简化手续费计算（0.1% taker fee）

---

### Story 3: Paper Trading 监控与交互 (Optional)

**目标**: 提供交易操作界面和监控面板

**范围**:
- 交易操作 UI（下单表单）
- 持仓列表显示
- P&L 汇总面板
- 交易历史记录

**验收标准**:
- [ ] 用户可以通过 UI 执行模拟交易
- [ ] 持仓列表显示所有虚拟持仓
- [ ] 总资产和收益率实时更新
- [ ] 最近交易记录可查看

**技术要点**:
- 复用/扩展 MonitorCanvas 组件
- 集成现有 InsightCard 展示交易结果
- 使用 A2UI 模式通过 AI 对话触发交易

---

## Compatibility Requirements

- [x] 现有 DeployCanvas API 保持不变
- [x] Agent Store 结构向后兼容（仅扩展字段）
- [x] UI 变更遵循现有 Canvas 组件模式
- [x] 不影响现有回测功能

## Risk Mitigation

- **Primary Risk**: Hyperliquid API 不稳定或变更
- **Mitigation**:
  - 添加 API 错误重试机制
  - 缓存最近价格作为 fallback
  - 抽象数据源接口便于切换
- **Rollback Plan**:
  - Paper Trading 功能完全独立
  - 可通过 feature flag 禁用
  - 不影响现有系统任何功能

## Definition of Done

- [ ] Story 1 & 2 完成（Story 3 可选）
- [ ] 现有回测和部署功能正常
- [ ] Paper Trading 完整流程可运行
- [ ] 基本错误处理和用户提示
- [ ] 代码遵循项目现有规范

---

## Technical Notes

### Hyperliquid API 参考

```typescript
// 获取 Mid Price
POST https://api.hyperliquid.xyz/info
Body: { "type": "allMids" }
Response: { "BTC": "42150.5", "ETH": "2250.3", ... }

// 获取单个资产信息
POST https://api.hyperliquid.xyz/info
Body: { "type": "meta" }
```

### 虚拟账户数据结构

```typescript
interface PaperAccount {
  id: string
  agentId: string
  initialCapital: number
  currentBalance: number
  positions: PaperPosition[]
  trades: PaperTrade[]
  createdAt: number
  updatedAt: number
}

interface PaperPosition {
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  realizedPnl: number
}

interface PaperTrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price: number
  fee: number
  timestamp: number
}
```

---

## Story Manager Handoff

> **Story Manager Handoff:**
>
> "Please develop detailed user stories for this brownfield epic. Key considerations:
>
> - This is an enhancement to an existing system running Next.js 15 + React 19 + TypeScript
> - Integration points: DeployCanvas, Agent Store, Monitor Store
> - Existing patterns to follow: Canvas 组件模式, A2UI 交互模式, Zustand Store 模式
> - Critical compatibility requirements: 不影响现有回测和部署功能
> - Each story must include verification that existing functionality remains intact
>
> The epic should maintain system integrity while delivering Paper Trading MVP functionality."

---

**Created**: 2025-12-26
**Status**: Draft
**Priority**: High
**Estimated Stories**: 2-3
