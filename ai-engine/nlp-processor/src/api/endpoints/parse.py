"""策略解析端点"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from ...models.schemas import ParseStrategyRequest, ParseStrategyResponse
from ...services.parser_service import ParserService, get_parser_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parse", tags=["Parse"])


@router.post("/strategy", response_model=ParseStrategyResponse)
async def parse_strategy(
    request: ParseStrategyRequest,
    parser_service: ParserService = Depends(get_parser_service),
) -> ParseStrategyResponse:
    """
    解析策略描述

    将自然语言的策略描述转换为结构化的策略配置。

    Args:
        request: 策略解析请求
        parser_service: 解析服务

    Returns:
        策略解析响应，包含结构化的策略配置或错误信息

    Raises:
        HTTPException: 当解析过程发生错误时
    """
    try:
        logger.info(f"Parsing strategy for user {request.user_id}")
        logger.debug(f"Strategy description: {request.description[:200]}...")

        # 调用解析服务
        response = await parser_service.parse_strategy(request)

        # 记录解析结果
        if response.success:
            logger.info(
                f"Strategy parsed successfully (confidence: {response.confidence})"
            )
            if response.strategy:
                logger.debug(f"Strategy name: {response.strategy.name}")
                logger.debug(f"Strategy type: {response.strategy.strategy_type}")
        else:
            logger.warning(f"Strategy parsing failed: {response.errors}")

        return response

    except Exception as e:
        logger.error(f"Error parsing strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"策略解析失败: {str(e)}",
        )


@router.post("/validate-strategy")
async def validate_strategy(
    strategy_config: dict,
    parser_service: ParserService = Depends(get_parser_service),
) -> dict:
    """
    验证策略配置

    检查策略配置的完整性和合理性。

    Args:
        strategy_config: 策略配置字典
        parser_service: 解析服务

    Returns:
        验证结果，包含错误、警告和建议
    """
    try:
        logger.info("Validating strategy configuration")

        # 使用 LangChain 策略链进行验证
        from ...chains.strategy_chain import get_strategy_chain

        chain = await get_strategy_chain()
        validation_result = await chain.validate_strategy(strategy_config)

        logger.info(
            f"Validation completed - Valid: {validation_result.get('is_valid', False)}"
        )

        return validation_result

    except Exception as e:
        logger.error(f"Error validating strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"策略验证失败: {str(e)}",
        )


@router.post("/optimize-strategy")
async def optimize_strategy(
    strategy_config: dict,
    market_context: dict | None = None,
) -> dict:
    """
    生成策略优化建议

    基于当前策略配置和市场环境，提供优化建议。

    Args:
        strategy_config: 策略配置
        market_context: 市场环境信息（可选）

    Returns:
        优化建议列表
    """
    try:
        logger.info("Generating strategy optimization suggestions")

        from ...chains.strategy_chain import get_strategy_chain

        chain = await get_strategy_chain()
        suggestions = await chain.generate_strategy_suggestions(
            strategy_config, market_context
        )

        logger.info(f"Generated {len(suggestions)} suggestions")

        return {
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions),
        }

    except Exception as e:
        logger.error(f"Error optimizing strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"策略优化失败: {str(e)}",
        )


@router.post("/extract-parameters")
async def extract_parameters(
    user_input: str,
    parameter_schema: dict,
) -> dict:
    """
    从用户输入中提取参数

    Args:
        user_input: 用户输入文本
        parameter_schema: 参数模式定义

    Returns:
        提取的参数字典
    """
    try:
        logger.info("Extracting parameters from user input")

        from ...chains.strategy_chain import get_strategy_chain

        chain = await get_strategy_chain()
        parameters = await chain.extract_parameters(user_input, parameter_schema)

        logger.info(f"Extracted {len(parameters)} parameters")

        return {
            "success": True,
            "parameters": parameters,
        }

    except Exception as e:
        logger.error(f"Error extracting parameters: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"参数提取失败: {str(e)}",
        )
