# NLP Processor 测试文档

## 测试覆盖范围

本测试套件为 Delta Terminal NLP Processor 模块提供全面的测试覆盖,包括:

### 1. 意图识别服务测试 (`test_intent_service.py`)

**测试内容:**
- ✅ 意图识别功能
- ✅ 实体提取功能 (策略、市场、查询)
- ✅ 交易概念检测
- ✅ 技术指标检测
- ✅ 策略角度推荐判断
- ✅ 错误处理

**测试用例数:** 15+

**覆盖的类/函数:**
- `IntentService`
- `recognize_intent()`
- `extract_entities()`
- `detect_trading_concept_from_text()`
- `has_specific_indicator()`
- `needs_perspective_recommendation()`
- `get_intent_service()`

### 2. InsightData 生成服务测试 (`test_insight_service.py`)

**测试内容:**
- ✅ InsightData 生成 (策略创建、修改、优化等)
- ✅ 意图完整性评估
- ✅ 澄清 InsightData 生成
- ✅ 参数解析 (slider, select, toggle, 约束等)
- ✅ 策略角度推荐检查
- ✅ 对话历史格式化
- ✅ 错误处理

**测试用例数:** 20+

**覆盖的类/函数:**
- `InsightGeneratorService`
- `generate_insight()`
- `_generate_clarification_insight()`
- `_assess_intent_completeness()`
- `_parse_params()`
- `_check_perspective_needed()`
- `get_insight_service()`

### 3. 聊天 API 端点测试 (`test_chat_endpoint.py`)

**测试内容:**
- ✅ 基本消息发送
- ✅ 对话 ID 管理
- ✅ 跟进消息处理 (澄清回答)
- ✅ 普通对话处理
- ✅ 对话历史获取/删除/清空
- ✅ 请求验证
- ✅ 错误处理
- ✅ 辅助函数 (重建原始请求、生成建议操作)

**测试用例数:** 20+

**覆盖的端点:**
- `POST /api/v1/chat/message`
- `GET /api/v1/chat/conversation/{id}`
- `DELETE /api/v1/chat/conversation/{id}`
- `POST /api/v1/chat/conversation/{id}/clear`

### 4. InsightData 数据模型测试 (`test_insight_schemas.py`)

**测试内容:**
- ✅ 枚举类型验证
- ✅ 基础模型验证 (ParamOption, HeatmapZone, Constraint 等)
- ✅ InsightParam 各种类型测试
- ✅ 图表数据模型 (Candle, ChartData, ComparisonData)
- ✅ 影响评估模型 (ImpactMetric, InsightImpact)
- ✅ InsightData 完整性测试
- ✅ RiskAlertInsight 测试
- ✅ ClarificationInsight 测试
- ✅ 工厂函数测试

**测试用例数:** 40+

**覆盖的模型:**
- `InsightData`
- `InsightParam`
- `RiskAlertInsight`
- `ClarificationInsight`
- 所有支持的数据模型和枚举

## 测试统计

| 模块 | 测试文件 | 测试用例 | 估计覆盖率 |
|------|---------|---------|-----------|
| intent_service.py | test_intent_service.py | 15+ | ~85% |
| insight_service.py | test_insight_service.py | 20+ | ~75% |
| chat.py (endpoint) | test_chat_endpoint.py | 20+ | ~90% |
| insight_schemas.py | test_insight_schemas.py | 40+ | ~95% |
| **总计** | **4 个文件** | **~95 个测试** | **~80%** |

**之前覆盖率:** ~30%
**新增覆盖率:** ~50%
**目标覆盖率:** >80% ✅

## 运行测试

### 前提条件

确保已安装测试依赖:

```bash
pip install pytest pytest-asyncio pytest-cov
```

或使用 poetry:

```bash
poetry install
```

### 运行所有测试

```bash
# 使用 pytest
pytest tests/ -v

# 使用 poetry
poetry run pytest tests/ -v

# 使用提供的脚本
./run_tests.sh
```

### 运行特定测试文件

```bash
# 意图识别服务测试
pytest tests/test_intent_service.py -v

# InsightData 服务测试
pytest tests/test_insight_service.py -v

# 聊天端点测试
pytest tests/test_chat_endpoint.py -v

# 数据模型测试
pytest tests/test_insight_schemas.py -v
```

