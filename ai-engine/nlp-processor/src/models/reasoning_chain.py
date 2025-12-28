"""
Reasoning Chain - AI 推理链可视化模块

让用户看到 AI 的思考过程，而不是黑盒输出。
用户可以在推理链的任何节点进行确认、质疑或修改。

核心理念：
- 透明性：展示 AI 为什么这样推荐
- 可交互：用户可以介入任意推理步骤
- 可追溯：每个决策都有证据支撑
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


# =============================================================================
# Reasoning Node Types
# =============================================================================


class ReasoningNodeType(str, Enum):
    """推理节点类型"""

    # 理解层 - 理解用户意图
    UNDERSTANDING = "understanding"

    # 分析层 - 分析当前状态
    ANALYSIS = "analysis"

    # 决策层 - 做出决策
    DECISION = "decision"

    # 推荐层 - 给出推荐
    RECOMMENDATION = "recommendation"

    # 警告层 - 风险提示
    WARNING = "warning"

    # 分支层 - 探索其他可能性
    BRANCH = "branch"


class ReasoningNodeStatus(str, Enum):
    """推理节点状态"""

    PENDING = "pending"          # 等待用户确认
    CONFIRMED = "confirmed"      # 用户已确认
    CHALLENGED = "challenged"    # 用户质疑
    MODIFIED = "modified"        # 用户已修改
    SKIPPED = "skipped"          # 用户跳过
    AUTO_CONFIRMED = "auto"      # 自动确认（高置信度）


class EvidenceType(str, Enum):
    """证据类型"""

    INDICATOR = "indicator"      # 技术指标值
    PRICE_LEVEL = "price_level"  # 价格水平
    VOLUME = "volume"            # 成交量
    PATTERN = "pattern"          # 形态识别
    NEWS = "news"                # 新闻/事件
    HISTORY = "history"          # 历史数据
    CORRELATION = "correlation"  # 相关性分析


# =============================================================================
# Evidence Models
# =============================================================================


class ReasoningEvidence(BaseModel):
    """推理证据 - 支撑推理的数据"""

    type: EvidenceType = Field(description="证据类型")
    label: str = Field(description="证据标签")
    value: Union[str, float, Dict[str, Any]] = Field(description="证据值")
    significance: Literal["high", "medium", "low"] = Field(
        default="medium",
        description="重要程度"
    )
    source: Optional[str] = Field(default=None, description="数据来源")
    timestamp: Optional[str] = Field(default=None, description="数据时间")

    # 可视化配置
    visualization: Optional[Dict[str, Any]] = Field(
        default=None,
        description="可视化配置 (chart type, color, etc.)"
    )


# =============================================================================
# User Action Models
# =============================================================================


class NodeAction(str, Enum):
    """用户可对节点执行的操作"""

    CONFIRM = "confirm"          # 确认这一步
    CHALLENGE = "challenge"      # 质疑这一步
    MODIFY = "modify"            # 修改这一步
    EXPAND = "expand"            # 展开详情
    COLLAPSE = "collapse"        # 收起详情
    EXPLORE_BRANCH = "branch"    # 探索其他分支
    SKIP = "skip"                # 跳过这一步


class UserInteraction(BaseModel):
    """用户与节点的交互记录"""

    action: NodeAction = Field(description="用户操作")
    timestamp: str = Field(description="操作时间")
    input: Optional[str] = Field(default=None, description="用户输入（如修改内容）")
    feedback: Optional[str] = Field(default=None, description="用户反馈")


# =============================================================================
# Reasoning Node
# =============================================================================


class ReasoningBranch(BaseModel):
    """推理分支 - 探索其他可能性"""

    id: str = Field(description="分支 ID")
    label: str = Field(description="分支标签")
    description: str = Field(description="分支描述")
    probability: float = Field(
        description="此分支的可能性 (0-1)",
        ge=0,
        le=1
    )
    trade_offs: List[str] = Field(
        default_factory=list,
        description="选择此分支的权衡"
    )
    # 分支展开后的子节点（懒加载）
    child_nodes: Optional[List["ReasoningNode"]] = Field(
        default=None,
        description="分支下的子推理节点"
    )


class ReasoningNode(BaseModel):
    """
    推理节点 - 推理链的基本单元

    每个节点代表 AI 思考过程中的一步：
    - 理解用户说了什么
    - 分析当前市场状态
    - 做出决策
    - 给出推荐
    """

    id: str = Field(description="节点唯一 ID")
    type: ReasoningNodeType = Field(description="节点类型")
    title: str = Field(description="节点标题（简短）")
    content: str = Field(description="节点内容（详细说明）")

    # 置信度与状态
    confidence: float = Field(
        description="AI 对此步骤的置信度 (0-1)",
        ge=0,
        le=1
    )
    status: ReasoningNodeStatus = Field(
        default=ReasoningNodeStatus.PENDING,
        description="节点状态"
    )

    # 证据支撑
    evidence: List[ReasoningEvidence] = Field(
        default_factory=list,
        description="支撑此推理的证据"
    )

    # 可选分支（其他可能的推理路径）
    branches: List[ReasoningBranch] = Field(
        default_factory=list,
        description="可探索的其他分支"
    )

    # 用户交互
    interactions: List[UserInteraction] = Field(
        default_factory=list,
        description="用户交互历史"
    )

    # 可执行的操作
    available_actions: List[NodeAction] = Field(
        default_factory=lambda: [NodeAction.CONFIRM, NodeAction.CHALLENGE],
        description="用户可执行的操作"
    )

    # 子节点（用于嵌套推理）
    children: List["ReasoningNode"] = Field(
        default_factory=list,
        description="子推理节点"
    )

    # 元数据
    created_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="创建时间"
    )

    # 展示配置
    expanded: bool = Field(default=True, description="是否默认展开")
    highlight: bool = Field(default=False, description="是否高亮显示")

    class Config:
        # 允许递归引用
        arbitrary_types_allowed = True


# 允许递归模型
ReasoningNode.model_rebuild()
ReasoningBranch.model_rebuild()


# =============================================================================
# Reasoning Chain
# =============================================================================


class ReasoningChainStatus(str, Enum):
    """推理链状态"""

    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"      # 已完成
    NEEDS_INPUT = "needs_input"  # 需要用户输入
    MODIFIED = "modified"        # 用户已修改
    CANCELLED = "cancelled"      # 用户取消


class ReasoningChain(BaseModel):
    """
    推理链 - AI 完整的推理过程

    包含从理解用户意图到给出最终推荐的完整链条。
    用户可以在任意节点介入、修改、探索其他分支。
    """

    id: str = Field(description="推理链唯一 ID")

    # 链的起点 - 用户原始输入
    user_input: str = Field(description="用户原始输入")

    # 推理节点列表
    nodes: List[ReasoningNode] = Field(description="推理节点列表")

    # 链状态
    status: ReasoningChainStatus = Field(
        default=ReasoningChainStatus.IN_PROGRESS,
        description="推理链状态"
    )

    # 当前活跃节点（等待用户确认的节点）
    active_node_id: Optional[str] = Field(
        default=None,
        description="当前需要用户关注的节点"
    )

    # 总体置信度（所有节点置信度的综合）
    overall_confidence: float = Field(
        description="整体置信度 (0-1)",
        ge=0,
        le=1
    )

    # 用户已确认的节点数
    confirmed_count: int = Field(default=0, description="已确认节点数")
    total_count: int = Field(description="总节点数")

    # 元数据
    created_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="创建时间"
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="更新时间"
    )

    # 关联的 InsightData ID（如果有）
    insight_id: Optional[str] = Field(
        default=None,
        description="关联的 InsightData ID"
    )


# =============================================================================
# Factory Functions
# =============================================================================


def create_reasoning_node(
    node_type: ReasoningNodeType,
    title: str,
    content: str,
    confidence: float,
    evidence: Optional[List[ReasoningEvidence]] = None,
    branches: Optional[List[ReasoningBranch]] = None,
    available_actions: Optional[List[NodeAction]] = None,
    expanded: bool = True,
    highlight: bool = False,
) -> ReasoningNode:
    """创建推理节点"""
    import uuid

    return ReasoningNode(
        id=f"node_{uuid.uuid4().hex[:8]}",
        type=node_type,
        title=title,
        content=content,
        confidence=confidence,
        evidence=evidence or [],
        branches=branches or [],
        available_actions=available_actions or [NodeAction.CONFIRM, NodeAction.CHALLENGE],
        expanded=expanded,
        highlight=highlight,
    )


def create_reasoning_chain(
    user_input: str,
    nodes: List[ReasoningNode],
    insight_id: Optional[str] = None,
) -> ReasoningChain:
    """创建推理链"""
    import uuid

    # 计算整体置信度（加权平均）
    if nodes:
        overall_confidence = sum(n.confidence for n in nodes) / len(nodes)
    else:
        overall_confidence = 0.0

    # 找到第一个待确认的节点
    active_node_id = None
    for node in nodes:
        if node.status == ReasoningNodeStatus.PENDING:
            active_node_id = node.id
            break

    return ReasoningChain(
        id=f"chain_{uuid.uuid4().hex[:8]}",
        user_input=user_input,
        nodes=nodes,
        overall_confidence=overall_confidence,
        active_node_id=active_node_id,
        confirmed_count=sum(1 for n in nodes if n.status == ReasoningNodeStatus.CONFIRMED),
        total_count=len(nodes),
        insight_id=insight_id,
    )


# =============================================================================
# Reasoning Chain Builder
# =============================================================================


class ReasoningChainBuilder:
    """
    推理链构建器 - 便捷地构建推理链

    使用方法:
    ```python
    builder = ReasoningChainBuilder("我想抄底 BTC")
    chain = (
        builder
        .add_understanding("理解意图", "您想在 BTC 价格低位时买入", 0.95)
        .add_analysis("市场分析", "当前 BTC 价格...", 0.88, evidence=[...])
        .add_decision("策略选择", "基于分析，推荐使用 RSI 策略", 0.82)
        .add_recommendation("最终推荐", "RSI 超卖策略配置如下...", 0.85)
        .build()
    )
    ```
    """

    def __init__(self, user_input: str, insight_id: Optional[str] = None):
        self.user_input = user_input
        self.insight_id = insight_id
        self.nodes: List[ReasoningNode] = []

    def add_understanding(
        self,
        title: str,
        content: str,
        confidence: float,
        evidence: Optional[List[ReasoningEvidence]] = None,
        branches: Optional[List[ReasoningBranch]] = None,
    ) -> "ReasoningChainBuilder":
        """添加理解节点"""
        node = create_reasoning_node(
            node_type=ReasoningNodeType.UNDERSTANDING,
            title=title,
            content=content,
            confidence=confidence,
            evidence=evidence,
            branches=branches,
            highlight=True,  # 理解节点默认高亮
        )
        self.nodes.append(node)
        return self

    def add_analysis(
        self,
        title: str,
        content: str,
        confidence: float,
        evidence: Optional[List[ReasoningEvidence]] = None,
        branches: Optional[List[ReasoningBranch]] = None,
    ) -> "ReasoningChainBuilder":
        """添加分析节点"""
        node = create_reasoning_node(
            node_type=ReasoningNodeType.ANALYSIS,
            title=title,
            content=content,
            confidence=confidence,
            evidence=evidence,
            branches=branches,
        )
        self.nodes.append(node)
        return self

    def add_decision(
        self,
        title: str,
        content: str,
        confidence: float,
        evidence: Optional[List[ReasoningEvidence]] = None,
        branches: Optional[List[ReasoningBranch]] = None,
    ) -> "ReasoningChainBuilder":
        """添加决策节点"""
        node = create_reasoning_node(
            node_type=ReasoningNodeType.DECISION,
            title=title,
            content=content,
            confidence=confidence,
            evidence=evidence,
            branches=branches,
            available_actions=[
                NodeAction.CONFIRM,
                NodeAction.CHALLENGE,
                NodeAction.EXPLORE_BRANCH,
            ],
        )
        self.nodes.append(node)
        return self

    def add_recommendation(
        self,
        title: str,
        content: str,
        confidence: float,
        evidence: Optional[List[ReasoningEvidence]] = None,
    ) -> "ReasoningChainBuilder":
        """添加推荐节点"""
        node = create_reasoning_node(
            node_type=ReasoningNodeType.RECOMMENDATION,
            title=title,
            content=content,
            confidence=confidence,
            evidence=evidence,
            highlight=True,  # 推荐节点默认高亮
            available_actions=[
                NodeAction.CONFIRM,
                NodeAction.MODIFY,
            ],
        )
        self.nodes.append(node)
        return self

    def add_warning(
        self,
        title: str,
        content: str,
        confidence: float,
        evidence: Optional[List[ReasoningEvidence]] = None,
    ) -> "ReasoningChainBuilder":
        """添加警告节点"""
        node = create_reasoning_node(
            node_type=ReasoningNodeType.WARNING,
            title=title,
            content=content,
            confidence=confidence,
            evidence=evidence,
            highlight=True,
            available_actions=[
                NodeAction.CONFIRM,
                NodeAction.SKIP,
            ],
        )
        self.nodes.append(node)
        return self

    def build(self) -> ReasoningChain:
        """构建推理链"""
        return create_reasoning_chain(
            user_input=self.user_input,
            nodes=self.nodes,
            insight_id=self.insight_id,
        )


# =============================================================================
# Extended InsightData with Reasoning Chain
# =============================================================================


class InsightDataWithReasoning(BaseModel):
    """
    带推理链的 InsightData

    扩展现有 InsightData，添加推理链字段。
    前端可以选择展示推理链，让用户看到 AI 的思考过程。
    """

    # 原有 InsightData 字段（通过组合而非继承）
    insight_id: str = Field(description="InsightData ID")

    # 推理链
    reasoning_chain: Optional[ReasoningChain] = Field(
        default=None,
        description="AI 推理过程（可选展示）"
    )

    # 是否默认展示推理链
    show_reasoning: bool = Field(
        default=False,
        description="是否默认展示推理链"
    )

    # 推理链展示模式
    reasoning_display_mode: Literal["collapsed", "expanded", "highlight_only"] = Field(
        default="collapsed",
        description="推理链展示模式"
    )
