# Strategy Generator 快速入门

5分钟快速开始使用 AI 策略生成服务！

## 前置要求

- Python 3.11+
- Poetry (或 pip)
- Anthropic API Key

## 1️⃣ 安装

### 方法一：使用自动化脚本（推荐）

```bash
cd ai-engine/strategy-generator
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### 方法二：手动安装

```bash
# 安装依赖
poetry install

# 或使用pip
pip install -r requirements.txt

# 复制环境变量模板
cp .env.example .env
```

## 2️⃣ 配置

编辑 `.env` 文件，填入您的 API 密钥：

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

## 3️⃣ 启动服务

### 开发模式

```bash
# 使用Make
make dev

# 或直接使用uvicorn
poetry run uvicorn src.main:app --reload --port 8002
```

### Docker模式

```bash
# 使用Docker Compose（推荐）
make docker-run

# 或手动
docker build -t strategy-generator .
docker run -p 8002:8002 -e ANTHROPIC_API_KEY=your-key strategy-generator
```

## 4️⃣ 验证服务

访问 http://localhost:8002/api/v1/health

应该看到：

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "ai_model": "claude-3-5-sonnet-20241022"
}
```

## 5️⃣ 第一个策略

### 使用API文档（推荐）

1. 打开 http://localhost:8002/api/v1/docs
2. 找到 `POST /api/v1/generate/quick`
3. 点击 "Try it out"
4. 输入：
   - `description`: "当BTC价格跌破20日均线时买入"
   - `trading_pair`: "BTC/USDT"
5. 点击 "Execute"

### 使用curl

```bash
curl -X POST "http://localhost:8002/api/v1/generate/quick" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "当BTC价格跌破20日均线时买入",
    "trading_pair": "BTC/USDT"
  }'
```

### 使用Python

```python
import requests

response = requests.post(
    "http://localhost:8002/api/v1/generate",
    json={
        "description": "网格策略，BTC在30000-50000区间",
        "trading_pair": "BTC/USDT",
        "timeframe": "1h",
        "code_format": "both"
    }
)

result = response.json()
print(result["strategy"]["code_python"])
```

## 6️⃣ 运行示例

```bash
# 运行所有示例
python examples/usage_examples.py
```

## 常用命令

```bash
# 开发
make dev              # 启动开发服务器
make test             # 运行测试
make lint             # 代码检查
make format           # 格式化代码

# Docker
make docker-build     # 构建镜像
make docker-run       # 启动容器
make docker-logs      # 查看日志
make docker-stop      # 停止容器

# 其他
make help             # 查看所有命令
```

## API 端点速查

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/generate` | POST | 完整生成策略 |
| `/api/v1/generate/quick` | POST | 快速生成 |
| `/api/v1/optimize` | POST | 优化策略 |
| `/api/v1/validate` | POST | 验证策略 |
| `/api/v1/validate/quick` | POST | 快速验证 |
| `/api/v1/health` | GET | 健康检查 |

## 常见问题

### 端口已被占用

修改 `.env` 中的 `PORT` 值：

```bash
PORT=8003
```

### API密钥无效

确认 `.env` 中的 `ANTHROPIC_API_KEY` 正确设置。

### 依赖安装失败

尝试：

```bash
poetry cache clear pypi --all
poetry install
```

### 服务无法启动

检查日志：

```bash
make docker-logs
```

## 下一步

- 📖 阅读完整 [README.md](./README.md)
- 📚 查看 [API 文档](http://localhost:8002/api/v1/docs)
- 🔧 查看 [CLAUDE.md](./CLAUDE.md) 了解模块详情
- 💻 运行 [示例代码](./examples/usage_examples.py)

## 获取帮助

- GitHub Issues: [提交问题](https://github.com/yourusername/delta-terminal/issues)
- 文档: [完整文档](./README.md)

---

🎉 **恭喜！您已成功设置 Strategy Generator！**
