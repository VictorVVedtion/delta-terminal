"""
风险管理配置模块
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"
    )

    # 应用配置
    app_name: str = "Delta Terminal Risk Manager"
    app_version: str = "0.1.0"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"

    # 服务器配置
    host: str = "0.0.0.0"
    port: int = 8004

    # Redis 配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    redis_prefix: str = "risk:"

    # JWT 配置
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    # 风控限制配置
    # 持仓限制
    max_position_size_usdt: float = 100000.0  # 单个币种最大持仓 (USDT)
    max_total_position_usdt: float = 500000.0  # 总持仓上限 (USDT)
    max_position_concentration: float = 0.3  # 单币种持仓占比上限 (30%)

    # 订单限制
    max_order_size_usdt: float = 50000.0  # 单笔订单上限 (USDT)
    min_order_size_usdt: float = 10.0  # 单笔订单下限 (USDT)
    max_orders_per_minute: int = 100  # 每分钟最大订单数
    max_orders_per_symbol_minute: int = 20  # 单币种每分钟最大订单数

    # 亏损限制
    max_daily_loss_usdt: float = 10000.0  # 日最大亏损 (USDT)
    max_daily_loss_percentage: float = 0.05  # 日最大亏损比例 (5%)
    max_drawdown_percentage: float = 0.15  # 最大回撤比例 (15%)
    max_consecutive_losses: int = 5  # 最大连续亏损次数

    # 杠杆限制
    max_leverage: float = 10.0  # 最大杠杆倍数
    default_leverage: float = 3.0  # 默认杠杆倍数

    # 监控配置
    position_check_interval_seconds: int = 5  # 持仓检查间隔
    pnl_check_interval_seconds: int = 10  # 盈亏检查间隔
    risk_report_interval_seconds: int = 60  # 风控报告生成间隔

    # 告警配置
    alert_webhook_url: Optional[str] = None  # Webhook 告警地址
    alert_email_enabled: bool = False  # 邮件告警开关
    alert_sms_enabled: bool = False  # 短信告警开关

    # 紧急止损配置
    emergency_stop_enabled: bool = True  # 紧急止损开关
    emergency_stop_drawdown: float = 0.20  # 紧急止损回撤阈值 (20%)
    emergency_stop_daily_loss: float = 15000.0  # 紧急止损日亏损阈值 (USDT)

    # 外部服务配置
    order_executor_url: str = "http://localhost:8003"
    exchange_connector_url: str = "http://localhost:8002"

    # 日志配置
    log_level: str = "INFO"
    log_format: str = "json"

    # CORS 配置
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]


# 创建全局配置实例
settings = Settings()
