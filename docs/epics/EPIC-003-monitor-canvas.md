# Epic 003: 实时监控集成 - Brownfield Enhancement

> 基于 PRD Epic 5 Feature 5.2，为 Delta Terminal 添加实时策略监控功能

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-003 |
| 名称 | 实时监控集成 (MonitorCanvas) |
| 类型 | Brownfield Enhancement |
| 优先级 | P1 (高) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-25 |
| PRD 参考 | `docs/prd/features.md#feature-5.2` |
| 前置依赖 | EPIC-001 (Strategy Deployment) ✅, EPIC-002 (Backtest Engine) ✅ |

---

## Epic Goal

**实现完整的策略实时监控功能，让用户可以监控运行中策略的状态、持仓、盈亏和交易记录。**

完成 Canvas 三件套：
- DeployCanvas (EPIC-001) ✅ - 策略部署
- BacktestCanvas (EPIC-002) ✅ - 策略回测
- MonitorCanvas (EPIC-003) ✅ - 策略监控

---

## 现有系统上下文

### 技术栈
- **框架**: Next.js 15 + React 19 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Shadcn/ui + TailwindCSS + RiverBit Design System

### 已有组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| MonitorCanvas | `components/canvas/MonitorCanvas.tsx` | 实时监控 UI | ✅ 完成 (~640 行) |
| InsightData | `types/insight.ts` | A2UI 数据结构 (含 `stop_agent` action) | ✅ 完成 |
| ChatInterface | `components/strategy/ChatInterface.tsx` | 对话界面 | ✅ 完成 (需扩展) |
| AgentStore | `store/agent.ts` | Agent 状态管理 | ✅ 完成 |
| WebSocketProvider | `components/providers/WebSocketProvider.tsx` | WebSocket 连接 | ⚠️ 基础实现 |

### 已完成组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| useMonitor | `hooks/useMonitor.ts` | 监控状态管理 Hook | ✅ 完成 |
| Monitor API | `lib/api.ts` | 监控 API 接口 | ✅ 完成 |
| MonitorStore | `store/monitor.ts` | 监控数据全局管理 | ✅ 完成 |
| ChatInterface 集成 | `components/strategy/ChatInterface.tsx` | 检测 `stop_agent` action | ✅ 完成 |

### 集成点

1. **ChatInterface** - 检测 `stop_agent` action 并弹出 MonitorCanvas
2. **API 层** - `lib/api.ts` 新增 `getAgentStatus()`, `pauseAgent()`, `resumeAgent()`, `stopAgent()`
3. **InsightData** - 使用已有 `'stop_agent'` action 类型
4. **AgentStore** - 与现有 agent 状态联动

---

## 增强详情

### PRD 规范摘要 (Feature 5.2)

#### 策略性能分析
- **配置详情**: 显示策略配置
- **实时盈亏**: 当日/总盈亏、已实现/未实现盈亏
- **交易记录**: 所有交易详情
- **资金曲线**: 可视化盈亏走势
- **绩效指标**: 胜率、回撤、夏普比率等

#### 用户流程
1. 用户部署策略后，AI 建议监控
2. AI 返回 `action: 'stop_agent'` (或用户主动请求监控)
3. ChatInterface 检测并弹出 MonitorCanvas
4. 实时显示策略状态、持仓、盈亏
5. 用户可暂停/恢复/停止策略
6. 策略状态变更后更新 AgentStore

### 成功标准

1. ✅ `useMonitor` Hook 管理完整监控生命周期
2. ✅ MonitorCanvas 实时显示策略状态
3. ✅ 持仓和交易记录正确展示
4. ✅ 暂停/恢复/停止策略功能正常
5. ✅ ChatInterface 自动检测相关 action
6. ✅ 与 AgentStore 状态联动正确

---

## Stories

### Story 3.1: useMonitor Hook 与监控状态管理

**标题**: 创建 useMonitor Hook 管理策略监控

**描述**:
开发 `useMonitor` Hook，连接 MonitorCanvas 与 API，管理实时监控数据。

**验收标准**:
- [ ] 创建 `hooks/useMonitor.ts`
- [ ] 实现数据轮询机制 (polling interval)
- [ ] 支持获取策略状态、持仓、交易记录
- [ ] 实现暂停/恢复/停止策略方法
- [ ] 错误处理与重连机制
- [ ] TypeScript 类型安全检查通过

**技术设计**:
```typescript
interface UseMonitorReturn {
  // 状态
  strategy: StrategyInfo | null
  pnl: PnLData | null
  positions: Position[]
  recentTrades: Trade[]
  metrics: StrategyMetrics | null
  isLoading: boolean
  error: string | null

  // 动作
  pauseAgent: () => Promise<void>
  resumeAgent: () => Promise<void>
  stopAgent: () => Promise<void>
  refresh: () => Promise<void>
}
```

---

### Story 3.2: 监控 API 接口与数据层

**标题**: 实现监控 API 接口和 MonitorStore

