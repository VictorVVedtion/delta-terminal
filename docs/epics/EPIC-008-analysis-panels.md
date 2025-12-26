# EPIC-008: 分析面板系统 - Brownfield Enhancement

> 为 Delta Terminal 添加高级策略分析能力,包含敏感度分析、归因分析和策略对比

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-008 |
| 名称 | 分析面板系统 (Analysis Panels) |
| 类型 | Brownfield Enhancement |
| 优先级 | P1 (高) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-26 |
| PRD 参考 | 场景 S16 (敏感度分析), S34 (归因分析), S35 (策略对比) |
| 前置依赖 | EPIC-007 (Backtest System) ✅ |

---

## Epic Goal

**实现交互式的策略分析面板系统,帮助用户深入理解策略性能、参数影响和盈亏来源,通过可视化和对比工具辅助策略优化决策。**

完成 Canvas 分析套件:
- SensitivityCanvas - 参数敏感度分析
- AttributionCanvas - 盈亏归因分析
- ComparisonCanvas - 多策略对比

---

## 现有系统上下文

### 技术栈
- **框架**: Next.js 15 + React 19 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Shadcn/ui + TailwindCSS
- **图表库**: Recharts (已集成)
- **A2UI 系统**: InsightData + Canvas 面板

### 已有组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| BacktestCanvas | `components/canvas/BacktestCanvas.tsx` | 回测结果展示 | ✅ 完成 |
| BacktestInsightData | `types/insight.ts` | 回测数据结构 | ✅ 完成 |
| ParamControl | `components/a2ui/controls/ParamControl.tsx` | 参数控件 | ✅ 完成 |
| ParamSlider | `components/a2ui/controls/ParamSlider.tsx` | 滑块控件 | ✅ 完成 |
| HeatmapSlider | `components/a2ui/controls/HeatmapSlider.tsx` | 热力图滑块 | ✅ 完成 |
| InsightStore | `store/insight.ts` | Insight 状态管理 | ✅ 完成 |

### 集成点

1. **ChatInterface** - 识别分析相关请求并返回分析 Insight
2. **InsightData 扩展** - 新增 `sensitivity`, `attribution`, `comparison` 类型
3. **Canvas 系统** - 复用 Canvas 滑出面板模式
4. **Recharts** - 使用 Heatmap, BarChart, LineChart 等组件

---

## 增强详情

### PRD 场景摘要

#### S16: 敏感度分析
- **参数影响热力图**: 可视化参数对性能的影响程度
- **关键参数识别**: 自动标识对策略影响最大的参数
- **交互式调参**: 直接在热力图上调整参数查看影响

**用户价值**:
了解哪些参数最重要,避免过度优化不重要的参数

#### S34: 归因分析
- **盈亏归因分解**: 分解盈亏来源(趋势跟踪/波段交易/止损等)
- **因子贡献度**: 量化各因子对总收益的贡献
- **时间序列分析**: 查看不同时期各因子表现

**用户价值**:
理解策略盈利逻辑,识别稳定和不稳定的收益来源

#### S35: 策略对比
- **多策略性能对比**: 并排对比多个策略的关键指标
- **指标对比图表**: 收益曲线、回撤、胜率等可视化对比
- **差异高亮**: 自动标注显著差异点

**用户价值**:
快速选择最优策略,或组合多个策略降低风险

### 成功标准

1. ✅ 敏感度分析热力图正确渲染
2. ✅ 归因分析显示各因子贡献度
3. ✅ 策略对比支持 2-4 个策略并排显示
4. ✅ 所有图表可交互(hover, click)
5. ✅ Canvas 面板支持全屏和折叠
6. ✅ TypeScript 类型完整

---

## Stories

### Story 8.1: SensitivityCanvas - 参数敏感度分析

**标题**: 实现参数敏感度分析面板

**描述**:
开发 SensitivityCanvas 组件,通过热力图和条形图展示参数对策略性能的影响程度。

**验收标准**:
- [ ] 扩展 InsightType 添加 `'sensitivity'` 类型
- [ ] 定义 SensitivityInsightData 数据结构
- [ ] 创建 `components/canvas/SensitivityCanvas.tsx`
- [ ] 参数影响热力图 (Recharts Heatmap)
- [ ] 关键参数排序条形图
- [ ] 支持选中参数查看详细影响曲线
- [ ] 集成到 ChatInterface action 检测
- [ ] TypeScript 类型完整

**技术设计**:
```typescript
// types/insight.ts 扩展
export interface SensitivityInsightData extends InsightData {
  type: 'sensitivity'

  // 参数敏感度矩阵
  sensitivityMatrix: {
    paramKey: string
    paramLabel: string
    // 参数值 -> 性能指标变化
    impacts: Array<{
      paramValue: number
      totalReturn: number
      winRate: number
      maxDrawdown: number
      sharpeRatio: number
    }>
  }[]

  // 关键参数排序 (按影响程度)
  keyParameters: Array<{
    paramKey: string
    paramLabel: string
    impactScore: number // 0-100
    sensitivity: 'high' | 'medium' | 'low'
  }>

  // 基准性能 (未调参)
  baseline: {
    totalReturn: number
    winRate: number
    maxDrawdown: number
    sharpeRatio: number
  }
}
```

