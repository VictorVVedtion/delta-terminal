"""
基础订单执行器
"""
import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, List
import structlog
import ccxt.async_support as ccxt
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from ..config import settings
from ..models.schemas import (
    OrderCreateRequest,
    OrderResponse,
    OrderStatus,
    ExecutionReport,
)

logger = structlog.get_logger()


class OrderExecutionError(Exception):
    """订单执行错误"""

    pass


class InsufficientBalanceError(OrderExecutionError):
    """余额不足错误"""

    pass


class InvalidOrderError(OrderExecutionError):
    """无效订单错误"""

    pass


class BaseOrderExecutor(ABC):
    """
    基础订单执行器抽象类

    所有具体执行器都应继承此类并实现 execute 方法
    """

    def __init__(self, exchange_name: str = settings.DEFAULT_EXCHANGE):
        """
        初始化执行器

        Args:
            exchange_name: 交易所名称
        """
        self.exchange_name = exchange_name
        self.exchange: Optional[ccxt.Exchange] = None
        self.logger = logger.bind(
            executor=self.__class__.__name__, exchange=exchange_name
        )

    async def initialize(self) -> None:
        """初始化交易所连接"""
        try:
            exchange_class = getattr(ccxt, self.exchange_name)
            self.exchange = exchange_class(settings.get_exchange_config())
            await self.exchange.load_markets()
            self.logger.info(
                "exchange_initialized",
                markets_count=len(self.exchange.markets) if self.exchange else 0,
            )
        except Exception as e:
            self.logger.error("exchange_init_failed", error=str(e))
            raise

    async def close(self) -> None:
        """关闭交易所连接"""
        if self.exchange:
            await self.exchange.close()
            self.logger.info("exchange_closed")

    @abstractmethod
    async def execute(self, order_request: OrderCreateRequest) -> OrderResponse:
        """
        执行订单 (抽象方法)

        Args:
            order_request: 订单创建请求

        Returns:
            OrderResponse: 订单响应

        Raises:
            OrderExecutionError: 订单执行错误
        """
        pass

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(ccxt.NetworkError),
    )
    async def _submit_order(
        self,
        symbol: str,
        order_type: str,
        side: str,
        amount: float,
        price: Optional[float] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        提交订单到交易所 (带重试)

        Args:
            symbol: 交易对
            order_type: 订单类型
            side: 买卖方向
            amount: 数量
            price: 价格 (限价单必填)
            params: 额外参数

        Returns:
            交易所订单响应

        Raises:
            OrderExecutionError: 订单执行错误
        """
        if not self.exchange:
            raise OrderExecutionError("Exchange not initialized")

        try:
            self.logger.info(
                "submitting_order",
                symbol=symbol,
                type=order_type,
                side=side,
                amount=amount,
                price=price,
            )

            if order_type == "market":
                result = await self.exchange.create_market_order(
                    symbol, side, amount, params or {}
                )
            elif order_type == "limit":
                if price is None:
                    raise InvalidOrderError("Limit order requires price")
                result = await self.exchange.create_limit_order(
                    symbol, side, amount, price, params or {}
                )
            else:
                raise InvalidOrderError(f"Unsupported order type: {order_type}")

            self.logger.info(
                "order_submitted",
                order_id=result.get("id"),
                status=result.get("status"),
            )
            return result

        except ccxt.InsufficientFunds as e:
            self.logger.error("insufficient_balance", error=str(e))
            raise InsufficientBalanceError(str(e)) from e
        except ccxt.InvalidOrder as e:
            self.logger.error("invalid_order", error=str(e))
            raise InvalidOrderError(str(e)) from e
        except ccxt.NetworkError as e:
            self.logger.warning("network_error_retrying", error=str(e))
            raise
        except Exception as e:
            self.logger.error("order_submission_failed", error=str(e))
            raise OrderExecutionError(str(e)) from e

    async def _fetch_order(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """
        查询订单状态

        Args:
            order_id: 订单ID
            symbol: 交易对

        Returns:
            订单信息
        """
        if not self.exchange:
            raise OrderExecutionError("Exchange not initialized")

        try:
            return await self.exchange.fetch_order(order_id, symbol)
        except Exception as e:
            self.logger.error("fetch_order_failed", order_id=order_id, error=str(e))
            raise OrderExecutionError(f"Failed to fetch order: {e}") from e

    async def _cancel_order(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """
        取消订单

        Args:
            order_id: 订单ID
            symbol: 交易对

        Returns:
            取消结果
        """
        if not self.exchange:
            raise OrderExecutionError("Exchange not initialized")

        try:
            self.logger.info("canceling_order", order_id=order_id, symbol=symbol)
            result = await self.exchange.cancel_order(order_id, symbol)
            self.logger.info("order_canceled", order_id=order_id)
            return result
        except Exception as e:
            self.logger.error("cancel_order_failed", order_id=order_id, error=str(e))
            raise OrderExecutionError(f"Failed to cancel order: {e}") from e

    async def _fetch_balance(self) -> Dict[str, Any]:
        """
        查询账户余额

        Returns:
            余额信息
        """
        if not self.exchange:
            raise OrderExecutionError("Exchange not initialized")

        try:
            return await self.exchange.fetch_balance()
        except Exception as e:
            self.logger.error("fetch_balance_failed", error=str(e))
            raise OrderExecutionError(f"Failed to fetch balance: {e}") from e

    async def _fetch_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        查询市场行情

        Args:
            symbol: 交易对

        Returns:
            行情信息
        """
        if not self.exchange:
            raise OrderExecutionError("Exchange not initialized")

        try:
            return await self.exchange.fetch_ticker(symbol)
        except Exception as e:
            self.logger.error("fetch_ticker_failed", symbol=symbol, error=str(e))
            raise OrderExecutionError(f"Failed to fetch ticker: {e}") from e

    def _convert_to_order_response(
        self,
        order_request: OrderCreateRequest,
        exchange_order: Dict[str, Any],
        order_id: Optional[str] = None,
    ) -> OrderResponse:
        """
        将交易所订单响应转换为标准订单响应

        Args:
            order_request: 原始订单请求
            exchange_order: 交易所订单响应
            order_id: 自定义订单ID

        Returns:
            OrderResponse
        """
        now = datetime.utcnow()

        # 映射订单状态
        status_map = {
            "open": OrderStatus.SUBMITTED,
            "closed": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELED,
            "expired": OrderStatus.EXPIRED,
            "rejected": OrderStatus.REJECTED,
        }
        status = status_map.get(
            exchange_order.get("status", "open"), OrderStatus.SUBMITTED
        )

        # 处理部分成交
        filled = exchange_order.get("filled", 0)
        amount = exchange_order.get("amount", order_request.quantity)
        if 0 < filled < amount:
            status = OrderStatus.PARTIAL

        # 构建执行报告
        executions: List[ExecutionReport] = []
        if filled > 0 and exchange_order.get("trades"):
            for trade in exchange_order["trades"]:
                executions.append(
                    ExecutionReport(
                        id=str(uuid.uuid4()),
                        order_id=order_id or str(uuid.uuid4()),
                        exchange_order_id=exchange_order.get("id"),
                        timestamp=datetime.fromtimestamp(
                            trade.get("timestamp", 0) / 1000
                        ),
                        price=trade.get("price", 0),
                        quantity=trade.get("amount", 0),
                        fee=trade.get("fee", {}).get("cost", 0),
                        fee_currency=trade.get("fee", {}).get("currency", "USDT"),
                        trade_id=trade.get("id"),
                    )
                )

        return OrderResponse(
            id=order_id or str(uuid.uuid4()),
            strategy_id=order_request.strategy_id,
            exchange=order_request.exchange,
            symbol=order_request.symbol,
            side=order_request.side,
            order_type=order_request.order_type,
            status=status,
            quantity=amount,
            price=order_request.price,
            filled_quantity=filled,
            average_price=exchange_order.get("average"),
            time_in_force=order_request.time_in_force,
            exchange_order_id=exchange_order.get("id"),
            client_order_id=order_request.client_order_id,
            twap_slices=order_request.twap_slices,
            twap_interval=order_request.twap_interval,
            iceberg_visible_ratio=order_request.iceberg_visible_ratio,
            stop_price=order_request.stop_price,
            created_at=now,
            updated_at=now,
            submitted_at=now if status != OrderStatus.PENDING else None,
            filled_at=now if status == OrderStatus.FILLED else None,
            executions=executions,
            notes=order_request.notes,
        )

    async def validate_order(self, order_request: OrderCreateRequest) -> None:
        """
        验证订单参数

        Args:
            order_request: 订单请求

        Raises:
            InvalidOrderError: 订单参数无效
        """
        # 检查交易对是否存在
        if not self.exchange or order_request.symbol not in self.exchange.markets:
            raise InvalidOrderError(f"Invalid symbol: {order_request.symbol}")

        # 检查订单金额
        market = self.exchange.markets[order_request.symbol]
        min_amount = market.get("limits", {}).get("amount", {}).get("min", 0)
        if order_request.quantity < min_amount:
            raise InvalidOrderError(
                f"Order amount {order_request.quantity} below minimum {min_amount}"
            )

        # 检查订单价值限制
        price = order_request.price
        if not price and order_request.order_type == "limit":
            raise InvalidOrderError("Limit order requires price")

        if price:
            order_value = order_request.quantity * price
            if order_value > settings.MAX_ORDER_VALUE:
                raise InvalidOrderError(
                    f"Order value {order_value} exceeds maximum {settings.MAX_ORDER_VALUE}"
                )

        self.logger.info("order_validated", order_id=order_request.client_order_id)
