"""
配置管理模块
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 应用配置
    app_name: str = "Market Data Collector"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8003

    # Redis 配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    redis_ttl: int = 3600  # 缓存TTL (秒)

    # TimescaleDB 配置
    timescale_host: str = "localhost"
    timescale_port: int = 5432
    timescale_user: str = "postgres"
    timescale_password: str = "postgres"
    timescale_database: str = "market_data"

    # 数据采集配置
    supported_exchanges: List[str] = ["binance", "okx", "bybit"]
    default_exchange: str = "binance"

    # Ticker 采集配置
    ticker_update_interval: int = 1  # 秒
    ticker_batch_size: int = 100

    # 订单簿采集配置
    orderbook_depth: int = 20  # 订单簿深度
    orderbook_update_interval: int = 1  # 秒

    # 成交数据配置
    trade_batch_size: int = 100
    trade_fetch_interval: int = 5  # 秒

    # K线配置
    kline_intervals: List[str] = ["1m", "5m", "15m", "1h", "4h", "1d"]
    kline_batch_size: int = 500

    # WebSocket 配置
    ws_ping_interval: int = 30
    ws_ping_timeout: int = 10
    ws_reconnect_delay: int = 5
    ws_max_reconnect_attempts: int = 10

    # 数据库连接池配置
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # 日志配置
    log_level: str = "INFO"
    log_format: str = "json"

    # 监控配置
    enable_metrics: bool = True
    metrics_port: int = 9003

    @property
    def database_url(self) -> str:
        """构造数据库连接URL"""
        return (
            f"postgresql+asyncpg://{self.timescale_user}:{self.timescale_password}"
            f"@{self.timescale_host}:{self.timescale_port}/{self.timescale_database}"
        )

    @property
    def redis_url(self) -> str:
        """构造Redis连接URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


settings = Settings()
