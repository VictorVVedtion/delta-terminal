"""连接器工厂"""
from typing import Dict, Optional, Type
from .base import BaseConnector
from .binance import BinanceConnector
from .okx import OKXConnector
from .bybit import BybitConnector


class ConnectorFactory:
    """交易所连接器工厂"""

    _connectors: Dict[str, Type[BaseConnector]] = {
        'binance': BinanceConnector,
        'okx': OKXConnector,
        'bybit': BybitConnector,
    }

    _instances: Dict[str, BaseConnector] = {}

    @classmethod
    def register_connector(cls, exchange_id: str, connector_class: Type[BaseConnector]) -> None:
        """
        注册新的连接器

        Args:
            exchange_id: 交易所ID
            connector_class: 连接器类
        """
        cls._connectors[exchange_id.lower()] = connector_class

    @classmethod
    def create_connector(
        cls,
        exchange_id: str,
        api_key: str = "",
        api_secret: str = "",
        password: str = "",
        testnet: bool = False,
        options: Optional[Dict] = None,
        singleton: bool = True,
    ) -> BaseConnector:
        """
        创建连接器实例

        Args:
            exchange_id: 交易所ID
            api_key: API密钥
            api_secret: API密钥
            password: 密码
            testnet: 是否使用测试网
            options: 额外选项
            singleton: 是否使用单例模式

        Returns:
            连接器实例

        Raises:
            ValueError: 不支持的交易所
        """
        exchange_id = exchange_id.lower()

        if exchange_id not in cls._connectors:
            raise ValueError(
                f"不支持的交易所: {exchange_id}。"
                f"支持的交易所: {', '.join(cls._connectors.keys())}"
            )

        # 单例模式：每个交易所只创建一个实例
        if singleton:
            instance_key = f"{exchange_id}_{testnet}"
            if instance_key not in cls._instances:
                connector_class = cls._connectors[exchange_id]
                cls._instances[instance_key] = connector_class(
                    exchange_id=exchange_id,
                    api_key=api_key,
                    api_secret=api_secret,
                    password=password,
                    testnet=testnet,
                    options=options,
                )
            return cls._instances[instance_key]

        # 非单例模式：每次创建新实例
        connector_class = cls._connectors[exchange_id]
        return connector_class(
            exchange_id=exchange_id,
            api_key=api_key,
            api_secret=api_secret,
            password=password,
            testnet=testnet,
            options=options,
        )

    @classmethod
    def get_supported_exchanges(cls) -> list[str]:
        """
        获取支持的交易所列表

        Returns:
            交易所ID列表
        """
        return list(cls._connectors.keys())

    @classmethod
    def clear_instances(cls) -> None:
        """清除所有单例实例"""
        cls._instances.clear()

    @classmethod
    async def disconnect_all(cls) -> None:
        """断开所有连接"""
        for instance in cls._instances.values():
            await instance.disconnect()
        cls._instances.clear()
