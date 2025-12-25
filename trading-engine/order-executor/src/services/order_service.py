"""
订单服务 - 订单管理业务逻辑
"""
from datetime import datetime
from typing import List, Optional
import structlog
import uuid

from ..models.schemas import (
    OrderCreateRequest,
    OrderCancelRequest,
    OrderQueryRequest,
    OrderResponse,
    OrderStatus,
    OrderStatistics,
    TWAPProgress,
    IcebergProgress,
)
from ..queue.order_queue import OrderQueue
from ..executor.twap_executor import TWAPOrderExecutor
from ..executor.iceberg_executor import IcebergOrderExecutor

logger = structlog.get_logger()


class OrderService:
    """
    订单服务

    提供订单管理的核心业务逻辑
    """

    def __init__(self, order_queue: OrderQueue):
        """
        初始化订单服务

        Args:
            order_queue: 订单队列实例
        """
        self.order_queue = order_queue
        self.logger = logger.bind(service="order_service")

        # 临时订单存储 (实际应使用数据库)
        self.orders: dict[str, OrderResponse] = {}

    async def create_order(
        self, order_request: OrderCreateRequest, priority: int = 0
    ) -> OrderResponse:
        """
        创建订单

        Args:
            order_request: 订单创建请求
            priority: 优先级

        Returns:
            OrderResponse
        """
        self.logger.info(
            "creating_order",
            strategy_id=order_request.strategy_id,
            symbol=order_request.symbol,
            order_type=order_request.order_type.value,
        )

        # 验证订单参数
        self._validate_order_request(order_request)

        # 将订单加入队列
        queue_id = await self.order_queue.enqueue(order_request, priority)

        # 创建初始订单响应
        order_response = OrderResponse(
            id=str(uuid.uuid4()),
            strategy_id=order_request.strategy_id,
            exchange=order_request.exchange,
            symbol=order_request.symbol,
            side=order_request.side,
            order_type=order_request.order_type,
            status=OrderStatus.PENDING,
            quantity=order_request.quantity,
            price=order_request.price,
            filled_quantity=0.0,
            time_in_force=order_request.time_in_force,
            client_order_id=order_request.client_order_id or queue_id,
            twap_slices=order_request.twap_slices,
            twap_interval=order_request.twap_interval,
            iceberg_visible_ratio=order_request.iceberg_visible_ratio,
            stop_price=order_request.stop_price,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            notes=order_request.notes,
        )

        # 存储订单 (实际应存入数据库)
        self.orders[order_response.id] = order_response

        self.logger.info(
            "order_created",
            order_id=order_response.id,
            queue_id=queue_id,
        )

        return order_response

    async def cancel_order(self, cancel_request: OrderCancelRequest) -> OrderResponse:
        """
        取消订单

        Args:
            cancel_request: 取消订单请求

        Returns:
            更新后的订单状态
        """
        self.logger.info("canceling_order", order_id=cancel_request.order_id)

        # 查询订单
        order = self.orders.get(cancel_request.order_id)
        if not order:
            raise ValueError(f"Order not found: {cancel_request.order_id}")

        # 检查订单状态
        if order.status in [
            OrderStatus.FILLED,
            OrderStatus.CANCELED,
            OrderStatus.REJECTED,
        ]:
            self.logger.warning(
                "order_cannot_be_canceled",
                order_id=cancel_request.order_id,
                current_status=order.status.value,
            )
            return order

        # 对于 TWAP/Iceberg 订单,需要特殊处理
        if order.order_type.value == "twap":
            executor = self.order_queue.executors.get("twap")
            if isinstance(executor, TWAPOrderExecutor):
                await executor.cancel_twap(cancel_request.order_id)

        elif order.order_type.value == "iceberg":
            executor = self.order_queue.executors.get("iceberg")
            if isinstance(executor, IcebergOrderExecutor):
                await executor.cancel_iceberg(cancel_request.order_id, order.symbol)

        else:
            # 普通订单取消
            if order.exchange_order_id:
                executor = self.order_queue.executors.get(order.order_type.value)
                if executor:
                    await executor._cancel_order(order.exchange_order_id, order.symbol)

        # 更新订单状态
        order.status = OrderStatus.CANCELED
        order.updated_at = datetime.utcnow()
        order.notes = f"{order.notes or ''} | Canceled: {cancel_request.reason or 'User request'}"

        self.logger.info("order_canceled", order_id=cancel_request.order_id)

        return order

    async def get_order(self, order_id: str) -> Optional[OrderResponse]:
        """
        查询单个订单

        Args:
            order_id: 订单ID

        Returns:
            OrderResponse 或 None
        """
        return self.orders.get(order_id)

    async def query_orders(self, query: OrderQueryRequest) -> List[OrderResponse]:
        """
        查询订单列表

        Args:
            query: 查询条件

        Returns:
            订单列表
        """
        results = list(self.orders.values())

        # 应用过滤条件
        if query.order_id:
            results = [o for o in results if o.id == query.order_id]

        if query.strategy_id:
            results = [o for o in results if o.strategy_id == query.strategy_id]

        if query.exchange:
            results = [o for o in results if o.exchange == query.exchange]

        if query.symbol:
            results = [o for o in results if o.symbol == query.symbol]

        if query.status:
            results = [o for o in results if o.status == query.status]

        if query.start_time:
            results = [o for o in results if o.created_at >= query.start_time]

        if query.end_time:
            results = [o for o in results if o.created_at <= query.end_time]

        # 排序 (按创建时间倒序)
        results.sort(key=lambda x: x.created_at, reverse=True)

        # 分页
        start = query.offset
        end = start + query.limit
        return results[start:end]

    async def get_order_statistics(
        self, strategy_id: Optional[str] = None
    ) -> OrderStatistics:
        """
        获取订单统计信息

        Args:
            strategy_id: 策略ID (可选)

        Returns:
            OrderStatistics
        """
        orders = list(self.orders.values())

        if strategy_id:
            orders = [o for o in orders if o.strategy_id == strategy_id]

        total_orders = len(orders)
        pending_orders = len([o for o in orders if o.status == OrderStatus.PENDING])
        filled_orders = len([o for o in orders if o.status == OrderStatus.FILLED])
        canceled_orders = len([o for o in orders if o.status == OrderStatus.CANCELED])
        failed_orders = len([o for o in orders if o.status == OrderStatus.FAILED])

        # 计算总成交量和成交金额
        total_volume = sum(o.filled_quantity for o in orders)
        total_value = sum(
            o.filled_quantity * (o.average_price or o.price or 0) for o in orders
        )

        # 计算成功率
        completed = filled_orders + canceled_orders + failed_orders
        success_rate = (filled_orders / completed * 100) if completed > 0 else 0

        return OrderStatistics(
            total_orders=total_orders,
            pending_orders=pending_orders,
            filled_orders=filled_orders,
            canceled_orders=canceled_orders,
            failed_orders=failed_orders,
            total_volume=total_volume,
            total_value=total_value,
            success_rate=success_rate,
        )

    async def get_twap_progress(self, order_id: str) -> Optional[TWAPProgress]:
        """
        获取 TWAP 订单执行进度

        Args:
            order_id: 订单ID

        Returns:
            TWAPProgress 或 None
        """
        executor = self.order_queue.executors.get("twap")
        if isinstance(executor, TWAPOrderExecutor):
            return await executor.get_twap_progress(order_id)
        return None

    async def get_iceberg_progress(self, order_id: str) -> Optional[IcebergProgress]:
        """
        获取冰山单执行进度

        Args:
            order_id: 订单ID

        Returns:
            IcebergProgress 或 None
        """
        executor = self.order_queue.executors.get("iceberg")
        if isinstance(executor, IcebergOrderExecutor):
            return await executor.get_iceberg_progress(order_id)
        return None

    def _validate_order_request(self, order_request: OrderCreateRequest) -> None:
        """
        验证订单请求参数

        Args:
            order_request: 订单请求

        Raises:
            ValueError: 参数无效
        """
        # 验证限价单必须有价格
        if order_request.order_type.value == "limit" and not order_request.price:
            raise ValueError("Limit order requires price")

        # 验证 TWAP 参数
        if order_request.order_type.value == "twap":
            if not order_request.twap_slices or order_request.twap_slices < 2:
                raise ValueError("TWAP order requires at least 2 slices")
            if not order_request.twap_interval or order_request.twap_interval < 1:
                raise ValueError("TWAP order requires interval >= 1 second")

        # 验证冰山单参数
        if order_request.order_type.value == "iceberg":
            if not order_request.iceberg_visible_ratio:
                raise ValueError("Iceberg order requires visible ratio")
            if not (0 < order_request.iceberg_visible_ratio <= 1):
                raise ValueError("Iceberg visible ratio must be between 0 and 1")

        # 验证止损止盈订单
        if order_request.order_type.value in ["stop_loss", "take_profit"]:
            if not order_request.stop_price:
                raise ValueError(
                    f"{order_request.order_type.value} order requires stop price"
                )

        self.logger.info("order_request_validated", order_type=order_request.order_type.value)
