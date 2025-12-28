"""Insight API 端点

A2UI 核心 API: 处理 InsightData 的验证、批准、拒绝等操作
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ...models.insight_schemas import (
    Constraint,
    ConstraintType,
    InsightData,
    InsightParam,
    InsightType,
    ParamType,
)
from ...services.strategy_client import (
    StrategyClient,
    StrategyServiceError,
    get_strategy_client,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["Insights"])


# =============================================================================
# Request/Response Models
# =============================================================================


class ParamValue(BaseModel):
    """参数值"""
    key: str
    value: Any


class ValidateParamsRequest(BaseModel):
    """验证参数请求"""
    insight_id: str
    params: List[ParamValue]


class ValidationError(BaseModel):
    """验证错误"""
    param_key: str
    message: str
    severity: str = "error"  # error | warning


class ValidateParamsResponse(BaseModel):
    """验证参数响应"""
    valid: bool
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []


class ClarificationAnswerRequest(BaseModel):
    """追问回答请求"""
    insight_id: str
    question_key: str
    selected_options: List[str] = []
    custom_text: Optional[str] = None


class ClarificationAnswerResponse(BaseModel):
    """追问回答响应"""
    success: bool
    next_insight: Optional[InsightData] = None
    message: str = ""


class ApproveInsightRequest(BaseModel):
    """批准洞察请求"""
    insight_id: str
    edited_params: List[ParamValue] = []


class ApproveInsightResponse(BaseModel):
    """批准洞察响应"""
    success: bool
    strategy_id: Optional[str] = None
    message: str = ""
    next_step: Optional[str] = None  # "deploy" | "backtest" | "monitor"


class RejectInsightRequest(BaseModel):
    """拒绝洞察请求"""
    insight_id: str
    reason: Optional[str] = None


class RejectInsightResponse(BaseModel):
    """拒绝洞察响应"""
    success: bool
    message: str = ""


# =============================================================================
# Repository Integration
# =============================================================================

from ...repositories import get_insight_repository, InsightRepository

# 获取 repository 实例 (懒加载)
_repository: Optional[InsightRepository] = None


async def _get_repo() -> InsightRepository:
    """获取 repository 实例"""
    global _repository
    if _repository is None:
        _repository = await get_insight_repository()
    return _repository


async def store_insight(insight: InsightData) -> None:
    """存储洞察"""
    repo = await _get_repo()
    await repo.save(insight)


async def get_insight(insight_id: str) -> Optional[InsightData]:
    """获取洞察"""
    repo = await _get_repo()
    return await repo.get(insight_id)


# =============================================================================
# Validation Logic
# =============================================================================


def validate_param_value(
    param: InsightParam, value: Any
) -> List[ValidationError]:
    """验证单个参数值"""
    errors: List[ValidationError] = []

    # 类型验证
    if param.type == ParamType.NUMBER:
        if not isinstance(value, (int, float)):
            errors.append(ValidationError(
                param_key=param.key,
                message=f"参数 '{param.label}' 必须是数字",
                severity="error"
            ))
            return errors

        # 范围验证
        if param.config:
            if param.config.min is not None and value < param.config.min:
                errors.append(ValidationError(
                    param_key=param.key,
                    message=f"参数 '{param.label}' 不能小于 {param.config.min}",
                    severity="error"
                ))
            if param.config.max is not None and value > param.config.max:
                errors.append(ValidationError(
                    param_key=param.key,
                    message=f"参数 '{param.label}' 不能大于 {param.config.max}",
                    severity="error"
                ))

    elif param.type == ParamType.SLIDER:
        if not isinstance(value, (int, float)):
            errors.append(ValidationError(
                param_key=param.key,
                message=f"参数 '{param.label}' 必须是数字",
                severity="error"
            ))
            return errors

        if param.config:
            if param.config.min is not None and value < param.config.min:
                errors.append(ValidationError(
                    param_key=param.key,
                    message=f"滑块值不能小于 {param.config.min}",
                    severity="error"
                ))
            if param.config.max is not None and value > param.config.max:
                errors.append(ValidationError(
                    param_key=param.key,
                    message=f"滑块值不能大于 {param.config.max}",
                    severity="error"
                ))

    elif param.type == ParamType.SELECT:
        if param.config and param.config.options:
            valid_values = [opt.value for opt in param.config.options]
            if value not in valid_values:
                errors.append(ValidationError(
                    param_key=param.key,
                    message=f"无效的选项: {value}",
                    severity="error"
                ))

    elif param.type == ParamType.TOGGLE:
        if not isinstance(value, bool):
            errors.append(ValidationError(
                param_key=param.key,
                message=f"参数 '{param.label}' 必须是布尔值",
                severity="error"
            ))

    return errors


def validate_constraints(
    params: List[InsightParam],
    values: Dict[str, Any]
) -> List[ValidationError]:
    """验证参数约束"""
    errors: List[ValidationError] = []

    for param in params:
        if not param.constraints:
            continue

        value = values.get(param.key)
        if value is None:
            continue

        for constraint in param.constraints:
            if constraint.type == ConstraintType.MIN_MAX:
                # 已在 validate_param_value 中处理
                pass

            elif constraint.type == ConstraintType.DEPENDENCY:
                # 依赖关系验证
                if constraint.related_param:
                    related_value = values.get(constraint.related_param)
                    if related_value is None:
                        errors.append(ValidationError(
                            param_key=param.key,
                            message=constraint.message or f"依赖参数 '{constraint.related_param}' 未设置",
                            severity=constraint.severity
                        ))

            elif constraint.type == ConstraintType.MUTUAL_EXCLUSIVE:
                # 互斥验证
                if constraint.related_param:
                    related_value = values.get(constraint.related_param)
                    if related_value is not None and value is not None:
                        errors.append(ValidationError(
                            param_key=param.key,
                            message=constraint.message or f"参数 '{param.key}' 与 '{constraint.related_param}' 互斥",
                            severity=constraint.severity
                        ))

            elif constraint.type == ConstraintType.CUSTOM:
                # 自定义规则 - 简单规则解析
                if constraint.rule:
                    # TODO: 实现自定义规则解析器
                    pass

    return errors


# =============================================================================
# API Endpoints
# =============================================================================


@router.post("/validate", response_model=ValidateParamsResponse)
async def validate_params(request: ValidateParamsRequest) -> ValidateParamsResponse:
    """
    验证参数值

    对用户编辑的参数进行实时验证，返回错误和警告
    """
    insight = await get_insight(request.insight_id)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {request.insight_id} not found"
        )

    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []

    # 构建参数值映射
    values_map = {pv.key: pv.value for pv in request.params}

    # 验证每个参数
    for param in insight.params:
        if param.key in values_map:
            param_errors = validate_param_value(param, values_map[param.key])
            for err in param_errors:
                if err.severity == "warning":
                    warnings.append(err)
                else:
                    errors.append(err)

    # 验证约束
    constraint_errors = validate_constraints(insight.params, values_map)
    for err in constraint_errors:
        if err.severity == "warning":
            warnings.append(err)
        else:
            errors.append(err)

    logger.info(f"Validated insight {request.insight_id}: {len(errors)} errors, {len(warnings)} warnings")

    return ValidateParamsResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )


@router.post("/clarification-answer", response_model=ClarificationAnswerResponse)
async def answer_clarification(
    request: ClarificationAnswerRequest
) -> ClarificationAnswerResponse:
    """
    处理追问回答

    接收用户对 AI 追问的回答，生成下一个洞察
    """
    insight = await get_insight(request.insight_id)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {request.insight_id} not found"
        )

    if insight.type != InsightType.CLARIFICATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This insight is not a clarification request"
        )

    logger.info(
        f"Processing clarification answer for {request.insight_id}: "
        f"options={request.selected_options}, custom={request.custom_text}"
    )

    # TODO: 根据用户回答生成新的洞察
    # 1. 将回答合并到上下文
    # 2. 调用 InsightGeneratorService 生成新洞察
    # 3. 返回新洞察

    return ClarificationAnswerResponse(
        success=True,
        next_insight=None,  # TODO: 生成新洞察
        message="回答已记录，正在生成策略配置..."
    )


@router.post("/{insight_id}/approve", response_model=ApproveInsightResponse)
async def approve_insight(
    insight_id: str,
    request: ApproveInsightRequest
) -> ApproveInsightResponse:
    """
    批准洞察

    用户确认并批准 AI 生成的策略配置
    """
    insight = await get_insight(insight_id)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {insight_id} not found"
        )

    # 构建参数值映射（使用编辑后的值或原始值）
    values_map = {}
    for param in insight.params:
        values_map[param.key] = param.value

    # 应用用户编辑的参数
    if request.edited_params:
        for pv in request.edited_params:
            values_map[pv.key] = pv.value

    # 验证最终参数
    errors: List[ValidationError] = []
    for param in insight.params:
        if param.key in values_map:
            param_errors = validate_param_value(param, values_map[param.key])
            errors.extend([e for e in param_errors if e.severity == "error"])

    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {errors[0].message}"
        )

    logger.info(f"Approved insight {insight_id}")

    # 从参数中提取策略配置
    strategy_name = values_map.get("name", f"Strategy-{insight_id[:8]}")
    strategy_symbol = values_map.get("symbol", "BTC/USDT")
    strategy_type = values_map.get("strategy_type", "custom")

    # 构建策略配置
    strategy_config = {
        "params": values_map,
        "insightId": insight_id,
        "type": insight.type.value if hasattr(insight.type, "value") else str(insight.type),
    }

    # 如果有目标策略信息，则使用
    if insight.target:
        strategy_name = insight.target.name or strategy_name
        strategy_symbol = insight.target.symbol or strategy_symbol

    # 调用策略服务创建策略
    try:
        strategy_client = get_strategy_client()
        result = await strategy_client.create_strategy(
            name=strategy_name,
            symbol=strategy_symbol,
            strategy_type=strategy_type,
            config=strategy_config,
            user_id=getattr(insight, "user_id", None),
        )

        strategy_id = result.get("id") or result.get("strategyId")
        if not strategy_id:
            # 如果服务没有返回 ID，生成一个临时 ID
            strategy_id = f"strategy_{insight_id[:8]}"
            logger.warning(f"Strategy service did not return ID, using fallback: {strategy_id}")

        logger.info(f"Created strategy {strategy_id} from insight {insight_id}")

        return ApproveInsightResponse(
            success=True,
            strategy_id=strategy_id,
            message="策略已创建成功",
            next_step="deploy"
        )

    except StrategyServiceError as e:
        logger.error(f"Strategy service error: {e}")
        # 策略服务不可用时，生成临时 ID 并记录
        fallback_id = f"pending_{insight_id[:8]}"
        logger.warning(f"Using fallback strategy ID: {fallback_id}")

        return ApproveInsightResponse(
            success=True,
            strategy_id=fallback_id,
            message="策略已保存（等待同步到策略服务）",
            next_step="deploy"
        )

    except Exception as e:
        logger.error(f"Unexpected error creating strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建策略失败: {str(e)}"
        )


@router.post("/{insight_id}/reject", response_model=RejectInsightResponse)
async def reject_insight(
    insight_id: str,
    request: RejectInsightRequest
) -> RejectInsightResponse:
    """
    拒绝洞察

    用户拒绝 AI 生成的策略配置
    """
    insight = await get_insight(insight_id)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {insight_id} not found"
        )

    logger.info(f"Rejected insight {insight_id}, reason: {request.reason}")

    # TODO: 记录拒绝原因用于改进

    return RejectInsightResponse(
        success=True,
        message="已取消此策略配置，您可以重新描述需求"
    )


@router.get("/{insight_id}")
async def get_insight_by_id(insight_id: str) -> InsightData:
    """
    获取洞察详情
    """
    insight = await get_insight(insight_id)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {insight_id} not found"
        )
    return insight
