"""回测引擎配置管理"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 应用基础配置
    app_name: str = "Delta Terminal - Backtest Engine"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8003

    # API配置
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]

    # Redis配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 3
    redis_password: Optional[str] = None

    # 数据库配置 (TimescaleDB)
    database_url: str = "postgresql://user:password@localhost:5432/delta_backtest"

    # 回测引擎配置
    default_initial_capital: float = 100000.0
    default_commission: float = 0.001  # 0.1%
    default_slippage: float = 0.0005   # 0.05%
    max_concurrent_backtests: int = 4
    backtest_timeout_seconds: int = 300

    # 数据存储配置
    data_cache_ttl: int = 3600  # 1小时
    max_data_points: int = 1000000

    # 性能优化配置
    enable_numba: bool = True
    parallel_processing: bool = True
    chunk_size: int = 10000

    # 报告配置
    report_output_dir: str = "./reports"
    enable_html_report: bool = True
    enable_pdf_report: bool = False
    enable_excel_report: bool = True

    # 日志配置
    log_level: str = "INFO"
    log_file: str = "./logs/backtest-engine.log"


# 全局配置实例
settings = Settings()
