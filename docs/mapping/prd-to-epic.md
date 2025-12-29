# PRD 到 EPIC 映射文档

> 版本：3.4
> 创建日期：2025-12-26
> 最后更新：2025-12-29 (A2UI 扩展路线图, 测试矩阵扩展)

---

## 文档目的

本文档建立 PRD (产品需求文档) 与实际开发 EPIC 之间的对应关系，确保：

1. 产品需求与开发工作的一致性
2. 功能覆盖完整性可追溯
3. 优先级执行符合 MVP 计划

---

## V3 设计系统场景总览

Delta Terminal V3 设计系统包含 **79 个核心场景**，分布在 16 个功能分区：

| 分区    | 场景范围 | 数量 | 核心主题                                                       |
| ------- | -------- | ---- | -------------------------------------------------------------- |
| Part 1  | S01-S05  | 5    | 核心概念 (A2UI, InsightData, Canvas, 状态机)                   |
| Part 2  | S06-S12  | 7    | 策略生命周期 (创建→回测→部署→迭代)                             |
| Part 3  | S13-S18  | 6    | A2UI 控件交互 (参数、约束、敏感度)                             |
| Part 4  | S19-S25  | 7    | 运营监控 (K线、订单、仓位、干预)                               |
| Part 5  | S26-S31  | 6    | 风险控制 (哨兵、熔断、审批)                                    |
| Part 6  | S32-S35  | 4    | 报表分析 (绩效、归因、对比)                                    |
| Part 7  | S36-S40  | 5    | 系统功能 (主题、语言、引导、帮助)                              |
| Part 8  | S41-S45  | 5    | 状态处理 (加载、错误、空态、边界)                              |
| Part 9  | S46-S49  | 6    | 智能澄清与模板系统 (含 A2UI 2.0 推理链 + chatHistory Fallback) |
| Part 10 | S51-S52  | 2    | 多对/组合策略                                                  |
| Part 11 | S53-S57  | 5    | Spirit 人格与社区集成                                          |
| Part 12 | S58-S63  | 6    | 移动端审批与通知                                               |
| Part 13 | S65-S68  | 4    | 学习成长 (虚拟货币、排行榜)                                    |
| Part 14 | S69-S72  | 4    | 高级回测与参数优化                                             |
| Part 15 | S74-S77  | 4    | 策略健康与诊断                                                 |
| Part 16 | S78-S80  | 3    | 系统集成与扩展                                                 |

> 注：S50/S64/S73 已合并到相关场景中；S46+/S46++ 为 A2UI 2.0 增强功能；S53 为 Trading
> Spirit 人格系统

---

## Part 1: 核心概念 (S01-S05)

### 场景映射

| 场景 ID | 场景名称             | 实现 EPIC    | 状态    | 优先级 |
| ------- | -------------------- | ------------ | ------- | ------ |
| S01     | A2UI 系统概览        | EPIC-001     | ✅ 完成 | P0     |
| S02     | InsightData 数据结构 | EPIC-001     | ✅ 完成 | P0     |
| S03     | InsightCard 卡片系统 | EPIC-001     | ✅ 完成 | P0     |
| S04     | Canvas 画布系统      | EPIC-001/003 | ✅ 完成 | P0     |
| S05     | 策略状态机           | EPIC-001     | ✅ 完成 | P0     |

### 详细说明

#### S01 A2UI 系统概览

- **定义**: AI-to-UI 双向交互系统
- **实现**:
  - `ChatInterface.tsx` - 对话界面
  - `CanvasPanel.tsx` - 画布面板
  - `InsightCard.tsx` - 智能卡片
- **状态**: ✅ 核心架构完成，双向绑定已实现

#### S02 InsightData 数据结构

- **定义**: AI 生成的结构化策略配置数据
- **实现**:
  - `types/insight.ts` - 10+ 种 InsightType
  - ParamType 支持 10+ 种控件类型
  - 约束类型 (min_max, dependency, mutual_exclusive, conditional)
- **状态**: ✅ 完成

#### S03 InsightCard 卡片系统

- **定义**: InsightData 的可视化编辑卡片
- **实现**:
  - `InsightCard.tsx` - 主卡片组件
  - `ClarificationCard.tsx` - 澄清卡片
  - `InsightMessage.tsx` - 消息卡片
  - `ReasoningChainView.tsx` - 推理链可视化
- **状态**: ✅ 完成 10+ 种卡片类型

#### S04 Canvas 画布系统

- **定义**: 策略配置、回测、部署、监控的滑动画布
- **实现**: **12 种 Canvas 已实现**
  - `BacktestCanvas.tsx` - 回测结果
  - `DeployCanvas.tsx` - 策略部署
  - `MonitorCanvas.tsx` - 实时监控
  - `ConfigCanvas.tsx` - 参数配置
  - `RiskSettings.tsx` - 风险设置
  - `BacktestInsightCanvas.tsx` - 回测洞察
  - `SensitivityCanvas.tsx` - 敏感度分析
  - `ComparisonCanvas.tsx` - 对比分析
  - `AttributionCanvas.tsx` - 归因分析
  - `VersionHistoryCanvas.tsx` - 版本历史
  - `Canvas.tsx` - 基础框架
  - `CanvasPanel.tsx` - 面板容器
- **状态**: ✅ 完成

#### S05 策略状态机

- **定义**: draft → configured → backtested → deployed → running → stopped
- **实现**:
  - `store/ai.ts` - AI 状态管理
  - `store/backtest.ts` - 回测状态
  - `store/paperTrading.ts` - 模拟交易状态
  - `store/safety.ts` - 安全状态
  - `store/version.ts` - 版本状态
  - `store/intervention.ts` - 干预状态
  - 共 17 个 Zustand Store 完整实现
- **状态**: ✅ 完成

