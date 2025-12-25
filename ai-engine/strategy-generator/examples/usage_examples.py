"""
Strategy Generator 使用示例
"""

import asyncio
import httpx
from typing import Dict, Any


# API基础URL
BASE_URL = "http://localhost:8002/api/v1"


async def example_generate_grid_strategy():
    """示例1: 生成网格策略"""
    print("\n=== 示例1: 生成网格策略 ===\n")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/generate",
            json={
                "description": "BTC在30000-50000区间内运行网格策略，设置10个网格",
                "trading_pair": "BTC/USDT",
                "timeframe": "1h",
                "initial_capital": 10000,
                "risk_per_trade": 0.01,
                "code_format": "both",
            },
        )

        result = response.json()

        if result["success"]:
            strategy = result["strategy"]
            print(f"✅ 策略名称: {strategy['name']}")
            print(f"📊 策略类型: {strategy['strategy_type']}")
            print(f"⚡ 复杂度: {strategy['complexity']}")
            print(f"\n💡 建议:")
            for suggestion in result["suggestions"]:
                print(f"  - {suggestion}")

            # 打印Python代码
            if strategy.get("code_python"):
                print(f"\n🐍 Python代码:\n")
                print(strategy["code_python"][:500] + "...")


async def example_generate_momentum_strategy():
    """示例2: 生成动量策略"""
    print("\n=== 示例2: 生成动量策略 ===\n")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/generate",
            json={
                "description": "当价格上穿20日移动平均线且RSI小于70时买入，下穿时卖出",
                "trading_pair": "ETH/USDT",
                "timeframe": "4h",
                "initial_capital": 5000,
                "risk_per_trade": 0.02,
                "max_positions": 2,
                "code_format": "json",
            },
        )

        result = response.json()

        if result["success"]:
            strategy = result["strategy"]
            print(f"✅ 策略生成成功!")
            print(f"\n📈 指标:")
            for indicator in strategy.get("indicators", []):
                print(f"  - {indicator['name']}: {indicator['description']}")

            print(f"\n📋 交易规则:")
            for rule in strategy.get("rules", []):
                print(f"  {rule['signal']}: {len(rule['conditions'])} 个条件")


async def example_quick_generate():
    """示例3: 快速生成策略"""
    print("\n=== 示例3: 快速生成 ===\n")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/generate/quick",
            params={
                "description": "定投策略，每天投资100 USDT",
                "trading_pair": "BTC/USDT",
            },
        )

        result = response.json()

        if result["success"]:
            print(f"✅ 快速生成成功!")
            print(f"策略: {result['strategy']['name']}")


async def example_optimize_strategy():
    """示例4: 优化策略"""
    print("\n=== 示例4: 优化策略 ===\n")

    # 首先生成一个策略
    async with httpx.AsyncClient() as client:
        gen_response = await client.post(
            f"{BASE_URL}/generate",
            json={
                "description": "简单动量策略",
                "trading_pair": "BTC/USDT",
                "code_format": "json",
            },
        )

        if not gen_response.json()["success"]:
            print("❌ 生成失败")
            return

        strategy_code = gen_response.json()["strategy"]["code_json"]

        # 优化策略
        opt_response = await client.post(
            f"{BASE_URL}/optimize",
            json={
                "strategy_code": str(strategy_code),
                "optimization_goal": "maximize_sharpe_ratio",
                "constraints": {"max_drawdown": 0.15},
                "suggest_parameters": True,
            },
        )

        result = opt_response.json()

        if result["success"]:
            print(f"✅ 优化完成!")
            print(f"\n🔧 优化建议:")
            for suggestion in result.get("suggestions", []):
                print(f"  参数: {suggestion['parameter']}")
                print(f"  当前值: {suggestion['current_value']}")
                print(f"  建议值: {suggestion['suggested_value']}")
                print(f"  原因: {suggestion['reason']}")
                print(f"  预期改进: {suggestion.get('expected_improvement', 'N/A')}")
                print()


async def example_validate_strategy():
    """示例5: 验证策略"""
    print("\n=== 示例5: 验证策略 ===\n")

    # 示例策略代码
    strategy_code = """{
        "strategy": {
            "name": "测试策略",
            "type": "momentum",
            "parameters": {
                "risk_per_trade": 0.02
            }
        },
        "risk_management": {
            "max_position_size": 0.1,
            "stop_loss_percent": 0.03
        }
    }"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/validate",
            json={
                "strategy_code": strategy_code,
                "check_syntax": True,
                "check_logic": True,
                "check_risk": True,
                "check_performance": False,
            },
        )

        result = response.json()

        if result["success"]:
            print(f"✅ 验证完成!")
            print(f"有效性: {'✅ 有效' if result['is_valid'] else '❌ 无效'}")
            print(f"评分: {result['score']}/100")

            if result.get("issues"):
                print(f"\n⚠️  发现问题:")
                for issue in result["issues"]:
                    severity_emoji = {
                        "error": "🔴",
                        "warning": "🟡",
                        "info": "🔵",
                    }
                    emoji = severity_emoji.get(issue["severity"], "⚪")
                    print(f"  {emoji} [{issue['severity']}] {issue['message']}")
                    if issue.get("suggestion"):
                        print(f"     💡 {issue['suggestion']}")

            print(f"\n📋 建议:")
            for rec in result.get("recommendations", []):
                print(f"  - {rec}")


async def example_health_check():
    """示例6: 健康检查"""
    print("\n=== 示例6: 健康检查 ===\n")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        result = response.json()

        print(f"服务状态: {result['status']}")
        print(f"版本: {result['version']}")
        print(f"AI模型: {result['ai_model']}")
        print(f"时间: {result['timestamp']}")


async def main():
    """运行所有示例"""
    print("\n" + "=" * 60)
    print("Strategy Generator API 使用示例")
    print("=" * 60)

    try:
        # 检查服务是否运行
        await example_health_check()

        # 运行示例
        await example_generate_grid_strategy()
        await example_generate_momentum_strategy()
        await example_quick_generate()
        await example_optimize_strategy()
        await example_validate_strategy()

        print("\n" + "=" * 60)
        print("所有示例执行完成!")
        print("=" * 60 + "\n")

    except httpx.ConnectError:
        print("\n❌ 无法连接到服务器!")
        print("请确保服务已启动: make dev")
        print("或使用Docker: make docker-run\n")
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}\n")


if __name__ == "__main__":
    asyncio.run(main())
