# NLP Processor 测试指南

## 快速开始

### 安装依赖

```bash
# 如果使用 pip
pip install -r requirements.txt

# 如果使用 poetry
poetry install
```

### 运行测试

```bash
# 方式 1: 直接使用 pytest (需要先安装依赖)
pytest tests/ -v

# 方式 2: 使用提供的脚本
./run_tests.sh

# 方式 3: 使用 poetry (如果已安装)
poetry run pytest tests/ -v
```

### 查看覆盖率

```bash
# 生成覆盖率报告
pytest tests/ --cov=src --cov-report=term-missing --cov-report=html

# 在浏览器中查看 HTML 报告
open htmlcov/index.html
```

## 测试文件概览

### 新增测试文件 (2025-12-28)

| 文件 | 测试用例数 | 代码行数 | 主要测试内容 |
|------|-----------|---------|-------------|
| `test_intent_service.py` | 11 | ~320 | 意图识别、实体提取、交易概念检测 |
| `test_insight_service.py` | 17 | ~500 | InsightData 生成、参数解析、澄清处理 |
| `test_chat_endpoint.py` | 17 | ~550 | 聊天 API、对话管理、跟进消息 |
| `test_insight_schemas.py` | 37 | ~560 | 数据模型、枚举、工厂函数 |
| **总计** | **82** | **~1930** | - |

### 原有测试文件

| 文件 | 测试用例数 | 主要测试内容 |
|------|-----------|-------------|
| `test_main.py` | 2 | 应用启动、健康检查 |
| `test_models.py` | 6 | 基础数据模型验证 |

## 测试覆盖详情

### 1. 意图识别服务 (`test_intent_service.py`)

**核心功能测试:**
- ✅ 意图识别成功场景
- ✅ 带用户 ID 的意图识别
- ✅ 错误处理 (LLM 调用失败)
- ✅ 实体提取 (策略、市场、查询)
- ✅ 交易概念检测 (抄底、突破等)
- ✅ 技术指标检测
- ✅ 策略角度推荐逻辑
- ✅ 服务工厂函数

**关键测试方法:**
```python
test_recognize_intent_success()
test_recognize_intent_with_user_id()
test_recognize_intent_error_handling()
test_extract_entities_strategy()
test_detect_trading_concept_from_text()
test_has_specific_indicator()
test_needs_perspective_recommendation()
```

### 2. InsightData 服务 (`test_insight_service.py`)

**核心功能测试:**
- ✅ InsightData 生成 (策略创建、普通对话)
- ✅ 意图完整性评估
- ✅ 澄清 InsightData 生成
- ✅ 参数解析 (基本、带约束、无效数据)
- ✅ 策略角度推荐检查
- ✅ 对话历史格式化
- ✅ InsightData 验证
- ✅ 服务工厂函数

**关键测试方法:**
```python
test_generate_insight_strategy_create()
test_assess_intent_completeness_complete()
test_generate_clarification_insight()
test_parse_params()
test_parse_params_with_constraints()
test_check_perspective_needed()
test_format_chat_history()
```

### 3. 聊天端点 (`test_chat_endpoint.py`)

**核心功能测试:**
- ✅ 基本消息发送
- ✅ 对话 ID 管理
- ✅ 跟进消息处理
- ✅ 普通对话处理
- ✅ 对话历史获取/删除/清空
- ✅ 请求验证
- ✅ 错误处理
- ✅ 辅助函数 (重建请求、生成建议)

**测试的 API 端点:**
- `POST /api/v1/chat/message`
- `GET /api/v1/chat/conversation/{id}`
- `DELETE /api/v1/chat/conversation/{id}`
- `POST /api/v1/chat/conversation/{id}/clear`

**关键测试方法:**
```python
test_send_message_basic()
test_send_message_with_conversation_id()
test_send_message_follow_up()
test_get_conversation()
test_delete_conversation()
test_clear_conversation()
test_reconstruct_original_request()
test_generate_suggested_actions_*()
```

### 4. 数据模型 (`test_insight_schemas.py`)

**核心功能测试:**
- ✅ 所有枚举类型 (8 个)
- ✅ 基础模型 (ParamOption, HeatmapZone, Constraint 等)
- ✅ InsightParam 各种类型
- ✅ 图表数据模型
- ✅ 影响评估模型
- ✅ InsightData 主结构
- ✅ RiskAlertInsight
- ✅ ClarificationInsight
- ✅ 工厂函数

**测试的模型类型:**
- 枚举: InsightType, ParamType, ConstraintType 等
- 参数: InsightParam (7 种类型)
- 图表: Candle, ChartData, ComparisonData
- 影响: ImpactMetric, InsightImpact
- 主结构: InsightData, RiskAlertInsight, ClarificationInsight

## Mock 使用示例

### Mock LLM 服务

```python
@pytest.fixture
def mock_llm_service():
    mock = AsyncMock()
    mock.generate_json_response = AsyncMock(
        return_value={
            "intent": "CREATE_STRATEGY",
            "confidence": 0.95,
            "entities": {"symbol": "BTC/USDT"}
        }
    )
    return mock
```

### Mock FastAPI 依赖

```python
with patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service):
    response = client.post("/api/v1/chat/message", json={...})
    assert response.status_code == 200
```

## 运行特定测试

### 按文件运行

```bash
# 只运行意图服务测试
pytest tests/test_intent_service.py -v

# 只运行数据模型测试
pytest tests/test_insight_schemas.py -v
```

### 按测试类运行

