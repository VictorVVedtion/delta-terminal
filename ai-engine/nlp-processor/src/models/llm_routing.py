"""LLM 多模型路由配置 Schema

定义可用模型、任务类型及路由规则，支持用户自定义模型分配。
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# =============================================================================
# 任务类型枚举
# =============================================================================

class LLMTaskType(str, Enum):
    """AI 任务类型 - 决定使用哪个模型"""

    # 轻量级任务 (推荐: 快速/便宜模型)
    INTENT_RECOGNITION = "intent_recognition"      # 意图识别
    ENTITY_EXTRACTION = "entity_extraction"        # 实体抽取
    SIMPLE_CHAT = "simple_chat"                    # 简单对话

    # 中等任务 (推荐: 平衡模型)
    MARKET_ANALYSIS = "market_analysis"            # 市场分析
    CLARIFICATION = "clarification"                # 澄清问题生成
    PERSPECTIVE_RECOMMEND = "perspective_recommend" # 策略角度推荐

    # 复杂任务 (推荐: 高性能模型)
    STRATEGY_GENERATION = "strategy_generation"    # 策略生成
    INSIGHT_GENERATION = "insight_generation"      # InsightData 生成
    COMPLEX_REASONING = "complex_reasoning"        # 复杂推理


# =============================================================================
# 模型定义
# =============================================================================

class ModelCapability(str, Enum):
    """模型能力标签"""
    FAST = "fast"                    # 快速响应
    CHEAP = "cheap"                  # 低成本
    REASONING = "reasoning"          # 强推理能力
    CODING = "coding"                # 代码生成
    MULTILINGUAL = "multilingual"    # 多语言支持
    STRUCTURED_OUTPUT = "structured_output"  # 结构化输出
    LONG_CONTEXT = "long_context"    # 长上下文


class ModelTier(str, Enum):
    """模型等级"""
    ECONOMY = "economy"      # 经济型 (低成本优先)
    BALANCED = "balanced"    # 平衡型 (成本/性能平衡)
    PREMIUM = "premium"      # 高级型 (性能优先)


class ModelInfo(BaseModel):
    """模型信息"""

    id: str = Field(..., description="OpenRouter 模型 ID")
    name: str = Field(..., description="显示名称")
    provider: str = Field(..., description="提供商")
    tier: ModelTier = Field(..., description="模型等级")

    # 定价 (每百万 token)
    input_price: float = Field(..., description="输入价格 ($/M tokens)")
    output_price: float = Field(..., description="输出价格 ($/M tokens)")

    # 能力标签
    capabilities: List[ModelCapability] = Field(default_factory=list)

    # 性能指标
    context_length: int = Field(default=128000, description="上下文长度")
    avg_tps: Optional[float] = Field(default=None, description="平均 tokens/秒")

    # 推荐用途
    recommended_for: List[LLMTaskType] = Field(default_factory=list)

    # 状态
    enabled: bool = Field(default=True, description="是否启用")


# =============================================================================
# 预定义模型库
# =============================================================================

AVAILABLE_MODELS: Dict[str, ModelInfo] = {
    # ==================== 高性能模型 ====================
    "anthropic/claude-sonnet-4.5": ModelInfo(
        id="anthropic/claude-sonnet-4.5",
        name="Claude Sonnet 4.5",
        provider="Anthropic",
        tier=ModelTier.PREMIUM,
        input_price=3.0,
        output_price=15.0,
        capabilities=[
            ModelCapability.REASONING,
            ModelCapability.CODING,
            ModelCapability.STRUCTURED_OUTPUT,
            ModelCapability.LONG_CONTEXT,
        ],
        context_length=200000,
        avg_tps=80,
        recommended_for=[
            LLMTaskType.STRATEGY_GENERATION,
            LLMTaskType.INSIGHT_GENERATION,
            LLMTaskType.COMPLEX_REASONING,
        ],
    ),

    "anthropic/claude-sonnet-4": ModelInfo(
        id="anthropic/claude-sonnet-4",
        name="Claude Sonnet 4",
        provider="Anthropic",
        tier=ModelTier.PREMIUM,
        input_price=3.0,
        output_price=15.0,
        capabilities=[
            ModelCapability.REASONING,
            ModelCapability.CODING,
            ModelCapability.STRUCTURED_OUTPUT,
        ],
        context_length=200000,
        avg_tps=75,
        recommended_for=[
            LLMTaskType.STRATEGY_GENERATION,
            LLMTaskType.INSIGHT_GENERATION,
        ],
    ),

    # ==================== 平衡型模型 ====================
    "google/gemini-2.0-flash-001": ModelInfo(
        id="google/gemini-2.0-flash-001",
        name="Gemini 2.0 Flash",
        provider="Google",
        tier=ModelTier.BALANCED,
        input_price=0.10,
        output_price=0.40,
        capabilities=[
            ModelCapability.FAST,
            ModelCapability.CHEAP,
            ModelCapability.MULTILINGUAL,
            ModelCapability.LONG_CONTEXT,
        ],
        context_length=1000000,
        avg_tps=150,
        recommended_for=[
            LLMTaskType.MARKET_ANALYSIS,
            LLMTaskType.CLARIFICATION,
            LLMTaskType.PERSPECTIVE_RECOMMEND,
        ],
    ),

    "deepseek/deepseek-chat": ModelInfo(
        id="deepseek/deepseek-chat",
        name="DeepSeek V3",
        provider="DeepSeek",
        tier=ModelTier.BALANCED,
        input_price=0.27,
        output_price=1.10,
        capabilities=[
            ModelCapability.REASONING,
            ModelCapability.CODING,
            ModelCapability.CHEAP,
            ModelCapability.STRUCTURED_OUTPUT,
        ],
        context_length=64000,
        avg_tps=60,
        recommended_for=[
            LLMTaskType.INSIGHT_GENERATION,
            LLMTaskType.MARKET_ANALYSIS,
            LLMTaskType.STRATEGY_GENERATION,
        ],
    ),

    # ==================== 经济型模型 ====================
    "qwen/qwen-2.5-72b-instruct": ModelInfo(
        id="qwen/qwen-2.5-72b-instruct",
        name="Qwen 2.5 72B",
        provider="Alibaba",
        tier=ModelTier.ECONOMY,
        input_price=0.35,
        output_price=0.40,
        capabilities=[
            ModelCapability.FAST,
            ModelCapability.CHEAP,
            ModelCapability.MULTILINGUAL,
            ModelCapability.CODING,
        ],
        context_length=131072,
        avg_tps=120,
        recommended_for=[
            LLMTaskType.INTENT_RECOGNITION,
            LLMTaskType.ENTITY_EXTRACTION,
            LLMTaskType.SIMPLE_CHAT,
        ],
    ),

    "anthropic/claude-3.5-haiku": ModelInfo(
        id="anthropic/claude-3.5-haiku",
        name="Claude 3.5 Haiku",
        provider="Anthropic",
        tier=ModelTier.ECONOMY,
        input_price=0.80,
        output_price=4.0,
        capabilities=[
            ModelCapability.FAST,
            ModelCapability.STRUCTURED_OUTPUT,
        ],
        context_length=200000,
        avg_tps=100,
        recommended_for=[
            LLMTaskType.INTENT_RECOGNITION,
            LLMTaskType.ENTITY_EXTRACTION,
            LLMTaskType.CLARIFICATION,
        ],
    ),

    "google/gemini-2.0-flash-lite-001": ModelInfo(
        id="google/gemini-2.0-flash-lite-001",
        name="Gemini 2.0 Flash Lite",
        provider="Google",
        tier=ModelTier.ECONOMY,
        input_price=0.075,
        output_price=0.30,
        capabilities=[
            ModelCapability.FAST,
            ModelCapability.CHEAP,
            ModelCapability.MULTILINGUAL,
        ],
        context_length=1000000,
        avg_tps=200,
        recommended_for=[
            LLMTaskType.INTENT_RECOGNITION,
            LLMTaskType.SIMPLE_CHAT,
        ],
    ),
}


# =============================================================================
# 默认路由配置
# =============================================================================

DEFAULT_MODEL_ROUTING: Dict[LLMTaskType, str] = {
    # 轻量级任务 → 经济型模型
    LLMTaskType.INTENT_RECOGNITION: "qwen/qwen-2.5-72b-instruct",
    LLMTaskType.ENTITY_EXTRACTION: "anthropic/claude-3.5-haiku",
    LLMTaskType.SIMPLE_CHAT: "google/gemini-2.0-flash-lite-001",

    # 中等任务 → 平衡型模型
    LLMTaskType.MARKET_ANALYSIS: "google/gemini-2.0-flash-001",
    LLMTaskType.CLARIFICATION: "google/gemini-2.0-flash-001",
    LLMTaskType.PERSPECTIVE_RECOMMEND: "deepseek/deepseek-chat",

    # 复杂任务 → 高性能模型
    LLMTaskType.STRATEGY_GENERATION: "anthropic/claude-sonnet-4.5",
    LLMTaskType.INSIGHT_GENERATION: "anthropic/claude-sonnet-4.5",
    LLMTaskType.COMPLEX_REASONING: "anthropic/claude-sonnet-4.5",
}


# =============================================================================
# 用户路由配置
# =============================================================================

class UserModelRouting(BaseModel):
    """用户自定义模型路由配置"""

    user_id: str = Field(..., description="用户 ID")

    # 任务到模型的映射 (覆盖默认配置)
    task_routing: Dict[LLMTaskType, str] = Field(
        default_factory=dict,
        description="任务类型到模型 ID 的映射",
    )

    # 全局默认模型 (如果任务未指定)
    default_model: Optional[str] = Field(
        default=None,
        description="全局默认模型",
    )

    # 成本限制
    monthly_budget_usd: Optional[float] = Field(
        default=None,
        description="月度预算限制 (USD)",
    )

    # 偏好设置
    prefer_speed: bool = Field(default=False, description="优先速度")
    prefer_cost: bool = Field(default=False, description="优先成本")
    prefer_quality: bool = Field(default=True, description="优先质量")


class ModelRoutingConfig(BaseModel):
    """完整的模型路由配置"""

    # 系统默认
    system_defaults: Dict[LLMTaskType, str] = Field(
        default_factory=lambda: dict(DEFAULT_MODEL_ROUTING)
    )

    # 用户覆盖
    user_overrides: Optional[UserModelRouting] = Field(default=None)

    # 降级策略
    fallback_model: str = Field(
        default="anthropic/claude-sonnet-4.5",
        description="降级模型 (当指定模型不可用时)",
    )

    def get_model_for_task(self, task: LLMTaskType) -> str:
        """获取任务对应的模型 ID"""
        # 1. 检查用户覆盖
        if self.user_overrides:
            if task in self.user_overrides.task_routing:
                model_id = self.user_overrides.task_routing[task]
                if model_id in AVAILABLE_MODELS and AVAILABLE_MODELS[model_id].enabled:
                    return model_id

            # 2. 检查用户全局默认
            if self.user_overrides.default_model:
                model_id = self.user_overrides.default_model
                if model_id in AVAILABLE_MODELS and AVAILABLE_MODELS[model_id].enabled:
                    return model_id

        # 3. 使用系统默认
        if task in self.system_defaults:
            model_id = self.system_defaults[task]
            if model_id in AVAILABLE_MODELS and AVAILABLE_MODELS[model_id].enabled:
                return model_id

        # 4. 降级
        return self.fallback_model


# =============================================================================
# API 请求/响应模型
# =============================================================================

class ModelListResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelInfo]
    total: int


class UpdateRoutingRequest(BaseModel):
    """更新路由配置请求"""
    task_routing: Dict[LLMTaskType, str] = Field(default_factory=dict)
    default_model: Optional[str] = None
    prefer_speed: bool = False
    prefer_cost: bool = False
    prefer_quality: bool = True


class RoutingConfigResponse(BaseModel):
    """路由配置响应"""
    system_defaults: Dict[str, str]
    user_overrides: Dict[str, str]
    current_config: Dict[str, str]  # 合并后的实际配置


# =============================================================================
# 辅助函数
# =============================================================================

def get_models_by_tier(tier: ModelTier) -> List[ModelInfo]:
    """按等级获取模型列表"""
    return [m for m in AVAILABLE_MODELS.values() if m.tier == tier and m.enabled]


def get_models_for_task(task: LLMTaskType) -> List[ModelInfo]:
    """获取推荐用于特定任务的模型"""
    return [m for m in AVAILABLE_MODELS.values() if task in m.recommended_for and m.enabled]


def get_cheapest_model_for_task(task: LLMTaskType) -> Optional[ModelInfo]:
    """获取任务的最便宜模型"""
    models = get_models_for_task(task)
    if not models:
        return None
    return min(models, key=lambda m: m.input_price + m.output_price)


def get_fastest_model_for_task(task: LLMTaskType) -> Optional[ModelInfo]:
    """获取任务的最快模型"""
    models = [m for m in get_models_for_task(task) if m.avg_tps is not None]
    if not models:
        return None
    return max(models, key=lambda m: m.avg_tps or 0)


# =============================================================================
# 导出
# =============================================================================

__all__ = [
    # 枚举
    "LLMTaskType",
    "ModelCapability",
    "ModelTier",
    # 模型
    "ModelInfo",
    "UserModelRouting",
    "ModelRoutingConfig",
    # 常量
    "AVAILABLE_MODELS",
    "DEFAULT_MODEL_ROUTING",
    # 响应模型
    "ModelListResponse",
    "UpdateRoutingRequest",
    "RoutingConfigResponse",
    # 辅助函数
    "get_models_by_tier",
    "get_models_for_task",
    "get_cheapest_model_for_task",
    "get_fastest_model_for_task",
]
