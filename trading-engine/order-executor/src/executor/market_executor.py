"""
市价单执行器
"""
import uuid
from datetime import datetime
from typing import Optional
import structlog

from .base import BaseOrderExecutor, OrderExecutionError
from ..models.schemas import OrderCreateRequest, OrderResponse, OrderStatus

logger = structlog.get_logger()


class MarketOrderExecutor(BaseOrderExecutor):
    """
    市价单执行器

    特点:
    - 立即执行,按市场最优价格成交
    - 高成交率,适合快速建仓/平仓
    - 可能存在滑点
    """

    async def execute(self, order_request: OrderCreateRequest) -> OrderResponse:
        """
        执行市价单

        Args:
            order_request: 订单创建请求

        Returns:
            OrderResponse: 订单执行结果

        Raises:
            OrderExecutionError: 执行失败
        """
        order_id = str(uuid.uuid4())
        self.logger.info(
            "executing_market_order",
            order_id=order_id,
            symbol=order_request.symbol,
            side=order_request.side.value,
            quantity=order_request.quantity,
        )

        try:
            # 验证订单
            await self.validate_order(order_request)

            # 获取当前市场价格(用于记录)
            ticker = await self._fetch_ticker(order_request.symbol)
            current_price = ticker.get("last", 0)

            self.logger.info(
                "market_price_reference",
                order_id=order_id,
                current_price=current_price,
            )

            # 提交市价单
            exchange_order = await self._submit_order(
                symbol=order_request.symbol,
                order_type="market",
                side=order_request.side.value,
                amount=order_request.quantity,
                params={
                    "clientOrderId": order_request.client_order_id or order_id,
                },
            )

            # 市价单通常立即成交,但仍需查询最终状态
            if exchange_order.get("id"):
                final_order = await self._fetch_order(
                    exchange_order["id"], order_request.symbol
                )
            else:
                final_order = exchange_order

            # 转换为标准响应
            order_response = self._convert_to_order_response(
                order_request, final_order, order_id
            )

            # 计算滑点
            if order_response.average_price and current_price:
                slippage = self._calculate_slippage(
                    expected_price=current_price,
                    actual_price=order_response.average_price,
                    side=order_request.side.value,
                )
                self.logger.info(
                    "market_order_executed",
                    order_id=order_id,
                    exchange_order_id=order_response.exchange_order_id,
                    filled_quantity=order_response.filled_quantity,
                    average_price=order_response.average_price,
                    slippage_bps=slippage,
                )
            else:
                self.logger.info(
                    "market_order_executed",
                    order_id=order_id,
                    exchange_order_id=order_response.exchange_order_id,
                    filled_quantity=order_response.filled_quantity,
                    average_price=order_response.average_price,
                )

            return order_response

        except Exception as e:
            self.logger.error(
                "market_order_failed", order_id=order_id, error=str(e), exc_info=True
            )
            # 返回失败状态的订单
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

    def _calculate_slippage(
        self, expected_price: float, actual_price: float, side: str
    ) -> float:
        """
        计算滑点 (以基点 bps 为单位)

        Args:
            expected_price: 期望价格 (参考价格)
            actual_price: 实际成交价格
            side: 买卖方向

        Returns:
            滑点 (bps, 正值表示不利滑点)
        """
        if side == "buy":
            # 买入: 实际价格高于期望价格为不利滑点
            slippage = (actual_price - expected_price) / expected_price
        else:
            # 卖出: 实际价格低于期望价格为不利滑点
            slippage = (expected_price - actual_price) / expected_price

        return slippage * 10000  # 转换为基点
