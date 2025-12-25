"""基础连接器接口"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime
import ccxt
from ccxt.base.exchange import Exchange

from ..models.schemas import (
    Market,
    Ticker,
    OrderBook,
    Trade,
    OHLCV,
    Balance,
    Order,
    OrderRequest,
    Position,
)


class BaseConnector(ABC):
    """交易所连接器基类"""

    def __init__(
        self,
        exchange_id: str,
        api_key: str = "",
        api_secret: str = "",
        password: str = "",
        testnet: bool = False,
        options: Optional[Dict[str, Any]] = None,
    ):
        """
        初始化连接器

        Args:
            exchange_id: 交易所ID
            api_key: API密钥
            api_secret: API密钥
            password: 密码（部分交易所需要）
            testnet: 是否使用测试网
            options: 额外选项
        """
        self.exchange_id = exchange_id
        self.testnet = testnet
        self.options = options or {}

        # 初始化 CCXT 交易所实例
        self.exchange = self._create_exchange(
            api_key=api_key,
            api_secret=api_secret,
            password=password,
        )

        # 连接状态
        self.connected = False
        self.last_ping: Optional[datetime] = None

    @abstractmethod
    def _create_exchange(
        self,
        api_key: str,
        api_secret: str,
        password: str,
    ) -> Exchange:
        """
        创建 CCXT 交易所实例

        Args:
            api_key: API密钥
            api_secret: API密钥
            password: 密码

        Returns:
            CCXT 交易所实例
        """
        pass

    async def connect(self) -> bool:
        """
        连接到交易所

        Returns:
            连接是否成功
        """
        try:
            # 加载市场数据
            await self.exchange.load_markets()
            self.connected = True
            self.last_ping = datetime.utcnow()
            return True
        except Exception as e:
            self.connected = False
            raise Exception(f"连接到 {self.exchange_id} 失败: {str(e)}")

    async def disconnect(self) -> None:
        """断开连接"""
        if hasattr(self.exchange, 'close'):
            await self.exchange.close()
        self.connected = False

    async def ping(self) -> bool:
        """
        检查连接状态

        Returns:
            连接是否正常
        """
        try:
            await self.exchange.fetch_time()
            self.last_ping = datetime.utcnow()
            return True
        except Exception:
            self.connected = False
            return False

    # ==================== 市场数据 ====================

    async def fetch_markets(self, params: Optional[Dict[str, Any]] = None) -> List[Market]:
        """
        获取市场列表

        Args:
            params: 额外参数

        Returns:
            市场列表
        """
        markets = await self.exchange.fetch_markets(params or {})
        return [self._parse_market(m) for m in markets]

    async def fetch_ticker(
        self,
        symbol: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Ticker:
        """
        获取行情数据

        Args:
            symbol: 交易对
            params: 额外参数

        Returns:
            行情数据
        """
        ticker = await self.exchange.fetch_ticker(symbol, params or {})
        return self._parse_ticker(ticker)

    async def fetch_tickers(
        self,
        symbols: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Ticker]:
        """
        获取多个行情数据

        Args:
            symbols: 交易对列表
            params: 额外参数

        Returns:
            行情数据列表
        """
        tickers = await self.exchange.fetch_tickers(symbols, params or {})
        return [self._parse_ticker(t) for t in tickers.values()]

    async def fetch_order_book(
        self,
        symbol: str,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> OrderBook:
        """
        获取订单簿

        Args:
            symbol: 交易对
            limit: 深度限制
            params: 额外参数

        Returns:
            订单簿数据
        """
        orderbook = await self.exchange.fetch_order_book(symbol, limit, params or {})
        return self._parse_orderbook(orderbook)

    async def fetch_trades(
        self,
        symbol: str,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Trade]:
        """
        获取最近成交

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            成交记录列表
        """
        trades = await self.exchange.fetch_trades(symbol, since, limit, params or {})
        return [self._parse_trade(t) for t in trades]

    async def fetch_ohlcv(
        self,
        symbol: str,
        timeframe: str = "1m",
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[OHLCV]:
        """
        获取K线数据

        Args:
            symbol: 交易对
            timeframe: 时间周期
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            K线数据列表
        """
        ohlcv = await self.exchange.fetch_ohlcv(symbol, timeframe, since, limit, params or {})
        return [self._parse_ohlcv(o) for o in ohlcv]

    # ==================== 账户管理 ====================

    async def fetch_balance(self, params: Optional[Dict[str, Any]] = None) -> List[Balance]:
        """
        获取账户余额

        Args:
            params: 额外参数

        Returns:
            余额列表
        """
        balance = await self.exchange.fetch_balance(params or {})
        return self._parse_balance(balance)

    async def fetch_positions(
        self,
        symbols: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Position]:
        """
        获取持仓信息（合约）

        Args:
            symbols: 交易对列表
            params: 额外参数

        Returns:
            持仓列表
        """
        if not self.exchange.has['fetchPositions']:
            return []

        positions = await self.exchange.fetch_positions(symbols, params or {})
        return [self._parse_position(p) for p in positions]

    # ==================== 订单管理 ====================

    async def create_order(self, order_request: OrderRequest) -> Order:
        """
        创建订单

        Args:
            order_request: 订单请求

        Returns:
            订单信息
        """
        order = await self.exchange.create_order(
            symbol=order_request.symbol,
            type=order_request.type,
            side=order_request.side,
            amount=order_request.amount,
            price=order_request.price,
            params=order_request.params,
        )
        return self._parse_order(order)

    async def cancel_order(
        self,
        order_id: str,
        symbol: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Order:
        """
        取消订单

        Args:
            order_id: 订单ID
            symbol: 交易对
            params: 额外参数

        Returns:
            订单信息
        """
        order = await self.exchange.cancel_order(order_id, symbol, params or {})
        return self._parse_order(order)

    async def fetch_order(
        self,
        order_id: str,
        symbol: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Order:
        """
        查询订单

        Args:
            order_id: 订单ID
            symbol: 交易对
            params: 额外参数

        Returns:
            订单信息
        """
        order = await self.exchange.fetch_order(order_id, symbol, params or {})
        return self._parse_order(order)

    async def fetch_open_orders(
        self,
        symbol: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Order]:
        """
        查询未完成订单

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            订单列表
        """
        orders = await self.exchange.fetch_open_orders(symbol, since, limit, params or {})
        return [self._parse_order(o) for o in orders]

    async def fetch_closed_orders(
        self,
        symbol: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Order]:
        """
        查询已完成订单

        Args:
            symbol: 交易对
            since: 起始时间戳
            limit: 数量限制
            params: 额外参数

        Returns:
            订单列表
        """
        orders = await self.exchange.fetch_closed_orders(symbol, since, limit, params or {})
        return [self._parse_order(o) for o in orders]

    # ==================== 数据解析方法 ====================

    def _parse_market(self, market: Dict[str, Any]) -> Market:
        """解析市场数据"""
        return Market(**market)

    def _parse_ticker(self, ticker: Dict[str, Any]) -> Ticker:
        """解析行情数据"""
        return Ticker(
            symbol=ticker['symbol'],
            timestamp=ticker.get('timestamp', 0),
            datetime=ticker.get('datetime', ''),
            high=ticker.get('high'),
            low=ticker.get('low'),
            bid=ticker.get('bid'),
            bid_volume=ticker.get('bidVolume'),
            ask=ticker.get('ask'),
            ask_volume=ticker.get('askVolume'),
            vwap=ticker.get('vwap'),
            open=ticker.get('open'),
            close=ticker.get('close'),
            last=ticker.get('last'),
            previous_close=ticker.get('previousClose'),
            change=ticker.get('change'),
            percentage=ticker.get('percentage'),
            average=ticker.get('average'),
            base_volume=ticker.get('baseVolume'),
            quote_volume=ticker.get('quoteVolume'),
            info=ticker.get('info', {}),
        )

    def _parse_orderbook(self, orderbook: Dict[str, Any]) -> OrderBook:
        """解析订单簿"""
        return OrderBook(
            symbol=orderbook['symbol'],
            timestamp=orderbook.get('timestamp', 0),
            datetime=orderbook.get('datetime', ''),
            nonce=orderbook.get('nonce'),
            bids=orderbook.get('bids', []),
            asks=orderbook.get('asks', []),
        )

    def _parse_trade(self, trade: Dict[str, Any]) -> Trade:
        """解析成交记录"""
        return Trade(**trade)

    def _parse_ohlcv(self, ohlcv: List[Any]) -> OHLCV:
        """解析K线数据"""
        return OHLCV(
            timestamp=ohlcv[0],
            open=ohlcv[1],
            high=ohlcv[2],
            low=ohlcv[3],
            close=ohlcv[4],
            volume=ohlcv[5],
        )

    def _parse_balance(self, balance: Dict[str, Any]) -> List[Balance]:
        """解析余额数据"""
        balances = []
        for currency, data in balance.items():
            if isinstance(data, dict) and 'free' in data:
                balances.append(Balance(
                    currency=currency,
                    free=data.get('free', 0.0),
                    used=data.get('used', 0.0),
                    total=data.get('total', 0.0),
                ))
        return balances

    def _parse_position(self, position: Dict[str, Any]) -> Position:
        """解析持仓数据"""
        return Position(**position)

    def _parse_order(self, order: Dict[str, Any]) -> Order:
        """解析订单数据"""
        return Order(**order)