---

## Part 2: 策略生命周期 (S06-S12)

### 场景映射

| 场景 ID | 场景名称        | 实现 EPIC | 状态      | 优先级 |
| ------- | --------------- | --------- | --------- | ------ |
| S06     | AI 对话创建策略 | EPIC-001  | ✅ 完成   | P0     |
| S07     | 多因子策略构建  | 待规划    | ❌ 未实现 | P1     |
| S08     | 回测参数配置    | EPIC-002  | ✅ 完成   | P0     |
| S09     | 回测结果分析    | EPIC-002  | ✅ 完成   | P0     |
| S10     | 策略部署上线    | EPIC-001  | ✅ 完成   | P0     |
| S11     | 策略迭代优化    | EPIC-007  | ✅ 完成   | P1     |
| S12     | 策略版本管理    | EPIC-007  | ✅ 完成   | P2     |

### 详细说明

#### S06 AI 对话创建策略

- **流程**: 用户输入 → AI 解析 → InsightData 生成 → Canvas 展示
- **实现**:
  - `ChatInterface.tsx` - 聊天接口
  - `/api/ai/chat/route.ts` - Chat API
  - `/api/ai/chat/stream/route.ts` - 流式 Chat
  - `ai-orchestrator/orchestrator.ts` - AI 编排引擎
- **状态**: ✅ 完成

#### S08-S09 回测系统

- **实现**: 完整的回测组件套件
  - `BacktestForm.tsx` - 参数表单
  - `BacktestCanvas.tsx` - 结果展示
  - `BacktestEquityCurve.tsx` - 净值曲线
  - `BacktestKlineChart.tsx` - K线图表
  - `BacktestHistory.tsx` - 历史记录
  - `BacktestParamPanel.tsx` - 参数面板
  - `BacktestResults.tsx` - 结果面板
  - `BacktestStatsCard.tsx` - 统计卡片
  - `/api/backtest/run/route.ts` - 回测 API
  - `store/backtest.ts` - 状态管理
  - `hooks/useBacktest.ts` - 回测 Hook
- **状态**: ✅ 完成

#### S10 策略部署上线

- **实现**:
  - `DeployCanvas.tsx` - 部署 Canvas
  - `ApprovalFlow.tsx` - 审批流程
  - `ApprovalHistory.tsx` - 审批历史
  - `types/deployment.ts` - 类型定义
  - `hooks/useDeployment.ts` - 部署 Hook
- **状态**: ✅ 完成

#### S11 策略迭代优化

- **实现**:
  - `SensitivityCanvas.tsx` - 敏感度分析
  - `VersionCompare.tsx` - 版本对比
  - `VersionList.tsx` - 版本列表
  - `store/version.ts` - 版本状态
- **状态**: ✅ 完成

#### S12 策略版本管理

- **实现**:
  - `VersionHistoryCanvas.tsx` - 版本历史 Canvas
  - `VersionCompare.tsx` - 版本对比
  - `VersionList.tsx` - 版本列表
  - `store/version.ts` - 版本状态管理
  - `types/version.ts` - 类型定义
- **状态**: ✅ 完成

---

## Part 3: A2UI 控件交互 (S13-S18)

### 场景映射

| 场景 ID | 场景名称       | 实现 EPIC | 状态      | 优先级 |
| ------- | -------------- | --------- | --------- | ------ |
| S13     | 参数值调整     | EPIC-001  | ✅ 完成   | P0     |
| S14     | L1/L2 参数层级 | EPIC-001  | ⚠️ 部分   | P1     |
| S15     | 参数约束与验证 | EPIC-001  | ✅ 完成   | P0     |
| S16     | 敏感度分析     | EPIC-007  | ✅ 完成   | P1     |
| S17     | K线拖拽设置    | 待规划    | ❌ 未实现 | P2     |
| S18     | 参数联动更新   | EPIC-001  | ✅ 完成   | P1     |

### 详细说明

#### S13 参数值调整

- **实现**: 完整的 A2UI 控件集合
  - `ParamSlider.tsx` - 滑块控件
  - `ParamControl.tsx` - 通用参数控制
  - `ParamToggle.tsx` - 开关控件
  - `ParamButtonGroup.tsx` - 按钮组
  - `LogicBuilder.tsx` - 逻辑构建器
  - `HeatmapSlider.tsx` - 热力图滑块
- **状态**: ✅ 完成 7 种控件

#### S15 参数约束与验证

- **实现**:
  - `lib/constraint-engine.ts` - 约束引擎
  - `hooks/useConstraintValidation.ts` - 约束验证 Hook
  - `hooks/useParamConstraints.ts` - 参数约束 Hook
  - `hooks/useParamValidation.ts` - 参数验证 Hook
  - `types/constraint.ts` - 约束类型定义
- **状态**: ✅ 完成

#### S16 敏感度分析

- **实现**:
  - `SensitivityCanvas.tsx` - 敏感度分析 Canvas
  - 参数变化对策略性能的影响可视化
- **状态**: ✅ 完成

#### S18 参数联动更新

- **实现**: 通过约束引擎实现参数联动
- **状态**: ✅ 完成

---

## Part 4: 运营监控 (S19-S25)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态    | 优先级 |
| ------- | ------------ | --------- | ------- | ------ |
| S19     | 实时监控面板 | EPIC-003  | ✅ 完成 | P0     |
| S20     | K线信号标注  | EPIC-003  | ✅ 完成 | P1     |
| S21     | 订单管理     | EPIC-001  | ✅ 完成 | P0     |
| S22     | 仓位管理     | EPIC-004  | ✅ 完成 | P0     |
| S23     | 运行参数配置 | EPIC-001  | ✅ 完成 | P0     |
| S24     | 手动干预机制 | EPIC-004  | ✅ 完成 | P0     |
| S25     | 策略回滚     | EPIC-007  | ✅ 完成 | P2     |

