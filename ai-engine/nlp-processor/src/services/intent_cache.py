"""意图识别缓存服务

P0 优化: 缓存 LLM 意图识别结果，避免重复调用
预期收益: 减少 30-40% 响应时间 (缓存命中时)
"""

import hashlib
import json
import logging
from typing import Optional, Tuple
from datetime import datetime

from ..models.schemas import IntentRecognitionResponse, IntentType
from ..config import settings

logger = logging.getLogger(__name__)


class IntentCache:
    """意图识别缓存 (Redis 后端)"""

    def __init__(self, redis_client=None):
        """
        初始化缓存

        Args:
            redis_client: Redis 客户端实例 (redis.asyncio.Redis)
        """
        self.redis = redis_client
        self.key_prefix = "intent_cache:"
        # 缓存 TTL: 24小时 (意图识别结果相对稳定)
        self.ttl = 24 * 3600
        # 缓存命中统计
        self._hits = 0
        self._misses = 0

    def _make_cache_key(self, text: str, context: dict = None) -> str:
        """
        生成缓存键

        使用输入文本和上下文的 hash 作为键，确保相同输入得到相同结果

        Args:
            text: 用户输入文本
            context: 上下文信息

        Returns:
            缓存键
        """
        # 标准化输入
        normalized_text = text.strip().lower()

        # 提取相关上下文 (只使用影响意图识别的字段)
        relevant_context = {}
        if context:
            # 只保留影响意图的字段
            for key in ["session_type", "current_intent", "active_strategy"]:
                if key in context:
                    relevant_context[key] = context[key]

        # 生成 hash
        cache_data = {
            "text": normalized_text,
            "context": relevant_context,
        }
        cache_str = json.dumps(cache_data, sort_keys=True, ensure_ascii=False)
        hash_value = hashlib.sha256(cache_str.encode()).hexdigest()[:16]

        return f"{self.key_prefix}{hash_value}"

    async def get(
        self, text: str, context: dict = None
    ) -> Optional[IntentRecognitionResponse]:
        """
        从缓存获取意图识别结果

        Args:
            text: 用户输入文本
            context: 上下文信息

        Returns:
            缓存的意图识别结果，未命中返回 None
        """
        if not self.redis:
            return None

        try:
            key = self._make_cache_key(text, context)
            data = await self.redis.get(key)

            if not data:
                self._misses += 1
                return None

            # 反序列化
            cache_dict = json.loads(data)

            # 验证并重建响应
            intent = IntentType(cache_dict.get("intent", "UNKNOWN"))
            confidence = float(cache_dict.get("confidence", 0.0))
            entities = cache_dict.get("entities", {})
            reasoning = cache_dict.get("reasoning", "")

            self._hits += 1
            logger.info(
                f"Intent cache HIT: {key[:20]}... "
                f"(intent={intent}, hit_rate={self.hit_rate:.1%})"
            )

            return IntentRecognitionResponse(
                intent=intent,
                confidence=confidence,
                entities=entities,
                reasoning=f"[cached] {reasoning}",
            )

        except Exception as e:
            logger.error(f"Intent cache get error: {e}")
            self._misses += 1
            return None

    async def set(
        self,
        text: str,
        response: IntentRecognitionResponse,
        context: dict = None,
    ) -> bool:
        """
        缓存意图识别结果

        Args:
            text: 用户输入文本
            response: 意图识别结果
            context: 上下文信息

        Returns:
            是否成功缓存
        """
        if not self.redis:
            return False

        # 不缓存低置信度或未知意图
        if response.confidence < 0.5 or response.intent == IntentType.UNKNOWN:
            logger.debug(
                f"Skipping cache for low confidence ({response.confidence}) "
                f"or unknown intent"
            )
            return False

        try:
            key = self._make_cache_key(text, context)

            # 序列化
            cache_dict = {
                "intent": response.intent.value,
                "confidence": response.confidence,
                "entities": response.entities,
                "reasoning": response.reasoning,
                "cached_at": datetime.now().isoformat(),
            }
            data = json.dumps(cache_dict, ensure_ascii=False)

            # 保存到 Redis
            await self.redis.setex(key, self.ttl, data)

            logger.debug(f"Intent cached: {key[:20]}... (TTL: {self.ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Intent cache set error: {e}")
            return False

    @property
    def hit_rate(self) -> float:
        """缓存命中率"""
        total = self._hits + self._misses
        return self._hits / total if total > 0 else 0.0

    def get_stats(self) -> dict:
        """获取缓存统计信息"""
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{self.hit_rate:.1%}",
        }


class MemoryIntentCache(IntentCache):
    """内存意图缓存 (开发环境 Fallback)"""

    def __init__(self):
        """初始化内存缓存"""
        super().__init__(redis_client=None)
        self._cache: dict = {}
        # 内存缓存 TTL 更短
        self.ttl = 3600  # 1小时
        logger.info("Using in-memory intent cache (development mode)")

    async def get(
        self, text: str, context: dict = None
    ) -> Optional[IntentRecognitionResponse]:
        """从内存获取缓存"""
        key = self._make_cache_key(text, context)
        cached = self._cache.get(key)

        if not cached:
            self._misses += 1
            return None

        # 检查过期
        cached_at = datetime.fromisoformat(cached.get("cached_at", ""))
        age = (datetime.now() - cached_at).total_seconds()

        if age > self.ttl:
            del self._cache[key]
            self._misses += 1
            return None

        self._hits += 1

        return IntentRecognitionResponse(
            intent=IntentType(cached["intent"]),
            confidence=cached["confidence"],
            entities=cached["entities"],
            reasoning=f"[memory-cached] {cached.get('reasoning', '')}",
        )

    async def set(
        self,
        text: str,
        response: IntentRecognitionResponse,
        context: dict = None,
    ) -> bool:
        """保存到内存缓存"""
        if response.confidence < 0.5 or response.intent == IntentType.UNKNOWN:
            return False

        key = self._make_cache_key(text, context)
        self._cache[key] = {
            "intent": response.intent.value,
            "confidence": response.confidence,
            "entities": response.entities,
            "reasoning": response.reasoning,
            "cached_at": datetime.now().isoformat(),
        }

        # 简单的 LRU: 超过 1000 条时清理最早的
        if len(self._cache) > 1000:
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]

        return True


# 全局缓存实例
_intent_cache: Optional[IntentCache] = None


async def get_intent_cache() -> IntentCache:
    """
    获取意图缓存实例 (单例)

    优先使用 Redis，失败时 fallback 到内存缓存

    Returns:
        IntentCache 实例
    """
    global _intent_cache

    if _intent_cache is not None:
        return _intent_cache

    # 尝试连接 Redis
    try:
        import redis.asyncio as redis

        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password if settings.redis_password else None,
            decode_responses=False,
            max_connections=settings.redis_max_connections,
        )

        # 测试连接
        await redis_client.ping()

        _intent_cache = IntentCache(redis_client)
        logger.info("✅ Intent cache initialized with Redis backend")

    except Exception as e:
        logger.warning(
            f"⚠️  Failed to connect to Redis for intent cache: {e}. "
            f"Falling back to in-memory cache"
        )
        _intent_cache = MemoryIntentCache()

    return _intent_cache
