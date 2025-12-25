"""
限价单执行器
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional
import structlog

from .base import BaseOrderExecutor, OrderExecutionError, InvalidOrderError
from ..models.schemas import OrderCreateRequest, OrderResponse, OrderStatus
from ..config import settings

logger = structlog.get_logger()


class LimitOrderExecutor(BaseOrderExecutor):
    """
    限价单执行器

    特点:
    - 以指定价格或更优价格成交
    - 可能不会立即成交
    - 需要监控订单状态直到成交或超时
    """

    async def execute(self, order_request: OrderCreateRequest) -> OrderResponse:
        """
        执行限价单

        Args:
            order_request: 订单创建请求

        Returns:
            OrderResponse: 订单执行结果

        Raises:
            OrderExecutionError: 执行失败
        """
        order_id = str(uuid.uuid4())

        if not order_request.price:
            raise InvalidOrderError("Limit order requires price")

        self.logger.info(
            "executing_limit_order",
            order_id=order_id,
            symbol=order_request.symbol,
            side=order_request.side.value,
            quantity=order_request.quantity,
            price=order_request.price,
        )

        try:
            # 验证订单
            await self.validate_order(order_request)

            # 验证价格合理性
            await self._validate_limit_price(order_request)

            # 提交限价单
            exchange_order = await self._submit_order(
                symbol=order_request.symbol,
                order_type="limit",
                side=order_request.side.value,
                amount=order_request.quantity,
                price=order_request.price,
                params={
                    "clientOrderId": order_request.client_order_id or order_id,
                    "timeInForce": order_request.time_in_force.value,
                },
            )

            # 转换为标准响应
            order_response = self._convert_to_order_response(
                order_request, exchange_order, order_id
            )

            self.logger.info(
                "limit_order_submitted",
                order_id=order_id,
                exchange_order_id=order_response.exchange_order_id,
                status=order_response.status.value,
            )

            # 如果是 IOC/FOK 订单,立即检查状态
            if order_request.time_in_force.value in ["IOC", "FOK"]:
                await asyncio.sleep(1)  # 等待交易所处理
                final_order = await self._fetch_order(
                    exchange_order["id"], order_request.symbol
                )
                order_response = self._convert_to_order_response(
                    order_request, final_order, order_id
                )

            return order_response

        except Exception as e:
            self.logger.error(
                "limit_order_failed", order_id=order_id, error=str(e), exc_info=True
            )
            return OrderResponse(
                id=order_id,
                strategy_id=order_request.strategy_id,
                exchange=order_request.exchange,
                symbol=order_request.symbol,
                side=order_request.side,
                order_type=order_request.order_type,
                status=OrderStatus.FAILED,
                quantity=order_request.quantity,
                price=order_request.price,
                filled_quantity=0.0,
                time_in_force=order_request.time_in_force,
                client_order_id=order_request.client_order_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                error_message=str(e),
                notes=order_request.notes,
            )

    async def _validate_limit_price(self, order_request: OrderCreateRequest) -> None:
        """
        验证限价单价格合理性

        Args:
            order_request: 订单请求

        Raises:
            InvalidOrderError: 价格不合理
        """
        if not order_request.price:
            return

        # 获取当前市场价格
        ticker = await self._fetch_ticker(order_request.symbol)
        current_price = ticker.get("last", 0)

        if not current_price:
            self.logger.warning(
                "unable_to_validate_price",
                symbol=order_request.symbol,
                reason="market_price_unavailable",
            )
            return

        # 计算价格偏离度
        deviation = abs(order_request.price - current_price) / current_price

        # 检查价格是否偏离市场价过多 (默认 20%)
        max_deviation = 0.20
        if deviation > max_deviation:
            self.logger.warning(
                "limit_price_deviation_high",
                order_price=order_request.price,
                market_price=current_price,
                deviation_pct=deviation * 100,
            )

        # 买单价格过高或卖单价格过低的警告
        if order_request.side.value == "buy" and order_request.price > current_price * 1.05:
            self.logger.warning(
                "buy_limit_price_above_market",
                limit_price=order_request.price,
                market_price=current_price,
                suggestion="Consider using market order or lower limit price",
            )
        elif order_request.side.value == "sell" and order_request.price < current_price * 0.95:
            self.logger.warning(
                "sell_limit_price_below_market",
                limit_price=order_request.price,
                market_price=current_price,
                suggestion="Consider using market order or higher limit price",
            )

    async def monitor_order(
        self, order_id: str, exchange_order_id: str, symbol: str, timeout: int = 300
    ) -> OrderResponse:
        """
        监控限价单状态直到成交或超时

        Args:
            order_id: 内部订单ID
            exchange_order_id: 交易所订单ID
            symbol: 交易对
            timeout: 超时时间(秒)

        Returns:
            最终订单状态
        """
        start_time = datetime.utcnow()
        check_interval = 5  # 每 5 秒检查一次

        self.logger.info(
            "monitoring_limit_order",
            order_id=order_id,
            exchange_order_id=exchange_order_id,
            timeout=timeout,
        )

        while True:
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed >= timeout:
                self.logger.warning(
                    "limit_order_monitoring_timeout",
                    order_id=order_id,
                    elapsed=elapsed,
                )
                break

            try:
                # 查询订单状态
                exchange_order = await self._fetch_order(exchange_order_id, symbol)
                status = exchange_order.get("status", "")

                # 如果订单已完成(成交/取消/拒绝等),停止监控
                if status in ["closed", "canceled", "rejected", "expired"]:
                    self.logger.info(
                        "limit_order_completed",
                        order_id=order_id,
                        status=status,
                        filled=exchange_order.get("filled", 0),
                    )
                    break

                # 部分成交也继续监控
                filled = exchange_order.get("filled", 0)
                amount = exchange_order.get("amount", 0)
                if filled > 0:
                    self.logger.info(
                        "limit_order_partial_fill",
                        order_id=order_id,
                        filled=filled,
                        amount=amount,
                        fill_pct=(filled / amount * 100) if amount > 0 else 0,
                    )

            except Exception as e:
                self.logger.error(
                    "limit_order_monitoring_error",
                    order_id=order_id,
                    error=str(e),
                )

            await asyncio.sleep(check_interval)

        # 返回最终状态
        try:
            final_order = await self._fetch_order(exchange_order_id, symbol)
            # 这里需要重建 OrderCreateRequest 或从数据库查询
            # 简化处理: 返回基本信息
            return self._build_order_response_from_exchange(order_id, final_order)
        except Exception as e:
            self.logger.error(
                "fetch_final_order_failed", order_id=order_id, error=str(e)
            )
            raise OrderExecutionError(f"Failed to fetch final order status: {e}")

    def _build_order_response_from_exchange(
        self, order_id: str, exchange_order: dict
    ) -> OrderResponse:
        """
        从交易所订单构建 OrderResponse (简化版)

        Args:
            order_id: 内部订单ID
            exchange_order: 交易所订单信息

        Returns:
            OrderResponse
        """
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

        filled = exchange_order.get("filled", 0)
        amount = exchange_order.get("amount", 0)
        if 0 < filled < amount:
            status = OrderStatus.PARTIAL

        return OrderResponse(
            id=order_id,
            strategy_id="",  # 需要从数据库获取
            exchange=self.exchange_name,
            symbol=exchange_order.get("symbol", ""),
            side=exchange_order.get("side", "buy"),  # type: ignore
            order_type="limit",  # type: ignore
            status=status,
            quantity=amount,
            price=exchange_order.get("price"),
            filled_quantity=filled,
            average_price=exchange_order.get("average"),
            time_in_force="GTC",  # type: ignore
            exchange_order_id=exchange_order.get("id"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            submitted_at=datetime.utcnow(),
            filled_at=datetime.utcnow() if status == OrderStatus.FILLED else None,
        )
