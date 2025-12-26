"""配置管理模块"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # API 配置
    api_host: str = Field(default="0.0.0.0", description="API 主机地址")
    api_port: int = Field(default=8001, description="API 端口")
    api_reload: bool = Field(default=True, description="热重载")
    api_workers: int = Field(default=1, description="工作进程数")

    # 环境配置
    environment: str = Field(default="development", description="运行环境")

    # OpenRouter API 配置 (替代直接 Anthropic 调用)
    openrouter_api_key: str = Field(description="OpenRouter API 密钥")
    openrouter_api_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API URL",
    )
    llm_model: str = Field(
        default="anthropic/claude-sonnet-4.5",
        description="LLM 模型名称 (OpenRouter 格式)",
    )
    llm_max_tokens: int = Field(default=4096, description="最大 token 数")
    llm_temperature: float = Field(default=0.7, description="温度参数")


    # Redis 配置
    redis_host: str = Field(default="localhost", description="Redis 主机")
    redis_port: int = Field(default=6379, description="Redis 端口")
    redis_db: int = Field(default=0, description="Redis 数据库")
    redis_password: str = Field(default="", description="Redis 密码")
    redis_max_connections: int = Field(default=10, description="最大连接数")

    # PostgreSQL 配置
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/delta_terminal",
        description="数据库连接 URL",
    )
    database_echo: bool = Field(default=False, description="SQL 日志")
    database_pool_size: int = Field(default=5, description="连接池大小")
    database_max_overflow: int = Field(default=10, description="最大溢出连接")

    # JWT 配置
    secret_key: str = Field(description="JWT 密钥")
    algorithm: str = Field(default="HS256", description="加密算法")
    access_token_expire_minutes: int = Field(default=30, description="Token 过期时间(分钟)")

    # CORS 配置
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        description="允许的跨域来源",
    )

    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_format: str = Field(default="json", description="日志格式")

    # 对话配置
    conversation_max_history: int = Field(default=20, description="最大对话历史条数")
    conversation_ttl: int = Field(default=3600, description="对话 TTL(秒)")

    # 速率限制
    rate_limit_per_minute: int = Field(default=60, description="每分钟请求限制")
    rate_limit_per_hour: int = Field(default=1000, description="每小时请求限制")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        """解析 CORS 来源"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.strip("[]").split(",")]
        return v

    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.environment.lower() == "development"

    @property
    def redis_url(self) -> str:
        """Redis 连接 URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例(单例)"""
    return Settings()


# 全局配置实例
settings = get_settings()
