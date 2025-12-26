# Epic 001: 策略部署流程 - Brownfield Enhancement

> 基于 PRD S10-11 场景，为 Delta Terminal 添加 Paper/Live 部署功能

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-001 |
| 名称 | 策略部署流程 (S10-11) |
| 类型 | Brownfield Enhancement |
| 优先级 | P0 (紧急) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-25 |
| PRD 参考 | `delta-terminal-v3-complete.html#s10` |

---

## Epic Goal

**实现从回测通过到 Paper 模拟盘再到 Live 实盘的完整策略部署流程，提供安全的双重确认机制和清晰的部署状态追踪。**

这是策略生命周期的核心环节，直接关系到用户资金安全和交易执行。

---

## 现有系统上下文

### 技术栈
- **框架**: Next.js 15 + React 19 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Shadcn/ui + TailwindCSS + RiverBit Design System
- **A2UI 控件**: ParamSlider, ParamToggle, ParamButtonGroup, LogicBuilder

### 相关现有组件

| 组件 | 路径 | 功能 |
|------|------|------|
| CanvasPanel | `components/canvas/CanvasPanel.tsx` | 策略提案滑出面板 |
| BacktestCanvas | `components/canvas/BacktestCanvas.tsx` | 回测结果展示 |
| MonitorCanvas | `components/canvas/MonitorCanvas.tsx` | 策略运行监控 |
| AgentStore | `store/agent.ts` | Agent 状态管理 (含 live/paper/shadow) |
| InsightData | `types/insight.ts` | A2UI 数据结构 |

### 现有状态定义

```typescript
// store/agent.ts
export type AgentStatus = 'live' | 'paper' | 'shadow' | 'paused' | 'stopped'
```

### 集成点

1. **CanvasPanel 模式扩展** - 新增 `mode: 'deploy'`
2. **AgentStore 状态流转** - `backtest_passed → paper → live`
3. **API 层** - `lib/api.ts` 新增部署接口
4. **InsightData actions** - 添加 `'deploy_paper' | 'deploy_live'`

---

## 增强详情

### PRD 规范摘要 (S10-11)

#### S10. Paper 部署
- **前置条件**: 回测已通过 (显示 ✓ 标识)
- **配置项**:
  - 虚拟资金额度 (默认 $10,000)
  - 模式徽章: `Paper` (黄色)
- **动作**: "部署模拟盘" 按钮

#### S11. Live 部署
- **前置条件**:
  - 回测通过 ✓
  - Paper 运行 7 天 ✓
- **配置项**:
  - 初始资金额度
  - Paper 阶段收益率展示
- **安全机制**:
  - ⚠️ 实盘涉及真实资金警告
  - ☑️ 明确勾选确认 checkbox
  - 按钮置灰直到确认
- **动作**: "确认实盘部署" 按钮

### 成功标准

1. ✅ 用户可在回测通过后一键部署 Paper 模式
2. ✅ Paper 运行 7 天后可申请 Live 部署
3. ✅ Live 部署需双重确认 (警告 + checkbox)
4. ✅ 部署状态实时更新到 AgentStore
5. ✅ 部署失败时显示明确错误信息和回滚指引

---

## Stories

### Story 1: DeployCanvas 组件开发

**标题**: 创建 DeployCanvas 部署确认画布

**描述**:
开发一个新的 Canvas 组件，支持 Paper 和 Live 两种部署模式的确认流程。

**验收标准**:
- [ ] 创建 `DeployCanvas.tsx` 组件
- [ ] 支持 `mode: 'paper' | 'live'` 切换
- [ ] Paper 模式显示虚拟资金配置
- [ ] Live 模式显示前置条件检查、资金配置、双重确认
- [ ] 复用 RiverBit Design System 样式
- [ ] 与 CanvasPanel 滑出交互一致

**技术细节**:
```typescript
interface DeployCanvasProps {
  strategyId: string;
  mode: 'paper' | 'live';
  backtestResult: BacktestSummary;
  paperPerformance?: PaperPerformance; // Live 模式需要
  onDeploy: (config: DeployConfig) => Promise<void>;
  onCancel: () => void;
}
```

---

### Story 2: 部署 API 接口与状态流转

**标题**: 实现部署 API 接口和 AgentStore 状态管理

**描述**:
扩展 API 客户端和 Zustand Store，支持策略部署流程和状态追踪。