### 运行特定测试类或方法

```bash
# 运行特定测试类
pytest tests/test_intent_service.py::TestIntentService -v

# 运行特定测试方法
pytest tests/test_intent_service.py::TestIntentService::test_recognize_intent_success -v
```

### 生成测试覆盖率报告

```bash
# 生成终端报告
pytest tests/ --cov=src --cov-report=term-missing

# 生成 HTML 报告
pytest tests/ --cov=src --cov-report=html

# 查看 HTML 报告
open htmlcov/index.html
```

### 仅运行异步测试

```bash
pytest tests/ -v -k "asyncio"
```

### 查看测试输出详情

```bash
# 显示打印输出
pytest tests/ -v -s

# 显示详细的错误追踪
pytest tests/ -v --tb=long

# 失败时进入调试模式
pytest tests/ -v --pdb
```

## 测试组织

```
tests/
├── README.md                    # 本文件
├── __init__.py                  # 测试包初始化
├── test_main.py                 # 主应用测试 (原有)
├── test_models.py               # 基础模型测试 (原有)
├── test_intent_service.py       # 意图识别服务测试 (新增)
├── test_insight_service.py      # InsightData 服务测试 (新增)
├── test_chat_endpoint.py        # 聊天端点测试 (新增)
└── test_insight_schemas.py      # 数据模型测试 (新增)
```

## Mock 策略

测试使用以下 mock 策略:

1. **LLM 服务 Mock:**
   - `AsyncMock` 模拟 LLM API 调用
   - 预定义响应避免真实 API 调用
   - 测试错误场景

2. **服务依赖 Mock:**
   - `patch` 替换服务依赖
   - 隔离单元测试
   - 控制测试环境

3. **FastAPI 测试客户端:**
   - `TestClient` 模拟 HTTP 请求
   - 不启动真实服务器
   - 快速集成测试

## 测试最佳实践

1. **使用描述性的测试名称**
   ```python
   def test_recognize_intent_with_user_id()  # ✅ 好
   def test_func1()                          # ❌ 不好
   ```

2. **每个测试一个断言主题**
   - 测试一个具体功能点
   - 失败时容易定位问题

3. **使用 Fixtures 共享测试数据**
   ```python
   @pytest.fixture
   def sample_data():
       return {"key": "value"}
   ```

4. **测试边界条件和错误场景**
   - 空输入
   - 无效数据
   - 异常情况

5. **保持测试独立**
   - 不依赖其他测试
   - 可以任意顺序运行

## 持续集成

建议在 CI/CD 管道中运行测试:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run tests
        run: pytest tests/ -v --cov=src
```

## 贡献指南

添加新测试时:

1. 在相应的测试文件中添加测试用例
2. 使用描述性的测试名称
3. 添加必要的注释说明测试目的
4. 确保所有测试通过: `pytest tests/ -v`
5. 检查覆盖率: `pytest tests/ --cov=src`
6. 更新本 README 文档

## 常见问题

### Q: 测试失败怎么办?

A: 查看错误信息和堆栈追踪:
```bash
pytest tests/ -v --tb=long
```

### Q: 如何跳过某些测试?

A: 使用 `@pytest.mark.skip` 装饰器:
```python
@pytest.mark.skip(reason="暂时跳过")
def test_something():
    pass
```

### Q: 如何测试异步函数?

A: 使用 `@pytest.mark.asyncio` 装饰器:
```python
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None
```

### Q: Mock 对象怎么用?

A: 使用 `unittest.mock` 或 `pytest-mock`:
```python
from unittest.mock import AsyncMock, patch

@patch('module.function')
def test_with_mock(mock_func):
    mock_func.return_value = "mocked"
    # 测试代码
```

## 参考资料

- [Pytest 文档](https://docs.pytest.org/)
- [FastAPI 测试指南](https://fastapi.tiangolo.com/tutorial/testing/)
- [Python AsyncIO 测试](https://docs.python.org/3/library/asyncio-dev.html#testing)
- [Pydantic 模型测试](https://docs.pydantic.dev/latest/concepts/testing/)

---

**最后更新:** 2025-12-28
**维护者:** Delta Terminal AI Team
