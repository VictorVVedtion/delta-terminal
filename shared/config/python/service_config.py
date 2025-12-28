"""
Delta Terminal 统一服务配置

Python 服务共享配置，与 TypeScript 配置保持同步
服务发现遵循统一规范：
- 开发环境使用 localhost + 固定端口
- 生产环境通过环境变量配置
"""

import os
from dataclasses import dataclass
from typing import List, Optional
from functools import lru_cache


# =============================================================================
# 服务端口规范 (开发环境)
# =============================================================================

class ServicePorts:
    """
    服务端口规范
    - 3000-3999: Frontend & API Gateway
    - 4000-4999: Backend Services (Node.js)
    - 8000-8999: Python Services (AI/Trading/Data)
    """
    # Frontend
    WEB_APP = 3000
    API_GATEWAY = 3001

    # Backend Services (Node.js)
    AUTH_SERVICE = 4001
    USER_SERVICE = 4002
    STRATEGY_SERVICE = 4003
    AI_ORCHESTRATOR = 4010

    # AI Engine (Python)
    NLP_PROCESSOR = 8001
    STRATEGY_GENERATOR = 8002
    SIGNAL_ANALYZER = 8003

    # Trading Engine (Python)
    ORDER_EXECUTOR = 8101
    RISK_MANAGER = 8102
    EXCHANGE_CONNECTOR = 8103

    # Data Pipeline (Python)
    MARKET_DATA_COLLECTOR = 8201
    BACKTEST_ENGINE = 8202
    ANALYTICS_SERVICE = 8203


# =============================================================================
# 服务 URL 配置
# =============================================================================

@dataclass
class ServiceUrls:
    """服务 URL 配置"""
    # Frontend & Gateway
    web_app: str
    api_gateway: str

    # Backend Services (Node.js)
    auth_service: str
    user_service: str
    strategy_service: str
    ai_orchestrator: str

    # AI Engine (Python)
    nlp_processor: str
    strategy_generator: str
    signal_analyzer: str

    # Trading Engine (Python)
    order_executor: str
    risk_manager: str
    exchange_connector: str

    # Data Pipeline (Python)
    market_data_collector: str
    backtest_engine: str
    analytics_service: str


def _get_env_url(env_key: str, default_port: int) -> str:
    """获取服务 URL，优先环境变量，否则使用默认端口"""
    return os.getenv(env_key, f"http://localhost:{default_port}")


@lru_cache()
def get_service_urls() -> ServiceUrls:
    """获取服务 URL 配置（缓存单例）"""
    return ServiceUrls(
        # Frontend & Gateway
        web_app=_get_env_url("WEB_APP_URL", ServicePorts.WEB_APP),
        api_gateway=_get_env_url("API_GATEWAY_URL", ServicePorts.API_GATEWAY),

        # Backend Services (Node.js)
        auth_service=_get_env_url("AUTH_SERVICE_URL", ServicePorts.AUTH_SERVICE),
        user_service=_get_env_url("USER_SERVICE_URL", ServicePorts.USER_SERVICE),
        strategy_service=_get_env_url("STRATEGY_SERVICE_URL", ServicePorts.STRATEGY_SERVICE),
        ai_orchestrator=_get_env_url("AI_ORCHESTRATOR_URL", ServicePorts.AI_ORCHESTRATOR),

        # AI Engine (Python)
        nlp_processor=_get_env_url("NLP_PROCESSOR_URL", ServicePorts.NLP_PROCESSOR),
        strategy_generator=_get_env_url("STRATEGY_GENERATOR_URL", ServicePorts.STRATEGY_GENERATOR),
        signal_analyzer=_get_env_url("SIGNAL_ANALYZER_URL", ServicePorts.SIGNAL_ANALYZER),

        # Trading Engine (Python)
        order_executor=_get_env_url("ORDER_EXECUTOR_URL", ServicePorts.ORDER_EXECUTOR),
        risk_manager=_get_env_url("RISK_MANAGER_URL", ServicePorts.RISK_MANAGER),
        exchange_connector=_get_env_url("EXCHANGE_CONNECTOR_URL", ServicePorts.EXCHANGE_CONNECTOR),

        # Data Pipeline (Python)
        market_data_collector=_get_env_url("MARKET_DATA_COLLECTOR_URL", ServicePorts.MARKET_DATA_COLLECTOR),
        backtest_engine=_get_env_url("BACKTEST_ENGINE_URL", ServicePorts.BACKTEST_ENGINE),
        analytics_service=_get_env_url("ANALYTICS_SERVICE_URL", ServicePorts.ANALYTICS_SERVICE),
    )


# =============================================================================
# CORS 配置
# =============================================================================

def get_cors_origins() -> List[str]:
    """获取 CORS 允许的源列表"""
    env_origins = os.getenv("CORS_ORIGINS")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",")]

    return [
        f"http://localhost:{ServicePorts.WEB_APP}",
        f"http://localhost:{ServicePorts.API_GATEWAY}",
    ]


# =============================================================================
# 辅助函数
# =============================================================================

def is_production() -> bool:
    """检查是否为生产环境"""
    env = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development"))
    return env.lower() in ("production", "prod")


def is_development() -> bool:
    """检查是否为开发环境"""
    return not is_production()


def get_service_url(service_name: str) -> Optional[str]:
    """
    通过服务名获取 URL

    Args:
        service_name: 服务名称 (如 'nlp_processor', 'strategy_service')

    Returns:
        服务 URL 或 None
    """
    urls = get_service_urls()
    return getattr(urls, service_name, None)


# =============================================================================
# 快捷访问
# =============================================================================

# 服务 URL 单例
service_urls = get_service_urls()

# CORS 源列表
cors_origins = get_cors_origins()
