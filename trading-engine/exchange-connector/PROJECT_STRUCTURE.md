# Exchange Connector 项目结构

```
exchange-connector/
├── src/                              # 源代码目录
│   ├── __init__.py                   # 模块初始化
│   ├── main.py                       # 主应用入口（FastAPI）
│   ├── config.py                     # 配置管理
│   │
│   ├── api/                          # API 层
│   │   ├── router.py                 # 路由聚合
│   │   └── endpoints/                # API 端点
│   │       ├── exchanges.py          # 交易所管理端点
│   │       ├── markets.py            # 市场数据端点
│   │       └── account.py            # 账户订单端点
│   │
│   ├── connectors/                   # 交易所连接器
│   │   ├── base.py                   # 基础连接器接口
│   │   ├── binance.py                # 币安连接器
│   │   ├── okx.py                    # OKX 连接器
│   │   ├── bybit.py                  # Bybit 连接器
│   │   └── factory.py                # 连接器工厂
│   │
│   ├── websocket/                    # WebSocket 模块
│   │   ├── base.py                   # WebSocket 基类
│   │   ├── binance_ws.py             # 币安 WebSocket
│   │   └── manager.py                # WebSocket 管理器
│   │
│   ├── services/                     # 业务逻辑层
│   │   └── exchange_service.py       # 交易所服务
│   │
│   └── models/                       # 数据模型
│       └── schemas.py                # Pydantic 模型定义
│
├── tests/                            # 测试目录
│   ├── __init__.py
│   └── test_connectors.py            # 连接器测试
│
├── pyproject.toml                    # Poetry 配置
├── Dockerfile                        # Docker 镜像构建
├── docker-compose.yml                # Docker Compose 配置
├── Makefile                          # 常用命令快捷方式
├── .env.example                      # 环境变量示例
├── .gitignore                        # Git 忽略文件
├── README.md                         # 项目文档
├── CLAUDE.md                         # AI 上下文文档
└── PROJECT_STRUCTURE.md              # 本文件
```

## 核心文件说明

### 应用入口

- **src/main.py**: FastAPI 应用主文件，定义路由、中间件、生命周期管理
- **src/config.py**: 配置管理，使用 Pydantic Settings

### 连接器层 (src/connectors/)

- **base.py**: 抽象基类，定义统一接口
  - `BaseConnector`: 所有连接器的基类
  - 提供通用方法：fetch_ticker, fetch_order_book, create_order 等

- **binance.py**: 币安交易所实现
  - 现货、合约支持
  - 特有功能：杠杆设置、资金费率查询等

- **okx.py**: OKX 交易所实现
  - 现货、永续、交割、期权支持
  - 特有功能：持仓模式、期权链等

- **bybit.py**: Bybit 交易所实现
  - 现货、永续、反向合约支持
  - 特有功能：止盈止损、保证金调整等

- **factory.py**: 连接器工厂
  - 创建和管理连接器实例
  - 单例模式支持

### WebSocket 层 (src/websocket/)

- **base.py**: WebSocket 基类
  - 连接管理
  - 自动重连机制
  - 订阅管理

- **binance_ws.py**: 币安 WebSocket 实现
  - 行情、深度、成交、K线推送

- **manager.py**: WebSocket 管理器
  - 统一管理所有 WebSocket 连接
  - 订阅分发

### 服务层 (src/services/)

- **exchange_service.py**: 交易所服务
  - 业务逻辑封装
  - Redis 缓存管理
  - API 密钥加密存储

### API 层 (src/api/)

- **router.py**: 路由聚合
- **endpoints/exchanges.py**: 交易所连接管理
- **endpoints/markets.py**: 市场数据查询
- **endpoints/account.py**: 账户订单管理

### 数据模型 (src/models/)

- **schemas.py**: Pydantic 数据模型
  - 请求/响应模型
  - 业务实体模型

## 技术架构

### 请求流程

```
客户端请求
    ↓
FastAPI 路由 (api/endpoints/*.py)
    ↓
业务服务层 (services/exchange_service.py)
    ↓
连接器工厂 (connectors/factory.py)
    ↓
具体连接器 (connectors/binance.py 等)
    ↓
CCXT 库
    ↓
交易所 API
```

### WebSocket 数据流

```
交易所 WebSocket
    ↓
WebSocket 连接 (websocket/binance_ws.py)
    ↓
WebSocket 管理器 (websocket/manager.py)
    ↓
回调函数
    ↓
应用层处理
```

## 依赖关系

### 核心依赖

- **FastAPI**: Web 框架
- **CCXT**: 交易所统一接口
- **Pydantic**: 数据验证
- **Redis**: 缓存
- **websockets**: WebSocket 客户端
- **cryptography**: 加密

### 开发依赖

- **pytest**: 测试框架
- **black**: 代码格式化
- **ruff**: 代码检查
- **mypy**: 类型检查

## 配置文件

### pyproject.toml

- Poetry 依赖管理
- 工具配置（black, ruff, mypy, pytest）

### .env

- 应用配置
- 交易所 API 密钥
- Redis 连接信息
- 加密密钥

### docker-compose.yml

- Redis 服务
- Exchange Connector 服务
- 网络配置

## 测试结构

```
tests/
├── unit/                 # 单元测试
├── integration/          # 集成测试
└── e2e/                  # 端到端测试
```

## 部署结构

### Docker

- 多阶段构建优化镜像大小
- 非 root 用户运行
- 健康检查

### Kubernetes (未来)

- Deployment
- Service
- ConfigMap
- Secret

## 扩展点

### 添加新交易所

1. 创建 `src/connectors/newexchange.py`
2. 继承 `BaseConnector`
3. 实现必要方法
4. 在 `factory.py` 注册

### 添加新功能

1. 在 `BaseConnector` 添加抽象方法
2. 各连接器实现
3. 服务层封装
4. API 端点暴露

### 添加 WebSocket 支持

1. 创建 `src/websocket/newexchange_ws.py`
2. 继承 `BaseWebSocket`
3. 实现消息处理
4. 在 `manager.py` 注册
