"""聊天端点

A2UI Enhancement: 返回结构化的 InsightData 而非纯文本
"""

import logging
import uuid
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status

from ...chains.strategy_chain import StrategyChain, get_strategy_chain
from ...models.schemas import (
    ChatRequest,
    ChatResponse,
    Conversation,
    IntentRecognitionRequest,
    IntentType,
    MessageRole,
)
from ...services.insight_service import InsightGeneratorService, get_insight_service
from ...services.intent_service import IntentService, get_intent_service
from .insight import store_insight

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

# 临时存储对话（实际应使用 Redis 或数据库）
conversations: Dict[str, Conversation] = {}

# A2UI: 需要生成 InsightData 的意图类型
INSIGHT_INTENTS = {
    IntentType.CREATE_STRATEGY,
    IntentType.MODIFY_STRATEGY,
    IntentType.ANALYZE_MARKET,
    IntentType.BACKTEST,
    IntentType.OPTIMIZE_STRATEGY,
    IntentType.BACKTEST_SUGGEST,
    IntentType.RISK_ANALYSIS,
}


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    intent_service: IntentService = Depends(get_intent_service),
    strategy_chain: StrategyChain = Depends(get_strategy_chain),
    insight_service: InsightGeneratorService = Depends(get_insight_service),
) -> ChatResponse:
    """
    发送聊天消息

    A2UI Enhancement: 对于策略相关的意图，返回结构化的 InsightData

    Args:
        request: 聊天请求
        intent_service: 意图服务
        strategy_chain: 策略链
        insight_service: InsightData 生成服务

    Returns:
        聊天响应（包含 InsightData）
    """
    try:
        logger.info(f"Received message from user {request.user_id}")

        # 获取或创建对话
        conversation_id = request.conversation_id or str(uuid.uuid4())

        if conversation_id not in conversations:
            conversations[conversation_id] = Conversation(
                conversation_id=conversation_id,
                user_id=request.user_id,
                messages=[],
                context=request.context or {},
            )

        conversation = conversations[conversation_id]

        # 添加用户消息到历史
        conversation.add_message(MessageRole.USER, request.message)

        # 识别意图 (传递 user_id 以应用用户模型配置)
        intent_request = IntentRecognitionRequest(
            text=request.message, context=request.context
        )
        intent_response = await intent_service.recognize_intent(
            intent_request, user_id=request.user_id
        )

        logger.info(
            f"Intent recognized: {intent_response.intent} "
            f"(confidence: {intent_response.confidence})"
        )

        # A2UI: 根据意图决定是否生成 InsightData
        insight_data = None
        if intent_response.intent in INSIGHT_INTENTS:
            # 生成结构化的 InsightData
            logger.info("Generating InsightData for A2UI")
            insight = await insight_service.generate_insight(
                user_input=request.message,
                intent=intent_response.intent,
                chat_history=conversation.messages,
                user_id=request.user_id,
                context={
                    "entities": intent_response.entities,
                    **(request.context or {}),
                },
            )
            # 存储 InsightData 以便后续批准/拒绝操作
            await store_insight(insight)
            logger.info(f"Stored InsightData: {insight.id}")
            insight_data = insight.model_dump()
            ai_response = insight.explanation
        else:
            # 对于一般性对话，使用传统的策略链
            ai_response = await strategy_chain.process_conversation(
                user_input=request.message,
                chat_history=conversation.messages,
                user_id=request.user_id,
                conversation_id=conversation_id,
                context={
                    "intent": intent_response.intent,
                    "entities": intent_response.entities,
                    **(request.context or {}),
                },
            )

        # 添加 AI 响应到历史
        conversation.add_message(MessageRole.ASSISTANT, ai_response)

        # 生成建议的后续操作
        suggested_actions = await _generate_suggested_actions(
            intent_response.intent, intent_response.entities
        )

        return ChatResponse(
            message=ai_response,
            conversation_id=conversation_id,
            intent=intent_response.intent,
            confidence=intent_response.confidence,
            extracted_params=intent_response.entities,
            suggested_actions=suggested_actions,
            timestamp=datetime.now(),
            insight=insight_data,  # A2UI: 包含结构化数据
        )

    except Exception as e:
        logger.error(f"Error processing chat message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理消息失败: {str(e)}",
        )


@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str) -> Conversation:
    """
    获取对话历史

    Args:
        conversation_id: 对话 ID

    Returns:
        对话对象
    """
    if conversation_id not in conversations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在",
        )

    return conversations[conversation_id]


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str) -> Dict[str, str]:
    """
    删除对话

    Args:
        conversation_id: 对话 ID

    Returns:
        删除确认消息
    """
    if conversation_id in conversations:
        del conversations[conversation_id]
        return {"message": "对话已删除"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="对话不存在",
    )


@router.post("/conversation/{conversation_id}/clear")
async def clear_conversation(conversation_id: str) -> Dict[str, str]:
    """
    清空对话历史（保留对话）

    Args:
        conversation_id: 对话 ID

    Returns:
        清空确认消息
    """
    if conversation_id not in conversations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在",
        )

    conversations[conversation_id].messages = []
    conversations[conversation_id].updated_at = datetime.now()

    return {"message": "对话历史已清空"}


async def _generate_suggested_actions(intent: str, entities: Dict) -> list[str]:
    """
    生成建议的后续操作

    Args:
        intent: 识别的意图
        entities: 提取的实体

    Returns:
        建议操作列表
    """
    suggestions = []

    if intent == "CREATE_STRATEGY":
        suggestions.extend([
            "查看完整的策略配置",
            "进行历史数据回测",
            "启动策略运行",
        ])
    elif intent == "ANALYZE_MARKET":
        suggestions.extend([
            "查看更多技术指标",
            "分析历史价格走势",
            "创建基于分析的策略",
        ])
    elif intent == "QUERY_STRATEGY":
        suggestions.extend([
            "查看策略详情",
            "修改策略参数",
            "查看策略表现",
        ])

    return suggestions
