"""对话存储服务

安全增强: 使用 Redis 存储对话数据，避免内存泄漏和服务重启丢失数据
提供内存 fallback 用于开发环境
"""

import json
import logging
from typing import Dict, Optional
from datetime import datetime

from ..models.schemas import Conversation, Message, MessageRole
from ..config import settings

logger = logging.getLogger(__name__)


class ConversationStore:
    """对话存储抽象接口"""

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """获取对话"""
        raise NotImplementedError

    async def save_conversation(self, conversation: Conversation) -> None:
        """保存对话"""
        raise NotImplementedError

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        raise NotImplementedError

    async def clear_conversation_messages(self, conversation_id: str) -> bool:
        """清空对话消息历史"""
        raise NotImplementedError

    async def exists(self, conversation_id: str) -> bool:
        """检查对话是否存在"""
        raise NotImplementedError


class RedisConversationStore(ConversationStore):
    """Redis 对话存储实现"""

    def __init__(self, redis_client):
        """
        初始化 Redis 存储

        Args:
            redis_client: Redis 客户端实例 (redis.asyncio.Redis)
        """
        self.redis = redis_client
        self.ttl = settings.conversation_ttl  # 默认 3600 秒
        self.key_prefix = "conversation:"

    def _make_key(self, conversation_id: str) -> str:
        """生成 Redis 键"""
        return f"{self.key_prefix}{conversation_id}"

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """从 Redis 获取对话 (安全反序列化)"""
        try:
            key = self._make_key(conversation_id)
            data = await self.redis.get(key)

            if not data:
                return None

            # 安全反序列化 JSON
            try:
                conversation_dict = json.loads(data)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for conversation {conversation_id}: {e}")
                # 删除损坏的数据
                await self.redis.delete(key)
                return None

            # 验证必需字段
            required_fields = ["conversation_id", "user_id", "created_at", "updated_at"]
            for field in required_fields:
                if field not in conversation_dict:
                    logger.error(f"Missing required field '{field}' in conversation {conversation_id}")
                    return None

            # 安全重建 Message 对象 - 跳过无效消息而非丢弃整个对话
            messages = []
            for idx, msg in enumerate(conversation_dict.get("messages", [])):
                try:
                    # 验证消息字段
                    if not isinstance(msg, dict):
                        logger.warning(f"Skipping invalid message at index {idx}: not a dict")
                        continue

                    role_str = msg.get("role")
                    content = msg.get("content")
                    timestamp_str = msg.get("timestamp")

                    if not role_str or content is None or not timestamp_str:
                        logger.warning(f"Skipping message at index {idx}: missing required fields")
                        continue

                    # 安全解析 role
                    try:
                        role = MessageRole(role_str)
                    except ValueError:
                        logger.warning(f"Skipping message at index {idx}: invalid role '{role_str}'")
                        continue

                    # 安全解析 timestamp
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str)
                    except ValueError:
                        logger.warning(f"Skipping message at index {idx}: invalid timestamp '{timestamp_str}'")
                        continue

                    messages.append(Message(
                        role=role,
                        content=content,
                        timestamp=timestamp,
                        metadata=msg.get("metadata")
                    ))
                except Exception as e:
                    logger.warning(f"Skipping message at index {idx} due to error: {e}")
                    continue

            # 安全解析时间戳
            try:
                created_at = datetime.fromisoformat(conversation_dict["created_at"])
                updated_at = datetime.fromisoformat(conversation_dict["updated_at"])
            except ValueError as e:
                logger.error(f"Invalid timestamp in conversation {conversation_id}: {e}")
                return None

            conversation = Conversation(
                conversation_id=conversation_dict["conversation_id"],
                user_id=conversation_dict["user_id"],
                messages=messages,
                context=conversation_dict.get("context", {}),
                created_at=created_at,
                updated_at=updated_at,
            )

            logger.debug(f"Retrieved conversation {conversation_id} from Redis ({len(messages)} messages)")
            return conversation

        except Exception as e:
            logger.error(f"Error retrieving conversation from Redis: {e}")
            return None

    async def save_conversation(self, conversation: Conversation) -> None:
        """保存对话到 Redis"""
        try:
            key = self._make_key(conversation.conversation_id)

            # 序列化为 JSON
            conversation_dict = {
                "conversation_id": conversation.conversation_id,
                "user_id": conversation.user_id,
                "messages": [
                    {
                        "role": msg.role.value,
                        "content": msg.content,
                        "timestamp": msg.timestamp.isoformat(),
                        "metadata": msg.metadata,
                    }
                    for msg in conversation.messages
                ],
                "context": conversation.context,
                "created_at": conversation.created_at.isoformat(),
                "updated_at": conversation.updated_at.isoformat(),
            }

            data = json.dumps(conversation_dict, ensure_ascii=False)

            # 保存到 Redis 并设置过期时间
            await self.redis.setex(key, self.ttl, data)

            logger.debug(f"Saved conversation {conversation.conversation_id} to Redis (TTL: {self.ttl}s)")

        except Exception as e:
            logger.error(f"Error saving conversation to Redis: {e}")
            raise

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        try:
            key = self._make_key(conversation_id)
            result = await self.redis.delete(key)
            deleted = result > 0

            if deleted:
                logger.info(f"Deleted conversation {conversation_id} from Redis")
            else:
                logger.warning(f"Conversation {conversation_id} not found in Redis")

            return deleted

        except Exception as e:
            logger.error(f"Error deleting conversation from Redis: {e}")
            return False

    async def clear_conversation_messages(self, conversation_id: str) -> bool:
        """清空对话消息历史"""
        try:
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                return False

            # 清空消息列表
            conversation.messages = []
            conversation.updated_at = datetime.now()

            # 保存回 Redis
            await self.save_conversation(conversation)

            logger.info(f"Cleared messages for conversation {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"Error clearing conversation messages: {e}")
            return False

    async def exists(self, conversation_id: str) -> bool:
        """检查对话是否存在"""
        try:
            key = self._make_key(conversation_id)
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error checking conversation existence: {e}")
            return False


class MemoryConversationStore(ConversationStore):
    """内存对话存储实现 (Fallback / 开发环境)"""

    def __init__(self):
        """初始化内存存储"""
        self.conversations: Dict[str, Conversation] = {}
        logger.warning(
            "Using in-memory conversation store. "
            "This is NOT recommended for production. "
            "Configure Redis for persistent storage."
        )

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """从内存获取对话"""
        return self.conversations.get(conversation_id)

    async def save_conversation(self, conversation: Conversation) -> None:
        """保存对话到内存"""
        self.conversations[conversation.conversation_id] = conversation
        logger.debug(f"Saved conversation {conversation.conversation_id} to memory")

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            logger.info(f"Deleted conversation {conversation_id} from memory")
            return True
        return False

    async def clear_conversation_messages(self, conversation_id: str) -> bool:
        """清空对话消息历史"""
        conversation = self.conversations.get(conversation_id)
        if conversation:
            conversation.messages = []
            conversation.updated_at = datetime.now()
            logger.info(f"Cleared messages for conversation {conversation_id}")
            return True
        return False

    async def exists(self, conversation_id: str) -> bool:
        """检查对话是否存在"""
        return conversation_id in self.conversations


# 全局存储实例
_conversation_store: Optional[ConversationStore] = None


async def get_conversation_store() -> ConversationStore:
    """
    获取对话存储实例 (单例)

    优先使用 Redis，失败时 fallback 到内存存储

    Returns:
        ConversationStore 实例
    """
    global _conversation_store

    if _conversation_store is not None:
        return _conversation_store

    # 尝试连接 Redis
    try:
        import redis.asyncio as redis

        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password if settings.redis_password else None,
            decode_responses=False,  # 使用字节处理
            max_connections=settings.redis_max_connections,
        )

        # 测试连接
        await redis_client.ping()

        _conversation_store = RedisConversationStore(redis_client)
        logger.info("✅ Conversation store initialized with Redis backend")

    except Exception as e:
        logger.warning(
            f"⚠️  Failed to connect to Redis: {e}. "
            f"Falling back to in-memory storage (NOT PRODUCTION SAFE)"
        )
        _conversation_store = MemoryConversationStore()

    return _conversation_store
