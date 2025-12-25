"""
配置管理模块
"""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 基础配置
    app_name: str = "Delta Terminal Strategy Generator"
    app_version: str = "0.1.0"
    debug: bool = Field(default=False, validation_alias="DEBUG")
    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8002, validation_alias="PORT")

    # AI 配置
    anthropic_api_key: Optional[str] = Field(default=None, validation_alias="ANTHROPIC_API_KEY")
    openai_api_key: Optional[str] = Field(default=None, validation_alias="OPENAI_API_KEY")
    ai_model: str = Field(default="claude-3-5-sonnet-20241022", validation_alias="AI_MODEL")
    ai_temperature: float = Field(default=0.2, validation_alias="AI_TEMPERATURE")
    ai_max_tokens: int = Field(default=4096, validation_alias="AI_MAX_TOKENS")

    # 策略生成配置
    max_strategy_complexity: int = Field(
        default=10, validation_alias="MAX_STRATEGY_COMPLEXITY"
    )
    min_backtest_period_days: int = Field(
        default=30, validation_alias="MIN_BACKTEST_PERIOD_DAYS"
    )
    default_risk_limit: float = Field(default=0.02, validation_alias="DEFAULT_RISK_LIMIT")

    # Redis 配置 (缓存策略生成结果)
    redis_host: str = Field(default="localhost", validation_alias="REDIS_HOST")
    redis_port: int = Field(default=6379, validation_alias="REDIS_PORT")
    redis_db: int = Field(default=2, validation_alias="REDIS_DB")
    redis_password: Optional[str] = Field(default=None, validation_alias="REDIS_PASSWORD")

    # API 配置
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        validation_alias="CORS_ORIGINS",
    )

    # 日志配置
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    log_format: str = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )


# 全局配置实例
settings = Settings()
