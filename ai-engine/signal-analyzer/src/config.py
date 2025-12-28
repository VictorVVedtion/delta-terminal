"""配置管理模块"""

from functools import lru_cache
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

    # 服务配置
    service_name: str = Field(default="signal-analyzer", description="服务名称")
    service_version: str = Field(default="0.1.0", description="服务版本")
    port: int = Field(default=8007, description="服务端口")
    log_level: str = Field(default="INFO", description="日志级别")

    # JWT 配置
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production", description="JWT 密钥"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT 算法")

    # Redis 配置
    redis_host: str = Field(default="localhost", description="Redis 主机")
    redis_port: int = Field(default=6379, description="Redis 端口")
    redis_db: int = Field(default=2, description="Redis 数据库")
    redis_password: Optional[str] = Field(default=None, description="Redis 密码")

    # 缓存配置
    signal_cache_ttl: int = Field(default=300, description="信号缓存时间（秒）")
    indicator_cache_ttl: int = Field(default=600, description="指标缓存时间（秒）")

    # 技术指标默认参数
    rsi_period: int = Field(default=14, description="RSI 周期")
    macd_fast: int = Field(default=12, description="MACD 快线周期")
    macd_slow: int = Field(default=26, description="MACD 慢线周期")
    macd_signal: int = Field(default=9, description="MACD 信号线周期")
    ma_short: int = Field(default=20, description="短期 MA 周期")
    ma_long: int = Field(default=50, description="长期 MA 周期")
    bb_period: int = Field(default=20, description="布林带周期")
    bb_std: float = Field(default=2.0, description="布林带标准差倍数")

    # 信号阈值
    rsi_oversold: float = Field(default=30.0, description="RSI 超卖阈值")
    rsi_overbought: float = Field(default=70.0, description="RSI 超买阈值")
    signal_confidence_threshold: float = Field(
        default=0.6, description="信号置信度阈值"
    )

    @property
    def redis_url(self) -> str:
        """获取 Redis URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    """获取配置实例（单例）"""
    return Settings()
