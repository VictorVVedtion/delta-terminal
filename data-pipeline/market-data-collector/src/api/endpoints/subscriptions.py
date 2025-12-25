"""
订阅管理端点
"""
from fastapi import APIRouter, HTTPException, status
from typing import List

from src.models.schemas import (
    SubscriptionRequest,
    SubscriptionResponse,
    ErrorResponse,
)
from src.services.data_service import data_service

router = APIRouter(prefix="/subscriptions", tags=["订阅管理"])


@router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建数据订阅",
    description="创建新的市场数据订阅，启动实时数据采集",
)
async def create_subscription(
    request: SubscriptionRequest,
) -> SubscriptionResponse:
    """
    创建数据订阅

    参数:
    - exchange: 交易所名称
    - symbols: 交易对列表
    - data_types: 数据类型列表（ticker, orderbook, trade, kline）
    - intervals: K线间隔（仅 kline 类型需要）

    返回订阅ID和状态信息
    """
    try:
        subscription = await data_service.create_subscription(request)
        return subscription

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建订阅失败: {str(e)}",
        )


@router.get(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
    summary="获取订阅信息",
    description="根据订阅ID获取订阅详情",
)
async def get_subscription(subscription_id: str) -> SubscriptionResponse:
    """
    获取订阅信息

    参数:
    - subscription_id: 订阅ID

    返回订阅详情
    """
    subscription = await data_service.get_subscription(subscription_id)

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"订阅不存在: {subscription_id}",
        )

    return subscription


@router.delete(
    "/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="取消订阅",
    description="取消指定的数据订阅",
)
async def cancel_subscription(subscription_id: str) -> None:
    """
    取消订阅

    参数:
    - subscription_id: 订阅ID

    成功返回 204
    """
    try:
        await data_service.cancel_subscription(subscription_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"取消订阅失败: {str(e)}",
        )


@router.get(
    "",
    response_model=List[SubscriptionResponse],
    summary="获取所有订阅",
    description="获取当前所有活跃的订阅列表",
)
async def list_subscriptions() -> List[SubscriptionResponse]:
    """
    获取所有订阅

    返回所有活跃订阅列表
    """
    # TODO: 实现分页
    return list(data_service.subscriptions.values())
