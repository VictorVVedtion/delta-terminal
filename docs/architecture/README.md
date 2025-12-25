# Delta Terminal 架构文档索引

> **文档版本**: 1.0.0
> **最后更新**: 2025-12-24
> **维护团队**: Delta Terminal 架构组

---

## 文档导航

本目录包含 Delta Terminal 的完整架构设计文档，涵盖系统设计、技术选型、数据流、安全策略等核心内容。

---

## 核心文档

### 1. [架构概述](./overview.md)

**阅读时长**: 20 分钟

**内容概要**:
- 系统架构愿景与设计原则
- 总体架构图 (Mermaid)
- 微服务划分与职责
- 通信模式 (同步/异步/实时)
- 部署架构 (Kubernetes)
- 扩展性设计与性能指标
- 灾难恢复策略

**适用人群**: 全体开发人员、架构师、项目经理

**关键要点**:
- ✨ 采用微服务架构，支持独立部署和扩展
- ✨ 事件驱动设计，使用 RabbitMQ 异步处理
- ✨ 云原生部署，使用 Kubernetes 容器编排
- ✨ 99.9% 可用性目标，<100ms API 响应

---

### 2. [技术栈详解](./tech-stack.md)

**阅读时长**: 30 分钟

**内容概要**:
- 前端技术栈 (Next.js 15, React 19, TailwindCSS)
- 后端技术栈 (Node.js Fastify, Python FastAPI)
- AI 与机器学习 (LangChain, Claude API, Pinecone)
- 数据存储 (PostgreSQL, Redis, TimescaleDB)
- 基础设施 (Docker, Kubernetes, RabbitMQ)
- 监控与日志 (Prometheus, Grafana)

**适用人群**: 全体开发人员

**关键要点**:
- ✨ Next.js 15 App Router + React 19 RC 提供最新前端体验
- ✨ Fastify 高性能 API 网关
- ✨ Claude API + LangChain 提供 AI 策略生成
- ✨ TimescaleDB 优化时序数据存储

**版本要求总结**:
```
Node.js    ≥ 20.0.0
Python     ≥ 3.11.0
PostgreSQL ≥ 15.0
Redis      ≥ 7.2.0
Kubernetes ≥ 1.28.0
```

---

### 3. [数据流设计](./data-flow.md)

**阅读时长**: 25 分钟

**内容概要**:
- 核心数据流 (策略创建、订单执行、市场数据)
- AI 处理流程 (NLP → 策略生成 → 优化)
- 实时数据推送 (WebSocket 架构)
- 数据模型与 Schema
- 数据存储策略 (热/温/冷数据)
- 数据加密与脱敏

**适用人群**: 全体开发人员、数据工程师

**关键要点**:
- ✨ 策略创建: 用户输入 → AI 解析 → 代码生成 → 验证
- ✨ 订单执行: 信号触发 → 风险检查 → 下单 → 推送
- ✨ 实时推送: Redis Pub/Sub + Socket.io
- ✨ 多级缓存: L1 (内存) → L2 (Redis) → L3 (CDN)

**数据流图**:
```mermaid
用户输入 → API 网关 → 业务服务 → AI 引擎 → 交易引擎 → 交易所
   ↑                                                           ↓
   └─────────────── WebSocket 推送 ←─── 数据管道 ←──────────────┘
```

---

### 4. [安全架构](./security.md)

**阅读时长**: 30 分钟

**内容概要**:
- 安全原则 (纵深防御、最小权限、零信任)
- 认证与授权 (JWT, OAuth2, RBAC)
- API 密钥管理 (AES-256 加密)
- 数据加密 (TLS 1.3, 数据库加密)
- 网络安全 (DDoS 防护, API 限流, CORS)
- 审计与监控
- 合规性 (GDPR, 金融合规)

**适用人群**: 全体开发人员、安全团队

**关键要点**:
- ✨ JWT + Refresh Token 双 Token 机制
- ✨ API 密钥 AES-256-GCM 加密存储
- ✨ TLS 1.3 传输加密
- ✨ RBAC 权限控制
- ✨ 审计日志记录所有关键操作

**安全检查清单**:
- [ ] 所有用户输入都经过验证
- [ ] 敏感数据加密存储
- [ ] HTTPS/TLS 1.3 启用
- [ ] API 限流配置
- [ ] 审计日志完整

---

### 5. [编码规范](./coding-standards.md)

**阅读时长**: 35 分钟

**内容概要**:
- 通用编码原则 (SOLID, DRY, KISS)
- TypeScript/JavaScript 规范
- Python 规范 (PEP 8)
- API 设计规范 (RESTful)
- 数据库规范
- Git 提交规范 (Conventional Commits)
- 代码审查清单

**适用人群**: 全体开发人员

**关键要点**:
- ✨ 严格的 TypeScript 类型检查
- ✨ ESLint + Prettier 自动格式化
- ✨ Python Black + Ruff 代码质量
- ✨ RESTful API 设计规范
- ✨ Conventional Commits 提交规范

