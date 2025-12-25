"""交易所管理端点"""
from fastapi import APIRouter, HTTPException, status
from typing import List
import ccxt

from ...models.schemas import (
    ExchangeCredentials,
    ExchangeConnection,
    SupportedExchange,
    SuccessResponse,
    ErrorResponse,
)
from ...services.exchange_service import get_exchange_service
from ...connectors.factory import ConnectorFactory

router = APIRouter(prefix="/exchanges", tags=["exchanges"])


@router.get("/supported", response_model=SuccessResponse)
async def get_supported_exchanges() -> SuccessResponse:
    """
    获取支持的交易所列表

    Returns:
        支持的交易所列表
    """
    supported = ConnectorFactory.get_supported_exchanges()

    exchanges = []
    for exchange_id in supported:
        try:
            # 获取交易所信息
            exchange_class = getattr(ccxt, exchange_id)
            exchange = exchange_class()

            exchanges.append(SupportedExchange(
                id=exchange.id,
                name=exchange.name,
                countries=exchange.countries if hasattr(exchange, 'countries') else [],
                has=exchange.has,
                timeframes=list(exchange.timeframes.keys()) if hasattr(exchange, 'timeframes') else [],
                urls=exchange.urls if hasattr(exchange, 'urls') else {},
            ))
        except Exception as e:
            # 跳过错误的交易所
            continue

    return SuccessResponse(data=exchanges)


@router.post("/connect", response_model=SuccessResponse)
async def connect_exchange(
    exchange_id: str,
    credentials: ExchangeCredentials,
) -> SuccessResponse:
    """
    连接到交易所

    Args:
        exchange_id: 交易所ID
        credentials: API凭证

    Returns:
        连接信息
    """
    try:
        service = get_exchange_service()
        connection = await service.connect_exchange(exchange_id, credentials)

        return SuccessResponse(data=connection.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"连接失败: {str(e)}",
        )


@router.delete("/{exchange_id}", response_model=SuccessResponse)
async def disconnect_exchange(exchange_id: str) -> SuccessResponse:
    """
    断开交易所连接

    Args:
        exchange_id: 交易所ID

    Returns:
        成功响应
    """
    try:
        service = get_exchange_service()
        await service.disconnect_exchange(exchange_id)

        return SuccessResponse(data={"message": f"已断开 {exchange_id} 连接"})

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"断开连接失败: {str(e)}",
        )


@router.get("/{exchange_id}/ping", response_model=SuccessResponse)
async def ping_exchange(exchange_id: str) -> SuccessResponse:
    """
    测试交易所连接

    Args:
        exchange_id: 交易所ID

    Returns:
        连接状态
    """
    try:
        service = get_exchange_service()
        connector = await service.get_connector(exchange_id)

        ping_success = await connector.ping()

        return SuccessResponse(data={
            "exchange_id": exchange_id,
            "connected": ping_success,
            "last_ping": connector.last_ping.isoformat() if connector.last_ping else None,
        })

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ping 失败: {str(e)}",
        )
