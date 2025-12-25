"""币安交易所连接器"""
from typing import Any, Dict, Optional
import ccxt
from ccxt.base.exchange import Exchange

from .base import BaseConnector


class BinanceConnector(BaseConnector):
    """币安交易所连接器"""

    def _create_exchange(
        self,
        api_key: str,
        api_secret: str,
        password: str,
    ) -> Exchange:
        """
        创建币安交易所实例

        Args:
            api_key: API密钥
            api_secret: API密钥
            password: 密码（币安不需要）

        Returns:
            CCXT 交易所实例
        """
        config: Dict[str, Any] = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot',  # 默认现货
                'adjustForTimeDifference': True,
                'recvWindow': 10000,
            },
        }

        # 测试网配置
        if self.testnet:
            config['urls'] = {
                'api': {
                    'public': 'https://testnet.binance.vision/api/v3',
                    'private': 'https://testnet.binance.vision/api/v3',
                }
            }

        # 合并额外选项
        if self.options:
            config['options'].update(self.options)

        return ccxt.binance(config)

    async def set_market_type(self, market_type: str) -> None:
        """
        设置市场类型

        Args:
            market_type: 市场类型 (spot, margin, future, delivery)
        """
        valid_types = ['spot', 'margin', 'future', 'delivery']
        if market_type not in valid_types:
            raise ValueError(f"无效的市场类型: {market_type}，必须是 {valid_types} 之一")

        self.exchange.options['defaultType'] = market_type

    async def set_leverage(
        self,
        symbol: str,
        leverage: int,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置杠杆倍数（合约）

        Args:
            symbol: 交易对
            leverage: 杠杆倍数
            params: 额外参数

        Returns:
            设置结果
        """
        if not self.exchange.has['setLeverage']:
            raise NotImplementedError("当前市场类型不支持设置杠杆")

        return await self.exchange.set_leverage(leverage, symbol, params or {})

    async def set_margin_mode(
        self,
        symbol: str,
        margin_mode: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置保证金模式（合约）

        Args:
            symbol: 交易对
            margin_mode: 保证金模式 (cross, isolated)
            params: 额外参数

        Returns:
            设置结果
        """
        if margin_mode not in ['cross', 'isolated']:
            raise ValueError("保证金模式必须是 'cross' 或 'isolated'")

        if not self.exchange.has['setMarginMode']:
            raise NotImplementedError("当前市场类型不支持设置保证金模式")

        return await self.exchange.set_margin_mode(margin_mode, symbol, params or {})

    async def fetch_funding_rate(
        self,
        symbol: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        获取资金费率（永续合约）

        Args:
            symbol: 交易对
            params: 额外参数

        Returns:
            资金费率信息
        """
        if not self.exchange.has['fetchFundingRate']:
            raise NotImplementedError("当前市场类型不支持查询资金费率")

        return await self.exchange.fetch_funding_rate(symbol, params or {})

    async def fetch_funding_rate_history(
        self,
        symbol: str,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取历史资金费率

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            历史资金费率列表
        """
        if not self.exchange.has['fetchFundingRateHistory']:
            raise NotImplementedError("当前市场类型不支持查询历史资金费率")

        return await self.exchange.fetch_funding_rate_history(
            symbol, since, limit, params or {}
        )

    async def transfer(
        self,
        code: str,
        amount: float,
        from_account: str,
        to_account: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        账户间转账

        Args:
            code: 币种代码
            amount: 数量
            from_account: 源账户 (spot, margin, future)
            to_account: 目标账户 (spot, margin, future)
            params: 额外参数

        Returns:
            转账结果
        """
        if not self.exchange.has['transfer']:
            raise NotImplementedError("不支持账户间转账")

        return await self.exchange.transfer(
            code, amount, from_account, to_account, params or {}
        )

    async def fetch_my_trades(
        self,
        symbol: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取用户成交历史

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            成交历史列表
        """
        return await self.exchange.fetch_my_trades(symbol, since, limit, params or {})

    async def fetch_deposit_address(
        self,
        code: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        获取充值地址

        Args:
            code: 币种代码
            params: 额外参数

        Returns:
            充值地址信息
        """
        if not self.exchange.has['fetchDepositAddress']:
            raise NotImplementedError("不支持查询充值地址")

        return await self.exchange.fetch_deposit_address(code, params or {})

    async def fetch_deposits(
        self,
        code: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取充值历史

        Args:
            code: 币种代码
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            充值历史列表
        """
        if not self.exchange.has['fetchDeposits']:
            raise NotImplementedError("不支持查询充值历史")

        return await self.exchange.fetch_deposits(code, since, limit, params or {})

    async def fetch_withdrawals(
        self,
        code: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取提现历史

        Args:
            code: 币种代码
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            提现历史列表
        """
        if not self.exchange.has['fetchWithdrawals']:
            raise NotImplementedError("不支持查询提现历史")

        return await self.exchange.fetch_withdrawals(code, since, limit, params or {})
