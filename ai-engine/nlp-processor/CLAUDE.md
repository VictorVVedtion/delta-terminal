# NLP Processor 模块

> Delta Terminal AI 自然语言处理服务

## 模块概述

NLP Processor 是 Delta Terminal 的核心 AI 模块，负责：

1. **自然语言理解**：解析用户的自然语言输入，理解交易意图
2. **策略生成**：将自然语言描述转换为结构化的交易策略配置
3. **对话管理**：维护上下文，提供智能多轮对话
4. **参数提取**：从用户输入中提取关键交易参数
5. **策略验证**：验证策略配置的完整性和合理性
6. **A2UI InsightData 生成**：返回结构化的 InsightData 供前端渲染为交互式 UI

---

## A2UI (Agent-to-UI) 集成 🆕

### 核心理念

**"AI Proposer, Human Approver"** - AI 不再返回纯文本，而是返回结构化的 `InsightData`，前端将其渲染为可交互的 UI 控件，用户可以调整参数后批准或拒绝。

### 架构流程

```
用户消息 → 意图识别 → InsightGeneratorService → InsightData JSON
                                                      ↓
                                               前端 InsightCard 渲染
                                                      ↓
                                               用户调整参数并批准
                                                      ↓
                                               后端执行策略创建
```

### 新增模块

| 文件 | 职责 |
|------|------|
| `src/models/insight_schemas.py` | A2UI 类型定义 (InsightData, InsightParam 等) |
| `src/services/insight_service.py` | InsightData 生成服务 |
| `src/prompts/insight_prompts.py` | A2UI 专用提示词模板 |

### InsightData 结构

```python
class InsightData:
    id: str                    # 唯一标识
    type: InsightType          # strategy_create | strategy_modify | risk_alert
    params: List[InsightParam] # 交互式参数控件
    evidence: InsightEvidence  # 可视化证据 (图表)
    impact: InsightImpact      # 预期影响评估
    explanation: str           # 自然语言解释
```

### 参数控件类型

| ParamType | 用途 | 示例 |
|-----------|------|------|
| `slider` | 数值范围滑块 | RSI 周期 7-21 |
| `number` | 数字输入 | 止损百分比 |
| `select` | 下拉选择 | 交易对选择 |
| `toggle` | 开关切换 | 启用杠杆 |
| `button_group` | 按钮组单选 | 时间周期 |
| `logic_builder` | 条件逻辑构建器 | 入场条件 |
| `heatmap_slider` | 热力图滑块 | 风险等级 |

### 使用示例

```python
from src.services.insight_service import get_insight_service
from src.models.schemas import IntentType

service = await get_insight_service()
insight = await service.generate_insight(
    user_input="帮我创建一个 BTC RSI 策略",
    intent=IntentType.CREATE_STRATEGY,
    chat_history=[],
    user_id="user123",
)

# insight.params 包含可交互的参数配置
# insight.explanation 包含自然语言解释
```

---

## 技术架构

### 核心技术栈

- **Web 框架**：FastAPI (高性能异步框架)
- **AI 引擎**：
  - Anthropic Claude (Claude 3.5 Sonnet)
  - LangChain (AI 工作流编排)
