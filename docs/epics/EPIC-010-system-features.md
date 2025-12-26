# Epic 010: 系统辅助功能 - Brownfield Enhancement

> 为 Delta Terminal 添加新手引导、AI 追问澄清和策略模板库功能

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-010 |
| 名称 | 系统辅助功能 (System Features) |
| 类型 | Brownfield Enhancement |
| 优先级 | P1 (用户体验增强) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-26 |
| PRD 参考 | S40 新手引导, S46 AI追问澄清, S48 策略模板库 |
| 前置依赖 | EPIC-001 ~ EPIC-005 ✅ |

---

## Epic Goal

**提升新用户上手体验和 AI 交互质量，通过引导、澄清和模板加速策略创建。**

核心功能：
1. **Onboarding 新手引导** - 首次使用的交互式引导流程
2. **AI 追问澄清** - AI 主动提问澄清用户意图
3. **策略模板库** - 预设策略模板一键应用

---

## 现有系统上下文

### 待增强的组件

| 组件 | 路径 | 功能 | 当前状态 |
|------|------|------|---------|
| ChatInterface | `components/strategy/ChatInterface.tsx` | AI 对话界面 | ✅ 完成 (需扩展) |
| Header | `components/layout/Header.tsx` | 应用头部 | ✅ 完成 (需扩展) |
| AgentList | `components/sidebar/AgentList.tsx` | 策略列表 | ✅ 完成 (需扩展) |
| StrategyAssistant | `lib/prompts/strategy-assistant.ts` | AI 系统提示词 | ✅ 完成 (需扩展) |

### 新增组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| OnboardingTour | `components/system/OnboardingTour.tsx` | 引导流程组件 | ❌ 待创建 |
| ClarificationCard | `components/strategy/ClarificationCard.tsx` | AI 追问卡片 | ❌ 待创建 |
| TemplateSelector | `components/strategy/TemplateSelector.tsx` | 模板选择器 | ❌ 待创建 |
| OnboardingStore | `store/onboarding.ts` | 引导状态管理 | ❌ 待创建 |
| StrategyTemplates | `lib/templates/strategies.ts` | 策略模板定义 | ❌ 待创建 |

---

## 功能设计

### S40: 新手引导 (Onboarding)

#### 引导流程设计

```
步骤 1: 欢迎页
┌─────────────────────────────────────────────┐
│                                             │
│        🎉 欢迎使用 Delta Terminal            │
│                                             │
│    AI 驱动的智能交易终端                     │
│                                             │
│  我们将用 1 分钟带你了解核心功能              │
│                                             │
│  [开始引导]         [跳过]                   │
│                                             │
└─────────────────────────────────────────────┘

步骤 2: 对话创建策略 (聚光灯: ChatInterface)
┌─────────────────────────────────────────────┐
│  💬 AI 对话创建策略                          │
│                                             │
│  在这里与 Delta AI 对话，                    │
│  用自然语言描述你的交易想法                   │
│                                             │
│  例如: "创建一个 RSI 超卖买入策略"            │
│                                             │
│              [下一步]                        │
└─────────────────────────────────────────────┘

步骤 3: 策略管理 (聚光灯: AgentList)
┌─────────────────────────────────────────────┐
│  📊 策略列表                                 │
│                                             │
│  查看和管理你的所有交易策略                   │
│  启动、暂停、调整参数                         │
│                                             │
│              [下一步]                        │
└─────────────────────────────────────────────┘

步骤 4: 完成
┌─────────────────────────────────────────────┐
│  ✅ 准备就绪！                               │
│                                             │
│  现在试试创建你的第一个策略吧                 │
│                                             │
│  提示: 可以从模板库开始 →                    │
│                                             │
│              [开始使用]                      │
└─────────────────────────────────────────────┘
```

#### 引导触发条件

```typescript
interface OnboardingState {
  completed: boolean        // 是否完成过引导
  currentStep: number       // 当前步骤 0-4
  skipped: boolean          // 是否跳过
  lastShownAt?: number      // 上次显示时间
}

// 触发条件
function shouldShowOnboarding(): boolean {
  const state = getOnboardingState()

  // 已完成或跳过
  if (state.completed || state.skipped) return false

  // 首次访问
  const isFirstVisit = !state.lastShownAt

  // 或 7 天内未完成
  const daysSinceLastShown = (Date.now() - (state.lastShownAt || 0)) / (1000 * 60 * 60 * 24)
  const shouldRemind = daysSinceLastShown > 7 && !state.completed

  return isFirstVisit || shouldRemind
}
```

