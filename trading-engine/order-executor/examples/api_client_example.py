"""
Order Executor API 客户端使用示例
"""
import httpx
import asyncio
from typing import Dict, Any


class OrderExecutorClient:
    """Order Executor API 客户端"""

    def __init__(self, base_url: str = "http://localhost:8003"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """关闭客户端"""
        await self.client.aclose()

    async def create_market_order(
        self,
        strategy_id: str,
        exchange: str,
        symbol: str,
        side: str,
        quantity: float,
    ) -> Dict[str, Any]:
        """
        创建市价单

        Args:
            strategy_id: 策略ID
            exchange: 交易所
            symbol: 交易对
            side: 买卖方向 (buy/sell)
            quantity: 数量

        Returns:
            订单响应
        """
        order_data = {
            "strategy_id": strategy_id,
            "exchange": exchange,
            "symbol": symbol,
            "side": side,
            "order_type": "market",
            "quantity": quantity,
            "time_in_force": "GTC",
        }

        response = await self.client.post(
            f"{self.base_url}/api/v1/orders", json=order_data
        )
        response.raise_for_status()
        return response.json()

    async def create_twap_order(
        self,
        strategy_id: str,
        exchange: str,
        symbol: str,
        side: str,
        quantity: float,
        slices: int = 10,
        interval: int = 60,
    ) -> Dict[str, Any]:
        """
        创建 TWAP 订单

        Args:
            strategy_id: 策略ID
            exchange: 交易所
            symbol: 交易对
            side: 买卖方向
            quantity: 总数量
            slices: 分片数量
            interval: 时间间隔(秒)

        Returns:
            订单响应
        """
        order_data = {
            "strategy_id": strategy_id,
            "exchange": exchange,
            "symbol": symbol,
            "side": side,
            "order_type": "twap",
            "quantity": quantity,
            "twap_slices": slices,
            "twap_interval": interval,
            "time_in_force": "GTC",
        }

        response = await self.client.post(
            f"{self.base_url}/api/v1/orders", json=order_data
        )
        response.raise_for_status()
        return response.json()

    async def create_iceberg_order(
        self,
        strategy_id: str,
        exchange: str,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        visible_ratio: float = 0.1,
    ) -> Dict[str, Any]:
        """
        创建冰山单

        Args:
            strategy_id: 策略ID
            exchange: 交易所
            symbol: 交易对
            side: 买卖方向
            quantity: 总数量
            price: 限价价格
            visible_ratio: 可见比例

        Returns:
            订单响应
        """
        order_data = {
            "strategy_id": strategy_id,
            "exchange": exchange,
            "symbol": symbol,
            "side": side,
            "order_type": "iceberg",
            "quantity": quantity,
            "price": price,
            "iceberg_visible_ratio": visible_ratio,
            "time_in_force": "GTC",
        }

        response = await self.client.post(
            f"{self.base_url}/api/v1/orders", json=order_data
        )
        response.raise_for_status()
        return response.json()

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """查询订单"""
        response = await self.client.get(f"{self.base_url}/api/v1/orders/{order_id}")
        response.raise_for_status()
        return response.json()

    async def cancel_order(self, order_id: str, reason: str = None) -> Dict[str, Any]:
        """取消订单"""
        params = {"reason": reason} if reason else {}
        response = await self.client.post(
            f"{self.base_url}/api/v1/orders/{order_id}/cancel", params=params
        )
        response.raise_for_status()
        return response.json()

    async def get_twap_progress(self, order_id: str) -> Dict[str, Any]:
        """获取 TWAP 执行进度"""
        response = await self.client.get(
            f"{self.base_url}/api/v1/orders/{order_id}/twap-progress"
        )
        response.raise_for_status()
        return response.json()

    async def get_positions(
        self, strategy_id: str = None, exchange: str = None, symbol: str = None
    ) -> list[Dict[str, Any]]:
        """查询持仓"""
        params = {}
        if strategy_id:
            params["strategy_id"] = strategy_id
        if exchange:
            params["exchange"] = exchange
        if symbol:
            params["symbol"] = symbol

        response = await self.client.get(
            f"{self.base_url}/api/v1/positions", params=params
        )
        response.raise_for_status()
        return response.json()

    async def get_queue_status(self) -> Dict[str, Any]:
        """获取队列状态"""
        response = await self.client.get(f"{self.base_url}/api/v1/orders/queue/status")
        response.raise_for_status()
        return response.json()


async def main():
    """示例主函数"""
    client = OrderExecutorClient()

    try:
        # 示例 1: 创建市价单
        print("=" * 50)
        print("示例 1: 创建市价单")
        print("=" * 50)
        market_order = await client.create_market_order(
            strategy_id="demo_strategy",
            exchange="binance",
            symbol="BTC/USDT",
            side="buy",
            quantity=0.001,
        )
        print(f"市价单已创建: {market_order['id']}")
        print(f"状态: {market_order['status']}")

        # 示例 2: 创建 TWAP 订单
        print("\n" + "=" * 50)
        print("示例 2: 创建 TWAP 订单")
        print("=" * 50)
        twap_order = await client.create_twap_order(
            strategy_id="demo_strategy",
            exchange="binance",
            symbol="BTC/USDT",
            side="buy",
            quantity=0.01,
            slices=5,
            interval=30,
        )
        print(f"TWAP 订单已创建: {twap_order['id']}")
        print(f"分片数: {twap_order['twap_slices']}")
        print(f"时间间隔: {twap_order['twap_interval']}秒")

        # 等待一段时间后查询 TWAP 进度
        await asyncio.sleep(10)
        twap_progress = await client.get_twap_progress(twap_order["id"])
        print(f"\nTWAP 执行进度: {twap_progress['progress_percentage']:.1f}%")
        print(
            f"已完成分片: {twap_progress['completed_slices']}/{twap_progress['total_slices']}"
        )

        # 示例 3: 创建冰山单
        print("\n" + "=" * 50)
        print("示例 3: 创建冰山单")
        print("=" * 50)
        iceberg_order = await client.create_iceberg_order(
            strategy_id="demo_strategy",
            exchange="binance",
            symbol="BTC/USDT",
            side="buy",
            quantity=0.1,
            price=50000.0,
            visible_ratio=0.2,
        )
        print(f"冰山单已创建: {iceberg_order['id']}")
        print(f"总数量: {iceberg_order['quantity']}")
        print(f"可见比例: {iceberg_order['iceberg_visible_ratio']*100}%")

        # 示例 4: 查询持仓
        print("\n" + "=" * 50)
        print("示例 4: 查询持仓")
        print("=" * 50)
        positions = await client.get_positions(strategy_id="demo_strategy")
        print(f"当前持仓数量: {len(positions)}")
        for pos in positions:
            print(f"  - {pos['symbol']}: {pos['quantity']} ({pos['side']})")

        # 示例 5: 查询队列状态
        print("\n" + "=" * 50)
        print("示例 5: 查询队列状态")
        print("=" * 50)
        queue_status = await client.get_queue_status()
        print(f"队列健康状态: {queue_status['queue_health']}")
        print(f"待处理订单: {queue_status['pending_count']}")
        print(f"处理中订单: {queue_status['processing_count']}")
        print(f"失败订单: {queue_status['failed_count']}")

    except Exception as e:
        print(f"❌ 错误: {e}")

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