### 详细说明

#### S19 实时监控面板

- **实现**:
  - `MonitorCanvas.tsx` - 监控 Canvas
  - `SignalLog.tsx` - 信号日志
  - `hooks/useMonitor.ts` - 监控 Hook
  - `store/monitor.ts` - 监控状态
- **状态**: ✅ 完成

#### S21 订单管理

- **实现**:
  - `OrderForm.tsx` - 下单表单
  - `OrderBook.tsx` - 订单簿
  - `TradeHistory.tsx` - 交易历史
- **状态**: ✅ 完成

#### S22 仓位管理

- **实现**:
  - `PositionCard.tsx` - 仓位卡片
  - `PaperTradingPanel.tsx` - 模拟交易面板
  - `PaperTradingDashboard.tsx` - 仪表盘
  - `hooks/usePaperTrading.ts` - 模拟交易 Hook
  - `types/paperTrading.ts` - 类型定义
- **状态**: ✅ 完成

#### S20 K线信号标注

- **实现**:
  - `TradingViewChart.tsx` - 实时 K 线图表 (370+ 行)
  - 基于 lightweight-charts v5
  - 支持买入/卖出/平仓信号标注
  - 止损/止盈价格线
  - 多时间周期切换 (1m-1d)
  - 24h 统计数据展示
- **状态**: ✅ 完成

#### S24 手动干预机制

- **实现**:
  - `InterventionPanel.tsx` - 干预面板
  - `InterventionHistory.tsx` - 干预历史
  - `EmergencyActions.tsx` - 紧急操作
  - `store/intervention.ts` - 干预状态管理
  - `types/intervention.ts` - 类型定义
- **状态**: ✅ 完成

#### S25 策略回滚

- **实现**: 通过 VersionHistoryCanvas 实现版本回滚
- **状态**: ✅ 完成

---

## Part 5: 风险控制 (S26-S31)

### 场景映射

| 场景 ID | 场景名称               | 实现 EPIC | 状态    | 优先级 |
| ------- | ---------------------- | --------- | ------- | ------ |
| S26     | 风险哨兵系统           | EPIC-004  | ✅ 完成 | P0     |
| S27     | 风险仪表盘             | EPIC-004  | ✅ 完成 | P0     |
| S28     | 保证金预警             | EPIC-004  | ✅ 完成 | P0     |
| S29     | 熔断机制               | EPIC-004  | ✅ 完成 | P0     |
| S30     | 一键止损 (Kill Switch) | EPIC-004  | ✅ 完成 | P0     |
| S31     | 风险审批流程           | EPIC-004  | ✅ 完成 | P1     |

### 详细说明

#### S26 风险哨兵系统

- **实现**:
  - `SentinelAlerts.tsx` - 哨兵告警
  - `store/safety.ts` - 安全状态管理
  - `types/safety.ts` - 安全类型定义
- **状态**: ✅ 完成

#### S27 风险仪表盘

- **实现**:
  - `/app/risk/page.tsx` - 风险管理页面
  - 风险敞口、VaR、最大回撤等指标展示
- **状态**: ✅ 完成

#### S28 保证金预警

- **实现**:
  - `MarginAlert.tsx` - 保证金告警
  - `hooks/useMarginMonitor.ts` - 保证金监控 Hook
  - `types/safety.ts` - 保证金状态类型
- **状态**: ✅ 完成

#### S29 熔断机制

- **实现**:
  - `CircuitBreakerPanel.tsx` - 熔断面板
  - `ExtremeMarketPanel.tsx` - 极端市场面板
  - `store/safety.ts` - 安全状态管理
- **状态**: ✅ 完成

#### S30 一键止损 (Kill Switch)

- **实现**:
  - `KillSwitch.tsx` - Kill Switch 主组件
  - `KillSwitchModal.tsx` - Kill Switch 模态
  - `store/safety.ts` - 安全状态管理
- **状态**: ✅ 完成

#### S31 风险审批流程

- **实现**:
  - `ApprovalFlow.tsx` - 审批流程
  - `ApprovalHistory.tsx` - 审批历史
  - `types/deployment.ts` - 审批类型定义
- **状态**: ✅ 完成

---

## Part 6: 报表分析 (S32-S35)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态    | 优先级 |
| ------- | ------------ | --------- | ------- | ------ |
| S32     | 绩效报表     | EPIC-002  | ✅ 完成 | P1     |
| S33     | 交易明细报表 | EPIC-002  | ✅ 完成 | P1     |
| S34     | 盈亏归因分析 | EPIC-007  | ✅ 完成 | P2     |
| S35     | 策略对比分析 | EPIC-007  | ✅ 完成 | P2     |

### 详细说明

#### S32 绩效报表

- **实现**:
  - `BacktestResults.tsx` - 回测结果面板
  - `BacktestStatsCard.tsx` - 统计卡片
  - 收益率、夏普比率、最大回撤等指标
- **状态**: ✅ 完成

#### S33 交易明细报表

- **实现**:
  - `TradeHistory.tsx` - 交易历史
  - `BacktestHistory.tsx` - 回测历史
- **状态**: ✅ 完成

#### S34 盈亏归因分析

- **实现**:
  - `AttributionCanvas.tsx` - 归因分析 Canvas
  - 分析盈亏来源（策略/时段/品种）
- **状态**: ✅ 完成

#### S35 策略对比分析

- **实现**:
  - `ComparisonCanvas.tsx` - 对比分析 Canvas
  - `VersionCompare.tsx` - 版本对比
  - 多策略横向对比
- **状态**: ✅ 完成

---

## Part 7: 系统功能 (S36-S40)

### 场景映射

