# Delta Terminal AI交易终端

> 无代码AI自动交易平台 - 让AI成为你的交易伙伴

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-in_development-yellow.svg)](https://github.com)

## 项目简介

Delta Terminal 是一个革命性的AI驱动交易平台，通过对话式界面让任何人都能创建、测试和部署专业级别的交易策略。

### 核心特性

- **AI对话式策略创建**：用自然语言描述你的交易想法，AI自动生成策略代码
- **多交易所支持**：统一接口连接币安、OKX、FTX等主流交易所
- **智能风险管理**：内置止损、仓位管理、风险控制系统
- **实时回测**：基于历史数据快速验证策略有效性
- **7x24自动执行**：云端部署，全天候自动交易
- **可视化监控**：实时监控交易表现与资金状况

## 快速开始

### 前置要求

- Node.js >= 18.x
- Python >= 3.11
- PostgreSQL >= 15
- Redis >= 7.0
- pnpm >= 8.x (推荐)

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/your-org/delta-terminal.git
cd delta-terminal

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入必要配置

# 4. 初始化数据库
pnpm db:migrate

# 5. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 开始使用

## 项目结构

```
delta-terminal/
├── frontend/              # 前端应用
│   ├── web-app/          # Next.js Web应用
│   └── mobile-app/       # React Native移动应用
├── backend/              # 后端服务
│   ├── api-gateway/      # API网关
│   ├── auth-service/     # 认证服务
│   ├── user-service/     # 用户管理
│   └── strategy-service/ # 策略管理
├── ai-engine/            # AI引擎
│   ├── nlp-processor/    # 自然语言处理
│   ├── strategy-generator/ # 策略生成
│   └── signal-analyzer/  # 信号分析
├── trading-engine/       # 交易引擎
│   ├── order-executor/   # 订单执行
│   ├── risk-manager/     # 风险管理
│   └── exchange-connector/ # 交易所连接
├── data-pipeline/        # 数据管道
│   ├── market-data-collector/ # 市场数据采集
│   ├── backtest-engine/  # 回测引擎
│   └── analytics-service/ # 数据分析
└── shared/               # 共享模块
    ├── common-types/     # 类型定义
    ├── utils/           # 工具函数
    └── config/          # 配置管理
```

## 开发指南

详细的开发文档请参阅 [CLAUDE.md](CLAUDE.md)

### 常用命令

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 代码格式化
pnpm format

# 类型检查
pnpm type-check

# 数据库迁移
pnpm db:migrate
```

## 技术栈

### 前端
- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS
- Shadcn/ui

### 后端
- Node.js / Python
- Express / FastAPI
- PostgreSQL / Redis
- RabbitMQ / Kafka

### AI
- LangChain
- Claude API
- Pinecone (向量数据库)

### 交易
- CCXT (统一交易所接口)
- WebSocket (实时数据)

### 基础设施
- Docker / Kubernetes
- Prometheus / Grafana
- GitHub Actions

## 路线图

### Phase 1: MVP (Q1 2025)
- [ ] 基础Web界面
- [ ] AI对话策略创建
- [ ] 币安交易所集成
- [ ] 简单回测功能

### Phase 2: 增强 (Q2 2025)
- [ ] 移动端应用
- [ ] 多交易所支持
- [ ] 高级风险管理
- [ ] 实时监控面板

### Phase 3: 专业版 (Q3 2025)
- [ ] 策略市场
- [ ] 社区分享
- [ ] 专业回测工具
- [ ] API接口

## 贡献指南

我们欢迎所有形式的贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)

### 提交流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系我们

- 官网：https://delta-terminal.com
- 邮箱：support@delta-terminal.com
- Discord：https://discord.gg/delta-terminal
- Twitter：[@DeltaTerminal](https://twitter.com/DeltaTerminal)

## 致谢

感谢所有为本项目做出贡献的开发者！

---

**免责声明**：交易有风险，投资需谨慎。Delta Terminal 仅提供工具，不构成投资建议。
