# Epic 4: A2UI 系统 (Agent-to-UI)

> **Epic ID**: EPIC-004
> **优先级**: P0
> **预估工时**: 8-10 周
> **负责人**: 前端 + AI 团队

---

## Epic 概述

### 目标

实现 A2UI (Agent-to-UI) 核心系统，使 AI 返回可交互的结构化配置而非纯文本，从根本上改变用户与 AI 的交互方式。

### 核心价值

- **用户**: 从"手动配置"变成"审批决策"，降低使用门槛
- **产品**: 差异化竞争优势，建立技术壁垒
- **业务**: 提升策略创建成功率和用户留存

### 成功指标

| 指标 | 目标值 | 测量方式 |
|-----|--------|---------|
| 策略创建成功率 | ≥ 90% | 创建成功数/尝试创建数 |
| 首次策略创建时间 | < 5 分钟 | 从开始对话到批准 |
| 用户满意度 | ≥ 4.5/5 | 策略创建后评分 |
| InsightCard 点击率 | ≥ 80% | 点击数/展示数 |

---

## 依赖关系

### 前置依赖

- [x] EPIC-001: 基础架构 (用户认证、基础 UI)
- [x] EPIC-003: AI 对话核心 (NLP Processor)

### 被依赖

- EPIC-005: 高级风控 (依赖 risk_alert 类型)
- EPIC-006: 策略市场 (依赖 InsightCard 组件)

---

## Story 清单

### Sprint 1: 核心数据结构 + InsightCard (2 周)

---

#### Story 4.1: InsightData 类型定义

**Story ID**: DELTA-401
**优先级**: P0
**工时**: 3d
**负责人**: 前端 + 后端

**用户故事**:
> 作为开发者，我需要完整的 InsightData TypeScript 类型定义，以便前后端使用一致的数据结构。

**验收标准**:
- [ ] 定义 `InsightData` 接口及所有子类型
- [ ] 定义 `InsightParam` 多态控件类型
- [ ] 定义 `Constraint` 约束类型
- [ ] 定义 `ImpactMetric` 影响指标类型
- [ ] 类型定义放在 `shared/common-types` 中
- [ ] 包含完整的 JSDoc 注释

**技术设计**:
```typescript
// shared/common-types/src/insight.ts
export interface InsightData {
  id: string;
  type: InsightType;
  target?: InsightTarget;
  params: InsightParam[];
  evidence?: InsightEvidence;
  impact?: InsightImpact;
  explanation: string;
  createdAt: string;
}

export type InsightType =
  | "strategy_create"
  | "strategy_modify"
  | "batch_adjust"
  | "risk_alert";

// ... 完整定义
```

**测试要点**:
- [ ] 类型编译通过
- [ ] 示例数据符合类型定义

---

#### Story 4.2: AI 引擎 InsightData 生成

**Story ID**: DELTA-402
**优先级**: P0
**工时**: 5d
**负责人**: AI 团队

**用户故事**:
> 作为用户，当我请求创建策略时，AI 应该返回结构化的 InsightData 而非纯文本建议。

**验收标准**:
- [ ] 用户输入"创建 RSI 策略"返回 `strategy_create` 类型
- [ ] 用户输入"调整止损"返回 `strategy_modify` 类型
- [ ] 包含完整的 params、evidence、impact 字段
- [ ] explanation 字段提供自然语言解释
- [ ] 非策略请求仍返回纯文本

**技术设计**:
- 修改 `ai-engine/nlp-processor` 的输出格式
- 新增 InsightData 生成 Prompt
- 新增 `InsightBuilder` 服务类

**API 变更**:
```typescript
// POST /api/v1/ai/chat
// Response
{
  "message": "好的，我为你设计了一个 RSI 策略：",
  "insight": InsightData | null  // 新增字段
}
```

---

#### Story 4.3: InsightCard 基础组件

**Story ID**: DELTA-403
**优先级**: P0
**工时**: 3d
**负责人**: 前端

**用户故事**:
> 作为用户，我希望在聊天中看到策略提案的紧凑卡片，一眼了解关键信息。

**验收标准**:
- [ ] 卡片包含 Header (图标 + 标题 + Badge)
- [ ] 卡片包含 Body (关键指标预览)
- [ ] 卡片包含 Footer (提示文字 + 箭头)
- [ ] 不同类型卡片有不同配色
- [ ] 点击卡片触发 `onExpand` 事件
- [ ] Hover 状态有视觉反馈