| 场景 ID | 场景名称      | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------- | --------- | --------- | ------ |
| S36     | 深色/浅色主题 | 已实现    | ✅ 完成   | P1     |
| S37     | 多语言支持    | 待规划    | ❌ 未实现 | P2     |
| S38     | 新手引导      | 已实现    | ✅ 完成   | P1     |
| S39     | 帮助系统      | 已实现    | ⚠️ 部分   | P2     |
| S40     | 系统设置      | EPIC-006  | ✅ 完成   | P0     |

### 详细说明

#### S36 深色/浅色主题

- **实现**:
  - `theme-switcher.tsx` - 主题切换器
  - `ThemeProvider.tsx` - 主题提供者
  - TailwindCSS dark mode
- **状态**: ✅ 完成

#### S38 新手引导

- **实现**:
  - `OnboardingTour.tsx` - 引导界面
  - `store/onboarding.ts` - 引导状态管理
- **状态**: ✅ 完成

#### S40 系统设置

- **实现**:
  - `/app/settings/page.tsx` - 设置页面
  - 完整的用户设置、API Key 管理
- **状态**: ✅ 完成

---

## Part 8: 状态处理 (S41-S45)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态    | 优先级 |
| ------- | ------------ | --------- | ------- | ------ |
| S41     | 加载状态     | 已实现    | ✅ 完成 | P0     |
| S42     | 错误状态处理 | 已实现    | ✅ 完成 | P0     |
| S43     | 空状态展示   | 已实现    | ✅ 完成 | P0     |
| S44     | 边界情况处理 | 已实现    | ✅ 完成 | P0     |
| S45     | 网络断线处理 | EPIC-008  | ✅ 完成 | P1     |

### 详细说明

#### S41 加载状态

- **实现**:
  - `skeleton.tsx` - Skeleton 组件
  - `InsightCardLoading.tsx` - 加载指示器
  - `SystemLoading.tsx` - 系统加载
  - `ThinkingIndicator.tsx` - 思考指示器
- **状态**: ✅ 完成

#### S42 错误状态处理

- **实现**:
  - `ErrorBoundary.tsx` - 错误边界
  - `ApiError.tsx` - API 错误
  - `/app/error.tsx` - 全局错误处理
  - `/app/global-error.tsx` - 全局错误页面
- **状态**: ✅ 完成

#### S43 空状态展示

- **实现**: 各列表组件的空状态 UI
- **状态**: ✅ 完成

#### S44 边界情况处理

- **实现**: 数据验证、极端值处理
- **状态**: ✅ 完成

#### S45 网络断线处理

- **实现**:
  - `useOnlineStatus.ts` - 网络状态检测 Hook (155 行)
    - 浏览器 online/offline 事件监听
    - 周期性 ping 检测实际连接状态
    - 离线持续时间计算
    - 重连次数追踪
  - `useOfflineQueue.ts` - 离线请求队列 Hook (214 行)
    - 离线时缓存请求到队列
    - localStorage 持久化
    - 恢复在线时自动重试
    - 请求优先级和过期时间
  - `OfflineBanner.tsx` - 离线提示组件 (148 行)
    - OfflineBanner - 顶部横幅
    - OfflineIndicator - 最小化指示器
    - OfflineOverlay - 全屏遮罩
    - 显示队列计数和重连状态
- **状态**: ✅ 完成

---

## Part 9: 智能澄清与模板 (S46-S49)

### 场景映射

| 场景 ID | 场景名称                                | 实现 EPIC | 状态      | 优先级 |
| ------- | --------------------------------------- | --------- | --------- | ------ |
| S46     | AI 主动澄清                             | EPIC-001  | ✅ 完成   | P1     |
| S46+    | 推理链可视化 (A2UI 2.0)                 | EPIC-001  | ✅ 完成   | P1     |
| S46++   | 无状态上下文恢复 (chatHistory Fallback) | EPIC-001  | ✅ 完成   | P0     |
| S47     | 策略模板库                              | EPIC-001  | ✅ 完成   | P1     |
| S48     | 模板自定义                              | 待规划    | ❌ 未实现 | P2     |
| S49     | 智能推荐                                | 待规划    | ❌ 未实现 | P2     |

### 详细说明

#### S46 AI 主动澄清 (含 S50)

- **定义**: 用户输入模糊时，AI 主动提问澄清
- **实现**:
  - `ClarificationCard.tsx` - 澄清卡片
  - NLP Processor 澄清逻辑
- **状态**: ✅ 完成

#### S46+ 推理链可视化 (A2UI 2.0 增强)

- **定义**: 展示 AI 从理解意图到给出推荐的完整思考过程
- **核心理念**: 透明性 + 可交互 + 可追溯
- **后端实现**:
  - `ai-engine/nlp-processor/src/models/reasoning_chain.py` - 数据模型
  - `ai-engine/nlp-processor/src/services/reasoning_service.py` - 生成服务
- **前端实现**:
  - `types/reasoning.ts` - 类型定义
  - `ReasoningChainView.tsx` - 可视化组件
  - `hooks/useThinkingStream.ts` - 推理流处理 Hook
  - `ThinkingIndicator.tsx` - 思考指示器
- **功能**:
  - 节点类型: understanding → analysis → decision → recommendation → warning
  - 用户可确认/质疑/修改任意推理步骤
  - 支持分支探索（其他可能的策略角度）
  - 置信度可视化 + 证据标签
- **状态**: ✅ 完成

#### S46++ 无状态上下文恢复 (chatHistory Fallback)

- **定义**: 在无 Redis 或后端重启场景下，通过前端传递对话历史恢复上下文
- **核心问题**: Railway 部署环境无 Redis，对话上下文丢失导致多步骤引导失败
- **前端实现**:
  - `hooks/useA2UIInsight.ts` - 维护 chatHistory 并传递给后端
  - `app/api/ai/insight/route.ts` - 转发 chatHistory 到 NLP Processor
