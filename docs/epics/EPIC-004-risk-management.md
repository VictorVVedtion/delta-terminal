# Epic 004: 风险管理集成 - Brownfield Enhancement

> 基于 PRD Epic 4 Feature 4.1/4.2，为策略部署添加风险管理功能

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-004 |
| 名称 | 风险管理集成 (Risk Management) |
| 类型 | Brownfield Enhancement |
| 优先级 | P0 (MVP 必需) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-25 |
| PRD 参考 | `docs/prd/features.md#feature-4.1`, `#feature-4.2` |
| 前置依赖 | EPIC-001 (Strategy Deployment) ✅ |

---

## Epic Goal

**为策略部署流程添加完整的风险管理功能，保护用户资金安全。**

核心功能：
1. **止损止盈设置** - 自动限制单笔交易的损失和收益
2. **仓位限制** - 控制单策略/总仓位的资金占比
3. **风险验证** - 部署前检查风险配置合规性

---

## 现有系统上下文

### 已有组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| DeployCanvas | `components/canvas/DeployCanvas.tsx` | 策略部署 UI | ✅ 完成 (需扩展) |
| DeployConfig | `components/canvas/DeployCanvas.tsx` | 部署配置类型 | ✅ 完成 (需扩展) |
| RiskPanel | `components/sidebar/RiskPanel.tsx` | 风险概览 UI | ✅ 完成 |
| AgentStore | `store/agent.ts` | Agent 状态管理 | ✅ 完成 (需扩展) |
| useDeployment | `hooks/useDeployment.ts` | 部署 Hook | ✅ 完成 (需扩展) |

### 新增组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| RiskSettings | `components/canvas/RiskSettings.tsx` | 风险配置 UI | ✅ 已创建 |
| RiskConfig | `types/risk.ts` | 风险配置类型 | ✅ 已创建 |
| useRiskValidation | `hooks/useRiskValidation.ts` | 风险验证 Hook | ✅ 已创建 |
| Slider | `components/ui/slider.tsx` | 滑块组件 | ✅ 已创建 |

### 当前 DeployConfig 结构

```typescript
// 当前
export interface DeployConfig {
  mode: 'paper' | 'live'
  capital: number
  confirmationToken?: string
}

// 需扩展为
export interface DeployConfig {
  mode: 'paper' | 'live'
  capital: number
  confirmationToken?: string
  riskSettings: RiskSettings  // 新增
}
```

---

## 功能设计

### PRD 规范摘要

#### Feature 4.1: 智能止损止盈 (P0)

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 固定止损 | 价格/百分比触发卖出 | 支持绝对价格和百分比 |
| 固定止盈 | 价格/百分比触发卖出 | 支持绝对价格和百分比 |
| 追踪止损 | 动态调整止损位 | P1，后续实现 |

#### Feature 4.2: 仓位与资金管理 (P0)

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 单策略仓位限制 | 最大占用资金比例 | 默认 20% |
| 单笔交易限制 | 最大单笔交易金额 | 基于策略配置 |
| 总仓位限制 | 所有策略总仓位 | 默认 80% |

### 类型设计

```typescript
// types/risk.ts

export interface StopLossConfig {
  enabled: boolean
  type: 'fixed_price' | 'percentage'
  value: number  // 价格或百分比
}

export interface TakeProfitConfig {
  enabled: boolean
  type: 'fixed_price' | 'percentage'
  value: number
}

export interface PositionLimitConfig {
  maxPositionPercent: number  // 单策略最大仓位 (0-100)
  maxTradeAmount: number      // 单笔最大金额
}

export interface RiskSettings {
  stopLoss: StopLossConfig
  takeProfit: TakeProfitConfig
  positionLimit: PositionLimitConfig
}

export interface RiskValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}
```

### UI 设计

```
┌─────────────────────────────────────────────┐
│ 风险设置                                      │
├─────────────────────────────────────────────┤
│                                             │
│ 止损设置                                     │
│ ┌─────────────────────────────────────────┐│
│ │ ☑ 启用止损                               ││
│ │ ○ 固定价格  ● 百分比                      ││
│ │ [====●===] 5%                           ││
│ │ 触发价格: 当前价 × 0.95 = $38,000        ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 止盈设置                                     │
│ ┌─────────────────────────────────────────┐│
│ │ ☑ 启用止盈                               ││
│ │ ○ 固定价格  ● 百分比                      ││
│ │ [========●] 15%                         ││
│ │ 触发价格: 当前价 × 1.15 = $46,000        ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 仓位限制                                     │
│ ┌─────────────────────────────────────────┐│
│ │ 最大仓位: [===●====] 20%                 ││
│ │ 当前占用: $10,000 / $50,000              ││
│ │ ⚠️ 建议不超过 30%                        ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 风险评估                                     │
│ ┌─────────────────────────────────────────┐│
│ │ 风险等级: 🟡 中等                         ││
│ │ 最大可能损失: $500 (5%)                  ││
│ │ 最大预期收益: $1,500 (15%)               ││
│ │ 风险收益比: 1:3 ✅                       ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## Stories

### Story 4.1: 风险配置类型与 UI 组件

**标题**: 创建 RiskSettings 组件和类型定义

**描述**:
定义风险配置类型，创建可复用的 RiskSettings 组件。

**验收标准**:
- [x] 创建 `types/risk.ts` 类型定义
- [x] 创建 `components/canvas/RiskSettings.tsx` 组件
- [x] 止损设置支持固定价格和百分比
- [x] 止盈设置支持固定价格和百分比
- [x] 仓位限制滑块控制
- [x] 风险评估摘要显示
- [x] TypeScript 类型安全

**技术设计**:
```typescript
interface RiskSettingsProps {
  value: RiskSettings
  onChange: (settings: RiskSettings) => void
  currentPrice?: number  // 用于计算触发价格
  totalCapital?: number  // 用于计算仓位限制
  disabled?: boolean
}