**组件 Props**:
```typescript
interface InsightCardProps {
  insight: InsightData;
  onExpand: () => void;
  className?: string;
}
```

**设计规范**:
| 类型 | Badge | 图标背景色 |
|------|-------|-----------|
| strategy_create | 蓝色 "新建" | var(--rb-cyan-dim) |
| strategy_modify | 黄色 "修改" | var(--accent-yellow-dim) |
| batch_adjust | 紫色 "批量" | var(--accent-purple-dim) |
| risk_alert | 红色 "紧急" | var(--accent-red-dim) |

---

#### Story 4.4: Chat 集成 InsightCard

**Story ID**: DELTA-404
**优先级**: P0
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，当 AI 返回策略提案时，消息中应该显示 InsightCard 而非纯文本。

**验收标准**:
- [ ] AI 消息包含 insight 时渲染 InsightCard
- [ ] 纯文本消息正常显示
- [ ] InsightCard 在消息流中样式协调
- [ ] 支持一条消息包含多个 InsightCard

**技术设计**:
- 修改 `ChatMessage` 组件
- 新增 insight 渲染分支

---

### Sprint 2: Proposal Canvas + 基础控件 (2 周)

---

#### Story 4.5: Canvas 面板框架

**Story ID**: DELTA-405
**优先级**: P0
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，点击 InsightCard 后，右侧应该展开一个 Canvas 面板显示详细信息。

**验收标准**:
- [ ] Canvas 从右侧滑入动画
- [ ] 包含 Header (标题 + Tab + 关闭按钮)
- [ ] 包含可滚动的 Body 区域
- [ ] 包含固定的 Footer 操作区
- [ ] 响应式宽度 (桌面 560px)
- [ ] 点击关闭或遮罩层关闭

**组件结构**:
```tsx
<Canvas>
  <CanvasHeader>
    <CanvasTitle />
    <CanvasTabs /> {/* 可选 */}
    <CanvasClose />
  </CanvasHeader>
  <CanvasBody>
    {children}
  </CanvasBody>
  <CanvasFooter>
    {actions}
  </CanvasFooter>
</Canvas>
```

---

#### Story 4.6: Proposal Canvas 实现

**Story ID**: DELTA-406
**优先级**: P0
**工时**: 4d
**负责人**: 前端

**用户故事**:
> 作为用户，在 Proposal Canvas 中我应该能看到完整的策略配置、证据图表和影响预估。

**验收标准**:
- [ ] 策略信息区: 名称 + 类型 + 交易对
- [ ] L1 参数区: 核心参数直接展示
- [ ] L2 参数区: 高级参数折叠展示
- [ ] 证据区: K 线图 + 回测曲线 (占位图)
- [ ] 影响区: 4 宫格指标展示
- [ ] AI 解释区: explanation 文本
- [ ] 操作按钮: [拒绝] [批准]

**布局结构**:
```
┌─────────────────────────────┐
│ Header: RSI 策略 [新建]     │
├─────────────────────────────┤
│ Section: 核心参数           │
│   [Slider] RSI 周期: 14     │
│   [ButtonGroup] 方向: 做多  │
│   [Slider] 止损: -2%        │
├─────────────────────────────┤
│ Section: 高级参数 [展开 ▼]  │
├─────────────────────────────┤
│ Section: 回测证据           │
│   [Chart Placeholder]       │
├─────────────────────────────┤
│ Section: 影响预估           │
│   +24.5%  68%  -8.2%  1.5   │
├─────────────────────────────┤
│ Section: AI 解释            │
│   "基于过去90天数据..."     │
├─────────────────────────────┤
│ Footer: [拒绝] [批准]       │
└─────────────────────────────┘
```

---

#### Story 4.7: Slider 控件

**Story ID**: DELTA-407
**优先级**: P0
**工时**: 1d
**负责人**: 前端

**用户故事**:
> 作为用户，我需要一个滑块控件来调整数值范围参数。

**验收标准**:
- [ ] 显示 label + 当前值 + 单位
- [ ] 支持拖动和点击轨道
- [ ] 支持 min/max/step 配置
- [ ] 支持禁用状态
- [ ] 支持错误状态 (红色边框)
- [ ] 值变更触发 onChange

