"""
Market Data Service

使用 CCXT 获取真实市场数据：
- Hyperliquid: 实时行情数据
- OKX: 历史 K 线数据（回测用）

提供技术指标计算：RSI, MACD, EMA, 布林带等
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import ccxt.async_support as ccxt
import numpy as np
import pandas as pd
import ta
from ta.momentum import RSIIndicator
from ta.trend import MACD, EMAIndicator, SMAIndicator
from ta.volatility import BollingerBands

logger = logging.getLogger(__name__)


class MarketDataService:
    """
    统一市场数据服务

    - 实时数据: Hyperliquid (无需 API key)
    - 历史数据: OKX (无需 API key，公开接口)
    """

    def __init__(self):
        self._hyperliquid: Optional[ccxt.hyperliquid] = None
        self._okx: Optional[ccxt.okx] = None
        self._cache: Dict[str, Tuple[datetime, Any]] = {}
        self._cache_ttl = 10  # 缓存 10 秒

    async def _get_hyperliquid(self) -> ccxt.hyperliquid:
        """获取 Hyperliquid 交易所实例"""
        if self._hyperliquid is None:
            self._hyperliquid = ccxt.hyperliquid({
                "enableRateLimit": True,
            })
        return self._hyperliquid

    async def _get_okx(self) -> ccxt.okx:
        """获取 OKX 交易所实例"""
        if self._okx is None:
            self._okx = ccxt.okx({
                "enableRateLimit": True,
            })
        return self._okx

    async def close(self):
        """关闭交易所连接"""
        if self._hyperliquid:
            await self._hyperliquid.close()
            self._hyperliquid = None
        if self._okx:
            await self._okx.close()
            self._okx = None

    def _get_cache(self, key: str) -> Optional[Any]:
        """获取缓存数据"""
        if key in self._cache:
            cached_time, data = self._cache[key]
            if datetime.now() - cached_time < timedelta(seconds=self._cache_ttl):
                return data
        return None

    def _set_cache(self, key: str, data: Any):
        """设置缓存数据"""
        self._cache[key] = (datetime.now(), data)

    # =========================================================================
    # 实时行情数据 (Hyperliquid)
    # =========================================================================

    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        获取实时行情

        Args:
            symbol: 交易对，如 "BTC/USDT"

        Returns:
            包含价格、涨跌幅、成交量等信息
        """
        cache_key = f"ticker:{symbol}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        try:
            exchange = await self._get_hyperliquid()
            # Hyperliquid 使用 BTC/USDC:USDC 格式
            hyper_symbol = self._to_hyperliquid_symbol(symbol)
            ticker = await exchange.fetch_ticker(hyper_symbol)

            result = {
                "symbol": symbol,
                "price": ticker.get("last", 0),
                "high_24h": ticker.get("high", 0),
                "low_24h": ticker.get("low", 0),
                "volume_24h": ticker.get("baseVolume", 0),
                "quote_volume_24h": ticker.get("quoteVolume", 0),
                "change_24h": ticker.get("change", 0),
                "change_percent_24h": ticker.get("percentage", 0),
                "bid": ticker.get("bid", 0),
                "ask": ticker.get("ask", 0),
                "timestamp": ticker.get("timestamp", 0),
                "source": "hyperliquid",
            }
            self._set_cache(cache_key, result)
            return result

        except Exception as e:
            logger.error(f"Failed to get ticker for {symbol}: {e}")
            # 返回空数据而不是抛异常
            return {
                "symbol": symbol,
                "price": 0,
                "error": str(e),
                "source": "error",
            }

    async def get_orderbook(
        self, symbol: str, limit: int = 20
    ) -> Dict[str, Any]:
        """
        获取订单簿

        Args:
            symbol: 交易对
            limit: 深度数量

        Returns:
            买卖盘口数据
        """
        try:
            exchange = await self._get_hyperliquid()
            hyper_symbol = self._to_hyperliquid_symbol(symbol)
            orderbook = await exchange.fetch_order_book(hyper_symbol, limit)

            return {
                "symbol": symbol,
                "bids": orderbook.get("bids", [])[:limit],
                "asks": orderbook.get("asks", [])[:limit],
                "timestamp": orderbook.get("timestamp", 0),
                "source": "hyperliquid",
            }
        except Exception as e:
            logger.error(f"Failed to get orderbook for {symbol}: {e}")
            return {"symbol": symbol, "bids": [], "asks": [], "error": str(e)}

    # =========================================================================
    # 历史 K 线数据 (OKX)
    # =========================================================================

    async def get_ohlcv(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100,
        since: Optional[int] = None,
    ) -> List[List[float]]:
        """
        获取历史 K 线数据

        Args:
            symbol: 交易对，如 "BTC/USDT"
            timeframe: 时间周期，如 "1m", "5m", "15m", "1h", "4h", "1d"
            limit: K 线数量
            since: 开始时间戳 (毫秒)

        Returns:
            OHLCV 数据列表 [[timestamp, open, high, low, close, volume], ...]
        """
        cache_key = f"ohlcv:{symbol}:{timeframe}:{limit}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        try:
            exchange = await self._get_okx()
            # OKX 使用 BTC/USDT 格式
            ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, since, limit)
            self._set_cache(cache_key, ohlcv)
            return ohlcv

        except Exception as e:
            logger.error(f"Failed to get OHLCV for {symbol}: {e}")
            return []

    async def get_ohlcv_df(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100,
    ) -> pd.DataFrame:
        """
        获取 K 线数据并转换为 DataFrame

        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume
        """
        ohlcv = await self.get_ohlcv(symbol, timeframe, limit)
        if not ohlcv:
            return pd.DataFrame()

        df = pd.DataFrame(
            ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"]
        )
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        return df

    # =========================================================================
    # 技术指标计算
    # =========================================================================

    async def get_technical_indicators(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 100,
    ) -> Dict[str, Any]:
        """
        计算常用技术指标

        Args:
            symbol: 交易对
            timeframe: 时间周期
            limit: K 线数量

        Returns:
            包含各项技术指标的字典
        """
        df = await self.get_ohlcv_df(symbol, timeframe, limit)
        if df.empty:
            return {"error": "No data available"}

        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        try:
            # RSI
            rsi_indicator = RSIIndicator(close, window=14)
            rsi = rsi_indicator.rsi().iloc[-1]

            # MACD
            macd_indicator = MACD(close)
            macd = macd_indicator.macd().iloc[-1]
            macd_signal = macd_indicator.macd_signal().iloc[-1]
            macd_histogram = macd_indicator.macd_diff().iloc[-1]

            # EMA
            ema_20 = EMAIndicator(close, window=20).ema_indicator().iloc[-1]
            ema_50 = EMAIndicator(close, window=50).ema_indicator().iloc[-1]
            ema_200 = EMAIndicator(close, window=200).ema_indicator().iloc[-1] if len(close) >= 200 else None

            # SMA
            sma_20 = SMAIndicator(close, window=20).sma_indicator().iloc[-1]

            # 布林带
            bb = BollingerBands(close, window=20, window_dev=2)
            bb_upper = bb.bollinger_hband().iloc[-1]
            bb_middle = bb.bollinger_mavg().iloc[-1]
            bb_lower = bb.bollinger_lband().iloc[-1]

            # 支撑/阻力 (简单计算: 近期高低点)
            recent_high = high.tail(20).max()
            recent_low = low.tail(20).min()

            # 成交量分析
            volume_sma = volume.tail(20).mean()
            current_volume = volume.iloc[-1]
            volume_ratio = current_volume / volume_sma if volume_sma > 0 else 1

            # 趋势强度 (基于 ADX 简化版)
            price_change = (close.iloc[-1] - close.iloc[-20]) / close.iloc[-20] * 100 if len(close) >= 20 else 0

            # 波动率 (ATR 简化版)
            tr = pd.concat([
                high - low,
                abs(high - close.shift(1)),
                abs(low - close.shift(1))
            ], axis=1).max(axis=1)
            atr = tr.tail(14).mean()
            volatility = (atr / close.iloc[-1]) * 100  # 百分比

            return {
                "symbol": symbol,
                "timeframe": timeframe,
                "price": {
                    "current": float(close.iloc[-1]),
                    "open": float(df["open"].iloc[-1]),
                    "high_24h": float(high.tail(24).max()) if len(high) >= 24 else float(high.max()),
                    "low_24h": float(low.tail(24).min()) if len(low) >= 24 else float(low.min()),
                    "change_percent": float(price_change),
                },
                "rsi": {
                    "value": float(rsi) if not np.isnan(rsi) else 50,
                    "signal": "oversold" if rsi < 30 else "overbought" if rsi > 70 else "neutral",
                },
                "macd": {
                    "value": float(macd) if not np.isnan(macd) else 0,
                    "signal": float(macd_signal) if not np.isnan(macd_signal) else 0,
                    "histogram": float(macd_histogram) if not np.isnan(macd_histogram) else 0,
                    "trend": "bullish" if macd > macd_signal else "bearish",
                },
                "ema": {
                    "ema_20": float(ema_20) if not np.isnan(ema_20) else 0,
                    "ema_50": float(ema_50) if not np.isnan(ema_50) else 0,
                    "ema_200": float(ema_200) if ema_200 and not np.isnan(ema_200) else None,
                },
                "bollinger_bands": {
                    "upper": float(bb_upper) if not np.isnan(bb_upper) else 0,
                    "middle": float(bb_middle) if not np.isnan(bb_middle) else 0,
                    "lower": float(bb_lower) if not np.isnan(bb_lower) else 0,
                },
                "support_resistance": {
                    "resistance": float(recent_high),
                    "support": float(recent_low),
                },
                "volume": {
                    "current": float(current_volume),
                    "average": float(volume_sma),
                    "ratio": float(volume_ratio),
                    "signal": "high" if volume_ratio > 1.5 else "low" if volume_ratio < 0.5 else "normal",
                },
                "trend": {
                    "direction": "bullish" if price_change > 0 else "bearish" if price_change < 0 else "neutral",
                    "strength": abs(float(price_change)),
                },
                "volatility": {
                    "atr": float(atr) if not np.isnan(atr) else 0,
                    "percent": float(volatility) if not np.isnan(volatility) else 0,
                    "level": "high" if volatility > 5 else "low" if volatility < 2 else "medium",
                },
                "timestamp": datetime.now().isoformat(),
                "source": "okx",
            }

        except Exception as e:
            logger.error(f"Failed to calculate indicators for {symbol}: {e}")
            return {"error": str(e), "symbol": symbol}

    async def get_market_summary(self, symbol: str) -> Dict[str, Any]:
        """
        获取市场综合摘要 (用于 AI 分析)

        整合实时行情 + 技术指标，生成适合注入 LLM prompt 的数据
        """
        # 并行获取数据
        ticker_task = self.get_ticker(symbol)
        indicators_task = self.get_technical_indicators(symbol, "1h", 100)

        ticker, indicators = await asyncio.gather(ticker_task, indicators_task)

        if "error" in indicators:
            # 如果指标计算失败，只返回 ticker 数据
            return {
                "symbol": symbol,
                "price": ticker.get("price", 0),
                "change_24h": ticker.get("change_percent_24h", 0),
                "volume_24h": ticker.get("quote_volume_24h", 0),
                "data_available": False,
                "error": indicators.get("error"),
            }

        price_data = indicators.get("price", {})
        rsi_data = indicators.get("rsi", {})
        macd_data = indicators.get("macd", {})
        sr_data = indicators.get("support_resistance", {})
        vol_data = indicators.get("volatility", {})
        trend_data = indicators.get("trend", {})
        volume_data = indicators.get("volume", {})

        return {
            "symbol": symbol,
            "price": {
                "current": price_data.get("current", ticker.get("price", 0)),
                "high_24h": price_data.get("high_24h", ticker.get("high_24h", 0)),
                "low_24h": price_data.get("low_24h", ticker.get("low_24h", 0)),
                "change_percent": price_data.get("change_percent", ticker.get("change_percent_24h", 0)),
            },
            "indicators": {
                "rsi": rsi_data.get("value", 50),
                "rsi_signal": rsi_data.get("signal", "neutral"),
                "macd": macd_data.get("value", 0),
                "macd_signal": macd_data.get("signal", 0),
                "macd_trend": macd_data.get("trend", "neutral"),
            },
            "levels": {
                "support": sr_data.get("support", 0),
                "resistance": sr_data.get("resistance", 0),
            },
            "trend": {
                "direction": trend_data.get("direction", "neutral"),
                "strength": trend_data.get("strength", 0),
            },
            "volatility": {
                "level": vol_data.get("level", "medium"),
                "percent": vol_data.get("percent", 0),
            },
            "volume": {
                "ratio": volume_data.get("ratio", 1),
                "signal": volume_data.get("signal", "normal"),
            },
            "data_available": True,
            "timestamp": datetime.now().isoformat(),
        }

    # =========================================================================
    # 辅助方法
    # =========================================================================

    def _to_hyperliquid_symbol(self, symbol: str) -> str:
        """
        转换标准交易对格式为 Hyperliquid 格式

        BTC/USDT -> BTC/USDC:USDC
        ETH/USDT -> ETH/USDC:USDC
        """
        base = symbol.split("/")[0]
        return f"{base}/USDC:USDC"

    def _normalize_symbol(self, symbol: str) -> str:
        """标准化交易对格式"""
        symbol = symbol.upper().replace("-", "/")
        if "/" not in symbol:
            symbol = f"{symbol}/USDT"
        return symbol


# 单例实例
_market_data_service: Optional[MarketDataService] = None


async def get_market_data_service() -> MarketDataService:
    """获取 MarketDataService 单例"""
    global _market_data_service
    if _market_data_service is None:
        _market_data_service = MarketDataService()
    return _market_data_service