- **后端实现**:
  - `ai-engine/nlp-processor/src/api/endpoints/chat.py` - 从 chatHistory 重建 Conversation
  - `ai-engine/nlp-processor/src/services/conversation_store.py` - MemoryStore fallback
- **功能**:
  - 前端维护完整对话历史 (user/assistant 消息)
  - API 请求携带 chatHistory 作为 context 参数
  - 后端从 chatHistory 重建 Conversation 对象
  - 多步骤引导中正确恢复 collectedParams
- **状态**: ✅ 完成

#### S47 策略模板库

- **实现**:
  - `TemplateSelector.tsx` - 模板选择器
  - `lib/templates/strategies.ts` - 策略模板库
  - 预设策略模板（DCA、网格等）
- **状态**: ✅ 完成

---

## Part 10: 多对/组合策略 (S51-S52)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------ | --------- | --------- | ------ |
| S51     | 多交易对策略 | 待规划    | ❌ 未实现 | P1     |
| S52     | 策略组合管理 | 待规划    | ❌ 未实现 | P2     |

---

## Part 11: Spirit 人格与社区集成 (S54-S57)

### 场景映射

| 场景 ID | 场景名称                | 实现 EPIC | 状态      | 优先级 |
| ------- | ----------------------- | --------- | --------- | ------ |
| S53     | Trading Spirit 人格系统 | EPIC-001  | ✅ 完成   | P1     |
| S54     | 策略分享                | 待规划    | ❌ 未实现 | P2     |
| S55     | 策略订阅                | 待规划    | ❌ 未实现 | P2     |
| S56     | 社区排行榜              | 待规划    | ❌ 未实现 | P3     |
| S57     | 社交互动                | 待规划    | ❌ 未实现 | P3     |

### 详细说明

#### S53 Trading Spirit 人格系统 (新增)

- **定义**: 个性化 AI 交易助手人格，通过反应式 Orb 可视化展示状态
- **实现**:
  - `SpiritOrb.tsx` - 3D Orb 可视化组件 (WebGL 着色器)
  - `SpiritCreationWizard.tsx` - Spirit 创建引导向导
  - `OrbShader.ts` - 自定义着色器效果
  - `useSpiritController.ts` - Spirit 状态控制 Hook
  - Supabase 集成用于 Spirit 数据持久化
- **状态**: ✅ 完成

---

## Part 12: 移动端审批与通知 (S58-S63)

### 场景映射

| 场景 ID | 场景名称            | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------------- | --------- | --------- | ------ |
| S58     | 移动端审批 (含 S64) | 待规划    | ❌ 未实现 | P1     |
| S59     | 推送通知            | EPIC-005  | ✅ 完成   | P1     |
| S60     | 通知偏好设置        | EPIC-005  | ✅ 完成   | P1     |
| S61     | 紧急通知渠道        | 待规划    | ❌ 未实现 | P1     |
| S62     | 通知历史            | EPIC-005  | ✅ 完成   | P1     |
| S63     | 智能通知聚合        | 待规划    | ❌ 未实现 | P2     |

### 详细说明

#### S59-S62 通知系统

- **实现**:
  - `NotificationCenter.tsx` - 通知中心
  - `store/notification.ts` - 通知状态管理
  - `lib/notification.ts` - 通知工具库
  - `lib/toast.ts` - Toast 提示
- **状态**: ✅ 完成

---

## Part 13: 学习成长 (S65-S68)

### 场景映射

| 场景 ID | 场景名称                 | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------------------ | --------- | --------- | ------ |
| S65     | 模拟交易 (Paper Trading) | 已实现    | ✅ 完成   | P0     |
| S66     | 虚拟货币系统             | 待规划    | ❌ 未实现 | P2     |
| S67     | 学习排行榜               | 待规划    | ❌ 未实现 | P3     |
| S68     | 成就系统                 | 待规划    | ❌ 未实现 | P3     |

### 详细说明

#### S65 模拟交易

- **实现**: 完整的模拟交易组件套件
  - `PaperTradingPanel.tsx` - 模拟交易面板
  - `PaperTradingDashboard.tsx` - 仪表盘
  - `PaperTradingStatusCard.tsx` - 状态卡片
  - `PositionCard.tsx` - 仓位卡片
  - `QuickTradeButtons.tsx` - 快速交易按钮
  - `TradeHistory.tsx` - 交易历史
  - `/app/paper-trading/page.tsx` - 模拟交易页面
  - `store/paperTrading.ts` - 状态管理
  - `types/paperTrading.ts` - 类型定义
  - `hooks/usePaperTrading.ts` - Hook
  - `hooks/usePaperTradingDeploy.ts` - 部署 Hook
- **状态**: ✅ 完成

---

## Part 14: 高级回测 (S69-S72)

### 场景映射

| 场景 ID | 场景名称          | 实现 EPIC | 状态      | 优先级 |
| ------- | ----------------- | --------- | --------- | ------ |
| S69     | 参数网格优化      | EPIC-007  | ✅ 完成   | P1     |
| S70     | 蒙特卡洛模拟      | 待规划    | ❌ 未实现 | P2     |
| S71     | Walk-Forward 分析 | 待规划    | ❌ 未实现 | P2     |
| S72     | 多周期回测        | EPIC-002  | ⚠️ 部分   | P1     |

### 详细说明

#### S69 参数网格优化

- **实现**:
  - `SensitivityCanvas.tsx` - 敏感度/优化 Canvas
  - 参数空间搜索、最优参数组合可视化
- **状态**: ✅ 完成

---

