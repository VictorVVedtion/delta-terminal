"""
配置管理模块
"""
from typing import Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    # 应用配置
    APP_NAME: str = "Delta Terminal - Order Executor"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8003

    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/delta_orders"

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 2
    REDIS_PASSWORD: str | None = None

    # 交易所配置
    EXCHANGE_API_KEY: str = ""
    EXCHANGE_SECRET: str = ""
    EXCHANGE_PASSWORD: str | None = None  # OKX 需要
    DEFAULT_EXCHANGE: str = "binance"

    # 订单执行配置
    MAX_RETRY_COUNT: int = 3
    RETRY_DELAY: float = 1.0
    ORDER_TIMEOUT: int = 30  # 秒
    POSITION_CHECK_INTERVAL: float = 5.0  # 秒

    # TWAP 配置
    TWAP_DEFAULT_SLICES: int = 10
    TWAP_DEFAULT_INTERVAL: int = 60  # 秒
    TWAP_MAX_DEVIATION: float = 0.02  # 2%

    # 冰山单配置
    ICEBERG_DEFAULT_VISIBLE_RATIO: float = 0.1  # 10%
    ICEBERG_MIN_ORDER_SIZE: float = 10.0  # USDT

    # 风险控制配置
    MAX_ORDER_VALUE: float = 100000.0  # USDT
    MAX_POSITION_SIZE: float = 500000.0  # USDT
    MAX_DAILY_TRADES: int = 1000

    # 监控配置
    METRICS_ENABLED: bool = True
    METRICS_PORT: int = 9003

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    def get_exchange_config(self) -> Dict[str, Any]:
        """获取交易所配置"""
        config: Dict[str, Any] = {
            "apiKey": self.EXCHANGE_API_KEY,
            "secret": self.EXCHANGE_SECRET,
            "enableRateLimit": True,
            "options": {
                "defaultType": "spot",
                "adjustForTimeDifference": True,
            },
        }
        if self.EXCHANGE_PASSWORD:
            config["password"] = self.EXCHANGE_PASSWORD
        return config


settings = Settings()
