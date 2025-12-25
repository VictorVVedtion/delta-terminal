"""OKX 交易所连接器"""
from typing import Any, Dict, Optional
import ccxt
from ccxt.base.exchange import Exchange

from .base import BaseConnector


class OKXConnector(BaseConnector):
    """OKX 交易所连接器"""

    def _create_exchange(
        self,
        api_key: str,
        api_secret: str,
        password: str,
    ) -> Exchange:
        """
        创建 OKX 交易所实例

        Args:
            api_key: API密钥
            api_secret: API密钥
            password: API密码（OKX必需）

        Returns:
            CCXT 交易所实例
        """
        config: Dict[str, Any] = {
            'apiKey': api_key,
            'secret': api_secret,
            'password': password,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot',
                'broker': 'delta-terminal',
            },
        }

        # 测试网配置
        if self.testnet:
            config['hostname'] = 'www.okx.com'  # OKX 使用同一域名，通过参数区分
            config['options']['sandboxMode'] = True

        # 合并额外选项
        if self.options:
            config['options'].update(self.options)

        return ccxt.okx(config)

    async def set_market_type(self, market_type: str) -> None:
        """
        设置市场类型

        Args:
            market_type: 市场类型 (spot, swap, future, option)
        """
        valid_types = ['spot', 'swap', 'future', 'option']
        if market_type not in valid_types:
            raise ValueError(f"无效的市场类型: {market_type}，必须是 {valid_types} 之一")

        self.exchange.options['defaultType'] = market_type

    async def set_leverage(
        self,
        symbol: str,
        leverage: int,
        margin_mode: str = 'cross',
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置杠杆倍数

        Args:
            symbol: 交易对
            leverage: 杠杆倍数
            margin_mode: 保证金模式 (cross, isolated)
            params: 额外参数

        Returns:
            设置结果
        """
        if margin_mode not in ['cross', 'isolated']:
            raise ValueError("保证金模式必须是 'cross' 或 'isolated'")

        params = params or {}
        params['mgnMode'] = margin_mode

        return await self.exchange.set_leverage(leverage, symbol, params)

    async def set_position_mode(
        self,
        hedge_mode: bool,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置持仓模式

        Args:
            hedge_mode: True=双向持仓, False=单向持仓
            params: 额外参数

        Returns:
            设置结果
        """
        position_mode = 'long_short_mode' if hedge_mode else 'net_mode'
        params = params or {}
        params['posMode'] = position_mode

        return await self.exchange.set_position_mode(hedge_mode, None, params)

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
            from_account: 源账户类型 (funding, trading, spot, swap, future)
            to_account: 目标账户类型
            params: 额外参数

        Returns:
            转账结果
        """
        if not self.exchange.has['transfer']:
            raise NotImplementedError("不支持账户间转账")

        # OKX 账户类型映射
        account_map = {
            'funding': '6',
            'trading': '18',
            'spot': '18',
            'swap': '18',
            'future': '18',
        }

        params = params or {}
        params['type'] = '0'  # 账户内转账
        params['from'] = account_map.get(from_account, from_account)
        params['to'] = account_map.get(to_account, to_account)

        return await self.exchange.transfer(code, amount, from_account, to_account, params)

    async def fetch_ledger(
        self,
        code: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取账户流水

        Args:
            code: 币种代码
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            账户流水列表
        """
        if not self.exchange.has['fetchLedger']:
            raise NotImplementedError("不支持查询账户流水")

        return await self.exchange.fetch_ledger(code, since, limit, params or {})

    async def fetch_liquidations(
        self,
        symbol: str,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取强平订单

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            强平订单列表
        """
        if not self.exchange.has['fetchLiquidations']:
            raise NotImplementedError("不支持查询强平订单")

        return await self.exchange.fetch_liquidations(symbol, since, limit, params or {})

    async def fetch_option_chain(
        self,
        code: str,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取期权链

        Args:
            code: 标的资产代码 (如 BTC, ETH)
            params: 额外参数

        Returns:
            期权链列表
        """
        # OKX 期权特定功能
        params = params or {}
        params['instType'] = 'OPTION'
        params['uly'] = f'{code}-USD'

        markets = await self.exchange.fetch_markets(params)
        return [m for m in markets if m.get('option') is True]

    async def close_position(
        self,
        symbol: str,
        side: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        平仓

        Args:
            symbol: 交易对
            side: 方向 (long, short)，单向持仓时可选
            params: 额外参数

        Returns:
            平仓结果
        """
        params = params or {}

        if side:
            params['posSide'] = 'long' if side == 'long' else 'short'

        # OKX 使用市价单平仓
        params['mgnMode'] = 'cross'  # 或从当前持仓获取
        params['cxlOnClosePos'] = True  # 平仓时取消其他订单

        # 获取当前持仓数量
        positions = await self.fetch_positions([symbol])
        if not positions:
            raise ValueError(f"没有找到 {symbol} 的持仓")

        position = positions[0]
        amount = abs(position.contracts)
        order_side = 'sell' if position.side == 'long' else 'buy'

        # 创建市价平仓单
        return await self.exchange.create_order(
            symbol=symbol,
            type='market',
            side=order_side,
            amount=amount,
            params=params,
        )
