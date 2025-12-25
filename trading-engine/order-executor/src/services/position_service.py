"""
持仓服务 - 持仓管理业务逻辑
"""
from datetime import datetime
from typing import List, Optional, Dict
import structlog
import uuid

from ..models.schemas import PositionResponse
from ..executor.base import BaseOrderExecutor

logger = structlog.get_logger()


class PositionService:
    """
    持仓服务

    提供持仓管理的核心业务逻辑
    """

    def __init__(self, executors: Dict[str, BaseOrderExecutor]):
        """
        初始化持仓服务

        Args:
            executors: 执行器字典
        """
        self.executors = executors
        self.logger = logger.bind(service="position_service")

        # 临时持仓存储 (实际应使用数据库)
        self.positions: dict[str, PositionResponse] = {}

    async def get_positions(
        self,
        strategy_id: Optional[str] = None,
        exchange: Optional[str] = None,
        symbol: Optional[str] = None,
    ) -> List[PositionResponse]:
        """
        查询持仓列表

        Args:
            strategy_id: 策略ID (可选)
            exchange: 交易所 (可选)
            symbol: 交易对 (可选)

        Returns:
            持仓列表
        """
        results = list(self.positions.values())

        # 应用过滤条件
        if strategy_id:
            results = [p for p in results if p.strategy_id == strategy_id]

        if exchange:
            results = [p for p in results if p.exchange == exchange]

        if symbol:
            results = [p for p in results if p.symbol == symbol]

        return results

    async def get_position(
        self, strategy_id: str, exchange: str, symbol: str
    ) -> Optional[PositionResponse]:
        """
        查询单个持仓

        Args:
            strategy_id: 策略ID
            exchange: 交易所
            symbol: 交易对

        Returns:
            PositionResponse 或 None
        """
        position_key = f"{strategy_id}_{exchange}_{symbol}"
        return self.positions.get(position_key)

    async def sync_positions_from_exchange(
        self, exchange_name: str
    ) -> List[PositionResponse]:
        """
        从交易所同步持仓数据

        Args:
            exchange_name: 交易所名称

        Returns:
            同步后的持仓列表
        """
        self.logger.info("syncing_positions", exchange=exchange_name)

        # 获取执行器
        executor = self.executors.get("market")  # 使用任意执行器获取余额
        if not executor or not executor.exchange:
            raise ValueError(f"Exchange {exchange_name} not initialized")

        try:
            # 获取账户余额
            balance = await executor._fetch_balance()

            # 解析持仓信息
            positions: List[PositionResponse] = []

            # 现货账户持仓
            if "total" in balance:
                for currency, amount in balance["total"].items():
                    if amount > 0:
                        position = await self._create_spot_position(
                            exchange_name, currency, amount, balance
                        )
                        positions.append(position)

            # 合约账户持仓 (如果支持)
            if hasattr(executor.exchange, "fetch_positions"):
                contract_positions = await executor.exchange.fetch_positions()
                for pos in contract_positions:
                    if pos.get("contracts", 0) > 0:
                        position = await self._create_contract_position(
                            exchange_name, pos
                        )
                        positions.append(position)

            # 更新本地持仓缓存
            for position in positions:
                position_key = (
                    f"{position.strategy_id}_{position.exchange}_{position.symbol}"
                )
                self.positions[position_key] = position

            self.logger.info(
                "positions_synced", exchange=exchange_name, count=len(positions)
            )

            return positions

        except Exception as e:
            self.logger.error(
                "position_sync_failed", exchange=exchange_name, error=str(e)
            )
            raise

    async def _create_spot_position(
        self, exchange: str, currency: str, amount: float, balance: dict
    ) -> PositionResponse:
        """
        创建现货持仓记录

        Args:
            exchange: 交易所
            currency: 币种
            amount: 数量
            balance: 余额信息

        Returns:
            PositionResponse
        """
        # 计算平均成本 (简化处理,实际应从交易历史计算)
        entry_price = 1.0  # 默认值
        current_price = 1.0  # 需要从市场获取

        # 对于 USDT 等稳定币,直接使用 1.0
        if currency in ["USDT", "USDC", "BUSD", "DAI"]:
            entry_price = 1.0
            current_price = 1.0

        unrealized_pnl = (current_price - entry_price) * amount

        return PositionResponse(
            id=str(uuid.uuid4()),
            strategy_id="default",  # 实际应从订单历史关联
            exchange=exchange,
            symbol=f"{currency}/USDT",
            side="long",  # 现货只有多头
            quantity=amount,
            entry_price=entry_price,
            current_price=current_price,
            unrealized_pnl=unrealized_pnl,
            realized_pnl=0.0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def _create_contract_position(
        self, exchange: str, position_data: dict
    ) -> PositionResponse:
        """
        创建合约持仓记录

        Args:
            exchange: 交易所
            position_data: 交易所持仓数据

        Returns:
            PositionResponse
        """
        return PositionResponse(
            id=str(uuid.uuid4()),
            strategy_id="default",
            exchange=exchange,
            symbol=position_data.get("symbol", ""),
            side=position_data.get("side", "long"),
            quantity=position_data.get("contracts", 0),
            entry_price=position_data.get("entryPrice", 0),
            current_price=position_data.get("markPrice", 0),
            unrealized_pnl=position_data.get("unrealizedPnl", 0),
            realized_pnl=position_data.get("realizedPnl", 0),
            margin=position_data.get("initialMargin", 0),
            leverage=position_data.get("leverage", 1),
            liquidation_price=position_data.get("liquidationPrice"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def calculate_position_pnl(
        self, position: PositionResponse, current_price: float
    ) -> tuple[float, float]:
        """
        计算持仓盈亏

        Args:
            position: 持仓信息
            current_price: 当前价格

        Returns:
            (未实现盈亏, 盈亏百分比)
        """
        price_change = current_price - position.entry_price

        if position.side == "long":
            unrealized_pnl = price_change * position.quantity
        else:  # short
            unrealized_pnl = -price_change * position.quantity

        # 计算盈亏百分比
        if position.entry_price > 0:
            pnl_percentage = (price_change / position.entry_price) * 100
            if position.side == "short":
                pnl_percentage = -pnl_percentage
        else:
            pnl_percentage = 0.0

        return unrealized_pnl, pnl_percentage

    async def update_position_from_order(
        self, strategy_id: str, exchange: str, symbol: str, side: str, quantity: float, price: float
    ) -> PositionResponse:
        """
        根据订单成交更新持仓

        Args:
            strategy_id: 策略ID
            exchange: 交易所
            symbol: 交易对
            side: 买卖方向
            quantity: 数量
            price: 价格

        Returns:
            更新后的持仓
        """
        position_key = f"{strategy_id}_{exchange}_{symbol}"
        position = self.positions.get(position_key)

        if not position:
            # 创建新持仓
            position = PositionResponse(
                id=str(uuid.uuid4()),
                strategy_id=strategy_id,
                exchange=exchange,
                symbol=symbol,
                side="long" if side == "buy" else "short",
                quantity=quantity,
                entry_price=price,
                current_price=price,
                unrealized_pnl=0.0,
                realized_pnl=0.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.positions[position_key] = position

        else:
            # 更新现有持仓
            if side == "buy":
                # 买入: 增加持仓或平空仓
                if position.side == "long":
                    # 加仓
                    total_cost = (
                        position.entry_price * position.quantity + price * quantity
                    )
                    total_quantity = position.quantity + quantity
                    position.entry_price = total_cost / total_quantity
                    position.quantity = total_quantity
                else:
                    # 平空仓
                    if quantity >= position.quantity:
                        # 完全平仓或反向
                        remaining = quantity - position.quantity
                        position.realized_pnl += (
                            position.entry_price - price
                        ) * position.quantity
                        if remaining > 0:
                            position.side = "long"
                            position.quantity = remaining
                            position.entry_price = price
                        else:
                            # 完全平仓,删除持仓
                            del self.positions[position_key]
                            return position
                    else:
                        # 部分平仓
                        position.quantity -= quantity
                        position.realized_pnl += (position.entry_price - price) * quantity

            else:  # sell
                # 卖出: 减少持仓或开空仓
                if position.side == "long":
                    # 平多仓
                    if quantity >= position.quantity:
                        # 完全平仓或反向
                        remaining = quantity - position.quantity
                        position.realized_pnl += (
                            price - position.entry_price
                        ) * position.quantity
                        if remaining > 0:
                            position.side = "short"
                            position.quantity = remaining
                            position.entry_price = price
                        else:
                            # 完全平仓,删除持仓
                            del self.positions[position_key]
                            return position
                    else:
                        # 部分平仓
                        position.quantity -= quantity
                        position.realized_pnl += (price - position.entry_price) * quantity
                else:
                    # 加空仓
                    total_cost = (
                        position.entry_price * position.quantity + price * quantity
                    )
                    total_quantity = position.quantity + quantity
                    position.entry_price = total_cost / total_quantity
                    position.quantity = total_quantity

            position.updated_at = datetime.utcnow()

        self.logger.info(
            "position_updated",
            position_id=position.id,
            symbol=symbol,
            side=position.side,
            quantity=position.quantity,
        )

        return position