**组件 Props**:
```typescript
interface ParamSliderProps {
  param: InsightParam;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}
```

---

#### Story 4.8: Button Group 控件

**Story ID**: DELTA-408
**优先级**: P0
**工时**: 0.5d
**负责人**: 前端

**验收标准**:
- [ ] 水平排列选项按钮
- [ ] 选中状态品牌色高亮
- [ ] 支持单选模式

---

#### Story 4.9: Toggle 控件

**Story ID**: DELTA-409
**优先级**: P0
**工时**: 0.5d
**负责人**: 前端

**验收标准**:
- [ ] 开关样式
- [ ] 开启绿色，关闭灰色
- [ ] 过渡动画

---

#### Story 4.10: Number Input 控件

**Story ID**: DELTA-410
**优先级**: P0
**工时**: 0.5d
**负责人**: 前端

**验收标准**:
- [ ] 数字输入框
- [ ] 支持 min/max 验证
- [ ] 支持单位后缀

---

### Sprint 3: 约束系统 + 批准流程 (2 周)

---

#### Story 4.11: 约束系统实现

**Story ID**: DELTA-411
**优先级**: P0
**工时**: 3d
**负责人**: 前端

**用户故事**:
> 作为用户，当我设置的止损大于止盈时，系统应该提示错误并阻止提交。

**验收标准**:
- [ ] 支持 min_max 范围约束
- [ ] 支持 dependency 依赖约束 (止损 < 止盈)
- [ ] 支持 mutual_exclusive 互斥约束
- [ ] 违反约束时控件显示错误状态
- [ ] 显示具体错误信息
- [ ] 有错误时禁用批准按钮

**实现要点**:
```typescript
// hooks/useParamValidation.ts
function useParamValidation(params: InsightParam[], values: Map<string, any>) {
  // 返回 errors: Map<string, string>
}
```

---

#### Story 4.12: 参数编辑状态管理

**Story ID**: DELTA-412
**优先级**: P0
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，我对参数的修改应该被保存，在批准时使用修改后的值。

**验收标准**:
- [ ] 创建 InsightStore (Zustand)
- [ ] 保存当前 activeInsight
- [ ] 保存 editedParams Map
- [ ] 提供 updateParam action
- [ ] 提供 resetParams action

---

#### Story 4.13: 策略批准 API

**Story ID**: DELTA-413
**优先级**: P0
**工时**: 3d
**负责人**: 后端

**用户故事**:
> 作为用户，点击批准按钮后，系统应该创建策略并返回结果。

**验收标准**:
- [ ] 接收 insightId + 修改后的 params
- [ ] 服务端二次验证参数
- [ ] 创建策略记录
- [ ] 返回策略 ID 和状态
- [ ] 失败时返回具体错误

**API 设计**:
```typescript
// POST /api/v1/strategies/from-insight
Request: {
  insightId: string;
  params: Record<string, any>;
}
Response: {
  strategyId: string;
  status: "draft" | "backtesting";
  message: string;
}
```

---

#### Story 4.14: 批准流程前端集成

**Story ID**: DELTA-414
**优先级**: P0
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，点击批准后应该看到加载状态，成功后关闭 Canvas 并显示成功提示。

**验收标准**:
- [ ] 点击批准显示 loading 状态
- [ ] 成功后关闭 Canvas
- [ ] 显示成功 Toast
- [ ] Chat 中更新 InsightCard 状态
- [ ] 失败时显示错误信息

---

### Sprint 4: 影响预估 + 实时回测 (2 周)

---

#### Story 4.15: Impact 指标展示

**Story ID**: DELTA-415
**优先级**: P1
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，我需要看到策略的预估收益、胜率、回撤等指标。

**验收标准**:
- [ ] 4 宫格布局展示指标
- [ ] 显示数值 + 变化趋势 (上升/下降)
- [ ] 修改策略时显示新旧对比
- [ ] 颜色编码 (收益绿、回撤红)

---

#### Story 4.16: 快速回测 API

**Story ID**: DELTA-416
**优先级**: P1
**工时**: 4d
**负责人**: 后端

**用户故事**:
> 作为用户，当我调整参数时，系统应该快速返回新的回测结果。