**UI 布局**:
```
┌────────────────────────────────────────────────┐
│  敏感度分析 - BTC RSI 策略                      │
├────────────────────────────────────────────────┤
│  📊 参数影响热力图                              │
│  ┌──────────────────────────────────────────┐  │
│  │      RSI周期  超卖线  止损%  仓位%       │  │
│  │ 收益率  🟩🟩  🟨🟩  🟥🟥  🟨🟨           │  │
│  │ 胜率    🟩🟨  🟩🟩  🟥🟨  🟨🟨           │  │
│  │ 回撤    🟨🟨  🟩🟩  🟩🟩  🟥🟥           │  │
│  │ 夏普    🟩🟩  🟨🟩  🟥🟩  🟨🟨           │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  🎯 关键参数识别                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 1. 止损% ████████████████ 92分 (高敏感)  │  │
│  │ 2. RSI周期 ████████████ 78分 (高敏感)    │  │
│  │ 3. 超卖线 ████████ 65分 (中敏感)         │  │
│  │ 4. 仓位% ████ 42分 (低敏感)              │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  📈 选中参数详细分析 (点击热力图格子)           │
│  ┌──────────────────────────────────────────┐  │
│  │  参数: 止损%                              │  │
│  │  影响: 收益率                             │  │
│  │  [折线图: X轴=止损值, Y轴=收益率]         │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

### Story 8.2: AttributionCanvas - 盈亏归因分析

**标题**: 实现盈亏归因分析面板

**描述**:
开发 AttributionCanvas 组件,分解策略盈亏来源并展示各因子贡献度。

**验收标准**:
- [ ] 扩展 InsightType 添加 `'attribution'` 类型
- [ ] 定义 AttributionInsightData 数据结构
- [ ] 创建 `components/canvas/AttributionCanvas.tsx`
- [ ] 盈亏归因饼图/瀑布图
- [ ] 因子贡献度条形图
- [ ] 时间序列因子表现折线图
- [ ] 支持切换时间范围 (日/周/月)
- [ ] 集成到 ChatInterface
- [ ] TypeScript 类型完整

**技术设计**:
```typescript
// types/insight.ts 扩展
export interface AttributionInsightData extends InsightData {
  type: 'attribution'

  // 盈亏归因分解
  attributionBreakdown: Array<{
    factor: string // 因子名称 (趋势跟踪, 波段交易, 止损, 手续费等)
    contribution: number // 贡献金额 (USDT)
    contributionPercent: number // 贡献百分比
    color: string // 图表颜色
    description?: string
  }>

  // 时间序列因子表现
  timeSeriesAttribution: Array<{
    timestamp: number
    factors: Record<string, number> // factor -> 累计贡献
  }>

  // 总盈亏
  totalPnL: number

  // 分析周期
  period: {
    start: number
    end: number
  }
}
```

**UI 布局**:
```
┌────────────────────────────────────────────────┐
│  归因分析 - BTC RSI 策略                        │
├────────────────────────────────────────────────┤
│  💰 盈亏归因分解 (总盈亏: +$1,245)              │
│  ┌──────────────────────────────────────────┐  │
│  │  🟢 趋势跟踪 +$892 (71.6%)               │  │
│  │  🟡 波段交易 +$456 (36.6%)               │  │
│  │  🔵 均值回归 +$123 (9.9%)                │  │
│  │  🟠 止损保护 -$184 (-14.8%)              │  │
│  │  🔴 手续费 -$42 (-3.4%)                  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  📊 因子贡献饼图                                │
│  ┌──────────────────────────────────────────┐  │
│  │         [饼图可视化]                      │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  📈 时间序列因子表现                            │
│  ┌──────────────────────────────────────────┐  │
│  │  [多条折线: 各因子累计贡献随时间变化]     │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  🔍 AI 洞察                                    │
│  "趋势跟踪是主要盈利来源,但止损触发偏多,       │
│   建议调整止损距离或使用追踪止损"              │
└────────────────────────────────────────────────┘
```

---

### Story 8.3: ComparisonCanvas - 策略对比分析

**标题**: 实现多策略对比面板

**描述**:
开发 ComparisonCanvas 组件,支持 2-4 个策略的并排性能对比。

**验收标准**:
- [ ] 扩展 InsightType 添加 `'comparison'` 类型
- [ ] 定义 ComparisonInsightData 数据结构
- [ ] 创建 `components/canvas/ComparisonCanvas.tsx`
- [ ] 指标对比表格 (胜率、收益、回撤等)
- [ ] 收益曲线对比折线图
- [ ] 指标雷达图对比
- [ ] 差异高亮 (标注显著差异)
- [ ] 支持添加/移除对比策略
- [ ] 集成到 ChatInterface
- [ ] TypeScript 类型完整

**技术设计**:
```typescript
// types/insight.ts 扩展
export interface ComparisonInsightData extends InsightData {
  type: 'comparison'

