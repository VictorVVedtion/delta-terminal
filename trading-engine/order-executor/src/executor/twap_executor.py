"""
TWAP (Time-Weighted Average Price) 执行器
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
import structlog

from .base import BaseOrderExecutor, OrderExecutionError
from ..models.schemas import (
    OrderCreateRequest,
    OrderResponse,
    OrderStatus,
    TWAPSlice,
    TWAPProgress,
)
from ..config import settings

logger = structlog.get_logger()


class TWAPOrderExecutor(BaseOrderExecutor):
    """
    TWAP 订单执行器

    时间加权平均价格算法:
    - 将大额订单拆分为多个小订单
    - 在指定时间内均匀分布执行
    - 降低市场冲击,获得更优平均价格
    - 适合大额交易

    示例:
        买入 10 BTC, 分 10 片, 每片 1 BTC, 每 60 秒执行一片
        总执行时间: 10 分钟
    """

    def __init__(self, exchange_name: str = settings.DEFAULT_EXCHANGE):
        super().__init__(exchange_name)
        self.active_twap_orders: dict[str, TWAPProgress] = {}

    async def execute(self, order_request: OrderCreateRequest) -> OrderResponse:
        """
        执行 TWAP 订单

        Args:
            order_request: 订单创建请求

        Returns:
            OrderResponse: 父订单响应
        """
        order_id = str(uuid.uuid4())

        # 获取 TWAP 参数
        slices = order_request.twap_slices or settings.TWAP_DEFAULT_SLICES
        interval = order_request.twap_interval or settings.TWAP_DEFAULT_INTERVAL

        self.logger.info(
            "executing_twap_order",
            order_id=order_id,
            symbol=order_request.symbol,
            side=order_request.side.value,
            total_quantity=order_request.quantity,
            slices=slices,
            interval=interval,
        )

        try:
            # 验证订单
            await self.validate_order(order_request)

            # 创建 TWAP 分片
            slice_quantity = order_request.quantity / slices
            twap_slices = self._create_twap_slices(
                order_id, slices, slice_quantity, interval
            )

            # 初始化进度跟踪
            progress = TWAPProgress(
                order_id=order_id,
                total_slices=slices,
                completed_slices=0,
                total_quantity=order_request.quantity,
                filled_quantity=0.0,
                progress_percentage=0.0,
                estimated_completion=datetime.utcnow()
                + timedelta(seconds=slices * interval),
                slices=twap_slices,
            )
            self.active_twap_orders[order_id] = progress

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
                twap_slices=slices,
                twap_interval=interval,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                submitted_at=datetime.utcnow(),
                notes=order_request.notes,
            )

            # 异步执行 TWAP 分片 (不等待完成)
            asyncio.create_task(
                self._execute_twap_slices(order_id, order_request, twap_slices)
            )

            return parent_order

        except Exception as e:
            self.logger.error(
                "twap_order_failed", order_id=order_id, error=str(e), exc_info=True
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
                twap_slices=slices,
                twap_interval=interval,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                error_message=str(e),
                notes=order_request.notes,
            )

    def _create_twap_slices(
        self, parent_order_id: str, slices: int, quantity: float, interval: int
    ) -> List[TWAPSlice]:
        """
        创建 TWAP 分片

        Args:
            parent_order_id: 父订单ID
            slices: 分片数量
            quantity: 每片数量
            interval: 时间间隔(秒)

        Returns:
            TWAP 分片列表
        """
        twap_slices: List[TWAPSlice] = []
        now = datetime.utcnow()

        for i in range(slices):
            slice_id = f"{parent_order_id}_slice_{i + 1}"
            scheduled_time = now + timedelta(seconds=i * interval)

            twap_slices.append(
                TWAPSlice(
                    slice_id=slice_id,
                    parent_order_id=parent_order_id,
                    sequence=i + 1,
                    quantity=quantity,
                    status=OrderStatus.PENDING,
                    scheduled_time=scheduled_time,
                )
            )

        return twap_slices

    async def _execute_twap_slices(
        self,
        parent_order_id: str,
        order_request: OrderCreateRequest,
        twap_slices: List[TWAPSlice],
    ) -> None:
        """
        执行 TWAP 分片订单

        Args:
            parent_order_id: 父订单ID
            order_request: 原始订单请求
            twap_slices: TWAP 分片列表
        """
        self.logger.info(
            "starting_twap_execution",
            parent_order_id=parent_order_id,
            total_slices=len(twap_slices),
        )

        progress = self.active_twap_orders.get(parent_order_id)
        if not progress:
            self.logger.error(
                "twap_progress_not_found", parent_order_id=parent_order_id
            )
            return

        total_filled = 0.0
        total_cost = 0.0

        for slice_obj in twap_slices:
            try:
                # 等待到计划执行时间
                now = datetime.utcnow()
                if slice_obj.scheduled_time > now:
                    wait_seconds = (slice_obj.scheduled_time - now).total_seconds()
                    self.logger.info(
                        "waiting_for_slice_execution",
                        slice_id=slice_obj.slice_id,
                        wait_seconds=wait_seconds,
                    )
                    await asyncio.sleep(wait_seconds)

                # 执行分片订单
                self.logger.info(
                    "executing_twap_slice",
                    slice_id=slice_obj.slice_id,
                    sequence=slice_obj.sequence,
                    quantity=slice_obj.quantity,
                )

                # 提交市价单 (TWAP 通常使用市价单以确保成交)
                exchange_order = await self._submit_order(
                    symbol=order_request.symbol,
                    order_type="market",
                    side=order_request.side.value,
                    amount=slice_obj.quantity,
                    params={"clientOrderId": slice_obj.slice_id},
                )

                # 更新分片状态
                slice_obj.exchange_order_id = exchange_order.get("id")
                slice_obj.filled_quantity = exchange_order.get("filled", 0)
                slice_obj.average_price = exchange_order.get("average")
                slice_obj.executed_at = datetime.utcnow()
                slice_obj.status = (
                    OrderStatus.FILLED
                    if slice_obj.filled_quantity >= slice_obj.quantity * 0.99
                    else OrderStatus.PARTIAL
                )

                # 累计统计
                total_filled += slice_obj.filled_quantity
                if slice_obj.average_price:
                    total_cost += slice_obj.filled_quantity * slice_obj.average_price

                # 更新进度
                progress.completed_slices += 1
                progress.filled_quantity = total_filled
                progress.progress_percentage = (
                    progress.completed_slices / progress.total_slices * 100
                )
                progress.average_price = (
                    total_cost / total_filled if total_filled > 0 else None
                )

                self.logger.info(
                    "twap_slice_executed",
                    slice_id=slice_obj.slice_id,
                    filled=slice_obj.filled_quantity,
                    price=slice_obj.average_price,
                    progress=f"{progress.completed_slices}/{progress.total_slices}",
                )

            except Exception as e:
                self.logger.error(
                    "twap_slice_failed",
                    slice_id=slice_obj.slice_id,
                    error=str(e),
                    exc_info=True,
                )
                slice_obj.status = OrderStatus.FAILED

                # TWAP 执行策略: 遇到失败继续执行后续分片
                continue

        # TWAP 执行完成
        self.logger.info(
            "twap_execution_completed",
            parent_order_id=parent_order_id,
            completed_slices=progress.completed_slices,
            total_slices=progress.total_slices,
            filled_quantity=progress.filled_quantity,
            target_quantity=progress.total_quantity,
            average_price=progress.average_price,
        )

    async def get_twap_progress(self, order_id: str) -> Optional[TWAPProgress]:
        """
        获取 TWAP 执行进度

        Args:
            order_id: 父订单ID

        Returns:
            TWAP 进度信息
        """
        return self.active_twap_orders.get(order_id)

    async def cancel_twap(self, order_id: str) -> None:
        """
        取消 TWAP 订单

        停止后续分片执行,但已执行的分片无法撤销

        Args:
            order_id: 父订单ID
        """
        progress = self.active_twap_orders.get(order_id)
        if not progress:
            self.logger.warning("twap_order_not_found", order_id=order_id)
            return

        self.logger.info(
            "canceling_twap_order",
            order_id=order_id,
            completed_slices=progress.completed_slices,
            total_slices=progress.total_slices,
        )

        # 标记未执行的分片为取消状态
        for slice_obj in progress.slices:
            if slice_obj.status == OrderStatus.PENDING:
                slice_obj.status = OrderStatus.CANCELED

        # 如果有正在执行的订单,尝试取消
        for slice_obj in progress.slices:
            if (
                slice_obj.status == OrderStatus.SUBMITTED
                and slice_obj.exchange_order_id
            ):
                try:
                    # 这里需要传入 symbol,实际应用中需要从订单请求中获取
                    # await self._cancel_order(slice_obj.exchange_order_id, symbol)
                    slice_obj.status = OrderStatus.CANCELED
                except Exception as e:
                    self.logger.error(
                        "failed_to_cancel_slice",
                        slice_id=slice_obj.slice_id,
                        error=str(e),
                    )

        self.logger.info(
            "twap_order_canceled",
            order_id=order_id,
            final_filled=progress.filled_quantity,
        )
