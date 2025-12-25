"""配置管理模块"""
from typing import Dict, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 服务配置
    app_name: str = "Delta Terminal - Exchange Connector"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8003

    # Redis 配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None

    # WebSocket 配置
    ws_ping_interval: int = 30
    ws_ping_timeout: int = 10
    ws_reconnect_delay: int = 5
    ws_max_reconnect_attempts: int = 10

    # 连接器配置
    connector_timeout: int = 30
    connector_rate_limit: bool = True
    connector_pool_size: int = 10

    # 支持的交易所
    supported_exchanges: List[str] = Field(
        default=["binance", "okx", "bybit"]
    )

    # API 密钥加密
    encryption_key: str = Field(
        default="",
        description="用于加密 API 密钥的密钥，必须是32字节"
    )

    # 日志配置
    log_level: str = "INFO"
    log_format: str = "json"

    # CORS 配置
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"]
    )

    # 市场数据缓存
    market_cache_ttl: int = 60  # 秒
    ticker_cache_ttl: int = 5
    orderbook_cache_ttl: int = 1

    def get_exchange_config(self, exchange: str) -> Dict[str, str]:
        """获取交易所配置"""
        prefix = f"{exchange.upper()}_"
        return {
            "apiKey": self.__dict__.get(f"{prefix}API_KEY", ""),
            "secret": self.__dict__.get(f"{prefix}API_SECRET", ""),
            "password": self.__dict__.get(f"{prefix}PASSWORD", ""),
        }


settings = Settings()
