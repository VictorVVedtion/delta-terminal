"""
Repository Layer - 数据持久化

提供统一的数据访问接口，支持内存存储和数据库存储
"""

from .insight_repository import (
    InsightRepository,
    InMemoryInsightRepository,
    get_insight_repository,
)

__all__ = [
    "InsightRepository",
    "InMemoryInsightRepository",
    "get_insight_repository",
]