**描述**:
扩展 API 客户端支持监控操作，创建 MonitorStore 管理监控数据缓存。

**验收标准**:
- [ ] `lib/api.ts` 新增 `getAgentStatus()`, `getAgentPositions()`, `getAgentTrades()`
- [ ] `lib/api.ts` 新增 `pauseAgent()`, `resumeAgent()`, `stopAgent()`
- [ ] 创建 `store/monitor.ts` (Zustand)
- [ ] Mock 数据支持开发测试
- [ ] TypeScript 类型完整

**API 设计**:
```typescript
// lib/api.ts 扩展
async getAgentStatus(agentId: string): Promise<AgentStatus>
async getAgentPositions(agentId: string): Promise<Position[]>
async getAgentTrades(agentId: string, limit?: number): Promise<Trade[]>
async getAgentMetrics(agentId: string): Promise<StrategyMetrics>
async pauseAgent(agentId: string): Promise<{ success: boolean }>
async resumeAgent(agentId: string): Promise<{ success: boolean }>
async stopAgent(agentId: string): Promise<{ success: boolean }>
```

---

### Story 3.3: ChatInterface 监控流程集成

**标题**: 集成监控流程到对话界面

**描述**:
当用户请求监控策略或 AI 返回相关 action 时，ChatInterface 弹出 MonitorCanvas。

**验收标准**:
- [ ] ChatInterface 检测 `stop_agent` action
- [ ] 支持用户主动请求 "监控策略" 命令
- [ ] 弹出 MonitorCanvas 并显示实时数据
- [ ] 策略状态变更后在对话中显示反馈
- [ ] 与 AgentStore 联动正确
- [ ] TypeScript 类型安全检查通过

**集成流程**:
```
1. AI 返回 InsightData with actions: ['stop_agent'] 或用户请求监控
   ↓
2. ChatInterface 检测 action
   ↓
3. handleInsightAction 触发
   ↓
4. setMonitorOpen(true) + 设置 agentId
   ↓
5. MonitorCanvas 弹出
   ↓
6. useMonitor 开始轮询数据
   ↓
7. 用户操作 → 调用 API
   ↓
8. 状态更新 → AgentStore 同步
```

---

## 兼容性要求

- [x] 现有 MonitorCanvas UI 保持不变
- [x] AgentStore 接口兼容
- [x] InsightData.actions 向后兼容
- [x] 现有 API 客户端结构保持
- [x] ChatInterface 扩展不影响现有功能

---

## 风险缓解

### 主要风险
**实时数据需要后端 WebSocket 或轮询支持**

### 缓解措施
1. Mock API 层完整模拟监控数据
2. 使用轮询模式 (polling) 作为首选
3. WebSocket 作为可选增强
4. 接口设计支持后续后端集成

### 回滚计划
1. Mock 模式可随时切换
2. MonitorCanvas 独立于其他 Canvas
3. 监控失败不影响策略运行

---

## Definition of Done

- [x] 所有 3 个 Stories 完成并通过验收
- [x] useMonitor Hook 功能完整
- [x] 监控流程端到端可用 (打开 → 查看 → 操作)
- [x] 与 AgentStore 联动正确
- [x] TypeScript 类型检查通过
- [x] 无 P0/P1 级别 Bug

---

## 验证清单

### 范围验证
- [x] Epic 可在 3 个 Stories 内完成
- [x] 无需架构层面变更
- [x] 遵循现有 Canvas/Hook 模式
- [x] 复用已有 UI 组件

### 风险评估
- [x] 对现有系统风险: 低 (新增 Hook，扩展 API)
- [x] 回滚方案可行
- [x] Mock 数据可支持独立开发
- [x] 团队具备技术栈经验

### 完整性检查
- [x] Epic 目标清晰可实现
- [x] Stories 范围合理
- [x] 成功标准可衡量
- [x] 与 EPIC-001/002 模式一致

---

## Story Manager 移交

**Story Manager 移交说明:**

请为此 Brownfield Epic 开发详细的用户故事。关键考虑事项：

- 这是对运行 **Next.js 15 + React 19 + Zustand** 的现有系统的增强
- **集成点**: ChatInterface action 检测、MonitorCanvas 状态管理、AgentStore 联动
- **需遵循的现有模式**:
  - useBacktest Hook 模式 (参考 `hooks/useBacktest.ts`)
  - Canvas 滑出交互 (参考 `MonitorCanvas.tsx`)
  - API 客户端扩展 (参考 `lib/api.ts`)
- **关键兼容性要求**:
  - 已有 MonitorCanvas UI 保持不变
  - AgentStore 接口兼容
- 每个 Story 必须包含与已有组件的集成测试

Epic 目标: **实现完整的策略实时监控功能，让用户可以监控运行中策略的状态、持仓、盈亏和交易记录**

---

**创建时间**: 2025-12-25
**创建者**: YOLO Workflow Autonomous Agent
**来源**: PRD Feature 5.2 + Canvas 系统完整性分析