## Part 15: 策略健康诊断 (S74-S77)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------ | --------- | --------- | ------ |
| S74     | 策略健康评分 | 待规划    | ❌ 未实现 | P1     |
| S75     | 异常检测     | EPIC-004  | ✅ 完成   | P1     |
| S76     | 性能衰退预警 | 待规划    | ❌ 未实现 | P1     |
| S77     | 自动诊断报告 | 待规划    | ❌ 未实现 | P2     |

### 详细说明

#### S75 异常检测

- **实现**: 通过风险哨兵系统实现异常检测
- **状态**: ✅ 完成

---

## Part 16: 系统集成 (S78-S80)

### 场景映射

| 场景 ID | 场景名称     | 实现 EPIC | 状态      | 优先级 |
| ------- | ------------ | --------- | --------- | ------ |
| S78     | 交易所扩展   | EPIC-006  | ✅ 完成   | P0     |
| S79     | API 开放     | 待规划    | ❌ 未实现 | P2     |
| S80     | Webhook 集成 | 待规划    | ❌ 未实现 | P2     |

---

## 后端服务实现状态

### 已完成的后端服务

| 服务             | 状态    | 路由数 | 说明                                       |
| ---------------- | ------- | ------ | ------------------------------------------ |
| api-gateway      | ✅ 完成 | 5+     | 路由代理 + CORS + Rate Limit + Auth 中间件 |
| auth-service     | ✅ 完成 | 4      | 注册/登录/刷新/登出 + Token 服务           |
| user-service     | ✅ 完成 | 7      | 用户资料 + API Key 管理 + 加密存储         |
| strategy-service | ✅ 完成 | 10+    | 策略 CRUD + 模板 + 执行 + Spirit 引擎      |
| ai-orchestrator  | ✅ 完成 | 5+     | Chat + LLM Router + Skills + 服务客户端    |

### AI 引擎服务

| 服务               | 状态    | 部署       | 说明                                    |
| ------------------ | ------- | ---------- | --------------------------------------- |
| nlp-processor      | ✅ 完成 | 🚀 Railway | 意图识别 + 洞察生成 + 推理链 + LLM 路由 |
| strategy-generator | ✅ 完成 | -          | 策略生成 + 优化 + 验证                  |
| signal-analyzer    | ✅ 完成 | -          | 指标服务 + 信号聚合                     |

### 交易引擎服务

| 服务               | 状态    | 说明                                            |
| ------------------ | ------- | ----------------------------------------------- |
| order-executor     | ✅ 完成 | Market/Limit/TWAP/Iceberg 执行器 + 订单队列     |
| risk-manager       | ✅ 完成 | 4 种风险规则 + 仓位/盈亏监控 + 告警服务         |
| exchange-connector | ✅ 完成 | Binance + OKX + Bybit 连接器 + WebSocket 管理器 |

### 数据管道服务

| 服务                  | 状态    | 部署             | 说明                                         |
| --------------------- | ------- | ---------------- | -------------------------------------------- |
| backtest-engine       | ✅ 完成 | 🚀 Railway Ready | 事件驱动回测 + 绩效/风险指标 + 报告生成      |
| market-data-collector | ✅ 完成 | -                | K 线/订单簿/成交收集器 + TimescaleDB + Redis |

---

## 覆盖率统计

### 按功能分区统计

| 分区                       | 场景数 | 已完成 | 部分完成 | 未实现 | 覆盖率   |
| -------------------------- | ------ | ------ | -------- | ------ | -------- |
| Part 1: 核心概念           | 5      | 5      | 0        | 0      | **100%** |
| Part 2: 策略生命周期       | 7      | 6      | 0        | 1      | **86%**  |
| Part 3: A2UI 控件          | 6      | 5      | 1        | 0      | **92%**  |
| Part 4: 运营监控           | 7      | 7      | 0        | 0      | **100%** |
| Part 5: 风险控制           | 6      | 6      | 0        | 0      | **100%** |
| Part 6: 报表分析           | 4      | 4      | 0        | 0      | **100%** |
| Part 7: 系统功能           | 5      | 3      | 1        | 1      | **70%**  |
| Part 8: 状态处理           | 5      | 5      | 0        | 0      | **100%** |
| Part 9: 智能澄清           | 6      | 4      | 0        | 2      | **67%**  |
| Part 10: 组合策略          | 2      | 0      | 0        | 2      | 0%       |
| Part 11: Spirit 人格与社区 | 5      | 1      | 0        | 4      | **20%**  |
| Part 12: 移动通知          | 6      | 3      | 0        | 3      | **50%**  |
| Part 13: 学习成长          | 4      | 1      | 0        | 3      | **25%**  |
| Part 14: 高级回测          | 4      | 1      | 1        | 2      | **38%**  |
| Part 15: 策略诊断          | 4      | 1      | 0        | 3      | **25%**  |
| Part 16: 系统集成          | 3      | 1      | 0        | 2      | **33%**  |
| **总计**                   | **79** | **53** | **3**    | **23** | **69%**  |

### 按优先级统计

| 优先级    | 场景数 | 已完成 | 部分完成 | 未实现 | 覆盖率  |
| --------- | ------ | ------ | -------- | ------ | ------- |
| P0 (必须) | 26     | 25     | 0        | 1      | **96%** |
| P1 (重要) | 28     | 20     | 2        | 6      | **75%** |
| P2 (一般) | 18     | 6      | 1        | 11     | **36%** |
| P3 (可选) | 7      | 2      | 0        | 5      | **29%** |

---

## MVP 对齐检查

V3 设计系统定义的 MVP 核心场景：

