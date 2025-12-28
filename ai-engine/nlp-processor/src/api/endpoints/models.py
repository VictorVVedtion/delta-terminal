"""模型路由 API 端点

提供模型列表查询、路由配置管理等功能。
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ...models.llm_routing import (
    AVAILABLE_MODELS,
    DEFAULT_MODEL_ROUTING,
    LLMTaskType,
    ModelInfo,
    ModelTier,
    UserModelRouting,
    get_models_by_tier,
    get_models_for_task,
)
from ...services.llm_router import get_llm_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["models"])


# =============================================================================
# 请求/响应模型
# =============================================================================

class ModelListResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelInfo]
    total: int


class TaskModelsResponse(BaseModel):
    """任务推荐模型响应"""
    task: str
    recommended_models: List[ModelInfo]
    default_model: str


class RoutingConfigResponse(BaseModel):
    """路由配置响应"""
    system_defaults: Dict[str, str] = Field(description="系统默认路由")
    user_overrides: Dict[str, str] = Field(description="用户覆盖配置")
    effective_config: Dict[str, str] = Field(description="生效的配置")
    available_tasks: List[str] = Field(description="可配置的任务类型")


class UpdateRoutingRequest(BaseModel):
    """更新路由配置请求"""
    task_routing: Dict[str, str] = Field(
        default_factory=dict,
        description="任务到模型的映射 (task_type -> model_id)",
    )
    default_model: Optional[str] = Field(
        default=None,
        description="全局默认模型",
    )
    prefer_speed: bool = Field(default=False, description="优先速度")
    prefer_cost: bool = Field(default=False, description="优先成本")
    prefer_quality: bool = Field(default=True, description="优先质量")


class UpdateRoutingResponse(BaseModel):
    """更新路由配置响应"""
    success: bool
    message: str
    effective_config: Dict[str, str]


# =============================================================================
# 端点实现
# =============================================================================

@router.get("/", response_model=ModelListResponse)
async def list_models(
    tier: Optional[ModelTier] = None,
    enabled_only: bool = True,
) -> ModelListResponse:
    """
    获取可用模型列表

    Args:
        tier: 按等级筛选 (economy/balanced/premium)
        enabled_only: 只返回启用的模型

    Returns:
        模型列表
    """
    if tier:
        models = get_models_by_tier(tier)
    else:
        models = list(AVAILABLE_MODELS.values())

    if enabled_only:
        models = [m for m in models if m.enabled]

    return ModelListResponse(models=models, total=len(models))


@router.get("/{model_id}", response_model=ModelInfo)
async def get_model(model_id: str) -> ModelInfo:
    """
    获取单个模型信息

    Args:
        model_id: 模型 ID (如 anthropic/claude-sonnet-4.5)

    Returns:
        模型详情
    """
    # 处理 URL 编码的斜杠
    model_id = model_id.replace("%2F", "/")

    if model_id not in AVAILABLE_MODELS:
        raise HTTPException(status_code=404, detail=f"模型 {model_id} 不存在")

    return AVAILABLE_MODELS[model_id]


@router.get("/tasks/{task_type}", response_model=TaskModelsResponse)
async def get_task_models(task_type: str) -> TaskModelsResponse:
    """
    获取任务推荐的模型列表

    Args:
        task_type: 任务类型

    Returns:
        推荐模型列表和默认模型
    """
    try:
        task = LLMTaskType(task_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"无效的任务类型: {task_type}。可用类型: {[t.value for t in LLMTaskType]}",
        )

    recommended = get_models_for_task(task)
    default_model = DEFAULT_MODEL_ROUTING.get(task, "anthropic/claude-sonnet-4.5")

    return TaskModelsResponse(
        task=task.value,
        recommended_models=recommended,
        default_model=default_model,
    )


@router.get("/routing/config", response_model=RoutingConfigResponse)
async def get_routing_config(
    user_id: Optional[str] = None,
) -> RoutingConfigResponse:
    """
    获取当前路由配置

    Args:
        user_id: 用户 ID (可选，用于获取用户特定配置)

    Returns:
        路由配置详情
    """
    llm_router = get_llm_router()

    # 系统默认
    system_defaults = {task.value: model for task, model in DEFAULT_MODEL_ROUTING.items()}

    # 用户覆盖
    user_overrides: Dict[str, str] = {}
    if user_id:
        user_routing = llm_router.get_user_routing(user_id)
        if user_routing:
            user_overrides = {
                task.value: model
                for task, model in user_routing.task_routing.items()
            }
            if user_routing.default_model:
                user_overrides["_default"] = user_routing.default_model

    # 生效配置
    effective_config: Dict[str, str] = {}
    for task in LLMTaskType:
        model = llm_router.resolve_model(task, user_id)
        effective_config[task.value] = model

    return RoutingConfigResponse(
        system_defaults=system_defaults,
        user_overrides=user_overrides,
        effective_config=effective_config,
        available_tasks=[t.value for t in LLMTaskType],
    )


@router.put("/routing/config", response_model=UpdateRoutingResponse)
async def update_routing_config(
    request: UpdateRoutingRequest,
    user_id: str,
) -> UpdateRoutingResponse:
    """
    更新用户路由配置

    Args:
        request: 更新请求
        user_id: 用户 ID

    Returns:
        更新结果
    """
    llm_router = get_llm_router()

    # 验证模型 ID
    for task_str, model_id in request.task_routing.items():
        # 验证任务类型
        try:
            LLMTaskType(task_str)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"无效的任务类型: {task_str}",
            )

        # 验证模型 ID
        if model_id not in AVAILABLE_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"无效的模型 ID: {model_id}",
            )

    # 验证默认模型
    if request.default_model and request.default_model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"无效的默认模型 ID: {request.default_model}",
        )

    # 构建用户路由配置
    task_routing = {
        LLMTaskType(task_str): model_id
        for task_str, model_id in request.task_routing.items()
    }

    user_routing = UserModelRouting(
        user_id=user_id,
        task_routing=task_routing,
        default_model=request.default_model,
        prefer_speed=request.prefer_speed,
        prefer_cost=request.prefer_cost,
        prefer_quality=request.prefer_quality,
    )

    # 保存配置
    llm_router.set_user_routing(user_id, user_routing)

    # 返回生效配置
    effective_config: Dict[str, str] = {}
    for task in LLMTaskType:
        model = llm_router.resolve_model(task, user_id)
        effective_config[task.value] = model

    return UpdateRoutingResponse(
        success=True,
        message="路由配置已更新",
        effective_config=effective_config,
    )


@router.delete("/routing/config")
async def reset_routing_config(user_id: str) -> Dict[str, Any]:
    """
    重置用户路由配置为系统默认

    Args:
        user_id: 用户 ID

    Returns:
        操作结果
    """
    llm_router = get_llm_router()
    llm_router.clear_user_routing(user_id)

    return {
        "success": True,
        "message": "路由配置已重置为系统默认",
    }


@router.get("/routing/tasks", response_model=List[Dict[str, Any]])
async def list_task_types() -> List[Dict[str, Any]]:
    """
    获取所有任务类型及其说明

    Returns:
        任务类型列表
    """
    task_descriptions = {
        LLMTaskType.INTENT_RECOGNITION: {
            "name": "意图识别",
            "description": "识别用户输入的意图类型",
            "recommended_tier": "economy",
        },
        LLMTaskType.ENTITY_EXTRACTION: {
            "name": "实体抽取",
            "description": "从用户输入中提取关键实体",
            "recommended_tier": "economy",
        },
        LLMTaskType.SIMPLE_CHAT: {
            "name": "简单对话",
            "description": "普通的对话交流",
            "recommended_tier": "economy",
        },
        LLMTaskType.MARKET_ANALYSIS: {
            "name": "市场分析",
            "description": "分析市场行情和趋势",
            "recommended_tier": "balanced",
        },
        LLMTaskType.CLARIFICATION: {
            "name": "澄清问题",
            "description": "生成澄清问题以获取更多信息",
            "recommended_tier": "balanced",
        },
        LLMTaskType.PERSPECTIVE_RECOMMEND: {
            "name": "策略角度推荐",
            "description": "推荐交易策略的分析角度",
            "recommended_tier": "balanced",
        },
        LLMTaskType.STRATEGY_GENERATION: {
            "name": "策略生成",
            "description": "生成完整的交易策略配置",
            "recommended_tier": "premium",
        },
        LLMTaskType.INSIGHT_GENERATION: {
            "name": "Insight 生成",
            "description": "生成可交互的 InsightData",
            "recommended_tier": "premium",
        },
        LLMTaskType.COMPLEX_REASONING: {
            "name": "复杂推理",
            "description": "需要深度推理的复杂任务",
            "recommended_tier": "premium",
        },
    }

    result = []
    for task in LLMTaskType:
        info = task_descriptions.get(task, {})
        default_model = DEFAULT_MODEL_ROUTING.get(task, "anthropic/claude-sonnet-4.5")

        result.append({
            "id": task.value,
            "name": info.get("name", task.value),
            "description": info.get("description", ""),
            "recommended_tier": info.get("recommended_tier", "balanced"),
            "default_model": default_model,
        })

    return result
