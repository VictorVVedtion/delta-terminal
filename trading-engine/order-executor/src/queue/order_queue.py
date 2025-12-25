"""
订单队列管理系统
"""
import asyncio
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import structlog
from redis import asyncio as aioredis

from ..config import settings
from ..models.schemas import (
    OrderQueueItem,
    QueueStatus,
    OrderCreateRequest,
    OrderResponse,
)
from ..executor.base import BaseOrderExecutor
from ..executor.market_executor import MarketOrderExecutor
from ..executor.limit_executor import LimitOrderExecutor
from ..executor.twap_executor import TWAPOrderExecutor
from ..executor.iceberg_executor import IcebergOrderExecutor

logger = structlog.get_logger()


class OrderQueue:
    """
    订单队列管理器

    功能:
    - 异步订单队列处理
    - 优先级管理
    - 失败重试机制
    - 队列监控与统计
    - 并发控制
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        max_concurrent_orders: int = 10,
        retry_delay: float = 1.0,
    ):
        """
        初始化订单队列

        Args:
            redis_url: Redis 连接 URL
            max_concurrent_orders: 最大并发订单数
            retry_delay: 重试延迟(秒)
        """
        self.redis_url = redis_url or self._build_redis_url()
        self.redis: Optional[aioredis.Redis] = None
        self.max_concurrent_orders = max_concurrent_orders
        self.retry_delay = retry_delay
        self.logger = logger.bind(component="order_queue")

        # 队列名称
        self.PENDING_QUEUE = "order_queue:pending"
        self.PROCESSING_QUEUE = "order_queue:processing"
        self.FAILED_QUEUE = "order_queue:failed"
        self.COMPLETED_QUEUE = "order_queue:completed"
        self.PRIORITY_QUEUE = "order_queue:priority"

        # 订单数据存储
        self.ORDER_DATA_PREFIX = "order_data:"

        # 执行器映射
        self.executors: Dict[str, BaseOrderExecutor] = {}
        self._is_running = False
        self._worker_task: Optional[asyncio.Task] = None

    def _build_redis_url(self) -> str:
        """构建 Redis 连接 URL"""
        auth = f":{settings.REDIS_PASSWORD}@" if settings.REDIS_PASSWORD else ""
        return f"redis://{auth}{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"

    async def initialize(self) -> None:
        """初始化队列系统"""
        try:
            self.redis = await aioredis.from_url(
                self.redis_url, decode_responses=True, encoding="utf-8"
            )
            await self.redis.ping()
            self.logger.info("order_queue_initialized", redis_url=self.redis_url)

            # 初始化执行器
            await self._initialize_executors()

        except Exception as e:
            self.logger.error("queue_initialization_failed", error=str(e))
            raise

    async def _initialize_executors(self) -> None:
        """初始化订单执行器"""
        executor_classes = {
            "market": MarketOrderExecutor,
            "limit": LimitOrderExecutor,
            "twap": TWAPOrderExecutor,
            "iceberg": IcebergOrderExecutor,
        }

        for order_type, executor_class in executor_classes.items():
            executor = executor_class()
            await executor.initialize()
            self.executors[order_type] = executor
            self.logger.info("executor_initialized", order_type=order_type)

    async def close(self) -> None:
        """关闭队列系统"""
        self._is_running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

        # 关闭执行器
        for executor in self.executors.values():
            await executor.close()

        if self.redis:
            await self.redis.close()
        self.logger.info("order_queue_closed")

    async def enqueue(
        self, order_request: OrderCreateRequest, priority: int = 0
    ) -> str:
        """
        将订单加入队列

        Args:
            order_request: 订单创建请求
            priority: 优先级 (数值越大优先级越高)

        Returns:
            订单队列ID
        """
        if not self.redis:
            raise RuntimeError("Queue not initialized")

        queue_item_id = f"queue_{datetime.utcnow().timestamp()}_{order_request.client_order_id or ''}"

        queue_item = OrderQueueItem(
            order_id=queue_item_id,
            priority=priority,
            retry_count=0,
            max_retries=settings.MAX_RETRY_COUNT,
            created_at=datetime.utcnow(),
        )

        # 存储订单数据
        order_data_key = f"{self.ORDER_DATA_PREFIX}{queue_item_id}"
        await self.redis.setex(
            order_data_key,
            86400,  # 24小时过期
            order_request.model_dump_json(),
        )

        # 根据优先级选择队列
        if priority > 0:
            # 使用有序集合实现优先级队列
            await self.redis.zadd(
                self.PRIORITY_QUEUE, {queue_item.model_dump_json(): priority}
            )
        else:
            # 使用列表实现普通队列
            await self.redis.rpush(self.PENDING_QUEUE, queue_item.model_dump_json())

        self.logger.info(
            "order_enqueued",
            queue_item_id=queue_item_id,
            priority=priority,
            symbol=order_request.symbol,
            order_type=order_request.order_type.value,
        )

        return queue_item_id

    async def dequeue(self) -> Optional[tuple[OrderQueueItem, OrderCreateRequest]]:
        """
        从队列中获取订单

        Returns:
            (队列项, 订单请求) 或 None
        """
        if not self.redis:
            return None

        # 优先处理高优先级订单
        priority_item = await self.redis.zpopmax(self.PRIORITY_QUEUE)
        if priority_item:
            queue_item_json, _ = priority_item[0]
            queue_item = OrderQueueItem.model_validate_json(queue_item_json)
        else:
            # 处理普通队列
            queue_item_json = await self.redis.lpop(self.PENDING_QUEUE)
            if not queue_item_json:
                return None
            queue_item = OrderQueueItem.model_validate_json(queue_item_json)

        # 获取订单数据
        order_data_key = f"{self.ORDER_DATA_PREFIX}{queue_item.order_id}"
        order_data_json = await self.redis.get(order_data_key)
        if not order_data_json:
            self.logger.error("order_data_not_found", queue_item_id=queue_item.order_id)
            return None

        order_request = OrderCreateRequest.model_validate_json(order_data_json)

        # 移动到处理队列
        await self.redis.sadd(self.PROCESSING_QUEUE, queue_item.model_dump_json())

        return queue_item, order_request

    async def start_workers(self, worker_count: int = 1) -> None:
        """
        启动订单处理工作线程

        Args:
            worker_count: 工作线程数量
        """
        self._is_running = True
        self.logger.info("starting_queue_workers", worker_count=worker_count)

        workers = [
            asyncio.create_task(self._worker(f"worker_{i}"))
            for i in range(worker_count)
        ]

        await asyncio.gather(*workers, return_exceptions=True)

    async def _worker(self, worker_id: str) -> None:
        """
        订单处理工作线程

        Args:
            worker_id: 工作线程ID
        """
        self.logger.info("worker_started", worker_id=worker_id)

        while self._is_running:
            try:
                # 获取订单
                result = await self.dequeue()
                if not result:
                    await asyncio.sleep(1)  # 队列为空,等待
                    continue

                queue_item, order_request = result

                # 执行订单
                await self._process_order(queue_item, order_request)

            except Exception as e:
                self.logger.error(
                    "worker_error", worker_id=worker_id, error=str(e), exc_info=True
                )
                await asyncio.sleep(self.retry_delay)

        self.logger.info("worker_stopped", worker_id=worker_id)

    async def _process_order(
        self, queue_item: OrderQueueItem, order_request: OrderCreateRequest
    ) -> None:
        """
        处理订单

        Args:
            queue_item: 队列项
            order_request: 订单请求
        """
        if not self.redis:
            return

        self.logger.info(
            "processing_order",
            queue_item_id=queue_item.order_id,
            order_type=order_request.order_type.value,
            retry_count=queue_item.retry_count,
        )

        try:
            # 获取对应的执行器
            executor = self.executors.get(order_request.order_type.value)
            if not executor:
                raise ValueError(f"No executor for order type: {order_request.order_type}")

            # 执行订单
            order_response = await executor.execute(order_request)

            # 检查执行结果
            if order_response.status.value in ["filled", "submitted", "partial"]:
                # 成功
                await self._handle_success(queue_item, order_response)
            else:
                # 失败
                await self._handle_failure(queue_item, order_request, order_response)

        except Exception as e:
            self.logger.error(
                "order_processing_failed",
                queue_item_id=queue_item.order_id,
                error=str(e),
                exc_info=True,
            )
            await self._handle_failure(queue_item, order_request, None, str(e))

    async def _handle_success(
        self, queue_item: OrderQueueItem, order_response: OrderResponse
    ) -> None:
        """处理订单成功"""
        if not self.redis:
            return

        # 从处理队列移除
        await self.redis.srem(self.PROCESSING_QUEUE, queue_item.model_dump_json())

        # 添加到完成队列
        await self.redis.rpush(self.COMPLETED_QUEUE, order_response.model_dump_json())

        # 设置过期时间 (保留 7 天)
        await self.redis.expire(self.COMPLETED_QUEUE, 604800)

        self.logger.info(
            "order_completed",
            queue_item_id=queue_item.order_id,
            order_id=order_response.id,
            status=order_response.status.value,
        )

    async def _handle_failure(
        self,
        queue_item: OrderQueueItem,
        order_request: OrderCreateRequest,
        order_response: Optional[OrderResponse],
        error_message: Optional[str] = None,
    ) -> None:
        """处理订单失败"""
        if not self.redis:
            return

        # 检查是否需要重试
        if queue_item.retry_count < queue_item.max_retries:
            queue_item.retry_count += 1

            self.logger.warning(
                "order_retry",
                queue_item_id=queue_item.order_id,
                retry_count=queue_item.retry_count,
                max_retries=queue_item.max_retries,
            )

            # 重新加入队列
            await asyncio.sleep(self.retry_delay * queue_item.retry_count)
            await self.redis.rpush(self.PENDING_QUEUE, queue_item.model_dump_json())

        else:
            # 超过重试次数,标记为失败
            self.logger.error(
                "order_failed_max_retries",
                queue_item_id=queue_item.order_id,
                retry_count=queue_item.retry_count,
            )

            failure_data = {
                "queue_item": queue_item.model_dump(),
                "order_request": order_request.model_dump(),
                "error": error_message or (
                    order_response.error_message if order_response else "Unknown error"
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }

            await self.redis.rpush(self.FAILED_QUEUE, json.dumps(failure_data))

        # 从处理队列移除
        await self.redis.srem(self.PROCESSING_QUEUE, queue_item.model_dump_json())

    async def get_queue_status(self) -> QueueStatus:
        """
        获取队列状态

        Returns:
            QueueStatus
        """
        if not self.redis:
            raise RuntimeError("Queue not initialized")

        pending_count = await self.redis.llen(self.PENDING_QUEUE)
        priority_count = await self.redis.zcard(self.PRIORITY_QUEUE)
        processing_count = await self.redis.scard(self.PROCESSING_QUEUE)
        failed_count = await self.redis.llen(self.FAILED_QUEUE)
        completed_count = await self.redis.llen(self.COMPLETED_QUEUE)

        total_pending = pending_count + priority_count

        # 判断队列健康状态
        if failed_count > 100 or processing_count > self.max_concurrent_orders * 2:
            health = "critical"
        elif failed_count > 10 or processing_count > self.max_concurrent_orders:
            health = "degraded"
        else:
            health = "healthy"

        return QueueStatus(
            pending_count=total_pending,
            processing_count=processing_count,
            failed_count=failed_count,
            completed_count=completed_count,
            queue_health=health,
        )

    async def clear_completed(self, keep_recent: int = 1000) -> int:
        """
        清理已完成订单队列

        Args:
            keep_recent: 保留最近的订单数量

        Returns:
            清理的订单数量
        """
        if not self.redis:
            return 0

        total = await self.redis.llen(self.COMPLETED_QUEUE)
        if total <= keep_recent:
            return 0

        to_remove = total - keep_recent
        await self.redis.ltrim(self.COMPLETED_QUEUE, -keep_recent, -1)

        self.logger.info("completed_queue_cleared", removed_count=to_remove)
        return to_remove
