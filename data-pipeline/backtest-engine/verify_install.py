"""验证安装 - 检查所有模块是否可以正常导入"""
import sys
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent))

def verify_imports():
    """验证所有核心模块可以导入"""
    errors = []

    modules_to_test = [
        # 核心配置
        ("src.config", "Settings"),

        # 数据模型
        ("src.models.schemas", "BacktestConfig"),
        ("src.models.schemas", "BacktestResult"),
        ("src.models.schemas", "PerformanceMetrics"),

        # 事件引擎
        ("src.engine.event_engine", "EventEngine"),
        ("src.engine.event_engine", "MarketEvent"),
        ("src.engine.event_engine", "SignalEvent"),

        # 回测组件
        ("src.engine.data_handler", "DataHandler"),
        ("src.engine.portfolio", "Portfolio"),
        ("src.engine.execution", "SimulatedExecutionHandler"),
        ("src.engine.backtest_engine", "BacktestEngine"),

        # 指标计算
        ("src.metrics.performance", "PerformanceCalculator"),
        ("src.metrics.risk", "RiskCalculator"),

        # 报告生成
        ("src.reports.generator", "ReportGenerator"),

        # API
        ("src.api.router", "api_router"),
    ]

    print("=" * 60)
    print("验证模块导入...")
    print("=" * 60)

    for module_path, class_name in modules_to_test:
        try:
            module = __import__(module_path, fromlist=[class_name])
            obj = getattr(module, class_name)
            print(f"✅ {module_path}.{class_name}")
        except Exception as e:
            error_msg = f"❌ {module_path}.{class_name}: {str(e)}"
            errors.append(error_msg)
            print(error_msg)

    print("=" * 60)

    if errors:
        print(f"\n❌ 发现 {len(errors)} 个错误:")
        for error in errors:
            print(f"  {error}")
        return False
    else:
        print("\n✅ 所有模块导入成功!")
        return True


def test_basic_functionality():
    """测试基础功能"""
    from datetime import datetime
    from src.models.schemas import BacktestConfig
    from src.engine.backtest_engine import BacktestEngine
    from src.engine.event_engine import SignalEvent

    print("\n" + "=" * 60)
    print("测试基础功能...")
    print("=" * 60)

    try:
        # 创建配置
        config = BacktestConfig(
            strategy_id="test",
            symbols=["BTCUSDT"],
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 2),
            initial_capital=10000.0
        )
        print("✅ BacktestConfig 创建成功")

        # 创建引擎
        engine = BacktestEngine(config)
        print("✅ BacktestEngine 初始化成功")

        # 设置简单策略
        def test_strategy(event, data_handler, portfolio):
            return []

        engine.set_strategy(test_strategy)
        print("✅ 策略设置成功")

        print("\n✅ 基础功能测试通过!")
        return True

    except Exception as e:
        print(f"\n❌ 基础功能测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Delta Terminal - Backtest Engine")
    print("安装验证工具")
    print("=" * 60 + "\n")

    # 验证导入
    import_ok = verify_imports()

    if not import_ok:
        print("\n⚠️  请先解决导入错误")
        sys.exit(1)

    # 测试功能
    func_ok = test_basic_functionality()

    if not func_ok:
        print("\n⚠️  基础功能测试失败")
        sys.exit(1)

    # 显示项目信息
    print("\n" + "=" * 60)
    print("项目信息")
    print("=" * 60)

    try:
        from src.config import settings
        print(f"应用名称: {settings.app_name}")
        print(f"版本: {settings.app_version}")
        print(f"API端口: {settings.port}")
        print(f"API前缀: {settings.api_prefix}")
    except Exception as e:
        print(f"⚠️  无法加载配置: {str(e)}")

    print("\n" + "=" * 60)
    print("✅ 安装验证完成!")
    print("=" * 60)
    print("\n可以使用以下命令启动服务:")
    print("  python -m src.main")
    print("  或")
    print("  ./run.sh")
    print("\n运行示例:")
    print("  python example_backtest.py")
    print()


if __name__ == "__main__":
    main()