  // 对比的策略列表
  strategies: Array<{
    id: string
    name: string
    symbol: string
    color: string // 图表颜色

    // 核心指标
    metrics: {
      totalReturn: number
      annualizedReturn: number
      winRate: number
      maxDrawdown: number
      sharpeRatio: number
      sortinoRatio: number
      profitFactor: number
      totalTrades: number
    }

    // 收益曲线
    equityCurve: Array<{
      timestamp: number
      equity: number
    }>
  }>

  // 差异分析
  differences: Array<{
    metric: string
    significance: 'high' | 'medium' | 'low' // 差异显著性
    bestStrategy: string // 该指标最优的策略
    worstStrategy: string // 该指标最差的策略
  }>

  // AI 对比总结
  aiSummary: string
}
```

**UI 布局**:
```
┌────────────────────────────────────────────────┐
│  策略对比 - BTC策略群                           │
├────────────────────────────────────────────────┤
│  📋 指标对比表                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 指标        策略A   策略B   策略C  最优   │  │
│  │ 总收益      +42%   +38%   +56%  🏆C     │  │
│  │ 胜率        65%    58%    71%   🏆C     │  │
│  │ 最大回撤    -12%   -18%   -8%   🏆C     │  │
│  │ 夏普比率    1.8    1.4    2.1   🏆C     │  │
│  │ 交易次数    48     62     34    -       │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  📈 收益曲线对比                                │
│  ┌──────────────────────────────────────────┐  │
│  │  [三条折线: 策略A蓝, 策略B绿, 策略C红]    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  🎯 指标雷达图                                  │
│  ┌──────────────────────────────────────────┐  │
│  │     收益                                  │  │
│  │      /\                                   │  │
│  │  回撤  胜率    [三角形雷达图叠加]         │  │
│  │      \/                                   │  │
│  │    夏普                                   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  🔍 AI 对比洞察                                │
│  "策略C综合表现最佳,收益和风控平衡良好。       │
│   策略B交易频率较高但收益偏低,可能过度交易"    │
└────────────────────────────────────────────────┘
```

---

## 兼容性要求

- [x] 复用现有 Canvas 滑出面板机制
- [x] 使用已有 InsightData + InsightStore 架构
- [x] Recharts 图表库已集成
- [x] ParamControl 控件可复用
- [x] ChatInterface 扩展不影响现有功能
- [x] InsightType 枚举向后兼容

---

## 风险缓解

### 主要风险
**分析计算可能耗时较长,影响用户体验**

### 缓解措施
1. 使用 Mock 数据进行前端开发
2. 显示加载骨架屏和进度提示
3. 支持异步加载和缓存机制
4. 大数据集分页或虚拟滚动
5. 后端优化计算性能

### 回滚计划
1. 分析功能独立于核心交易流程
2. 可暂时禁用某类分析面板
3. 降级到简化版数据展示

---

## Definition of Done

- [ ] 所有 3 个 Stories 完成并通过验收
- [ ] SensitivityCanvas 敏感度热力图可交互
- [ ] AttributionCanvas 归因分解清晰展示
- [ ] ComparisonCanvas 支持多策略对比
- [ ] 所有图表响应式适配
- [ ] TypeScript 类型检查通过
- [ ] 无 P0/P1 级别 Bug
- [ ] 生产构建成功

---

## 验证清单

### 范围验证
- [x] Epic 可在 3 个 Stories 内完成
- [x] 无需架构层面变更
- [x] 遵循现有 Canvas/InsightData 模式
- [x] 复用 Recharts 和 A2UI 组件

### 风险评估
- [x] 对现有系统风险: 低 (独立分析功能)
- [x] 回滚方案可行
- [x] Mock 数据可支持独立开发
- [x] 团队具备 Recharts 经验

### 完整性检查
- [x] Epic 目标清晰可实现
- [x] Stories 范围合理
- [x] 成功标准可衡量
- [x] 与 EPIC-007 集成自然

---

## Story Manager 移交

**Story Manager 移交说明:**

请为此 Brownfield Epic 开发详细的用户故事。关键考虑事项:

- 这是对运行 **Next.js 15 + React 19 + Zustand + Recharts** 的现有系统的增强
- **集成点**:
  - ChatInterface 识别分析请求
  - InsightData 类型扩展
  - Canvas 系统复用
  - Recharts 图表集成
- **需遵循的现有模式**:
  - BacktestCanvas 滑出面板模式 (参考 `components/canvas/BacktestCanvas.tsx`)
  - InsightData 数据结构 (参考 `types/insight.ts`)
  - InsightStore 状态管理 (参考 `store/insight.ts`)
  - ParamControl A2UI 控件 (参考 `components/a2ui/controls/`)
- **关键兼容性要求**:
  - InsightType 枚举向后兼容
  - Canvas 面板交互一致性
  - 图表风格与系统主题匹配
- 每个 Story 必须包含 Mock 数据示例和类型定义

Epic 目标: **实现交互式的策略分析面板系统,帮助用户深入理解策略性能、参数影响和盈亏来源,通过可视化和对比工具辅助策略优化决策**

---

**创建时间**: 2025-12-26
**创建者**: BMad Analyst Agent
**来源**: PRD 场景 S16, S34, S35 + Canvas 系统扩展需求