---

### S46: AI 追问澄清

#### 澄清场景

| 用户输入 | AI 识别的模糊点 | 澄清问题 |
|---------|---------------|---------|
| "创建交易策略" | 无具体信息 | "你想交易哪个币种?" / "希望用什么指标?" |
| "BTC 策略" | 无交易逻辑 | "具体的交易逻辑是什么?" / "是趋势跟踪还是均值回归?" |
| "低风险策略" | 参数不明 | "止损设置多少?" / "仓位控制在多少?" |

#### 澄清卡片设计

```
┌─────────────────────────────────────────────┐
│ 🤔 需要更多信息                              │
├─────────────────────────────────────────────┤
│                                             │
│  你想交易哪个币种?                           │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ BTC/USDT│ │ ETH/USDT│ │ 其他... │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│  希望使用什么指标?                           │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │   RSI   │ │   MACD  │ │ 均线交叉 │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│  或者直接告诉我: ________________           │
│                                             │
└─────────────────────────────────────────────┘
```

#### AI 提示词扩展

```typescript
// lib/prompts/strategy-assistant.ts 扩展

export const CLARIFICATION_PROMPT = `
## 追问澄清规则

当用户输入模糊或信息不足时，你需要主动追问澄清。

### 追问触发条件
1. **缺少交易标的**: 未提及具体币种
2. **缺少交易逻辑**: 未说明买卖条件
3. **缺少风险参数**: 未指定止损止盈
4. **术语不明确**: 使用"低风险"、"稳健"等主观词

### 追问格式
返回 clarification-data JSON 块:

\`\`\`clarification-data
{
  "question": "你想交易哪个币种?",
  "options": [
    {"label": "BTC/USDT", "value": "BTCUSDT"},
    {"label": "ETH/USDT", "value": "ETHUSDT"},
    {"label": "其他", "value": "other"}
  ],
  "allowCustomInput": true,
  "contextHint": "不同币种的波动性和流动性差异较大"
}
\`\`\`

### 示例对话

用户: "创建一个策略"
AI: "好的！让我了解一下你的需求：
\`\`\`clarification-data
{"question": "你想交易哪个币种?", ...}
\`\`\`
"

用户: 选择 "BTC/USDT"
AI: "明白了，BTC/USDT。
\`\`\`clarification-data
{"question": "具体的交易逻辑是什么?",
 "options": [
   {"label": "RSI 超卖买入", "value": "rsi_oversold"},
   {"label": "均线金叉", "value": "ma_cross"},
   {"label": "网格交易", "value": "grid"}
 ]}
\`\`\`
"
`
```

---

### S48: 策略模板库

#### 模板分类

| 分类 | 模板名称 | 适用场景 | 风险等级 |
|------|---------|---------|---------|
| **趋势跟踪** | 均线金叉策略 | 上升趋势市场 | 🟡 中等 |
| **趋势跟踪** | MACD 金叉策略 | 趋势确认 | 🟡 中等 |
| **均值回归** | RSI 超卖买入 | 震荡市场 | 🟢 低 |
| **均值回归** | 布林带反弹 | 区间震荡 | 🟢 低 |
| **做市策略** | 网格交易 | 横盘市场 | 🟢 低 |
| **突破策略** | 价格突破 | 盘整后爆发 | 🔴 高 |

#### 模板数据结构

```typescript
// lib/templates/strategies.ts

export interface StrategyTemplate {
  id: string
  name: string
  category: 'trend' | 'mean_reversion' | 'market_making' | 'breakout'
  description: string
  riskLevel: 'low' | 'medium' | 'high'

  // 策略参数
  params: InsightParam[]

  // 默认配置
  defaultConfig: {
    symbol: string
    timeframe: string
    riskSettings: RiskSettings
  }

  // 历史表现 (可选)
  backtestMetrics?: {
    winRate: number
    totalReturn: number
    maxDrawdown: number
  }

  // 适用市场
  marketConditions: string[]

  // 使用提示
  tips: string[]
}

