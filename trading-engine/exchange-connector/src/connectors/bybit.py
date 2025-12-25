"""Bybit 交易所连接器"""
from typing import Any, Dict, Optional
import ccxt
from ccxt.base.exchange import Exchange

from .base import BaseConnector


class BybitConnector(BaseConnector):
    """Bybit 交易所连接器"""

    def _create_exchange(
        self,
        api_key: str,
        api_secret: str,
        password: str,
    ) -> Exchange:
        """
        创建 Bybit 交易所实例

        Args:
            api_key: API密钥
            api_secret: API密钥
            password: 密码（Bybit不需要）

        Returns:
            CCXT 交易所实例
        """
        config: Dict[str, Any] = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'swap',  # 默认永续合约
                'recvWindow': 10000,
            },
        }

        # 测试网配置
        if self.testnet:
            config['urls'] = {
                'api': {
                    'public': 'https://api-testnet.bybit.com',
                    'private': 'https://api-testnet.bybit.com',
                }
            }

        # 合并额外选项
        if self.options:
            config['options'].update(self.options)

        return ccxt.bybit(config)

    async def set_market_type(self, market_type: str) -> None:
        """
        设置市场类型

        Args:
            market_type: 市场类型 (spot, linear, inverse, option)
        """
        valid_types = ['spot', 'linear', 'inverse', 'option']
        if market_type not in valid_types:
            raise ValueError(f"无效的市场类型: {market_type}，必须是 {valid_types} 之一")

        # Bybit 类型映射
        type_map = {
            'spot': 'spot',
            'linear': 'swap',  # USDT永续
            'inverse': 'swap',  # 币本位永续
            'option': 'option',
        }

        self.exchange.options['defaultType'] = type_map[market_type]
        if market_type in ['linear', 'inverse']:
            self.exchange.options['defaultSettle'] = 'USDT' if market_type == 'linear' else 'BTC'

    async def set_leverage(
        self,
        symbol: str,
        leverage: int,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置杠杆倍数

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
        设置保证金模式

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

        # Bybit 使用数字表示: 0=全仓, 1=逐仓
        params = params or {}
        params['tradeMode'] = 0 if margin_mode == 'cross' else 1

        return await self.exchange.set_margin_mode(margin_mode, symbol, params)

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
        if not self.exchange.has['setPositionMode']:
            raise NotImplementedError("当前市场类型不支持设置持仓模式")

        # Bybit: 0=单向, 3=双向
        params = params or {}
        params['mode'] = 3 if hedge_mode else 0

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
            from_account: 源账户 (SPOT, CONTRACT, INVESTMENT, OPTION, UNIFIED, FUND)
            to_account: 目标账户
            params: 额外参数

        Returns:
            转账结果
        """
        if not self.exchange.has['transfer']:
            raise NotImplementedError("不支持账户间转账")

        # Bybit 账户类型必须大写
        from_account = from_account.upper()
        to_account = to_account.upper()

        valid_accounts = ['SPOT', 'CONTRACT', 'INVESTMENT', 'OPTION', 'UNIFIED', 'FUND']
        if from_account not in valid_accounts or to_account not in valid_accounts:
            raise ValueError(f"账户类型必须是 {valid_accounts} 之一")

        return await self.exchange.transfer(
            code, amount, from_account, to_account, params or {}
        )

    async def fetch_borrow_rate(
        self,
        code: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        获取借贷利率（现货杠杆）

        Args:
            code: 币种代码
            params: 额外参数

        Returns:
            借贷利率信息
        """
        if not self.exchange.has['fetchBorrowRate']:
            raise NotImplementedError("不支持查询借贷利率")

        return await self.exchange.fetch_borrow_rate(code, params or {})

    async def fetch_my_liquidations(
        self,
        symbol: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> list:
        """
        获取用户强平历史

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            强平历史列表
        """
        if not self.exchange.has['fetchMyLiquidations']:
            raise NotImplementedError("不支持查询强平历史")

        return await self.exchange.fetch_my_liquidations(symbol, since, limit, params or {})

    async def set_trading_stop(
        self,
        symbol: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        设置止盈止损（持仓级别）

        Args:
            symbol: 交易对
            params: 额外参数，包括 takeProfit, stopLoss, trailingStop 等

        Returns:
            设置结果
        """
        # Bybit 特有功能：持仓级别止盈止损
        params = params or {}

        # 必须指定持仓方向（单向持仓可省略）
        if 'positionIdx' not in params:
            params['positionIdx'] = 0  # 0=单向, 1=多头, 2=空头

        return await self.exchange.private_post_v5_position_trading_stop({
            'symbol': symbol,
            **params
        })

    async def modify_position_margin(
        self,
        symbol: str,
        amount: float,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        调整保证金（逐仓模式）

        Args:
            symbol: 交易对
            amount: 调整数量（正数=增加，负数=减少）
            params: 额外参数

        Returns:
            调整结果
        """
        params = params or {}
        params['margin'] = abs(amount)
        params['type'] = 1 if amount > 0 else 2  # 1=增加, 2=减少

        return await self.exchange.private_post_v5_position_set_leverage({
            'symbol': symbol,
            **params
        })

    async def close_position(
        self,
        symbol: str,
        side: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        一键平仓

        Args:
            symbol: 交易对
            side: 方向 (long, short)，单向持仓时可选
            params: 额外参数

        Returns:
            平仓结果
        """
        params = params or {}

        # 设置持仓索引
        if side:
            params['positionIdx'] = 1 if side == 'long' else 2
        else:
            params['positionIdx'] = 0  # 单向持仓

        # 使用 Bybit 一键平仓功能
        params['reduceOnly'] = True
        params['closeOnTrigger'] = True

        # 获取当前持仓
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