```bash
# 运行特定测试类
pytest tests/test_intent_service.py::TestIntentService -v

# 运行特定测试方法
pytest tests/test_intent_service.py::TestIntentService::test_recognize_intent_success -v
```

### 按关键词运行

```bash
# 运行所有包含 "async" 的测试
pytest tests/ -k "async" -v

# 运行所有 "error" 相关测试
pytest tests/ -k "error" -v
```

## 测试输出控制

### 详细输出

```bash
# 显示打印输出
pytest tests/ -v -s

# 显示完整错误追踪
pytest tests/ -v --tb=long

# 显示局部变量
pytest tests/ -v --showlocals
```

### 失败时调试

```bash
# 失败时进入 pdb 调试器
pytest tests/ -v --pdb

# 只运行上次失败的测试
pytest tests/ --lf

# 先运行失败的,再运行其他
pytest tests/ --ff
```

## 覆盖率报告

### 生成报告

```bash
# 终端报告 (显示缺失行)
pytest tests/ --cov=src --cov-report=term-missing

# HTML 报告
pytest tests/ --cov=src --cov-report=html

# XML 报告 (用于 CI)
pytest tests/ --cov=src --cov-report=xml

# 组合报告
pytest tests/ --cov=src --cov-report=term-missing --cov-report=html
```

### 查看报告

```bash
# 打开 HTML 报告
open htmlcov/index.html

# 或在 Linux
xdg-open htmlcov/index.html
```

### 覆盖率目标

- **当前覆盖率:** ~80%
- **最低要求:** 70%
- **理想目标:** 85%+

## 测试文件结构

```
tests/
├── README.md                    # 详细测试文档
├── __init__.py                  # 包初始化
├── test_main.py                 # 主应用测试
├── test_models.py               # 基础模型测试
├── test_intent_service.py       # 意图识别测试 ⭐ 新增
├── test_insight_service.py      # InsightData 服务测试 ⭐ 新增
├── test_chat_endpoint.py        # 聊天端点测试 ⭐ 新增
└── test_insight_schemas.py      # 数据模型测试 ⭐ 新增
```

## 常见测试场景

### 1. 测试异步函数

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None
```

### 2. 测试 API 端点

```python
def test_api_endpoint(client):
    response = client.post("/api/endpoint", json={...})
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
```

### 3. 测试数据模型验证

```python
def test_model_validation():
    # 有效数据
    model = Model(field="value")
    assert model.field == "value"

    # 无效数据
    with pytest.raises(ValidationError):
        Model(field=None)
```

### 4. 测试错误处理

```python
async def test_error_handling(service):
    service.method = AsyncMock(side_effect=Exception("Error"))
    result = await service.process()
    assert result.success is False
```

## 持续集成配置示例

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov

      - name: Run tests
        run: |
          pytest tests/ -v --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./coverage.xml
```

## 测试最佳实践

### 1. 测试命名

✅ **好的命名:**
```python
def test_recognize_intent_with_valid_input()
def test_generate_insight_returns_correct_type()
def test_parse_params_handles_invalid_data()
```

❌ **不好的命名:**
```python
def test1()
def test_function()
def test_stuff()
```

### 2. 测试结构 (AAA 模式)

```python
def test_example():
    # Arrange - 准备测试数据
    input_data = {"key": "value"}

    # Act - 执行被测试的函数
    result = function_to_test(input_data)

    # Assert - 验证结果
    assert result.success is True
    assert result.data == expected_data
```

### 3. 使用 Fixtures

```python
@pytest.fixture
def sample_data():
    return {"key": "value"}

def test_with_fixture(sample_data):
    assert sample_data["key"] == "value"
```

### 4. 参数化测试

```python
@pytest.mark.parametrize("input,expected", [
    ("BTC/USDT", True),
    ("ETH/USDT", True),
    ("INVALID", False),
])
def test_validate_symbol(input, expected):
    result = validate_symbol(input)
    assert result == expected
```

## 故障排查

### 问题: 模块导入错误

```bash
# 确保在项目根目录运行
cd /path/to/nlp-processor

# 检查 Python 路径
python3 -c "import sys; print(sys.path)"
```

### 问题: pytest 未找到

```bash
# 检查是否安装
pip list | grep pytest

# 重新安装
pip install pytest pytest-asyncio
```

### 问题: 异步测试失败

```bash
# 确保安装了 pytest-asyncio
pip install pytest-asyncio

# 检查 pyproject.toml 配置
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
```

### 问题: Mock 不工作

```python
# 确保 patch 路径正确
# ❌ 错误
@patch('intent_service.LLMService')

# ✅ 正确
@patch('src.services.intent_service.LLMService')
```

## 性能测试

### 测试执行时间

```bash
# 显示最慢的 10 个测试
pytest tests/ --durations=10

# 显示所有测试的时间
pytest tests/ --durations=0
```

### 并行测试 (可选)

```bash
# 安装 pytest-xdist
pip install pytest-xdist

# 使用多个 CPU 核心
pytest tests/ -n auto
```

## 下一步

1. **运行测试:** `pytest tests/ -v`
2. **查看覆盖率:** `pytest tests/ --cov=src --cov-report=html`
3. **持续改进:**
   - 添加更多边界条件测试
   - 增加性能测试
   - 集成到 CI/CD

## 相关文档

- [tests/README.md](tests/README.md) - 详细测试文档
- [TEST_SUMMARY.md](TEST_SUMMARY.md) - 测试覆盖总结
- [pyproject.toml](pyproject.toml) - pytest 配置
- [.coveragerc](.coveragerc) - 覆盖率配置

---

**维护者:** Delta Terminal AI Team
**最后更新:** 2025-12-28
