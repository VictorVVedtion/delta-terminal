"""
冰山单 (Iceberg Order) 执行器
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional
import structlog

from .base import BaseOrderExecutor, OrderExecutionError
from ..models.schemas import (
    OrderCreateRequest,
    OrderResponse,
    OrderStatus,
    IcebergSlice,
    IcebergProgress,
)
from ..config import settings

logger = structlog.get_logger()


class IcebergOrderExecutor(BaseOrderExecutor):
    """
    冰山单执行器

    冰山单原理:
    - 隐藏真实订单规模,只显示部分数量
    - 当显示部分成交后,自动补充新的显示部分
    - 降低市场冲击,避免暴露交易意图
    - 适合大额订单,防止被"盯梢"

    示例:
        买入 100 BTC, 可见比例 10%
        先挂 10 BTC 限价单, 成交后再挂 10 BTC, 直到全部成交
    """

    def __init__(self, exchange_name: str = settings.DEFAULT_EXCHANGE):
        super().__init__(exchange_name)
        self.active_iceberg_orders: dict[str, IcebergProgress] = {}

    async def execute(self, order_request: OrderCreateRequest) -> OrderResponse:
        """
        执行冰山单

        Args:
            order_request: 订单创建请求

        Returns:
            OrderResponse: 父订单响应
        """
        order_id = str(uuid.uuid4())

        # 获取可见比例
        visible_ratio = (
            order_request.iceberg_visible_ratio or settings.ICEBERG_DEFAULT_VISIBLE_RATIO
        )

        # 计算可见数量
        visible_quantity = order_request.quantity * visible_ratio
        hidden_quantity = order_request.quantity - visible_quantity

        self.logger.info(
            "executing_iceberg_order",
            order_id=order_id,
            symbol=order_request.symbol,
            side=order_request.side.value,
            total_quantity=order_request.quantity,
            visible_quantity=visible_quantity,
            visible_ratio=visible_ratio,
        )

        try:
            # 验证订单
            await self.validate_order(order_request)

            # 验证可见数量满足最小订单要求
            if not self.exchange or order_request.symbol not in self.exchange.markets:
                raise OrderExecutionError("Exchange not initialized or invalid symbol")

            market = self.exchange.markets[order_request.symbol]
            min_amount = market.get("limits", {}).get("amount", {}).get("min", 0)

            if visible_quantity < min_amount:
                raise OrderExecutionError(
                    f"Visible quantity {visible_quantity} below minimum {min_amount}. "
                    f"Increase visible ratio or total quantity."
                )

            # 初始化进度跟踪
            progress = IcebergProgress(
                order_id=order_id,
                total_quantity=order_request.quantity,
                visible_quantity=visible_quantity,
                filled_quantity=0.0,
                remaining_quantity=order_request.quantity,
                completed_slices=0,
            )
            self.active_iceberg_orders[order_id] = progress

            # 创建父订单响应
            parent_order = OrderResponse(
                id=order_id,
                strategy_id=order_request.strategy_id,
                exchange=order_request.exchange,
                symbol=order_request.symbol,
                side=order_request.side,
                order_type=order_request.order_type,
                status=OrderStatus.SUBMITTED,
                quantity=order_request.quantity,
                price=order_request.price,
                filled_quantity=0.0,
                time_in_force=order_request.time_in_force,
                client_order_id=order_request.client_order_id,
                iceberg_visible_ratio=visible_ratio,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                submitted_at=datetime.utcnow(),
                notes=order_request.notes,
            )

            # 异步执行冰山单
            asyncio.create_task(self._execute_iceberg_slices(order_id, order_request))

            return parent_order

        except Exception as e:
            self.logger.error(
                "iceberg_order_failed", order_id=order_id, error=str(e), exc_info=True
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
                iceberg_visible_ratio=visible_ratio,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                error_message=str(e),
                notes=order_request.notes,
            )

    async def _execute_iceberg_slices(
        self, parent_order_id: str, order_request: OrderCreateRequest
    ) -> None:
        """
        执行冰山单分片

        Args:
            parent_order_id: 父订单ID
            order_request: 原始订单请求
        """
        progress = self.active_iceberg_orders.get(parent_order_id)
        if not progress:
            self.logger.error(
                "iceberg_progress_not_found", parent_order_id=parent_order_id
            )
            return

        self.logger.info(
            "starting_iceberg_execution",
            parent_order_id=parent_order_id,
            total_quantity=progress.total_quantity,
            visible_quantity=progress.visible_quantity,
        )

        slice_count = 0

        while progress.remaining_quantity > 0:
            slice_count += 1
            slice_id = f"{parent_order_id}_slice_{slice_count}"

            # 计算本次分片数量
            slice_quantity = min(progress.visible_quantity, progress.remaining_quantity)

            self.logger.info(
                "executing_iceberg_slice",
                slice_id=slice_id,
                slice_number=slice_count,
                quantity=slice_quantity,
                remaining=progress.remaining_quantity,
            )

            try:
                # 创建限价单 (冰山单通常使用限价单)
                if not order_request.price:
                    # 如果没有指定价格,获取当前最优价格
                    ticker = await self._fetch_ticker(order_request.symbol)
                    if order_request.side.value == "buy":
                        order_price = ticker.get("bid", ticker.get("last", 0))
                    else:
                        order_price = ticker.get("ask", ticker.get("last", 0))
                else:
                    order_price = order_request.price

                # 提交限价单
                exchange_order = await self._submit_order(
                    symbol=order_request.symbol,
                    order_type="limit",
                    side=order_request.side.value,
                    amount=slice_quantity,
                    price=order_price,
                    params={
                        "clientOrderId": slice_id,
                        "timeInForce": "GTC",  # 冰山单使用 GTC
                    },
                )

                # 创建分片记录
                iceberg_slice = IcebergSlice(
                    slice_id=slice_id,
                    parent_order_id=parent_order_id,
                    visible_quantity=slice_quantity,
                    hidden_quantity=progress.remaining_quantity - slice_quantity,
                    status=OrderStatus.SUBMITTED,
                    exchange_order_id=exchange_order.get("id"),
                    created_at=datetime.utcnow(),
                )
                progress.current_slice = iceberg_slice

                # 监控分片直到完全成交
                filled = await self._monitor_slice_until_filled(
                    exchange_order.get("id", ""),
                    order_request.symbol,
                    slice_quantity,
                )

                # 更新进度
                iceberg_slice.filled_quantity = filled
                iceberg_slice.status = OrderStatus.FILLED
                progress.filled_quantity += filled
                progress.remaining_quantity -= filled
                progress.completed_slices += 1

                self.logger.info(
                    "iceberg_slice_completed",
                    slice_id=slice_id,
                    filled=filled,
                    total_filled=progress.filled_quantity,
                    remaining=progress.remaining_quantity,
                )

                # 如果未完全成交,停止执行
                if filled < slice_quantity * 0.99:
                    self.logger.warning(
                        "iceberg_slice_not_fully_filled",
                        slice_id=slice_id,
                        expected=slice_quantity,
                        actual=filled,
                    )
                    break

            except Exception as e:
                self.logger.error(
                    "iceberg_slice_failed",
                    slice_id=slice_id,
                    error=str(e),
                    exc_info=True,
                )
                # 冰山单遇到错误暂停执行
                break

        # 冰山单执行完成
        self.logger.info(
            "iceberg_execution_completed",
            parent_order_id=parent_order_id,
            completed_slices=progress.completed_slices,
            filled_quantity=progress.filled_quantity,
            target_quantity=progress.total_quantity,
            fill_rate=(progress.filled_quantity / progress.total_quantity * 100)
            if progress.total_quantity > 0
            else 0,
        )

    async def _monitor_slice_until_filled(
        self, exchange_order_id: str, symbol: str, target_quantity: float
    ) -> float:
        """
        监控分片订单直到完全成交或超时

        Args:
            exchange_order_id: 交易所订单ID
            symbol: 交易对
            target_quantity: 目标数量

        Returns:
            实际成交数量
        """
        check_interval = 5  # 每 5 秒检查一次
        max_wait_time = 300  # 最多等待 5 分钟
        elapsed = 0

        while elapsed < max_wait_time:
            try:
                order = await self._fetch_order(exchange_order_id, symbol)
                filled = order.get("filled", 0)

                # 检查是否完全成交
                if filled >= target_quantity * 0.99:
                    return filled

                # 检查订单是否被取消或拒绝
                status = order.get("status", "")
                if status in ["canceled", "rejected", "expired"]:
                    self.logger.warning(
                        "iceberg_slice_terminated",
                        exchange_order_id=exchange_order_id,
                        status=status,
                        filled=filled,
                    )
                    return filled

            except Exception as e:
                self.logger.error(
                    "slice_monitoring_error",
                    exchange_order_id=exchange_order_id,
                    error=str(e),
                )

            await asyncio.sleep(check_interval)
            elapsed += check_interval

        # 超时,返回当前成交量
        self.logger.warning(
            "iceberg_slice_monitoring_timeout",
            exchange_order_id=exchange_order_id,
            elapsed=elapsed,
        )
        try:
            final_order = await self._fetch_order(exchange_order_id, symbol)
            return final_order.get("filled", 0)
        except:
            return 0

    async def get_iceberg_progress(self, order_id: str) -> Optional[IcebergProgress]:
        """
        获取冰山单执行进度

        Args:
            order_id: 父订单ID

        Returns:
            冰山单进度信息
        """
        return self.active_iceberg_orders.get(order_id)

    async def cancel_iceberg(self, order_id: str, symbol: str) -> None:
        """
        取消冰山单

        取消当前活动的分片,停止后续执行

        Args:
            order_id: 父订单ID
            symbol: 交易对
        """
        progress = self.active_iceberg_orders.get(order_id)
        if not progress:
            self.logger.warning("iceberg_order_not_found", order_id=order_id)
            return

        self.logger.info(
            "canceling_iceberg_order",
            order_id=order_id,
            filled=progress.filled_quantity,
            remaining=progress.remaining_quantity,
        )

        # 取消当前活动的分片
        if progress.current_slice and progress.current_slice.exchange_order_id:
            try:
                await self._cancel_order(progress.current_slice.exchange_order_id, symbol)
                progress.current_slice.status = OrderStatus.CANCELED
                self.logger.info(
                    "iceberg_current_slice_canceled",
                    slice_id=progress.current_slice.slice_id,
                )
            except Exception as e:
                self.logger.error(
                    "failed_to_cancel_iceberg_slice",
                    slice_id=progress.current_slice.slice_id,
                    error=str(e),
                )

        # 标记为已取消,停止后续分片执行
        progress.remaining_quantity = 0

        self.logger.info(
            "iceberg_order_canceled",
            order_id=order_id,
            final_filled=progress.filled_quantity,
        )