**验收标准**:
- [ ] `lib/api.ts` 新增 `deployPaper()` 和 `deployLive()` 方法
- [ ] `store/agent.ts` 新增部署状态流转逻辑
- [ ] 部署进度通过 WebSocket 实时推送
- [ ] 错误处理和回滚机制
- [ ] 添加部署记录到历史

**API 设计**:
```typescript
// lib/api.ts
async deployPaper(strategyId: string, config: {
  virtualCapital: number;
}): Promise<DeploymentResult>

async deployLive(strategyId: string, config: {
  initialCapital: number;
  confirmationToken: string; // 双重确认令牌
}): Promise<DeploymentResult>
```

---

### Story 3: 部署流程集成与 E2E 测试

**标题**: 集成部署流程到 ChatInterface 并编写测试

**描述**:
将 DeployCanvas 集成到主对话流程，当 AI 返回 `action: 'deploy_paper' | 'deploy_live'` 时自动弹出部署确认面板。

**验收标准**:
- [ ] ChatInterface 识别部署 action 并弹出 DeployCanvas
- [ ] InsightData.actions 扩展支持 `deploy_paper` | `deploy_live`
- [ ] 部署成功后自动切换到 MonitorCanvas
- [ ] 编写 Playwright E2E 测试用例
- [ ] 验证现有回测/监控功能不受影响

**集成点**:
```typescript
// ChatInterface.tsx
if (insight.actions.includes('deploy_paper')) {
  setCanvasMode('deploy');
  setDeployMode('paper');
  openCanvas();
}
```

---

## 兼容性要求

- [x] 现有 API 保持不变
- [x] 数据库 Schema 无破坏性变更 (新增字段仅为可选)
- [x] UI 变更遵循现有 RiverBit Design System
- [x] Canvas 滑出交互与 CanvasPanel 一致
- [x] AgentStore 状态流转向后兼容

---

## 风险缓解

### 主要风险
**Live 部署涉及真实资金，错误部署可能导致资金损失**

### 缓解措施
1. 双重确认机制 (警告 + checkbox)
2. 前置条件强制检查 (回测 ✓ + Paper 7 天 ✓)
3. 部署操作需要后端二次验证
4. 部署记录完整审计日志

### 回滚计划
1. 部署失败时自动回滚到上一状态
2. Live 部署可随时切换回 Paper 模式
3. Kill Switch 可紧急停止所有交易

---

## Definition of Done

- [ ] 所有 3 个 Stories 完成并通过验收
- [ ] Paper/Live 部署流程端到端可用
- [ ] 现有回测、监控功能回归测试通过
- [ ] DeployCanvas 组件文档更新
- [ ] API 接口文档更新
- [ ] 无 P0/P1 级别 Bug

---

## 验证清单

### 范围验证
- [x] Epic 可在 3 个 Stories 内完成
- [x] 无需架构层面变更
- [x] 遵循现有 Canvas/A2UI 模式
- [x] 集成复杂度可控

### 风险评估
- [x] 对现有系统风险: 低 (新增组件，不修改核心逻辑)
- [x] 回滚方案可行
- [x] 测试策略覆盖现有功能
- [x] 团队具备集成点知识

### 完整性检查
- [x] Epic 目标清晰可实现
- [x] Stories 范围合理
- [x] 成功标准可衡量
- [x] 依赖已识别

---

## Story Manager 移交

**Story Manager 移交说明:**

请为此 Brownfield Epic 开发详细的用户故事。关键考虑事项：

- 这是对运行 **Next.js 15 + React 19 + Zustand** 的现有系统的增强
- **集成点**: CanvasPanel 模式扩展、AgentStore 状态流转、API 客户端扩展
- **需遵循的现有模式**:
  - Canvas 滑出交互 (参考 `CanvasPanel.tsx`)
  - A2UI 控件使用 (参考 `ParamSlider.tsx`, `ParamToggle.tsx`)
  - RiverBit Design System 样式
- **关键兼容性要求**:
  - 现有回测/监控功能不受影响
  - AgentStore 状态向后兼容
- 每个 Story 必须包含验证现有功能保持完整的测试

Epic 目标: **实现安全、直观的 Paper → Live 策略部署流程，保护用户资金安全**

---

**创建时间**: 2025-12-25
**创建者**: BMad Orchestrator (Party Mode Analysis)
**来源**: PRD S10-11 场景 + Party Mode 架构师/产品负责人分析