**命名规范速查**:
```typescript
// TypeScript
文件名: kebab-case.ts
类名: PascalCase
函数: camelCase
常量: UPPER_SNAKE_CASE

# Python
文件名: snake_case.py
类名: PascalCase
函数: snake_case
常量: UPPER_SNAKE_CASE
```

---

### 6. [源码结构](./source-tree.md)

**阅读时长**: 20 分钟

**内容概要**:
- 完整目录结构
- 模块职责详解
- 服务依赖关系
- 开发指南 (添加新服务/功能)
- 文件命名规范

**适用人群**: 全体开发人员

**关键要点**:
- ✨ Monorepo 结构，pnpm workspaces 管理
- ✨ 清晰的目录层次: frontend/backend/ai-engine/trading-engine/data-pipeline
- ✨ 每个服务独立部署
- ✨ 共享代码统一管理

**目录结构概览**:
```
delta-terminal/
├── frontend/          # 前端应用
├── backend/           # 后端服务 (Node.js)
├── ai-engine/         # AI 引擎 (Python)
├── trading-engine/    # 交易引擎 (Python)
├── data-pipeline/     # 数据管道 (Python)
├── shared/            # 共享代码
├── docs/              # 文档
├── scripts/           # 脚本工具
└── infra/             # 基础设施配置
```

---

### 7. [A2UI 系统架构](./a2ui-system.md) 🆕

**阅读时长**: 30 分钟

**内容概要**:
- A2UI (Agent-to-UI) 核心概念
- InsightData 数据结构
- InsightCard 展示规范
- Canvas 模式类型
- 参数控件系统
- 约束与验证
- 风控集成
- RiverBit 设计系统

**适用人群**: 前端开发、AI 工程师、产品经理

**关键要点**:
- ✨ **核心理念**: "AI Proposer, Human Approver"
- ✨ AI 返回结构化 InsightData，而非纯文本
- ✨ 用户从"手动配置"变成"审批决策"
- ✨ 6 大 Canvas 模式: Proposal/Backtest/Explorer/Monitor/Config/Detail
- ✨ 7 种参数控件: Slider/Number/Select/Toggle/ButtonGroup/LogicBuilder/HeatmapSlider

**A2UI 架构概览**:
```
用户消息 → AI Engine → InsightData → InsightCard (Chat)
                                          ↓ 点击
                                    Canvas Panel → 批准/拒绝 → Backend
```

---

## 阅读路径

### 新成员入职

**推荐阅读顺序**:
1. [架构概述](./overview.md) - 了解整体架构
2. [源码结构](./source-tree.md) - 熟悉代码组织
3. [技术栈详解](./tech-stack.md) - 掌握技术选型
4. [编码规范](./coding-standards.md) - 遵循编码标准

### 功能开发

**推荐阅读顺序**:
1. [数据流设计](./data-flow.md) - 理解数据流转
2. [API 设计规范](./coding-standards.md#api-设计规范) - API 设计
3. [源码结构](./source-tree.md) - 查找相关模块

### 安全审计

**推荐阅读顺序**:
1. [安全架构](./security.md) - 全面安全策略
2. [数据流设计](./data-flow.md) - 敏感数据处理
3. [编码规范](./coding-standards.md) - 安全编码实践

### 性能优化

**推荐阅读顺序**:
1. [架构概述](./overview.md) - 扩展性设计
2. [数据流设计](./data-flow.md) - 缓存策略
3. [技术栈详解](./tech-stack.md) - 性能技术

---

## 文档维护

### 更新流程

1. **提出变更**: 在团队会议上讨论架构变更
2. **更新文档**: 修改对应架构文档
3. **代码审查**: 架构师审查变更
4. **合并发布**: 合并到 main 分支

### 审核周期

| 文档 | 审核周期 | 责任人 |
|-----|---------|--------|
| 架构概述 | 季度 | 架构团队 |
| 技术栈详解 | 季度 | 技术委员会 |
| 数据流设计 | 月度 | 数据团队 |
| 安全架构 | 月度 | 安全团队 |
| 编码规范 | 季度 | 技术委员会 |
| 源码结构 | 季度 | 架构团队 |

---

## 相关资源

### 外部文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [Fastify 官方文档](https://fastify.dev/)
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [LangChain 文档](https://python.langchain.com/)
- [Kubernetes 文档](https://kubernetes.io/docs/)

### 内部资源

- [API 文档](../api/rest-api.md)
- [开发指南](../guides/getting-started.md)
- [部署指南](../guides/deployment.md)

---

## 反馈与改进

如有任何文档问题或改进建议，请：

1. 提交 GitHub Issue: `https://github.com/delta-terminal/issues`
2. 联系架构团队: `architecture@delta-terminal.com`
3. 在团队会议上提出

---

## 文档版本历史

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| 1.0.0 | 2025-12-24 | 初始版本，包含完整架构设计 |

---

**文档维护**: Delta Terminal 架构团队
**最后更新**: 2025-12-24
**审核周期**: 季度
