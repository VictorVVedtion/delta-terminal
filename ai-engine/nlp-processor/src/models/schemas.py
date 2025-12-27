"""数据模型定义"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# 枚举类型
# ============================================================================


class IntentType(str, Enum):
    """意图类型"""

    CREATE_STRATEGY = "create_strategy"
    MODIFY_STRATEGY = "modify_strategy"
    DELETE_STRATEGY = "delete_strategy"
    QUERY_STRATEGY = "query_strategy"
    ANALYZE_MARKET = "analyze_market"
    BACKTEST = "backtest"
    GENERAL_CHAT = "general_chat"
    UNKNOWN = "unknown"
    # 新增 AI 功能意图
    OPTIMIZE_STRATEGY = "optimize_strategy"  # 策略优化
    BACKTEST_SUGGEST = "backtest_suggest"  # 回测建议
    RISK_ANALYSIS = "risk_analysis"  # 风险分析


class MessageRole(str, Enum):
    """消息角色"""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class StrategyType(str, Enum):
    """策略类型"""

    GRID = "grid"  # 网格策略
    DCA = "dca"  # 定投策略
    SWING = "swing"  # 波段策略
    SCALPING = "scalping"  # 剥头皮策略
    ARBITRAGE = "arbitrage"  # 套利策略
    CUSTOM = "custom"  # 自定义策略


class OrderType(str, Enum):
    """订单类型"""

    MARKET = "market"  # 市价单
    LIMIT = "limit"  # 限价单
    STOP_LOSS = "stop_loss"  # 止损单
    STOP_LIMIT = "stop_limit"  # 止损限价单
    TAKE_PROFIT = "take_profit"  # 止盈单


class TimeFrame(str, Enum):
    """时间周期"""

    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"


# ============================================================================
# 消息相关
# ============================================================================


class Message(BaseModel):
    """对话消息"""

    role: MessageRole = Field(description="消息角色")
    content: str = Field(description="消息内容")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class ChatRequest(BaseModel):
    """聊天请求"""

    message: str = Field(description="用户消息", min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, description="对话 ID")
    user_id: str = Field(description="用户 ID")
    context: Optional[Dict[str, Any]] = Field(default=None, description="额外上下文")

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """验证消息内容"""
        return v.strip()


class ChatResponse(BaseModel):
    """聊天响应"""

    message: str = Field(description="AI 响应消息")
    conversation_id: str = Field(description="对话 ID")
    intent: IntentType = Field(description="识别的意图")
    confidence: float = Field(description="置信度", ge=0.0, le=1.0)
    extracted_params: Optional[Dict[str, Any]] = Field(
        default=None, description="提取的参数"
    )
    suggested_actions: Optional[List[str]] = Field(
        default=None, description="建议的后续操作"
    )
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")

    # A2UI: InsightData 结构化响应
    insight: Optional[Dict[str, Any]] = Field(
        default=None,
        description="A2UI InsightData 结构化数据，包含交互式参数配置"
    )


# ============================================================================
# 意图识别
# ============================================================================


class IntentRecognitionRequest(BaseModel):
    """意图识别请求"""

    text: str = Field(description="待识别文本", min_length=1)
    context: Optional[Dict[str, Any]] = Field(default=None, description="上下文信息")


class IntentRecognitionResponse(BaseModel):
    """意图识别响应"""

    intent: IntentType = Field(description="识别的意图")
    confidence: float = Field(description="置信度", ge=0.0, le=1.0)
    entities: Dict[str, Any] = Field(default_factory=dict, description="提取的实体")
    reasoning: Optional[str] = Field(default=None, description="推理过程")


# ============================================================================
# 策略解析
# ============================================================================


class StrategyCondition(BaseModel):
    """策略条件"""

    indicator: str = Field(description="指标名称")
    operator: str = Field(description="操作符", pattern="^(>|<|>=|<=|==|!=|crosses_above|crosses_below)$")
    value: float | str = Field(description="比较值")
    params: Optional[Dict[str, Any]] = Field(default=None, description="指标参数")


class StrategyAction(BaseModel):
    """策略动作"""

    action_type: str = Field(description="动作类型", pattern="^(buy|sell|close|alert)$")
    order_type: OrderType = Field(description="订单类型")
    amount: Optional[float] = Field(default=None, description="交易数量", gt=0)
    amount_percent: Optional[float] = Field(
        default=None, description="仓位百分比", ge=0, le=100
    )
    price: Optional[float] = Field(default=None, description="价格", gt=0)
    price_offset_percent: Optional[float] = Field(
        default=None, description="价格偏移百分比"
    )

    @field_validator("amount", "amount_percent")
    @classmethod
    def validate_amount(cls, v: Optional[float], info: Any) -> Optional[float]:
        """验证数量参数"""
        values = info.data
        if "amount" in values and "amount_percent" in values:
            if values.get("amount") and values.get("amount_percent"):
                raise ValueError("不能同时指定 amount 和 amount_percent")
        return v


class RiskManagement(BaseModel):
    """风险管理"""

    max_position_size: Optional[float] = Field(default=None, description="最大仓位", gt=0)
    max_position_percent: Optional[float] = Field(
        default=None, description="最大仓位百分比", ge=0, le=100
    )
    stop_loss_percent: Optional[float] = Field(
        default=None, description="止损百分比", gt=0, le=100
    )
    take_profit_percent: Optional[float] = Field(
        default=None, description="止盈百分比", gt=0
    )
    max_drawdown_percent: Optional[float] = Field(
        default=None, description="最大回撤百分比", gt=0, le=100
    )
    daily_loss_limit: Optional[float] = Field(
        default=None, description="每日亏损限制", gt=0
    )


class StrategyConfig(BaseModel):
    """策略配置"""

    name: str = Field(description="策略名称", min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, description="策略描述")
    strategy_type: StrategyType = Field(description="策略类型")
    symbol: str = Field(description="交易对", pattern="^[A-Z]+/[A-Z]+$")
    timeframe: TimeFrame = Field(description="时间周期")
    entry_conditions: List[StrategyCondition] = Field(
        description="入场条件", min_length=1
    )
    exit_conditions: Optional[List[StrategyCondition]] = Field(
        default=None, description="出场条件"
    )
    entry_action: StrategyAction = Field(description="入场动作")
    exit_action: Optional[StrategyAction] = Field(default=None, description="出场动作")
    risk_management: Optional[RiskManagement] = Field(
        default=None, description="风险管理"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default=None, description="其他参数"
    )

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """验证交易对格式"""
        return v.upper()


class ParseStrategyRequest(BaseModel):
    """策略解析请求"""

    description: str = Field(description="策略描述", min_length=10, max_length=5000)
    user_id: str = Field(description="用户 ID")
    context: Optional[Dict[str, Any]] = Field(default=None, description="额外上下文")


class ParseStrategyResponse(BaseModel):
    """策略解析响应"""

    success: bool = Field(description="是否成功")
    strategy: Optional[StrategyConfig] = Field(default=None, description="策略配置")
    errors: Optional[List[str]] = Field(default=None, description="错误信息")
    warnings: Optional[List[str]] = Field(default=None, description="警告信息")
    suggestions: Optional[List[str]] = Field(default=None, description="改进建议")
    confidence: float = Field(description="置信度", ge=0.0, le=1.0)


# ============================================================================
# 对话管理
# ============================================================================


class Conversation(BaseModel):
    """对话会话"""

    conversation_id: str = Field(description="对话 ID")
    user_id: str = Field(description="用户 ID")
    messages: List[Message] = Field(default_factory=list, description="消息历史")
    context: Dict[str, Any] = Field(default_factory=dict, description="对话上下文")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")

    def add_message(self, role: MessageRole, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """添加消息"""
        self.messages.append(
            Message(role=role, content=content, metadata=metadata)
        )
        self.updated_at = datetime.now()

    def get_recent_messages(self, limit: int = 10) -> List[Message]:
        """获取最近的消息"""
        return self.messages[-limit:] if len(self.messages) > limit else self.messages


# ============================================================================
# 健康检查
# ============================================================================


class HealthResponse(BaseModel):
    """健康检查响应"""

    status: str = Field(description="服务状态")
    version: str = Field(description="版本号")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")
    dependencies: Dict[str, str] = Field(
        default_factory=dict, description="依赖服务状态"
    )
