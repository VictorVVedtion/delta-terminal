"""
策略生成服务测试
"""

import pytest
from src.models.schemas import StrategyGenerateRequest, CodeFormat, StrategyType
from src.services.generator_service import StrategyGeneratorService


@pytest.fixture
def generator_service():
    """生成器服务fixture"""
    return StrategyGeneratorService()


@pytest.fixture
def sample_request():
    """示例请求fixture"""
    return StrategyGenerateRequest(
        description="当价格上穿20日移动平均线时买入，下穿时卖出",
        trading_pair="BTC/USDT",
        timeframe="1h",
        initial_capital=10000.0,
        risk_per_trade=0.02,
        max_positions=1,
        code_format=CodeFormat.JSON,
    )


@pytest.mark.asyncio
async def test_generate_strategy_success(generator_service, sample_request):
    """测试策略生成成功"""
    response = await generator_service.generate_strategy(sample_request)

    assert response.success is True
    assert response.strategy is not None
    assert response.strategy.name != ""
    assert response.strategy.code_json is not None


@pytest.mark.asyncio
async def test_generate_python_code(generator_service):
    """测试生成Python代码"""
    request = StrategyGenerateRequest(
        description="网格交易策略",
        trading_pair="ETH/USDT",
        timeframe="4h",
        initial_capital=5000.0,
        code_format=CodeFormat.PYTHON,
    )

    response = await generator_service.generate_strategy(request)

    assert response.success is True
    assert response.strategy.code_python is not None
    assert "class" in response.strategy.code_python


@pytest.mark.asyncio
async def test_generate_both_formats(generator_service):
    """测试同时生成两种格式"""
    request = StrategyGenerateRequest(
        description="定投策略，每天买入100 USDT的BTC",
        trading_pair="BTC/USDT",
        code_format=CodeFormat.BOTH,
    )

    response = await generator_service.generate_strategy(request)

    assert response.success is True
    assert response.strategy.code_json is not None
    assert response.strategy.code_python is not None


def test_strategy_name_generation(generator_service):
    """测试策略名称生成"""
    name = generator_service._generate_strategy_name(StrategyType.GRID, "BTC/USDT")

    assert "网格" in name
    assert "BTC_USDT" in name


def test_complexity_analysis(generator_service):
    """测试复杂度分析"""
    from src.models.schemas import StrategyComplexity

    # 简单策略 (1-3个规则)
    complexity = generator_service._analyze_complexity(2)
    assert complexity == StrategyComplexity.SIMPLE

    # 中等策略 (4-7个规则)
    complexity = generator_service._analyze_complexity(5)
    assert complexity == StrategyComplexity.MEDIUM

    # 复杂策略 (8+个规则)
    complexity = generator_service._analyze_complexity(10)
    assert complexity == StrategyComplexity.COMPLEX