| 场景             | 状态    | 说明                            |
| ---------------- | ------- | ------------------------------- |
| S01-S05 核心概念 | ✅ 100% | 12 种 Canvas + 17 个 Store 完成 |
| S06 AI 对话创建  | ✅ 完成 | 完整的 AI 编排系统              |
| S08-S09 回测系统 | ✅ 完成 | 8 个回测组件 + 完整 API         |
| S10 策略部署     | ✅ 完成 | 部署 + 审批流程                 |
| S19 实时监控     | ✅ 完成 | MonitorCanvas + SignalLog       |
| S26 风险哨兵     | ✅ 完成 | SentinelAlerts + 安全 Store     |
| S29 熔断机制     | ✅ 完成 | CircuitBreakerPanel             |
| S30 Kill Switch  | ✅ 完成 | KillSwitch + Modal              |
| S40 系统设置     | ✅ 完成 | Settings 页面                   |
| S65 模拟交易     | ✅ 完成 | 完整 Paper Trading 套件         |
| S78 交易所连接   | ✅ 完成 | Binance + OKX + Bybit WebSocket |

**MVP 完成度**: **~95%**

---

## 技术资产统计

### 前端资产 (Next.js 15 + React 19)

| 类别             | 数量 | 状态    |
| ---------------- | ---- | ------- |
| Canvas 组件      | 12+  | ✅ 完成 |
| InsightType 类型 | 10+  | ✅ 完成 |
| A2UI 参数控件    | 7    | ✅ 完成 |
| Zustand Store    | 17   | ✅ 完成 |
| Custom Hooks     | 20+  | ✅ 完成 |
| 类型定义文件     | 15+  | ✅ 完成 |
| 页面路由         | 10+  | ✅ 完成 |
| 前端 API 端点    | 15+  | ✅ 完成 |
| UI 基础组件      | 20+  | ✅ 完成 |
| 业务组件         | 100+ | ✅ 完成 |

### 后端资产 (Node.js + Python FastAPI)

| 类别             | 数量 | 状态                 |
| ---------------- | ---- | -------------------- |
| Node.js 服务     | 5    | ✅ 完成              |
| Python 服务      | 6    | ✅ 完成              |
| 后端路由         | 40+  | ✅ 完成              |
| 交易所连接器     | 3    | ✅ Binance/OKX/Bybit |
| WebSocket 管理器 | 4    | ✅ 完成              |
| 风险规则         | 4    | ✅ 完成              |
| 策略模板         | 3    | ✅ Grid/DCA/Momentum |

### 总体统计

| 指标              | 数量          |
| ----------------- | ------------- |
| 前端组件总数      | **130+**      |
| 后端服务总数      | **11**        |
| Python 源文件     | **70+**       |
| TypeScript 源文件 | **70+**       |
| **代码资产总计**  | **300+** 文件 |

---

## 待规划 EPIC

基于剩余缺口，建议新增以下 EPIC：

### EPIC-015: 多对/组合策略

- **覆盖场景**: S51-S52
- **优先级**: P1
- **预估 Stories**: 4

### EPIC-016: Spirit 社区

- **覆盖场景**: S54-S57
- **优先级**: P2
- **预估 Stories**: 6

### EPIC-017: 高级回测分析

- **覆盖场景**: S70-S71 (蒙特卡洛, Walk-Forward)
- **优先级**: P2
- **预估 Stories**: 3

### EPIC-018: 策略健康诊断

- **覆盖场景**: S74, S76-S77
- **优先级**: P1
- **预估 Stories**: 4

### EPIC-019: 移动端扩展

- **覆盖场景**: S58, S61, S63
- **优先级**: P1
- **预估 Stories**: 4

---

## 部署基础设施

### 生产环境

| 服务            | 平台    | URL                                                   | 状态      |
| --------------- | ------- | ----------------------------------------------------- | --------- |
| 前端 Web App    | Vercel  | https://web-app-psi-nine-46.vercel.app                | ✅ 运行中 |
| NLP Processor   | Railway | https://delta-nlp-processor-production.up.railway.app | ✅ 运行中 |
| Backtest Engine | Railway | 待部署                                                | 🟡 Ready  |

### 部署配置文件

| 文件           | 位置                           | 说明             |
| -------------- | ------------------------------ | ---------------- |
| `vercel.json`  | frontend/web-app/              | Vercel 部署配置  |
| `railway.toml` | ai-engine/nlp-processor/       | Railway NLP 部署 |
| `railway.toml` | data-pipeline/backtest-engine/ | Railway 回测部署 |
| `Dockerfile`   | ai-engine/nlp-processor/       | Python 3.11 容器 |
| `Dockerfile`   | data-pipeline/backtest-engine/ | Python 3.11 容器 |
| `.env.example` | frontend/web-app/              | 环境变量模板     |

### 环境变量

| 变量                  | 平台    | 说明                 |
| --------------------- | ------- | -------------------- |
| `NLP_PROCESSOR_URL`   | Vercel  | Railway NLP 服务地址 |
| `BACKTEST_ENGINE_URL` | Vercel  | Railway 回测服务地址 |
| `OPENROUTER_API_KEY`  | Railway | AI 模型 API Key      |
| `CORS_ORIGINS`        | Railway | 前端域名白名单       |

---

## 更新日志

| 日期       | 版本 | 变更内容                                                                                                 | 作者   |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------- | ------ |
| 2025-12-26 | 1.0  | 初始版本，基础 5 Epic 映射                                                                               | Claude |
| 2025-12-27 | 2.0  | 完整 V3 场景映射 (76 场景)                                                                               | Claude |
| 2025-12-27 | 2.1  | 新增 S46+ 推理链可视化                                                                                   | Claude |
| 2025-12-27 | 3.0  | **全面代码库扫描修正** - 覆盖率 44%→65%, MVP 75%→95%                                                     | Claude |
| 2025-12-27 | 3.1  | S20/S45/S78 完成标记                                                                                     | Claude |
| 2025-12-28 | 3.2  | **生产部署完成** - Vercel + Railway 上线, 全量代码验证                                                   | Claude |
| 2025-12-28 | 3.3  | **新增 Spirit 人格 + chatHistory Fallback** - S53 Trading Spirit, S46++ 无状态上下文恢复, 覆盖率 68%→69% | Claude |
| 2025-12-29 | 3.4  | **A2UI 扩展路线图** - 新增 EPIC-020~024, 测试矩阵扩展                                                    | Claude |

