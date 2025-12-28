"""
Strategy Perspectives - 策略角度库

定义交易概念与策略角度的映射关系。
用于实现 A2UI 的分层澄清机制：当用户表达交易意图但未指定具体判断逻辑时，
AI 推荐合适的"策略角度"供用户选择。

策略角度 = 判断入场/出场时机的业务逻辑维度
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class TradingConcept(str, Enum):
    """
    交易概念枚举

    表示用户的高层交易意图，如"抄底"、"追涨"等。
    这些是业务概念而非具体技术指标。
    """

    BOTTOM_FISHING = "bottom_fishing"      # 抄底 - 在价格低位买入
    TREND_FOLLOWING = "trend_following"    # 趋势跟踪 - 顺势而为
    BREAKOUT = "breakout"                  # 突破 - 价格突破关键位后入场
    MEAN_REVERSION = "mean_reversion"      # 均值回归 - 价格偏离后回归
    MOMENTUM = "momentum"                  # 动量 - 追涨杀跌
    RANGE_TRADING = "range_trading"        # 区间交易 - 高抛低吸
    SHORT_SELL = "short_sell"              # 做空 - 看跌做空
    SWING_TRADE = "swing_trade"            # 波段交易 - 中短期波段
    SCALPING = "scalping"                  # 超短线 - 快进快出
    DIP_BUYING = "dip_buying"              # 回调买入 - 在上涨趋势中的回调点买入


@dataclass
class StrategyPerspective:
    """
    策略角度

    表示判断入场/出场时机的具体逻辑维度。
    每个角度对应一种技术分析方法或市场信号。
    """

    id: str                                # 唯一标识符
    label: str                             # 显示标签
    description: str                       # 详细描述
    icon: str = ""                         # 图标 (emoji)
    recommended: bool = False              # 是否推荐
    indicator: Optional[str] = None        # 关联的技术指标
    default_params: Dict = field(default_factory=dict)  # 默认参数
    tags: List[str] = field(default_factory=list)       # 标签


# =============================================================================
# 预定义的策略角度
# =============================================================================

# RSI 相关角度
RSI_OVERSOLD = StrategyPerspective(
    id="rsi_oversold",
    label="RSI 超卖信号",
    description="当 RSI 低于 30，表示可能被过度卖出，价格有反弹潜力",
    icon="📉",
    recommended=True,
    indicator="RSI",
    default_params={"period": 14, "threshold": 30},
    tags=["技术指标", "超卖", "反转"]
)

RSI_OVERBOUGHT = StrategyPerspective(
    id="rsi_overbought",
    label="RSI 超买信号",
    description="当 RSI 高于 70，表示可能被过度买入，价格有回调风险",
    icon="📈",
    indicator="RSI",
    default_params={"period": 14, "threshold": 70},
    tags=["技术指标", "超买", "反转"]
)

# 支撑阻力相关角度
SUPPORT_LEVEL = StrategyPerspective(
    id="support_level",
    label="关键支撑位",
    description="价格接近历史支撑位，可能获得买盘支撑反弹",
    icon="🛡️",
    indicator="SUPPORT",
    tags=["价格结构", "支撑", "反弹"]
)

RESISTANCE_LEVEL = StrategyPerspective(
    id="resistance_level",
    label="关键阻力位",
    description="价格接近历史阻力位，可能遇到卖压回落",
    icon="🚧",
    indicator="RESISTANCE",
    tags=["价格结构", "阻力", "回调"]
)

SUPPORT_BREAKOUT = StrategyPerspective(
    id="support_breakout",
    label="支撑位突破",
    description="价格跌破支撑位，可能开启下跌趋势",
    icon="⬇️",
    indicator="SUPPORT",
    tags=["价格结构", "突破", "趋势"]
)

RESISTANCE_BREAKOUT = StrategyPerspective(
    id="resistance_breakout",
    label="阻力位突破",
    description="价格突破阻力位，可能开启上涨趋势",
    icon="⬆️",
    recommended=True,
    indicator="RESISTANCE",
    tags=["价格结构", "突破", "趋势"]
)

# 成交量相关角度
VOLUME_SURGE = StrategyPerspective(
    id="volume_surge",
    label="成交量放大",
    description="成交量显著放大，可能预示趋势转折或突破确认",
    icon="📊",
    indicator="VOLUME",
    default_params={"multiplier": 2.0},
    tags=["成交量", "确认", "突破"]
)

VOLUME_DIVERGENCE = StrategyPerspective(
    id="volume_divergence",
    label="量价背离",
    description="价格与成交量出现背离，可能预示趋势反转",
    icon="🔄",
    indicator="VOLUME",
    tags=["成交量", "背离", "反转"]
)

# 均线相关角度
MA_GOLDEN_CROSS = StrategyPerspective(
    id="ma_golden_cross",
    label="均线金叉",
    description="短期均线上穿长期均线，可能是上涨信号",
    icon="✨",
    recommended=True,
    indicator="MA",
    default_params={"short_period": 10, "long_period": 30},
    tags=["均线", "交叉", "趋势"]
)

MA_DEATH_CROSS = StrategyPerspective(
    id="ma_death_cross",
    label="均线死叉",
    description="短期均线下穿长期均线，可能是下跌信号",
    icon="💀",
    indicator="MA",
    default_params={"short_period": 10, "long_period": 30},
    tags=["均线", "交叉", "趋势"]
)

MA_SUPPORT = StrategyPerspective(
    id="ma_support",
    label="均线支撑",
    description="价格回踩均线后获得支撑反弹",
    icon="📏",
    indicator="MA",
    default_params={"period": 20},
    tags=["均线", "支撑", "回调"]
)

# MACD 相关角度
MACD_BULLISH = StrategyPerspective(
    id="macd_bullish",
    label="MACD 金叉",
    description="MACD 线上穿信号线，表示上涨动能增强",
    icon="🔺",
    indicator="MACD",
    default_params={"fast": 12, "slow": 26, "signal": 9},
    tags=["MACD", "动量", "趋势"]
)

MACD_BEARISH = StrategyPerspective(
    id="macd_bearish",
    label="MACD 死叉",
    description="MACD 线下穿信号线，表示下跌动能增强",
    icon="🔻",
    indicator="MACD",
    default_params={"fast": 12, "slow": 26, "signal": 9},
    tags=["MACD", "动量", "趋势"]
)

MACD_DIVERGENCE = StrategyPerspective(
    id="macd_divergence",
    label="MACD 背离",
    description="价格与 MACD 出现背离，可能预示趋势反转",
    icon="🔀",
    indicator="MACD",
    tags=["MACD", "背离", "反转"]
)

# 布林带相关角度
BB_LOWER_TOUCH = StrategyPerspective(
    id="bb_lower_touch",
    label="布林带下轨触及",
    description="价格触及布林带下轨，可能超卖反弹",
    icon="📐",
    indicator="BOLL",
    default_params={"period": 20, "std_dev": 2},
    tags=["布林带", "超卖", "反弹"]
)

BB_UPPER_TOUCH = StrategyPerspective(
    id="bb_upper_touch",
    label="布林带上轨触及",
    description="价格触及布林带上轨，可能超买回调",
    icon="📐",
    indicator="BOLL",
    tags=["布林带", "超买", "回调"]
)

BB_SQUEEZE = StrategyPerspective(
    id="bb_squeeze",
    label="布林带收窄",
    description="布林带收窄表示波动率降低，可能即将突破",
    icon="🔔",
    indicator="BOLL",
    tags=["布林带", "波动率", "突破"]
)

# 斐波那契相关角度
FIB_RETRACEMENT = StrategyPerspective(
    id="fib_retracement",
    label="斐波那契回调",
    description="价格回调至斐波那契关键位（38.2%/50%/61.8%），可能获得支撑",
    icon="🌀",
    indicator="FIB",
    default_params={"levels": [0.382, 0.5, 0.618]},
    tags=["斐波那契", "回调", "支撑"]
)

# 趋势相关角度
TREND_CONTINUATION = StrategyPerspective(
    id="trend_continuation",
    label="趋势延续",
    description="在确认的趋势中寻找回调入场点",
    icon="➡️",
    indicator="TREND",
    tags=["趋势", "延续", "回调"]
)

TREND_REVERSAL = StrategyPerspective(
    id="trend_reversal",
    label="趋势反转",
    description="识别趋势反转信号入场",
    icon="↩️",
    indicator="TREND",
    tags=["趋势", "反转", "拐点"]
)

# 价格形态相关角度
DOUBLE_BOTTOM = StrategyPerspective(
    id="double_bottom",
    label="双底形态",
    description="价格形成双底形态，可能开启反弹",
    icon="W",
    indicator="PATTERN",
    tags=["形态", "底部", "反转"]
)

HEAD_SHOULDERS = StrategyPerspective(
    id="head_shoulders",
    label="头肩形态",
    description="识别头肩顶/底形态的反转信号",
    icon="👤",
    indicator="PATTERN",
    tags=["形态", "反转", "经典"]
)


# =============================================================================
# 交易概念到策略角度的映射
# =============================================================================

CONCEPT_PERSPECTIVES_MAP: Dict[TradingConcept, List[StrategyPerspective]] = {

    # 抄底 - 在价格低位买入
    TradingConcept.BOTTOM_FISHING: [
        RSI_OVERSOLD,           # RSI 超卖
        SUPPORT_LEVEL,          # 关键支撑位
        VOLUME_SURGE,           # 成交量放大
        BB_LOWER_TOUCH,         # 布林带下轨
        DOUBLE_BOTTOM,          # 双底形态
        FIB_RETRACEMENT,        # 斐波那契回调
    ],

    # 趋势跟踪 - 顺势而为
    TradingConcept.TREND_FOLLOWING: [
        MA_GOLDEN_CROSS,        # 均线金叉
        MACD_BULLISH,           # MACD 金叉
        TREND_CONTINUATION,     # 趋势延续
        MA_SUPPORT,             # 均线支撑
        VOLUME_SURGE,           # 成交量确认
    ],

    # 突破交易
    TradingConcept.BREAKOUT: [
        RESISTANCE_BREAKOUT,    # 阻力位突破
        SUPPORT_BREAKOUT,       # 支撑位突破
        VOLUME_SURGE,           # 成交量确认
        BB_SQUEEZE,             # 布林带收窄
        MA_GOLDEN_CROSS,        # 均线交叉确认
    ],

    # 均值回归
    TradingConcept.MEAN_REVERSION: [
        RSI_OVERSOLD,           # RSI 超卖
        RSI_OVERBOUGHT,         # RSI 超买
        BB_LOWER_TOUCH,         # 布林带下轨
        BB_UPPER_TOUCH,         # 布林带上轨
        MA_SUPPORT,             # 均线回归
    ],

    # 动量交易 - 追涨杀跌
    TradingConcept.MOMENTUM: [
        MACD_BULLISH,           # MACD 金叉
        VOLUME_SURGE,           # 成交量放大
        RESISTANCE_BREAKOUT,    # 突破阻力
        TREND_CONTINUATION,     # 趋势延续
        MA_GOLDEN_CROSS,        # 均线金叉
    ],

    # 区间交易 - 高抛低吸
    TradingConcept.RANGE_TRADING: [
        SUPPORT_LEVEL,          # 支撑位买入
        RESISTANCE_LEVEL,       # 阻力位卖出
        RSI_OVERSOLD,           # RSI 超卖买入
        RSI_OVERBOUGHT,         # RSI 超买卖出
        BB_LOWER_TOUCH,         # 布林带下轨买入
        BB_UPPER_TOUCH,         # 布林带上轨卖出
    ],

    # 做空
    TradingConcept.SHORT_SELL: [
        RSI_OVERBOUGHT,         # RSI 超买
        RESISTANCE_LEVEL,       # 阻力位
        MA_DEATH_CROSS,         # 均线死叉
        MACD_BEARISH,           # MACD 死叉
        SUPPORT_BREAKOUT,       # 支撑位突破
        VOLUME_DIVERGENCE,      # 量价背离
    ],

    # 波段交易
    TradingConcept.SWING_TRADE: [
        MA_SUPPORT,             # 均线支撑
        FIB_RETRACEMENT,        # 斐波那契回调
        RSI_OVERSOLD,           # RSI 超卖
        TREND_CONTINUATION,     # 趋势延续
        VOLUME_SURGE,           # 成交量确认
    ],

    # 超短线
    TradingConcept.SCALPING: [
        VOLUME_SURGE,           # 成交量放大
        SUPPORT_LEVEL,          # 支撑位
        RESISTANCE_LEVEL,       # 阻力位
        RSI_OVERSOLD,           # RSI 超卖
        RSI_OVERBOUGHT,         # RSI 超买
    ],

    # 回调买入
    TradingConcept.DIP_BUYING: [
        MA_SUPPORT,             # 均线支撑
        FIB_RETRACEMENT,        # 斐波那契回调
        RSI_OVERSOLD,           # RSI 超卖（短期）
        BB_LOWER_TOUCH,         # 布林带下轨
        VOLUME_DIVERGENCE,      # 量价背离（确认回调结束）
    ],
}


# =============================================================================
# 交易概念关键词映射
# =============================================================================

TRADING_CONCEPT_KEYWORDS: Dict[TradingConcept, List[str]] = {
    TradingConcept.BOTTOM_FISHING: [
        "抄底", "触底", "低位", "低吸", "底部", "见底",
        "跌多了", "跌够了", "超跌", "抄一波底"
    ],
    TradingConcept.TREND_FOLLOWING: [
        "趋势", "顺势", "跟随", "追踪", "趋势交易",
        "顺势而为", "跟着趋势"
    ],
    TradingConcept.BREAKOUT: [
        "突破", "破位", "新高", "新低", "突破阻力",
        "突破支撑", "创新高", "破前高"
    ],
    TradingConcept.MEAN_REVERSION: [
        "均值回归", "回归", "偏离", "回调到位",
        "价格回归", "均值"
    ],
    TradingConcept.MOMENTUM: [
        "追涨", "杀跌", "动量", "强势", "弱势",
        "追高", "势头", "涨势", "跌势"
    ],
    TradingConcept.RANGE_TRADING: [
        "区间", "震荡", "高抛低吸", "箱体",
        "横盘", "盘整", "区间交易"
    ],
    TradingConcept.SHORT_SELL: [
        "做空", "空单", "看跌", "卖空", "看空",
        "空头", "做个空", "开空"
    ],
    TradingConcept.SWING_TRADE: [
        "波段", "中线", "波段交易", "中期",
        "波段操作", "做波段"
    ],
    TradingConcept.SCALPING: [
        "超短线", "短线", "快进快出", "日内",
        "短炒", "快速交易", "秒进秒出"
    ],
    TradingConcept.DIP_BUYING: [
        "回调", "回踩", "回调买入", "回踩买",
        "等回调", "回调入场", "接回调"
    ],
}


# =============================================================================
# 辅助函数
# =============================================================================

def detect_trading_concept(text: str) -> Optional[TradingConcept]:
    """
    从用户输入文本中检测交易概念

    Args:
        text: 用户输入文本

    Returns:
        检测到的交易概念，未检测到返回 None
    """
    text_lower = text.lower()

    for concept, keywords in TRADING_CONCEPT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return concept

    return None


def get_perspectives_for_concept(concept: TradingConcept) -> List[StrategyPerspective]:
    """
    获取指定交易概念对应的策略角度列表

    Args:
        concept: 交易概念

    Returns:
        策略角度列表
    """
    return CONCEPT_PERSPECTIVES_MAP.get(concept, [])


def get_recommended_perspectives(concept: TradingConcept, max_count: int = 4) -> List[StrategyPerspective]:
    """
    获取推荐的策略角度（优先返回标记为 recommended 的角度）

    Args:
        concept: 交易概念
        max_count: 最大返回数量

    Returns:
        推荐的策略角度列表
    """
    perspectives = get_perspectives_for_concept(concept)

    # 将推荐的角度排在前面
    sorted_perspectives = sorted(perspectives, key=lambda p: (not p.recommended, p.id))

    return sorted_perspectives[:max_count]


def perspective_to_clarification_option(perspective: StrategyPerspective) -> dict:
    """
    将 StrategyPerspective 转换为 ClarificationOption 格式

    Args:
        perspective: 策略角度

    Returns:
        ClarificationOption 字典格式
    """
    return {
        "id": perspective.id,
        "label": perspective.label,
        "description": perspective.description,
        "icon": perspective.icon,
        "recommended": perspective.recommended,
    }
