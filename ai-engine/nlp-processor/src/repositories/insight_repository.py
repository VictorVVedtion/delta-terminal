"""
Insight Repository - 洞察数据持久化

提供 InsightData 的存储、查询和管理功能
支持内存存储（开发）和数据库存储（生产）
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import OrderedDict
import asyncio
import os
import json

from ..models.insight_schemas import InsightData, InsightType

logger = logging.getLogger(__name__)


# =============================================================================
# 抽象基类
# =============================================================================


class InsightRepository(ABC):
    """Insight 存储抽象基类"""

    @abstractmethod
    async def save(self, insight: InsightData) -> None:
        """保存洞察"""
        pass

    @abstractmethod
    async def get(self, insight_id: str) -> Optional[InsightData]:
        """获取洞察"""
        pass

    @abstractmethod
    async def get_by_session(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[InsightData]:
        """获取会话的洞察历史"""
        pass

    @abstractmethod
    async def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        insight_type: Optional[InsightType] = None
    ) -> List[InsightData]:
        """获取用户的洞察历史"""
        pass

    @abstractmethod
    async def update(self, insight_id: str, updates: Dict) -> Optional[InsightData]:
        """更新洞察"""
        pass

    @abstractmethod
    async def delete(self, insight_id: str) -> bool:
        """删除洞察"""
        pass

    @abstractmethod
    async def delete_expired(self, max_age_hours: int = 24) -> int:
        """删除过期洞察"""
        pass

    @abstractmethod
    async def count_by_user(self, user_id: str) -> int:
        """统计用户洞察数量"""
        pass


# =============================================================================
# 内存存储实现 (开发/测试环境)
# =============================================================================


class InMemoryInsightRepository(InsightRepository):
    """内存存储实现

    特性:
    - LRU 缓存，自动淘汰旧数据
    - 支持按会话和用户查询
    - 定期清理过期数据
    """

    def __init__(self, max_size: int = 10000, cleanup_interval: int = 3600):
        self._store: OrderedDict[str, InsightData] = OrderedDict()
        self._session_index: Dict[str, List[str]] = {}  # session_id -> [insight_ids]
        self._user_index: Dict[str, List[str]] = {}     # user_id -> [insight_ids]
        self._max_size = max_size
        self._cleanup_interval = cleanup_interval
        self._cleanup_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def start(self):
        """启动定期清理任务"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("Started insight cleanup task")

    async def stop(self):
        """停止定期清理任务"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            logger.info("Stopped insight cleanup task")

    async def _cleanup_loop(self):
        """定期清理过期数据"""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                deleted = await self.delete_expired(max_age_hours=24)
                if deleted > 0:
                    logger.info(f"Cleaned up {deleted} expired insights")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup error: {e}")

    async def save(self, insight: InsightData) -> None:
        """保存洞察"""
        async with self._lock:
            # 检查容量，移除最旧的数据
            while len(self._store) >= self._max_size:
                oldest_id, oldest = self._store.popitem(last=False)
                self._remove_from_indexes(oldest_id, oldest)
                logger.debug(f"Evicted oldest insight: {oldest_id}")

            # 保存洞察
            self._store[insight.id] = insight
            self._store.move_to_end(insight.id)

            # 更新索引
            if hasattr(insight, 'session_id') and insight.session_id:
                if insight.session_id not in self._session_index:
                    self._session_index[insight.session_id] = []
                self._session_index[insight.session_id].append(insight.id)

            if hasattr(insight, 'user_id') and insight.user_id:
                if insight.user_id not in self._user_index:
                    self._user_index[insight.user_id] = []
                self._user_index[insight.user_id].append(insight.id)

            logger.debug(f"Saved insight: {insight.id}")

    async def get(self, insight_id: str) -> Optional[InsightData]:
        """获取洞察"""
        async with self._lock:
            insight = self._store.get(insight_id)
            if insight:
                # 移到末尾（LRU）
                self._store.move_to_end(insight_id)
            return insight

    async def get_by_session(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[InsightData]:
        """获取会话的洞察历史"""
        async with self._lock:
            insight_ids = self._session_index.get(session_id, [])
            # 按时间倒序
            insight_ids = list(reversed(insight_ids))
            # 分页
            paginated_ids = insight_ids[offset:offset + limit]
            return [
                self._store[iid]
                for iid in paginated_ids
                if iid in self._store
            ]

    async def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        insight_type: Optional[InsightType] = None
    ) -> List[InsightData]:
        """获取用户的洞察历史"""
        async with self._lock:
            insight_ids = self._user_index.get(user_id, [])
            # 按时间倒序
            insight_ids = list(reversed(insight_ids))

            # 过滤类型
            if insight_type:
                insights = [
                    self._store[iid]
                    for iid in insight_ids
                    if iid in self._store and self._store[iid].type == insight_type
                ]
            else:
                insights = [
                    self._store[iid]
                    for iid in insight_ids
                    if iid in self._store
                ]

            # 分页
            return insights[offset:offset + limit]

    async def update(self, insight_id: str, updates: Dict) -> Optional[InsightData]:
        """更新洞察"""
        async with self._lock:
            insight = self._store.get(insight_id)
            if not insight:
                return None

            # 更新字段
            insight_dict = insight.model_dump()
            insight_dict.update(updates)
            updated_insight = InsightData(**insight_dict)
            self._store[insight_id] = updated_insight
            return updated_insight

    async def delete(self, insight_id: str) -> bool:
        """删除洞察"""
        async with self._lock:
            if insight_id not in self._store:
                return False

            insight = self._store.pop(insight_id)
            self._remove_from_indexes(insight_id, insight)
            logger.debug(f"Deleted insight: {insight_id}")
            return True

    async def delete_expired(self, max_age_hours: int = 24) -> int:
        """删除过期洞察"""
        async with self._lock:
            cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
            expired_ids = []

            for insight_id, insight in self._store.items():
                if hasattr(insight, 'timestamp'):
                    try:
                        if isinstance(insight.timestamp, str):
                            ts = datetime.fromisoformat(insight.timestamp.replace('Z', '+00:00'))
                        else:
                            ts = insight.timestamp

                        if ts.replace(tzinfo=None) < cutoff:
                            expired_ids.append(insight_id)
                    except Exception:
                        pass

            for insight_id in expired_ids:
                insight = self._store.pop(insight_id)
                self._remove_from_indexes(insight_id, insight)

            return len(expired_ids)

    async def count_by_user(self, user_id: str) -> int:
        """统计用户洞察数量"""
        async with self._lock:
            return len(self._user_index.get(user_id, []))

    def _remove_from_indexes(self, insight_id: str, insight: InsightData) -> None:
        """从索引中移除"""
        if hasattr(insight, 'session_id') and insight.session_id:
            if insight.session_id in self._session_index:
                try:
                    self._session_index[insight.session_id].remove(insight_id)
                except ValueError:
                    pass

        if hasattr(insight, 'user_id') and insight.user_id:
            if insight.user_id in self._user_index:
                try:
                    self._user_index[insight.user_id].remove(insight_id)
                except ValueError:
                    pass


# =============================================================================
# PostgreSQL 存储实现 (生产环境)
# =============================================================================


class PostgresInsightRepository(InsightRepository):
    """PostgreSQL 存储实现

    注意: 需要配置数据库连接并运行 migrations
    """

    def __init__(self, database_url: str):
        # 转换 SQLAlchemy 格式的 DSN 为 asyncpg 格式
        # postgresql+asyncpg:// -> postgresql://
        self._database_url = self._normalize_dsn(database_url)
        self._pool = None

    @staticmethod
    def _normalize_dsn(dsn: str) -> str:
        """将 SQLAlchemy 格式的 DSN 转换为 asyncpg 兼容格式"""
        if dsn.startswith("postgresql+asyncpg://"):
            return dsn.replace("postgresql+asyncpg://", "postgresql://", 1)
        if dsn.startswith("postgres+asyncpg://"):
            return dsn.replace("postgres+asyncpg://", "postgres://", 1)
        return dsn

    async def connect(self):
        """建立数据库连接并验证表存在"""
        try:
            import asyncpg
            self._pool = await asyncpg.create_pool(
                self._database_url,
                min_size=2,
                max_size=10
            )
            # 验证 insights 表存在
            async with self._pool.acquire() as conn:
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'insights'
                    )
                """)
                if not table_exists:
                    logger.warning("Table 'insights' does not exist, will use in-memory fallback")
                    await self._pool.close()
                    self._pool = None
                    raise RuntimeError("insights table not found")
            logger.info("Connected to PostgreSQL for insight storage")
        except ImportError:
            logger.error("asyncpg not installed, falling back to in-memory storage")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    async def disconnect(self):
        """关闭数据库连接"""
        if self._pool:
            await self._pool.close()
            logger.info("Disconnected from PostgreSQL")

    async def save(self, insight: InsightData) -> None:
        """保存洞察到数据库"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = """
            INSERT INTO insights (id, type, user_id, session_id, data, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                timestamp = EXCLUDED.timestamp
        """

        async with self._pool.acquire() as conn:
            await conn.execute(
                query,
                insight.id,
                insight.type.value if hasattr(insight.type, 'value') else str(insight.type),
                getattr(insight, 'user_id', None),
                getattr(insight, 'session_id', None),
                insight.model_dump_json(),
                datetime.utcnow()
            )

    async def get(self, insight_id: str) -> Optional[InsightData]:
        """从数据库获取洞察"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = "SELECT data FROM insights WHERE id = $1"

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, insight_id)
            if row:
                return InsightData.model_validate_json(row['data'])
            return None

    async def get_by_session(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[InsightData]:
        """获取会话的洞察历史"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = """
            SELECT data FROM insights
            WHERE session_id = $1
            ORDER BY timestamp DESC
            LIMIT $2 OFFSET $3
        """

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, session_id, limit, offset)
            return [InsightData.model_validate_json(row['data']) for row in rows]

    async def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        insight_type: Optional[InsightType] = None
    ) -> List[InsightData]:
        """获取用户的洞察历史"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        if insight_type:
            query = """
                SELECT data FROM insights
                WHERE user_id = $1 AND type = $2
                ORDER BY timestamp DESC
                LIMIT $3 OFFSET $4
            """
            type_value = insight_type.value if hasattr(insight_type, 'value') else str(insight_type)
            params = (user_id, type_value, limit, offset)
        else:
            query = """
                SELECT data FROM insights
                WHERE user_id = $1
                ORDER BY timestamp DESC
                LIMIT $2 OFFSET $3
            """
            params = (user_id, limit, offset)

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [InsightData.model_validate_json(row['data']) for row in rows]

    async def update(self, insight_id: str, updates: Dict) -> Optional[InsightData]:
        """更新洞察"""
        existing = await self.get(insight_id)
        if not existing:
            return None

        insight_dict = existing.model_dump()
        insight_dict.update(updates)
        updated = InsightData(**insight_dict)
        await self.save(updated)
        return updated

    async def delete(self, insight_id: str) -> bool:
        """删除洞察"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = "DELETE FROM insights WHERE id = $1"

        async with self._pool.acquire() as conn:
            result = await conn.execute(query, insight_id)
            return result == "DELETE 1"

    async def delete_expired(self, max_age_hours: int = 24) -> int:
        """删除过期洞察"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = """
            DELETE FROM insights
            WHERE timestamp < NOW() - INTERVAL '$1 hours'
        """

        async with self._pool.acquire() as conn:
            result = await conn.execute(query, max_age_hours)
            # 解析删除数量
            try:
                return int(result.split()[-1])
            except (IndexError, ValueError):
                return 0

    async def count_by_user(self, user_id: str) -> int:
        """统计用户洞察数量"""
        if not self._pool:
            raise RuntimeError("Database not connected")

        query = "SELECT COUNT(*) FROM insights WHERE user_id = $1"

        async with self._pool.acquire() as conn:
            result = await conn.fetchval(query, user_id)
            return result or 0


# =============================================================================
# 工厂函数
# =============================================================================

_repository: Optional[InsightRepository] = None


async def get_insight_repository() -> InsightRepository:
    """获取 Insight Repository 实例

    根据环境变量选择存储后端:
    - DATABASE_URL 存在: 使用 PostgreSQL
    - 否则: 使用内存存储
    """
    global _repository

    if _repository is None:
        database_url = os.getenv("DATABASE_URL")

        if database_url:
            try:
                _repository = PostgresInsightRepository(database_url)
                await _repository.connect()
                logger.info("Using PostgreSQL insight repository")
            except Exception as e:
                logger.warning(f"PostgreSQL unavailable ({e}), falling back to in-memory")
                _repository = InMemoryInsightRepository()
                await _repository.start()
        else:
            _repository = InMemoryInsightRepository()
            await _repository.start()
            logger.info("Using in-memory insight repository")

    return _repository


async def close_insight_repository():
    """关闭 Repository 连接"""
    global _repository

    if _repository is not None:
        if isinstance(_repository, PostgresInsightRepository):
            await _repository.disconnect()
        elif isinstance(_repository, InMemoryInsightRepository):
            await _repository.stop()
        _repository = None


# =============================================================================
# 数据库迁移 SQL (供参考)
# =============================================================================

MIGRATION_SQL = """
-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    user_id VARCHAR(64),
    session_id VARCHAR(64),
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_session_id ON insights(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_timestamp ON insights(timestamp);
CREATE INDEX IF NOT EXISTS idx_insights_user_type ON insights(user_id, type);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_insights_updated_at
    BEFORE UPDATE ON insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
"""
