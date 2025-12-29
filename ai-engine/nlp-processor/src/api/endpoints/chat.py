"""聊天端点

A2UI Enhancement: 返回结构化的 InsightData 而非纯文本
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from ...chains.strategy_chain import StrategyChain, get_strategy_chain
from ...models.schemas import (
    ChatRequest,
    ChatResponse,
    Conversation,
    IntentRecognitionRequest,
    IntentType,
    Message,
    MessageRole,
)
from ...services.insight_service import InsightGeneratorService, get_insight_service
from ...services.intent_service import IntentService, get_intent_service
from ...services.conversation_store import ConversationStore, get_conversation_store
from ...services.prompt_guard import PromptGuard, get_prompt_guard, RiskLevel
from ...services.reasoning_service import ReasoningChainService, get_reasoning_service
from .insight import store_insight

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

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
    conversation_store: ConversationStore = Depends(get_conversation_store),
    prompt_guard: PromptGuard = Depends(get_prompt_guard),
) -> ChatResponse:
    """
    发送聊天消息

    A2UI Enhancement: 对于策略相关的意图，返回结构化的 InsightData
    支持多步骤引导流程，处理澄清问题的回答

    Security: 集成 Prompt Guard 防止注入攻击

    Args:
        request: 聊天请求
        intent_service: 意图服务
        strategy_chain: 策略链
        insight_service: InsightData 生成服务
        conversation_store: 对话存储服务
        prompt_guard: Prompt 注入检测器

    Returns:
        聊天响应（包含 InsightData）
    """
    try:
        logger.info(f"Received message from user {request.user_id}")

        # =======================================================================
        # Security: Prompt Guard 检测
        # =======================================================================
        guard_result = prompt_guard.check(request.message)

        if not guard_result.is_safe:
            # 高风险输入 - 拒绝处理
            if guard_result.risk_level in (RiskLevel.CRITICAL, RiskLevel.HIGH):
                logger.warning(
                    f"Blocked unsafe input from {request.user_id}: "
                    f"risk={guard_result.risk_level}, "
                    f"patterns={guard_result.matched_patterns}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "输入包含不安全的内容",
                        "risk_level": guard_result.risk_level,
                        "reason": guard_result.reason,
                        "message": "您的输入可能包含注入攻击模式，已被系统拒绝。请使用正常的语言描述您的需求。",
                    },
                )
            # 中等风险 - 记录警告但允许处理
            elif guard_result.risk_level == RiskLevel.MEDIUM:
                logger.info(
                    f"Medium risk input from {request.user_id}: "
                    f"patterns={guard_result.matched_patterns}"
                )
                # 继续处理，但在后续监控

        # 获取或创建对话
        conversation_id = request.conversation_id or str(uuid.uuid4())

        conversation = await conversation_store.get_conversation(conversation_id)
        if not conversation:
            # 对话不存在 - 可能是 MemoryStore 丢失或 Redis 未配置
            # 尝试从请求中恢复对话历史 (前端 fallback)
            context = request.context or {}
            chat_history_raw = context.get("chatHistory", [])

            # 重建消息历史 (安全验证)
            restored_messages = []
            valid_roles = {"user", "assistant"}  # 只接受有效的 role 值

            if chat_history_raw and isinstance(chat_history_raw, list):
                logger.info(
                    f"Restoring conversation from frontend chatHistory: "
                    f"{len(chat_history_raw)} messages"
                )
                for idx, msg in enumerate(chat_history_raw):
                    if not isinstance(msg, dict):
                        logger.warning(f"Skipping invalid message at index {idx}: not a dict")
                        continue

                    msg_role = msg.get("role", "").lower()
                    msg_content = msg.get("content")

                    # 验证 role 字段
                    if msg_role not in valid_roles:
                        logger.warning(f"Skipping message at index {idx}: invalid role '{msg_role}'")
                        continue

                    # 验证 content 字段
                    if not msg_content or not isinstance(msg_content, str):
                        logger.warning(f"Skipping message at index {idx}: invalid content")
                        continue

                    role = MessageRole.USER if msg_role == "user" else MessageRole.ASSISTANT
                    restored_messages.append(
                        Message(role=role, content=msg_content)
                    )

            conversation = Conversation(
                conversation_id=conversation_id,
                user_id=request.user_id,
                messages=restored_messages,
                context=context,
            )

        # 添加用户消息到历史
        conversation.add_message(MessageRole.USER, request.message)

        # 提取上下文信息
        context = request.context or {}
        is_follow_up = context.get("isFollowUp", False)
        # 兼容驼峰命名 (前端) 和蛇形命名
        collected_params = context.get("collectedParams", {}) or context.get("collected_params", {})
        previous_question = context.get("previousQuestion", "")
        category = context.get("category", "")

        # =====================================================================
        # A2UI 多步骤引导: 处理澄清问题的回答
        # =====================================================================
        # 只要是 follow-up 消息就进入多步骤引导流程
        # (即使 collected_params 为空，也需要处理澄清回答)
        if is_follow_up:
            logger.info(
                f"Processing clarification answer: category={category}, "
                f"collected_params={list(collected_params.keys())}"
            )

            # 合并用户回答到已收集的参数
            if category:
                collected_params[category] = request.message

            # 更新对话上下文
            conversation.context["collected_params"] = collected_params

            # 构建完整的用户意图描述（用于生成下一个 InsightData）
            # 结合对话历史重建原始请求
            original_request = _reconstruct_original_request(
                conversation.messages, collected_params
            )
            logger.info(f"Reconstructed request: {original_request}")

            # 直接使用 CREATE_STRATEGY 意图继续引导
            insight = await insight_service.generate_insight(
                user_input=original_request,
                intent=IntentType.CREATE_STRATEGY,
                chat_history=conversation.messages,
                user_id=request.user_id,
                context={
                    "collected_params": collected_params,
                    "is_follow_up": True,
                    "previous_question": previous_question,
                    "category": category,
                    **context,
                },
            )
            # 存储 InsightData
            await store_insight(insight)
            logger.info(f"Generated follow-up InsightData: {insight.id}")

            insight_data = insight.model_dump()
            ai_response = insight.explanation

            # 添加 AI 响应到历史并保存
            conversation.add_message(MessageRole.ASSISTANT, ai_response)
            await conversation_store.save_conversation(conversation)

            # 生成建议操作
            suggested_actions = await _generate_suggested_actions(
                IntentType.CREATE_STRATEGY, collected_params
            )

            return ChatResponse(
                message=ai_response,
                conversation_id=conversation_id,
                intent=IntentType.CREATE_STRATEGY,
                confidence=0.9,  # 高置信度因为是多步骤引导
                extracted_params=collected_params,
                suggested_actions=suggested_actions,
                timestamp=datetime.now(),
                insight=insight_data,
            )

        # =====================================================================
        # A2UI 2.0: 推理链交互快捷处理
        # 分支选择和质疑不需要重新进行意图识别
        # =====================================================================
        context = request.context or {}
        is_branch_selection = context.get("isBranchSelection", False)
        is_challenge = context.get("isChallenge", False)

        # A2UI 2.0: 记录推理链交互检测
        logger.debug(
            f"[A2UI] Checking reasoning chain interaction: "
            f"context_keys={list(context.keys())}, "
            f"is_branch_selection={is_branch_selection}, "
            f"is_challenge={is_challenge}"
        )

        if is_branch_selection or is_challenge:
            logger.info(
                f"Reasoning chain interaction: branch={is_branch_selection}, "
                f"challenge={is_challenge}"
            )
            # 直接调用 insight_service 处理交互
            insight = await insight_service.generate_insight(
                user_input=request.message,
                intent=IntentType.CREATE_STRATEGY,  # 保持策略创建意图
                chat_history=conversation.messages,
                user_id=request.user_id,
                context=context,
            )

            # 存储 InsightData
            try:
                await store_insight(insight)
            except Exception as store_error:
                logger.warning(f"Failed to store InsightData: {store_error}")

            insight_data = insight.model_dump()
            ai_response = insight.explanation

            # 添加 AI 响应到历史并保存
            conversation.add_message(MessageRole.ASSISTANT, ai_response)
            await conversation_store.save_conversation(conversation)

            return ChatResponse(
                message=ai_response,
                conversation_id=conversation_id,
                intent=IntentType.CREATE_STRATEGY,
                confidence=0.95,
                extracted_params=context.get("collected_params", {}),
                suggested_actions=["继续配置策略", "查看其他选项"],
                timestamp=datetime.now(),
                insight=insight_data,
            )

        # =====================================================================
        # 正常流程: 识别意图并生成响应
        # =====================================================================
        # 构建意图识别上下文（包含对话历史和上一次意图）
        intent_context = request.context.copy() if request.context else {}

        # 从对话历史中提取上一次的意图（用于上下文感知）
        if conversation.messages:
            # 查找最近的意图
            last_intent = conversation.context.get("last_intent")
            if last_intent:
                intent_context["previous_intent"] = last_intent

            # 添加最近的对话历史（最多 4 条，截断长内容）
            recent_messages = conversation.messages[-4:]
            intent_context["chatHistory"] = [
                {"role": m.role.value, "content": m.content[:200]}
                for m in recent_messages
            ]

        intent_request = IntentRecognitionRequest(
            text=request.message, context=intent_context
        )
        intent_response = await intent_service.recognize_intent(
            intent_request, user_id=request.user_id
        )

        # 保存当前意图到对话上下文（供下次使用）
        conversation.context["last_intent"] = intent_response.intent.value

        logger.info(
            f"Intent recognized: {intent_response.intent} "
            f"(confidence: {intent_response.confidence}, "
            f"previous: {intent_context.get('previous_intent', 'none')})"
        )

        # A2UI: 根据意图决定是否生成 InsightData
        insight_data = None
        if intent_response.intent in INSIGHT_INTENTS:
            # 检查是否是确认性回复（用户已确认要执行）
            is_confirmation = intent_response.entities.get("is_confirmation", False)
            inherited_from = intent_response.entities.get("inherited_from")

            if is_confirmation:
                logger.info(
                    f"User confirmed action (inherited from: {inherited_from})"
                )

            # 生成结构化的 InsightData
            logger.info("Generating InsightData for A2UI")
            insight = await insight_service.generate_insight(
                user_input=request.message,
                intent=intent_response.intent,
                chat_history=conversation.messages,
                user_id=request.user_id,
                context={
                    "entities": intent_response.entities,
                    "is_confirmation": is_confirmation,  # 告知 insight 服务这是确认
                    "inherited_from": inherited_from,
                    "previous_intent": intent_context.get("previous_intent"),
                    **(request.context or {}),
                },
            )
            # 存储 InsightData 以便后续批准/拒绝操作
            try:
                await store_insight(insight)
                logger.info(f"Stored InsightData: {insight.id}")
            except Exception as store_error:
                # 存储失败不应阻止响应返回
                logger.warning(f"Failed to store InsightData: {store_error}")
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

        # 保存对话到存储
        await conversation_store.save_conversation(conversation)

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
async def get_conversation(
    conversation_id: str,
    conversation_store: ConversationStore = Depends(get_conversation_store),
) -> Conversation:
    """
    获取对话历史

    Args:
        conversation_id: 对话 ID
        conversation_store: 对话存储服务

    Returns:
        对话对象
    """
    conversation = await conversation_store.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在",
        )

    return conversation


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    conversation_store: ConversationStore = Depends(get_conversation_store),
) -> Dict[str, str]:
    """
    删除对话

    Args:
        conversation_id: 对话 ID
        conversation_store: 对话存储服务

    Returns:
        删除确认消息
    """
    deleted = await conversation_store.delete_conversation(conversation_id)
    if deleted:
        return {"message": "对话已删除"}

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="对话不存在",
    )


@router.post("/conversation/{conversation_id}/clear")
async def clear_conversation(
    conversation_id: str,
    conversation_store: ConversationStore = Depends(get_conversation_store),
) -> Dict[str, str]:
    """
    清空对话历史（保留对话）

    Args:
        conversation_id: 对话 ID
        conversation_store: 对话存储服务

    Returns:
        清空确认消息
    """
    cleared = await conversation_store.clear_conversation_messages(conversation_id)
    if not cleared:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="对话不存在",
        )

    return {"message": "对话历史已清空"}


def _reconstruct_original_request(
    messages: list,
    collected_params: Dict[str, str],
) -> str:
    """
    从对话历史和已收集的参数重建原始用户请求

    多步骤引导流程中，用户的原始意图可能分散在多条消息中。
    此函数将这些信息整合为一个完整的请求描述。

    Args:
        messages: 对话消息历史
        collected_params: 已收集的参数

    Returns:
        重建的请求描述
    """
    # 查找第一条用户消息（通常包含原始意图）
    original_intent = ""
    for msg in messages:
        if msg.role.value == "user" and len(msg.content) > 10:
            # 跳过简短的回答（如 "BTC/USDT", "是"）
            if not any(
                msg.content.upper().startswith(prefix)
                for prefix in ["BTC", "ETH", "SOL", "是", "否", "好"]
            ):
                original_intent = msg.content
                break

    # 如果没找到原始意图，使用默认描述
    if not original_intent:
        original_intent = "创建交易策略"

    # 构建参数描述
    param_descriptions = []
    param_mapping = {
        "trading_pair": "交易对",
        "symbol": "交易对",
        "timeframe": "时间周期",
        "strategy_type": "策略类型",
        "strategy_perspective": "策略角度",
        "risk_level": "风险等级",
    }

    for key, value in collected_params.items():
        label = param_mapping.get(key, key)
        param_descriptions.append(f"{label}: {value}")

    # 组合为完整请求
    if param_descriptions:
        params_str = "，".join(param_descriptions)
        return f"{original_intent}（{params_str}）"
    else:
        return original_intent


async def _generate_suggested_actions(intent, entities: Dict) -> list[str]:
    """
    生成建议的后续操作

    Args:
        intent: 识别的意图 (IntentType 或 str)
        entities: 提取的实体

    Returns:
        建议操作列表
    """
    suggestions = []

    # 支持 IntentType 和字符串两种类型，统一转换为小写比较
    intent_str = intent.value if hasattr(intent, "value") else str(intent)
    intent_lower = intent_str.lower()

    if intent_lower == "create_strategy":
        suggestions.extend([
            "查看完整的策略配置",
            "进行历史数据回测",
            "启动策略运行",
        ])
    elif intent_lower == "analyze_market":
        suggestions.extend([
            "查看更多技术指标",
            "分析历史价格走势",
            "创建基于分析的策略",
        ])
    elif intent_lower == "query_strategy":
        suggestions.extend([
            "查看策略详情",
            "修改策略参数",
            "查看策略表现",
        ])

    return suggestions


@router.post("/reasoning/stream")
async def stream_reasoning_chain(
    request: ChatRequest,
    reasoning_service: ReasoningChainService = Depends(get_reasoning_service),
    intent_service: IntentService = Depends(get_intent_service),
) -> StreamingResponse:
    """
    流式推理链生成 (SSE)

    逐个节点流式返回推理链，用于前端实时渲染

    Args:
        request: 聊天请求
        reasoning_service: 推理链服务
        intent_service: 意图服务

    Returns:
        SSE 流式响应
    """
    try:
        logger.info(f"Stream reasoning chain request: {request.message}")

        # 识别意图
        from ...models.schemas import IntentRecognitionRequest

        intent_request = IntentRecognitionRequest(
            text=request.message, context=request.context or {}
        )
        intent_response = await intent_service.recognize_intent(
            intent_request, user_id=request.user_id
        )

        # 生成器函数 - 流式输出推理节点
        async def generate():
            try:
                # 发送开始事件
                yield f"event: start\ndata: {json.dumps({'message': '开始思考...'})}\n\n"

                # 流式生成推理节点
                async for node_data in reasoning_service.generate_reasoning_chain_stream(
                    user_input=request.message,
                    intent=intent_response.intent,
                    context=request.context or {},
                ):
                    # 发送节点数据
                    yield f"event: node\ndata: {json.dumps(node_data)}\n\n"

                # 发送完成事件
                yield f"event: done\ndata: {json.dumps({'message': '思考完成'})}\n\n"

            except Exception as e:
                logger.error(f"Error streaming reasoning chain: {e}", exc_info=True)
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
            },
        )

    except Exception as e:
        logger.error(f"Error in stream reasoning chain: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"推理链生成失败: {str(e)}",
        )