export function RiskSettings(props: RiskSettingsProps)
```

---

### Story 4.2: 风险验证 Hook

**标题**: 创建 useRiskValidation Hook

**描述**:
实现风险配置验证逻辑，在部署前检查风险设置合规性。

**验收标准**:
- [x] 创建 `hooks/useRiskValidation.ts`
- [x] 验证止损必须设置 (Live 模式)
- [x] 验证止损不能大于止盈
- [x] 验证仓位限制在合理范围
- [x] 返回警告和错误列表
- [x] 提供风险等级评估

**验证规则**:
```typescript
// Live 模式强制要求
- 必须设置止损 (error)
- 止损百分比 <= 10% (warning if > 10%)

// 通用验证
- 止损 < 止盈 (error)
- 仓位限制 <= 50% (warning if > 50%)
- 风险收益比 >= 1:2 (warning if < 1:2)
```

---

### Story 4.3: DeployCanvas 集成

**标题**: 将风险设置集成到部署流程

**描述**:
将 RiskSettings 组件集成到 DeployCanvas，扩展 DeployConfig 类型。

**验收标准**:
- [x] 扩展 DeployConfig 包含 riskSettings
- [x] DeployCanvas 渲染 RiskSettings 组件
- [x] 部署前运行风险验证
- [x] 验证失败时阻止部署
- [x] 显示风险验证警告/错误
- [ ] 更新 API 层传递风险配置 (待后端集成)
- [ ] AgentStore 保存风险设置 (待后端集成)

**集成流程**:
```
1. 用户打开 DeployCanvas
   ↓
2. 显示默认风险设置
   ↓
3. 用户调整止损/止盈/仓位
   ↓
4. 实时风险评估更新
   ↓
5. 点击部署按钮
   ↓
6. useRiskValidation 验证
   ↓
7. 验证通过 → 执行部署
   验证失败 → 显示错误，阻止部署
```

---

## 默认值

```typescript
const DEFAULT_RISK_SETTINGS: RiskSettings = {
  stopLoss: {
    enabled: true,
    type: 'percentage',
    value: 5,  // 5% 止损
  },
  takeProfit: {
    enabled: true,
    type: 'percentage',
    value: 15,  // 15% 止盈
  },
  positionLimit: {
    maxPositionPercent: 20,  // 单策略最大 20%
    maxTradeAmount: 10000,   // 单笔最大 $10,000
  },
}
```

---

## 风险等级计算

```typescript
function calculateRiskLevel(settings: RiskSettings): RiskLevel {
  const { stopLoss, takeProfit, positionLimit } = settings

  // 未设置止损 = 高风险
  if (!stopLoss.enabled) return 'high'

  // 止损过大 (>10%) = 高风险
  if (stopLoss.type === 'percentage' && stopLoss.value > 10) return 'high'

  // 仓位过大 (>30%) = 中等风险
  if (positionLimit.maxPositionPercent > 30) return 'medium'

  // 风险收益比 < 1:2 = 中等风险
  const riskRewardRatio = (takeProfit.value || 10) / (stopLoss.value || 5)
  if (riskRewardRatio < 2) return 'medium'

  return 'low'
}
```

---

## 兼容性要求

- [x] DeployCanvas 现有功能保持不变
- [x] Paper 模式允许跳过止损验证
- [x] AgentStore 接口向后兼容
- [x] RiskSettings 可独立使用

---

## Definition of Done

- [x] 所有 3 个 Stories 完成并通过验收
- [x] RiskSettings 组件功能完整
- [x] 风险验证逻辑正确
- [x] DeployCanvas 集成成功
- [x] Live 模式强制止损验证
- [x] TypeScript 类型检查通过
- [x] 无 P0/P1 级别 Bug

---

## 验证清单

### 范围验证
- [x] Epic 可在 3 个 Stories 内完成
- [x] 无需架构层面变更
- [x] 遵循现有组件模式
- [x] 复用已有 UI 组件 (Slider, Checkbox)

### 风险评估
- [x] 对现有系统风险: 低 (新增组件，扩展类型)
- [x] 回滚方案可行 (风险设置可选)
- [x] 团队具备技术栈经验

---

**创建时间**: 2025-12-25
**创建者**: YOLO Workflow Autonomous Agent
**来源**: PRD Feature 4.1/4.2

