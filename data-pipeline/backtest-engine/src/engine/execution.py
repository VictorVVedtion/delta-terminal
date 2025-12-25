"""模拟执行引擎 - 订单执行与成交模拟"""
from datetime import datetime
from typing import Dict, Optional
import uuid
import logging

from src.engine.event_engine import Event, EventType, OrderEvent, FillEvent
from src.engine.data_handler import DataHandler

logger = logging.getLogger(__name__)


class SimulatedExecutionHandler:
    """
    模拟执行处理器

    职责:
    1. 接收OrderEvent
    2. 模拟订单成交
    3. 应用滑点和手续费
    4. 生成FillEvent
    """

    def __init__(
        self,
        data_handler: DataHandler,
        commission: float = 0.001,
        slippage: float = 0.0005
    ):
        """
        Args:
            data_handler: 数据处理器
            commission: 手续费率 (默认0.1%)
            slippage: 滑点率 (默认0.05%)
        """
        self.data_handler = data_handler
        self.commission_rate = commission
        self.slippage_rate = slippage

        # 订单记录
        self.orders: Dict[str, Dict] = {}
        self.fills: Dict[str, Dict] = {}

    def execute_order(self, order_event: OrderEvent) -> Optional[FillEvent]:
        """
        执行订单

        Args:
            order_event: 订单事件

        Returns:
            FillEvent或None
        """
        data = order_event.data
        symbol = data['symbol']
        order_type = data['order_type']
        side = data['side']
        quantity = data['quantity']
        limit_price = data.get('price')

        # 获取当前市场价格
        current_price = self.data_handler.get_current_price(symbol)
        if current_price is None:
            logger.warning(f"无法获取 {symbol} 当前价格,订单未执行")
            return None

        # 确定成交价格
        fill_price = self._calculate_fill_price(
            current_price, order_type, side, limit_price
        )

        if fill_price is None:
            logger.debug(f"限价单未成交: {symbol} {side} @{limit_price}")
            return None

        # 计算手续费和滑点
        commission = quantity * fill_price * self.commission_rate
        slippage = quantity * fill_price * self.slippage_rate

        # 生成成交ID
        fill_id = str(uuid.uuid4())
        order_id = str(uuid.uuid4())

        # 记录成交
        fill_data = {
            'fill_id': fill_id,
            'order_id': order_id,
            'timestamp': order_event.timestamp,
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'price': fill_price,
            'commission': commission,
            'slippage': slippage
        }
        self.fills[fill_id] = fill_data

        logger.debug(
            f"订单成交: {symbol} {side.upper()} {quantity}@{fill_price:.2f} "
            f"| 手续费: {commission:.2f} | 滑点: {slippage:.2f}"
        )

        # 创建FillEvent
        fill_event = FillEvent(
            timestamp=order_event.timestamp,
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=fill_price,
            commission=commission,
            slippage=slippage
        )

        return fill_event

    def _calculate_fill_price(
        self,
        current_price: float,
        order_type: str,
        side: str,
        limit_price: Optional[float]
    ) -> Optional[float]:
        """
        计算成交价格

        考虑订单类型、滑点等因素

        Args:
            current_price: 当前市场价格
            order_type: 订单类型 (market/limit)
            side: 买卖方向
            limit_price: 限价单价格

        Returns:
            成交价格或None(未成交)
        """
        if order_type == 'market':
            # 市价单立即成交,考虑滑点
            if side == 'buy':
                # 买入时价格略高
                fill_price = current_price * (1 + self.slippage_rate)
            else:
                # 卖出时价格略低
                fill_price = current_price * (1 - self.slippage_rate)
            return fill_price

        elif order_type == 'limit':
            # 限价单需要价格满足条件
            if limit_price is None:
                logger.warning("限价单未提供价格")
                return None

            if side == 'buy':
                # 买入限价单: 市价 <= 限价时成交
                if current_price <= limit_price:
                    return current_price
            else:
                # 卖出限价单: 市价 >= 限价时成交
                if current_price >= limit_price:
                    return current_price

            return None  # 未成交

        else:
            logger.warning(f"不支持的订单类型: {order_type}")
            return None

    def get_fills(self) -> list:
        """获取所有成交记录"""
        return list(self.fills.values())

    def get_fill_count(self) -> int:
        """获取成交数量"""
        return len(self.fills)

    def reset(self) -> None:
        """重置执行器"""
        self.orders.clear()
        self.fills.clear()
        logger.info("执行器已重置")


class LiveExecutionHandler:
    """
    实盘执行处理器 (TODO)

    对接真实交易所API
    """

    def __init__(self, exchange_client):
        self.exchange_client = exchange_client
        raise NotImplementedError("实盘执行未实现")

    def execute_order(self, order_event: OrderEvent) -> Optional[FillEvent]:
        """执行实盘订单"""
        # TODO: 调用交易所API下单
        raise NotImplementedError