// 示例模板
export const RSI_OVERSOLD_TEMPLATE: StrategyTemplate = {
  id: 'rsi_oversold',
  name: 'RSI 超卖买入策略',
  category: 'mean_reversion',
  description: '当 RSI 指标低于超卖线时买入，高于超买线时卖出',
  riskLevel: 'low',
  params: [
    {
      key: 'rsi_period',
      label: 'RSI 周期',
      type: 'slider',
      value: 14,
      level: 1,
      config: { min: 5, max: 30, step: 1 }
    },
    {
      key: 'oversold_threshold',
      label: '超卖阈值',
      type: 'slider',
      value: 30,
      level: 1,
      config: { min: 10, max: 40, step: 1 }
    },
    {
      key: 'overbought_threshold',
      label: '超买阈值',
      type: 'slider',
      value: 70,
      level: 1,
      config: { min: 60, max: 90, step: 1 }
    }
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '1h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 3 },
      takeProfit: { enabled: true, type: 'percentage', value: 10 },
      positionLimit: { maxPositionPercent: 15, maxTradeAmount: 5000 }
    }
  },
  backtestMetrics: {
    winRate: 62,
    totalReturn: 28,
    maxDrawdown: -8
  },
  marketConditions: ['横盘震荡', 'RSI 指标有效'],
  tips: [
    '适合震荡市场，趋势市场效果较差',
    '建议结合成交量确认信号',
    '止损设置在关键支撑位下方'
  ]
}
```

#### 模板选择器 UI

```
┌─────────────────────────────────────────────┐
│ 📚 策略模板库                                │
├─────────────────────────────────────────────┤
│                                             │
│  [全部] [趋势] [均值回归] [网格] [突破]        │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ RSI 超卖买入策略          🟢 低风险    │ │
│  │                                       │ │
│  │ 当 RSI 指标低于 30 时买入，            │ │
│  │ 适合震荡市场                          │ │
│  │                                       │ │
│  │ 📊 历史表现: 胜率 62% | 收益 +28%      │ │
│  │                                       │ │
│  │            [查看详情] [立即使用]       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ 网格交易策略              🟢 低风险    │ │
│  │                                       │ │
│  │ 在价格区间设置网格，                   │ │
│  │ 低买高卖赚取差价                       │ │
│  │                                       │ │
│  │ 📊 历史表现: 胜率 58% | 收益 +35%      │ │
│  │                                       │ │
│  │            [查看详情] [立即使用]       │ │
│  └───────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Stories

### Story 10.1: Onboarding 新手引导

**标题**: 创建交互式新手引导流程

**描述**:
为首次使用的用户提供引导流程，介绍核心功能。

**验收标准**:
- [ ] 创建 `components/system/OnboardingTour.tsx`
- [ ] 创建 `store/onboarding.ts` 状态管理
- [ ] 4 步引导流程 (欢迎 → 对话 → 策略 → 完成)
- [ ] 聚光灯高亮目标组件
- [ ] 支持跳过和下次再说
- [ ] 引导状态持久化到 localStorage
- [ ] 完成后不再自动显示
- [ ] 可从设置中重新打开引导

**技术方案**:
- 使用 `react-joyride` 或自定义 Popover 组件
- 聚光灯效果: `position: relative` + `z-index` 控制
- 步骤配置可扩展

---

### Story 10.2: AI 追问澄清卡片

**标题**: 实现 AI 主动追问澄清功能

**描述**:
当用户输入模糊时，AI 主动提问并提供选项卡片。

**验收标准**:
- [ ] 创建 `components/strategy/ClarificationCard.tsx`
- [ ] 扩展 `lib/prompts/strategy-assistant.ts` 追问提示词
- [ ] 支持单选/多选/自定义输入
- [ ] 卡片选项点击后自动提交
- [ ] 澄清上下文保留在对话历史
- [ ] 澄清数据提取和验证
- [ ] 与现有 ChatInterface 集成

**澄清数据结构**:
```typescript
interface ClarificationData {
  question: string
  options: Array<{
    label: string
    value: string
    description?: string
  }>
  allowCustomInput?: boolean
  contextHint?: string
  type: 'single' | 'multiple' | 'text'
}
```

**集成方式**:
```typescript
// ChatInterface.tsx
const { textContent, clarificationData } = extractClarificationData(aiResponse)

if (clarificationData) {
  // 渲染 ClarificationCard 而非普通消息
  return <ClarificationCard data={clarificationData} onSelect={handleClarificationSelect} />
}
```

