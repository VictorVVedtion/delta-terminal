# NLP Processor - 自然语言处理服务

Delta Terminal AI 自然语言处理服务，负责策略解析和对话管理。

## 功能特性

- **自然语言策略解析**：将用户的自然语言描述转换为结构化的交易策略配置
- **意图识别**：准确识别用户的交易意图（创建策略、修改策略、市场分析等）
- **智能对话**：基于上下文的多轮对话管理
- **参数提取**：从用户输入中提取关键交易参数
- **策略验证**：验证策略配置的完整性和合理性
- **优化建议**：提供策略优化建议

## 技术栈

- **框架**：FastAPI
- **AI**：Anthropic Claude, LangChain
- **Python**：3.11+
- **依赖管理**：Poetry

## 快速开始

### 前置要求

- Python 3.11 或更高版本
- Poetry 1.7+
- Anthropic API Key

### 安装

1. 克隆仓库并进入目录：

```bash
cd ai-engine/nlp-processor
```

2. 安装依赖：

```bash
poetry install
```

3. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

4. 启动服务：

```bash
poetry run python -m src.main
# 或
poetry run uvicorn src.main:app --reload
```

服务将在 `http://localhost:8001` 启动。

### 使用 Docker

```bash
# 构建镜像
docker build -t nlp-processor .

# 运行容器
docker run -p 8001:8001 --env-file .env nlp-processor
```

## API 文档

启动服务后，访问以下地址查看 API 文档：

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## API 端点

### 聊天 API

#### POST /api/v1/chat/message

发送聊天消息，获得 AI 响应。

**请求示例：**

```json
{
  "message": "帮我创建一个 BTC/USDT 的网格策略",
  "user_id": "user123",
  "conversation_id": "conv456",
  "context": {}
}
```

**响应示例：**

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
  "suggested_actions": ["查看完整的策略配置", "进行历史数据回测"],
  "timestamp": "2025-12-24T00:00:00"
}
```

#### GET /api/v1/chat/conversation/{conversation_id}

获取对话历史。

#### DELETE /api/v1/chat/conversation/{conversation_id}

删除对话。

### 策略解析 API

#### POST /api/v1/parse/strategy

解析策略描述为结构化配置。

**请求示例：**

```json
{
  "description": "当 BTC/USDT 的 RSI 低于 30 时买入，高于 70 时卖出，使用 1 小时周期",
  "user_id": "user123",
  "context": {}
}
```

**响应示例：**

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
        "value": 30,
        "params": {"period": 14}
      }
    ],
    "entry_action": {
      "action_type": "buy",
      "order_type": "market",
      "amount_percent": 10
    }
  },
  "confidence": 0.92,
  "warnings": ["未设置止损"],
  "suggestions": ["建议添加止损以控制风险"]
}
```

#### POST /api/v1/parse/validate-strategy

验证策略配置。

#### POST /api/v1/parse/optimize-strategy

生成策略优化建议。

## 项目结构

```
nlp-processor/
├── src/
│   ├── api/              # API 端点
│   │   ├── endpoints/
│   │   │   ├── chat.py   # 聊天端点
│   │   │   └── parse.py  # 解析端点
│   │   └── router.py     # 路由聚合
│   ├── chains/           # LangChain 工作流
│   │   └── strategy_chain.py
│   ├── models/           # 数据模型
│   │   └── schemas.py
│   ├── prompts/          # 提示词模板
│   │   └── strategy_prompts.py
│   ├── services/         # 服务层
│   │   ├── llm_service.py      # LLM 服务
│   │   ├── intent_service.py   # 意图识别
│   │   └── parser_service.py   # 策略解析
│   ├── config.py         # 配置管理
│   └── main.py           # 应用入口
├── tests/                # 测试
├── Dockerfile            # Docker 配置
├── pyproject.toml        # 项目配置
└── README.md
```

## 开发

### 运行测试

```bash
poetry run pytest
```

### 代码格式化

```bash
poetry run black src/
poetry run ruff check src/
```

### 类型检查

```bash
poetry run mypy src/
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | 必填 |
| `CLAUDE_MODEL` | Claude 模型名称 | claude-3-5-sonnet-20241022 |
| `API_HOST` | 服务主机地址 | 0.0.0.0 |
| `API_PORT` | 服务端口 | 8001 |
| `ENVIRONMENT` | 运行环境 | development |

完整环境变量列表请参考 `.env.example`。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