**验收标准**:
- [ ] 接收策略参数
- [ ] 使用最近 90 天数据快速回测
- [ ] 返回关键指标和收益曲线
- [ ] 响应时间 < 2s

**API 设计**:
```typescript
// POST /api/v1/backtest/quick
Request: {
  symbol: string;
  timeframe: string;
  params: Record<string, any>;
  days?: number; // 默认 90
}
Response: {
  metrics: ImpactMetric[];
  equityCurve: { timestamp: number; value: number }[];
}
```

---

#### Story 4.17: 实时回测前端集成

**Story ID**: DELTA-417
**优先级**: P1
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，调整参数后应该自动更新回测结果。

**验收标准**:
- [ ] 参数变更 debounce 500ms
- [ ] 触发快速回测 API
- [ ] 显示 loading 指示器
- [ ] 更新 Impact 区域

---

### Sprint 5: 高级控件 + Monitor Canvas (2 周)

---

#### Story 4.18: Logic Builder 控件

**Story ID**: DELTA-418
**优先级**: P1
**工时**: 4d
**负责人**: 前端

**用户故事**:
> 作为用户，我需要一个可视化工具来构建多条件组合逻辑。

**验收标准**:
- [ ] 条件组展示 (AND/OR)
- [ ] 单个条件: 指标 + 运算符 + 值
- [ ] 添加/删除条件按钮
- [ ] 嵌套条件组支持
- [ ] 生成条件 JSON 结构

---

#### Story 4.19: Heatmap Slider 控件

**Story ID**: DELTA-419
**优先级**: P1
**工时**: 2d
**负责人**: 前端

**用户故事**:
> 作为用户，我需要一个可视化的风险等级选择器。

**验收标准**:
- [ ] 三区域轨道 (保守/中性/激进)
- [ ] 不同区域不同颜色
- [ ] 滑块拖动切换区域
- [ ] 显示当前区域描述

---

#### Story 4.20: Monitor Canvas 实现

**Story ID**: DELTA-420
**优先级**: P1
**工时**: 4d
**负责人**: 前端

**用户故事**:
> 作为用户，我需要实时监控运行中策略的状态。

**验收标准**:
- [ ] 实时 K 线图 (TradingView)
- [ ] 当前持仓信息
- [ ] 今日统计
- [ ] 最近订单列表
- [ ] 操作按钮: 暂停/修改/平仓

---

### 后续 Sprint...

- Story 4.21-4.25: Backtest Canvas
- Story 4.26-4.30: 风险预警系统
- Story 4.31-4.35: Kill Switch + 熔断

---

## 技术债务

- [ ] InsightCard 动画优化
- [ ] Canvas 虚拟滚动 (大量参数时)
- [ ] 控件组件单元测试
- [ ] E2E 测试覆盖

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| AI 生成数据格式不稳定 | 高 | 中 | 严格 schema 验证 + fallback |
| 实时回测性能不足 | 中 | 中 | 缓存 + 简化计算 |
| 复杂控件开发延期 | 中 | 高 | 优先级拆分，P2 后移 |

---

## 附录

### A. 组件清单

| 组件 | 路径 | Story |
|------|------|-------|
| InsightCard | `components/a2ui/InsightCard` | 4.3 |
| Canvas | `components/a2ui/Canvas` | 4.5 |
| ProposalCanvas | `components/a2ui/Canvas/Proposal` | 4.6 |
| ParamSlider | `components/a2ui/Controls/Slider` | 4.7 |
| ParamButtonGroup | `components/a2ui/Controls/ButtonGroup` | 4.8 |
| ParamToggle | `components/a2ui/Controls/Toggle` | 4.9 |
| ParamNumber | `components/a2ui/Controls/Number` | 4.10 |
| LogicBuilder | `components/a2ui/Controls/LogicBuilder` | 4.18 |
| HeatmapSlider | `components/a2ui/Controls/HeatmapSlider` | 4.19 |
| MonitorCanvas | `components/a2ui/Canvas/Monitor` | 4.20 |

### B. Store 结构

```typescript
// store/insight.ts
interface InsightState {
  activeInsight: InsightData | null;
  canvasMode: CanvasMode;
  canvasOpen: boolean;
  editedParams: Map<string, any>;
  errors: Map<string, string>;
  loading: boolean;
}
```

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-25
**维护者**: Delta Terminal 开发团队