---

### Story 10.3: 策略模板库

**标题**: 创建预设策略模板库和选择器

**描述**:
提供常用策略模板，用户可一键应用并调整参数。

**验收标准**:
- [ ] 创建 `lib/templates/strategies.ts` 模板定义
- [ ] 创建 `components/strategy/TemplateSelector.tsx` 选择器
- [ ] 至少 6 个预设模板 (RSI、MACD、网格、均线、突破、布林带)
- [ ] 模板按分类筛选
- [ ] 显示风险等级和历史表现
- [ ] 模板详情预览
- [ ] 一键应用模板到 ChatInterface
- [ ] 应用后自动打开 Canvas 供调整参数

**预设模板清单**:
1. RSI 超卖买入 (均值回归, 低风险)
2. 均线金叉策略 (趋势跟踪, 中等风险)
3. MACD 金叉策略 (趋势跟踪, 中等风险)
4. 网格交易策略 (做市, 低风险)
5. 布林带反弹策略 (均值回归, 低风险)
6. 价格突破策略 (突破, 高风险)

**集成位置**:
- ChatInterface 输入框上方显示 "📚 从模板开始" 按钮
- 点击打开模板选择器 Modal
- 选择模板后自动填充到对话并发送

---

## 技术方案

### Onboarding 实现

**推荐库**: `react-joyride` (可选) 或自定义实现

```bash
pnpm add react-joyride
```

```typescript
// components/system/OnboardingTour.tsx
import Joyride, { Step } from 'react-joyride'

const ONBOARDING_STEPS: Step[] = [
  {
    target: '.chat-interface',
    content: '在这里与 AI 对话创建策略',
    placement: 'bottom',
  },
  {
    target: '.agent-list',
    content: '查看和管理你的策略',
    placement: 'left',
  },
  // ...
]

export function OnboardingTour() {
  const { currentStep, completed, completeOnboarding, skipOnboarding } = useOnboardingStore()

  return (
    <Joyride
      steps={ONBOARDING_STEPS}
      stepIndex={currentStep}
      run={!completed}
      continuous
      showSkipButton
      callback={handleJoyrideCallback}
    />
  )
}
```

### 澄清数据提取

```typescript
// lib/prompts/strategy-assistant.ts
export function extractClarificationData(content: string): {
  textContent: string
  clarificationData: ClarificationData | null
} {
  const clarificationRegex = /```clarification-data\s*([\s\S]*?)```/
  const match = content.match(clarificationRegex)

  if (!match) {
    return { textContent: content, clarificationData: null }
  }

  const jsonText = match[1].trim()
  const textContent = content.replace(clarificationRegex, '').trim()

  try {
    const clarificationData = JSON.parse(jsonText)
    return { textContent, clarificationData }
  } catch (e) {
    console.error('[extractClarificationData] JSON parse error:', e)
    return { textContent: content, clarificationData: null }
  }
}
```

### 模板应用流程

```typescript
// components/strategy/TemplateSelector.tsx
function applyTemplate(template: StrategyTemplate) {
  // 1. 构建 InsightData
  const insight: InsightData = {
    id: `template_${template.id}_${Date.now()}`,
    type: 'strategy_create',
    target: {
      strategy_id: 'new',
      name: template.name,
      symbol: template.defaultConfig.symbol,
    },
    params: template.params,
    impact: {
      metrics: template.backtestMetrics ? [
        { key: 'winRate', label: '胜率', value: template.backtestMetrics.winRate, unit: '%' },
        { key: 'totalReturn', label: '历史收益', value: template.backtestMetrics.totalReturn, unit: '%' },
        { key: 'maxDrawdown', label: '最大回撤', value: template.backtestMetrics.maxDrawdown, unit: '%' },
      ] : [],
      confidence: 0.8,
      sample_size: 180,
    },
    actions: ['approve', 'reject', 'run_backtest'],
    created_at: new Date().toISOString(),
  }

  // 2. 添加到对话
  const message: Message = {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: `已为你加载「${template.name}」模板`,
    timestamp: Date.now(),
    insight,
    insightStatus: 'pending',
  }

  // 3. 自动展开 Canvas
  onInsightExpand(insight)

  // 4. 关闭模板选择器
  setOpen(false)
}
```

---