---

## A2UI 2.0+ 扩展路线图

> 基于多代理讨论（UX专家、架构师、产品负责人、QA工程师）的综合分析

### EPIC-020: A2UI 增强体验

**优先级**: P0-P1
**覆盖场景**: S46 扩展
**预估 Stories**: 6

| Story | 功能 | 优先级 | 复杂度 | 商业价值 |
|-------|------|--------|--------|----------|
| 20.1 | 推理链流式展示 (SSE) | P0 | 中 | ⭐⭐⭐⭐⭐ |
| 20.2 | 参数对比视图 (Before/After) | P1 | 低 | ⭐⭐⭐ |
| 20.3 | 个性化推理风格 (详细/简洁/专家) | P2 | 中 | ⭐⭐⭐ |
| 20.4 | 推理链书签/收藏 | P2 | 低 | ⭐⭐⭐ |
| 20.5 | 推理链分享功能 | P2 | 低 | ⭐⭐⭐ |
| 20.6 | 推理链教学模式 | P2 | 高 | ⭐⭐⭐⭐ |

### EPIC-021: A2UI 合规与审计

**优先级**: P1
**覆盖场景**: 新增合规需求
**预估 Stories**: 4

| Story | 功能 | 优先级 | 复杂度 | 商业价值 |
|-------|------|--------|--------|----------|
| 21.1 | 推理链审计日志 | P1 | 中 | ⭐⭐⭐⭐⭐ |
| 21.2 | 推理链历史持久化 (PostgreSQL) | P1 | 中 | ⭐⭐⭐⭐ |
| 21.3 | 推理链回放功能 | P2 | 中 | ⭐⭐⭐ |
| 21.4 | 合规报告导出 | P2 | 中 | ⭐⭐⭐⭐ |

### EPIC-022: A2UI 协议标准化

**优先级**: P2
**覆盖场景**: 技术扩展
**预估 Stories**: 5

| Story | 功能 | 优先级 | 复杂度 | 商业价值 |
|-------|------|--------|--------|----------|
| 22.1 | InsightData 版本化 (schemaVersion) | P2 | 低 | ⭐⭐⭐⭐ |
| 22.2 | 插件化控件系统 | P2 | 高 | ⭐⭐⭐⭐ |
| 22.3 | 多模态 InsightData (图表参数) | P2 | 高 | ⭐⭐⭐⭐ |
| 22.4 | 推理链 Diff 算法 | P2 | 中 | ⭐⭐⭐ |
| 22.5 | 推理链图数据库存储 (Neo4j) | P3 | 高 | ⭐⭐⭐⭐ |

### EPIC-023: 策略模板生态

**优先级**: P2
**覆盖场景**: S54-S57 扩展
**预估 Stories**: 4

| Story | 功能 | 优先级 | 复杂度 | 商业价值 |
|-------|------|--------|--------|----------|
| 23.1 | 策略模板市场 | P2 | 高 | ⭐⭐⭐⭐⭐ |
| 23.2 | 专家推理链订阅 | P2 | 高 | ⭐⭐⭐⭐⭐ |
| 23.3 | 推理链置信度排行榜 | P3 | 中 | ⭐⭐⭐ |
| 23.4 | 模板自定义编辑器 | P2 | 中 | ⭐⭐⭐⭐ |

### EPIC-024: A2UI SDK 开放

**优先级**: P3
**覆盖场景**: S79 扩展
**预估 Stories**: 3

| Story | 功能 | 优先级 | 复杂度 | 商业价值 |
|-------|------|--------|--------|----------|
| 24.1 | A2UI 白标 SDK | P3 | 极高 | ⭐⭐⭐⭐⭐ |
| 24.2 | 第三方洞察类型注册 | P3 | 高 | ⭐⭐⭐⭐ |
| 24.3 | A2UI 开发者文档 | P3 | 中 | ⭐⭐⭐⭐ |

---

## A2UI 测试矩阵扩展

> QA工程师建议的测试覆盖扩展

### 当前测试覆盖状态

| 洞察类型 | 创建 | 修改 | 验证 | 批准 | 单元测试 | E2E测试 |
|----------|------|------|------|------|----------|---------|
| strategy_create | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| strategy_modify | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| risk_alert | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ❌ |
| trade_signal | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ❌ |
| clarification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| backtest | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| **sensitivity** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **attribution** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **comparison** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

✅ = 已覆盖  ⚠️ = 部分覆盖  ❌ = 未覆盖

### 待补充测试场景

1. **EPIC-008 分析类测试** (P0)
   - SensitivityInsightCard 渲染测试
   - AttributionInsightCard 渲染测试
   - ComparisonInsightCard 渲染测试
   - 热力图/瀑布图/雷达图渲染

2. **约束系统边界测试** (P1)
   - 多约束同时触发
   - 循环依赖检测
   - 极值边界处理

3. **推理链交互测试** (P1)
   - 超长推理链 (50+ 节点)
   - 快速连续操作
   - 节点状态转换

4. **性能基准测试** (P2)
   - 1000 个参数渲染耗时
   - SSE 流式延迟测试
   - 内存占用监控

---

**文档维护说明**:

- 每完成一个场景后更新对应状态
- 每新增 EPIC 时确保与 V3 场景关联
- 月度检视覆盖率变化
- 部署变更需同步更新基础设施章节