- **数据验证**：Pydantic v2
- **依赖管理**：Poetry
- **Python 版本**：3.11+

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                   │
│  ├─ /api/v1/chat/*      - 对话端点                          │
│  └─ /api/v1/parse/*     - 解析端点                          │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  ├─ LLMService              - Claude API 集成               │
│  ├─ IntentService           - 意图识别                      │
│  ├─ ParserService           - 策略解析                      │
│  └─ InsightGeneratorService - A2UI InsightData 生成 🆕      │
├─────────────────────────────────────────────────────────────┤
│  Chain Layer (LangChain)                                     │
│  └─ StrategyChain       - AI 工作流编排                     │
├─────────────────────────────────────────────────────────────┤
│  External Services                                           │
│  ├─ Anthropic API       - Claude 模型                       │
│  ├─ Redis               - 缓存与会话存储                    │
│  └─ PostgreSQL          - 持久化存储                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
nlp-processor/
├── src/
│   ├── api/                      # API 层
│   │   ├── endpoints/
│   │   │   ├── chat.py          # 聊天端点 (含 A2UI InsightData 支持)
│   │   │   └── parse.py         # 解析端点
│   │   └── router.py            # 路由聚合
│   ├── chains/                   # LangChain 工作流
│   │   └── strategy_chain.py    # 策略处理链
│   ├── models/                   # 数据模型
│   │   ├── schemas.py           # Pydantic 模型定义
│   │   └── insight_schemas.py   # A2UI InsightData 类型定义 🆕
│   ├── prompts/                  # 提示词工程
│   │   ├── strategy_prompts.py  # 策略相关提示词
│   │   └── insight_prompts.py   # A2UI InsightData 生成提示词 🆕
│   ├── services/                 # 服务层
│   │   ├── llm_service.py       # LLM 服务
│   │   ├── intent_service.py    # 意图识别服务
│   │   ├── parser_service.py    # 策略解析服务
│   │   └── insight_service.py   # A2UI InsightData 生成服务 🆕
│   ├── config.py                 # 配置管理
│   └── main.py                   # 应用入口
├── tests/                        # 测试
│   ├── test_main.py
│   ├── test_models.py
│   └── ...
├── Dockerfile                    # Docker 配置
├── Makefile                      # 开发任务脚本
├── pyproject.toml                # Poetry 配置
├── .env.example                  # 环境变量示例
└── README.md                     # 模块文档
```

---

## 核心功能详解

### 1. 意图识别 (Intent Recognition)

**实现位置**：`src/services/intent_service.py`

**支持的意图类型**：

- `CREATE_STRATEGY` - 创建新策略
- `MODIFY_STRATEGY` - 修改现有策略
- `DELETE_STRATEGY` - 删除策略
- `QUERY_STRATEGY` - 查询策略
- `ANALYZE_MARKET` - 市场分析
- `BACKTEST` - 回测请求
- `GENERAL_CHAT` - 一般对话
- `UNKNOWN` - 未知意图

**示例**：

```python
from src.services.intent_service import get_intent_service

service = await get_intent_service()
result = await service.recognize_intent(
    IntentRecognitionRequest(
        text="帮我创建一个 BTC 的网格策略",
        context={}
    )
)
# result.intent = IntentType.CREATE_STRATEGY
# result.confidence = 0.95
# result.entities = {"symbol": "BTC/USDT", "strategy_type": "grid"}
```

### 2. 策略解析 (Strategy Parsing)

**实现位置**：`src/services/parser_service.py`

**解析流程**：

1. 接收自然语言描述
2. 调用 Claude API 进行结构化解析
3. 验证解析结果
4. 生成警告和建议
5. 返回 StrategyConfig 对象

**示例**：

```python
from src.services.parser_service import get_parser_service

service = await get_parser_service()
result = await service.parse_strategy(
    ParseStrategyRequest(
        description="""
        当 BTC/USDT 的 RSI 低于 30 时买入，
        高于 70 时卖出，使用 1 小时周期，
        止损 3%，止盈 5%
        """,
        user_id="user123"
    )
)
# result.success = True
# result.strategy = StrategyConfig(...)
# result.confidence = 0.92
```

### 3. 对话管理 (Conversation Management)

**实现位置**：`src/api/endpoints/chat.py`

**特性**：

- 多轮对话上下文维护
- 对话历史存储（当前内存，可扩展至 Redis）
- 自动意图识别
- 上下文感知响应

**示例**：

```python
# 用户第一轮
POST /api/v1/chat/message
{
  "message": "我想做量化交易",
  "user_id": "user123"
}

# 用户第二轮（基于上下文）
POST /api/v1/chat/message
{
  "message": "帮我创建一个 BTC 的策略",
  "user_id": "user123",
  "conversation_id": "conv_xyz"
}
```

### 4. LangChain 工作流

**实现位置**：`src/chains/strategy_chain.py`

**主要功能**：

- 对话处理链
- 策略优化建议生成
- 参数提取
- 策略验证

**示例**：

```python
from src.chains.strategy_chain import get_strategy_chain

chain = await get_strategy_chain()

# 处理对话
response = await chain.process_conversation(
    user_input="帮我分析 BTC 行情",
    chat_history=messages,
    user_id="user123",
    conversation_id="conv_xyz"
)
```

---

## 数据模型

### 核心模型

#### StrategyConfig

完整的策略配置模型：

```python
class StrategyConfig(BaseModel):
    name: str                                    # 策略名称
    description: Optional[str]                   # 策略描述
    strategy_type: StrategyType                  # 策略类型
    symbol: str                                  # 交易对 (BTC/USDT)
    timeframe: TimeFrame                         # 时间周期 (1h, 4h, 1d)
    entry_conditions: List[StrategyCondition]    # 入场条件
    exit_conditions: Optional[List[StrategyCondition]]  # 出场条件
    entry_action: StrategyAction                 # 入场动作
    exit_action: Optional[StrategyAction]        # 出场动作
    risk_management: Optional[RiskManagement]    # 风险管理
    parameters: Optional[Dict[str, Any]]         # 其他参数
```

#### StrategyCondition

策略条件定义：

```python
class StrategyCondition(BaseModel):
    indicator: str        # 指标名称 (RSI, MACD, EMA)
    operator: str         # 操作符 (>, <, >=, <=, ==, crosses_above)
    value: float | str    # 比较值
    params: Optional[Dict[str, Any]]  # 指标参数
```

#### RiskManagement

风险管理配置：

```python
class RiskManagement(BaseModel):
    max_position_size: Optional[float]       # 最大仓位
    max_position_percent: Optional[float]    # 最大仓位百分比
    stop_loss_percent: Optional[float]       # 止损百分比
    take_profit_percent: Optional[float]     # 止盈百分比
    max_drawdown_percent: Optional[float]    # 最大回撤
    daily_loss_limit: Optional[float]        # 每日亏损限制
```

---

## API 端点

### 聊天 API

#### POST `/api/v1/chat/message`

发送聊天消息，获得 AI 响应。

**请求**：

```json
{
  "message": "帮我创建一个 BTC/USDT 的网格策略",
  "user_id": "user123",
  "conversation_id": "conv456",  // 可选
  "context": {}                  // 可选
}
```

**响应**：

```json
{
  "message": "好的，我来帮你创建 BTC/USDT 网格策略...",
  "conversation_id": "conv456",
  "intent": "CREATE_STRATEGY",
  "confidence": 0.95,
  "extracted_params": {
    "symbol": "BTC/USDT",
    "strategy_type": "grid"
  },
  "suggested_actions": [
    "查看完整的策略配置",
    "进行历史数据回测"
  ],
  "timestamp": "2025-12-24T00:00:00"
}
```

#### GET `/api/v1/chat/conversation/{conversation_id}`

获取对话历史。

#### DELETE `/api/v1/chat/conversation/{conversation_id}`

删除对话。

### 策略解析 API

#### POST `/api/v1/parse/strategy`

解析策略描述为结构化配置。

**请求**：

```json
{
  "description": "当 BTC/USDT 的 RSI 低于 30 时买入，高于 70 时卖出",
  "user_id": "user123"
}
```

**响应**：

```json
{
  "success": true,
  "strategy": {
    "name": "BTC RSI 策略",
    "strategy_type": "swing",
    "symbol": "BTC/USDT",
    "timeframe": "1h",
    "entry_conditions": [
      {
        "indicator": "RSI",
        "operator": "<",
        "value": 30
      }
    ],
    "entry_action": {
      "action_type": "buy",
      "order_type": "market"
    }
  },
  "confidence": 0.92,
  "warnings": ["未设置止损"],
  "suggestions": ["建议添加止损以控制风险"]
}
```

#### POST `/api/v1/parse/validate-strategy`

验证策略配置。

#### POST `/api/v1/parse/optimize-strategy`

生成策略优化建议。

---

## 开发指南

### 本地开发

1. **安装依赖**：

```bash
poetry install
```

2. **配置环境变量**：

```bash
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY
```

3. **启动开发服务器**：

```bash
make dev
# 或
poetry run uvicorn src.main:app --reload
```

4. **运行测试**：

```bash
make test
```

### 使用 Makefile

```bash
make install       # 安装依赖
make dev           # 启动开发服务器
make test          # 运行测试
make format        # 格式化代码
make lint          # 代码检查
make type-check    # 类型检查
make clean         # 清理临时文件
```

### 代码规范

- **格式化**：使用 Black (行长 100)
- **Linting**：使用 Ruff
- **类型检查**：使用 MyPy
- **测试**：使用 Pytest

---

## 提示词工程

所有提示词定义在 `src/prompts/strategy_prompts.py`。

### 核心提示词

1. **意图识别提示词** (`INTENT_RECOGNITION_PROMPT`)
   - 识别用户意图
   - 提取关键实体
   - 返回 JSON 格式

2. **策略解析提示词** (`STRATEGY_PARSING_PROMPT`)
   - 将自然语言转换为策略配置
   - 包含完整的技术指标说明
   - 强调安全性和风险管理

3. **对话增强提示词** (`CONVERSATION_PROMPT`)
   - 上下文感知对话
   - 专业且友好的语气
   - 主动引导用户

### 提示词优化建议

- 使用清晰的角色定义
- 提供具体的输出格式要求
- 包含示例（Few-shot Learning）
- 强调安全和风险提示

---

## 性能优化

### 当前优化

1. **异步处理**：所有 I/O 操作使用 async/await
2. **连接池**：LLM 服务使用单例模式
3. **缓存**：对话历史临时缓存（可扩展至 Redis）

### 未来优化方向

1. **Redis 缓存**：
   - 对话历史
   - 常见策略模板
   - LLM 响应缓存

2. **批处理**：
   - 批量意图识别
   - 批量参数提取

3. **流式响应**：
   - 长文本使用流式输出
   - 提升用户体验

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t nlp-processor:latest .

# 运行容器
docker run -p 8001:8001 --env-file .env nlp-processor:latest
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nlp-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nlp-processor
  template:
    metadata:
      labels:
        app: nlp-processor
    spec:
      containers:
      - name: nlp-processor
        image: nlp-processor:latest
        ports:
        - containerPort: 8001
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: nlp-secrets
              key: anthropic-api-key
```

---

## 监控与日志

### 日志级别

- `DEBUG`：详细调试信息
- `INFO`：一般信息（默认）
- `WARNING`：警告信息
- `ERROR`：错误信息

### 关键指标

- API 响应时间
- LLM 调用成功率
- 意图识别准确率
- 策略解析成功率

---

## 故障排查

### 常见问题

1. **API 密钥错误**

```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY

# 验证密钥
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

2. **依赖安装失败**

```bash
# 清理缓存
poetry cache clear . --all
poetry install
```

3. **端口占用**

```bash
# 查找占用端口的进程
lsof -i :8001

# 更改端口
API_PORT=8002 make dev
```

---

## 未来扩展

### 短期规划

- [ ] Redis 集成（对话持久化）
- [ ] PostgreSQL 集成（策略存储）
- [ ] 流式响应支持
- [ ] 更多技术指标支持

### 长期规划

- [ ] 多语言支持
- [ ] 自定义提示词模板
- [ ] A/B 测试框架
- [ ] 策略推荐系统
- [ ] 知识图谱集成

---

## 相关模块

- **上游依赖**：无
- **下游服务**：
  - `strategy-service`：策略管理服务
  - `trading-engine`：交易执行引擎
  - `data-pipeline`：数据管道

---

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

---

**最后更新**：2025-12-24
**维护者**：Delta Terminal AI Team