## 文件路径

| 文件 | 路径 | 操作 |
|------|------|------|
| OnboardingTour | `components/system/OnboardingTour.tsx` | 创建 |
| OnboardingStore | `store/onboarding.ts` | 创建 |
| ClarificationCard | `components/strategy/ClarificationCard.tsx` | 创建 |
| StrategyAssistant | `lib/prompts/strategy-assistant.ts` | 修改 |
| TemplateSelector | `components/strategy/TemplateSelector.tsx` | 创建 |
| StrategyTemplates | `lib/templates/strategies.ts` | 创建 |
| ChatInterface | `components/strategy/ChatInterface.tsx` | 修改 |
| Layout | `app/layout.tsx` | 修改 (添加 OnboardingTour) |

---

## 默认配置

### Onboarding 步骤

```typescript
// store/onboarding.ts
const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  currentStep: 0,
  skipped: false,
  lastShownAt: undefined,
}

const ONBOARDING_STEPS = [
  { id: 'welcome', title: '欢迎', target: null },
  { id: 'chat', title: 'AI 对话', target: '.chat-interface' },
  { id: 'strategies', title: '策略管理', target: '.agent-list' },
  { id: 'complete', title: '完成', target: null },
]
```

### 模板默认值

```typescript
// lib/templates/strategies.ts
const COMMON_DEFAULT_CONFIG = {
  symbol: 'BTC/USDT',
  timeframe: '1h',
  riskSettings: {
    stopLoss: { enabled: true, type: 'percentage', value: 5 },
    takeProfit: { enabled: true, type: 'percentage', value: 15 },
    positionLimit: { maxPositionPercent: 20, maxTradeAmount: 10000 },
  },
}
```

---

## 兼容性要求

- [ ] ChatInterface 现有功能保持不变
- [ ] 引导可随时跳过或关闭
- [ ] 模板不影响自定义策略创建
- [ ] 澄清流程可降级为普通对话
- [ ] OnboardingStore 持久化可选

---

## Definition of Done

- [ ] 所有 3 个 Stories 完成并通过验收
- [ ] Onboarding 引导流程完整
- [ ] AI 追问澄清功能正常
- [ ] 策略模板库至少 6 个模板
- [ ] 所有组件集成到现有界面
- [ ] TypeScript 类型检查通过
- [ ] 生产构建通过
- [ ] 无 P0/P1 级别 Bug

---

## 验证清单

### 范围验证
- [x] Epic 可在 3 个 Stories 内完成
- [x] 无需架构层面变更
- [x] 遵循现有组件模式
- [x] 复用已有 UI 组件 (Card, Button, Modal)

### 风险评估
- [x] 对现有系统风险: 低 (新增功能，独立组件)
- [x] 回滚方案可行 (功能可选，可独立禁用)
- [x] 团队具备技术栈经验

### 完整性检查
- [x] Epic 目标明确可达成
- [x] Stories 合理拆分
- [x] 成功标准可衡量
- [x] 依赖已识别

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 引导流程干扰用户 | 中 | 低 | 可跳过、可关闭、记住选择 |
| AI 追问过于频繁 | 中 | 中 | 优化触发条件、允许直接回答 |
| 模板数量不足 | 低 | 低 | 先实现 6 个核心模板，后续扩展 |
| 模板参数不适用 | 中 | 中 | 提供参数调整界面、说明适用场景 |

---

## Story Manager Handoff

**Story Manager 接收说明:**

"请为此 Brownfield Epic 开发详细的 User Stories。关键考虑：

- **现有系统**: Next.js 15 + React 19 + TypeScript + Zustand
- **集成点**:
  - ChatInterface (AI 对话主界面)
  - Layout (全局布局)
  - StrategyAssistant (AI 提示词系统)
- **现有模式遵循**:
  - Zustand Store 状态管理
  - Shadcn/ui 组件库
  - InsightData 结构化 AI 响应
- **兼容性要求**: 所有新功能必须不影响现有对话流程
- **每个 Story 需包含**:
  - 组件创建清单
  - 类型定义
  - 集成步骤
  - 验证现有功能完整性

Epic 目标是提升新用户体验和 AI 交互质量，同时保持系统稳定性。"

---

**创建时间**: 2025-12-26
**创建者**: BMad Analyst Agent
**来源**: PRD S40, S46, S48
