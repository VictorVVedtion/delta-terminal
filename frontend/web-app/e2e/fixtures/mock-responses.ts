/**
 * E2E Test Mock Responses
 *
 * Mock 数据用于 E2E 测试，覆盖所有测试场景
 * 数据结构与后端 NLP Processor API 响应一致
 */

import type { InsightData, ClarificationInsight, BacktestInsightData, TradeSignalInsight } from '../../src/types/insight'

// =============================================================================
// API 响应结构
// =============================================================================

export interface InsightApiResponse {
  success: boolean
  message: string
  conversationId: string
  intent: string
  confidence: number
  insight?: InsightData
  suggestedActions?: string[]
  error?: string
}

// =============================================================================
// 意图分类测试响应 (SC01-SC05)
// =============================================================================

/**
 * SC01: 探索性查询 - 纯文本响应，无 InsightCard
 */
export const exploratoryResponse: InsightApiResponse = {
  success: true,
  message: `**BTC 当前行情分析**

根据最新市场数据，BTC/USDT 当前价格在 43,250 USDT 附近，24小时波动率约 3.2%。

**技术面分析：**
- RSI(14) 位于 55，处于中性区域
- MACD 金叉形成，短期动能转多
- 4小时级别支撑位: 42,800 USDT
- 阻力位: 44,500 USDT

**市场情绪：**
整体偏多，但需警惕上方阻力。建议观察是否能有效突破 44,500 后再考虑进场。`,
  conversationId: 'conv_exploratory_001',
  intent: 'exploratory',
  confidence: 0.92,
  suggestedActions: ['查看详细K线图', '设置价格提醒', '创建交易策略'],
}

/**
 * SC02: 行动性请求 - InsightCard 显示
 */
export const actionableResponse: InsightApiResponse = {
  success: true,
  message: '我已为您设计了一个支撑位抄底策略，请查看以下详细配置：',
  conversationId: 'conv_action_001',
  intent: 'create_strategy',
  confidence: 0.88,
  insight: {
    id: 'insight_action_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_new_001',
      name: 'BTC 支撑位抄底策略',
      symbol: 'BTC/USDT',
    },
    params: [
      {
        key: 'entry_price',
        label: '入场价格',
        type: 'number',
        value: 42800,
        level: 1,
        config: { min: 40000, max: 50000, step: 100, unit: 'USDT' },
        description: '当价格跌至此支撑位时触发买入',
      },
      {
        key: 'position_size',
        label: '仓位比例',
        type: 'slider',
        value: 20,
        level: 1,
        config: { min: 5, max: 50, step: 5, unit: '%' },
      },
      {
        key: 'stop_loss',
        label: '止损幅度',
        type: 'slider',
        value: 3,
        level: 1,
        config: { min: 1, max: 10, step: 0.5, unit: '%' },
      },
      {
        key: 'take_profit',
        label: '止盈幅度',
        type: 'slider',
        value: 6,
        level: 2,
        config: { min: 2, max: 20, step: 1, unit: '%' },
      },
    ],
    impact: {
      metrics: [
        { key: 'expectedReturn', label: '预期收益', value: 6, unit: '%', trend: 'up' },
        { key: 'maxDrawdown', label: '最大回撤', value: 3, unit: '%', trend: 'down' },
        { key: 'winRate', label: '历史胜率', value: 72, unit: '%', trend: 'up' },
      ],
      confidence: 0.85,
      sample_size: 156,
    },
    explanation: '基于历史数据分析，42,800 USDT 是一个强支撑位，过去 6 个月内该位置反弹成功率达 72%。策略设置 3% 止损控制风险，6% 止盈锁定利润。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
  },
  suggestedActions: ['运行回测', '调整参数', '查看历史表现'],
}

/**
 * SC03: 否定句处理 - 探索性响应
 */
export const negationResponse: InsightApiResponse = {
  success: true,
  message: `**收到您的指令**

好的，我理解您目前不希望买入 BTC。

**当前市场观察：**
- BTC 价格: 43,250 USDT
- 24h 涨幅: +2.1%
- 市场情绪: 偏多

如果您想设置在特定条件下触发的策略，或者需要我分析其他交易机会，随时告诉我。`,
  conversationId: 'conv_negation_001',
  intent: 'exploratory',
  confidence: 0.95,
}

/**
 * SC04: 疑问句 - 探索性响应
 */
export const questionResponse: InsightApiResponse = {
  success: true,
  message: `**网格策略设置指南**

网格策略是一种在价格波动区间内自动低买高卖的策略，适合震荡行情。

**关键参数设置：**

1. **价格区间**
   - 下限价格：设置在强支撑位
   - 上限价格：设置在强阻力位

2. **网格数量**
   - 建议 10-50 格
   - 格数越多，单格利润越小，但交易频率更高

3. **每格投入**
   - 总资金 / 网格数量
   - 建议预留 20% 资金应对极端行情

4. **适用场景**
   - 横盘震荡行情
   - 波动率 2%-5% 的币种

需要我帮您创建一个网格策略吗？`,
  conversationId: 'conv_question_001',
  intent: 'exploratory',
  confidence: 0.91,
  suggestedActions: ['创建网格策略', '查看示例配置', '学习更多策略'],
}

/**
 * SC05: 问号+动作词 - InsightCard 显示
 */
export const questionWithActionResponse: InsightApiResponse = {
  success: true,
  message: '好的，我来帮您创建一个网格策略。请查看以下推荐配置：',
  conversationId: 'conv_question_action_001',
  intent: 'create_strategy',
  confidence: 0.86,
  insight: {
    id: 'insight_grid_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_grid_001',
      name: 'BTC 网格交易策略',
      symbol: 'BTC/USDT',
    },
    params: [
      {
        key: 'lower_price',
        label: '下限价格',
        type: 'number',
        value: 40000,
        level: 1,
        config: { min: 30000, max: 50000, step: 500, unit: 'USDT' },
      },
      {
        key: 'upper_price',
        label: '上限价格',
        type: 'number',
        value: 48000,
        level: 1,
        config: { min: 40000, max: 60000, step: 500, unit: 'USDT' },
      },
      {
        key: 'grid_count',
        label: '网格数量',
        type: 'slider',
        value: 20,
        level: 1,
        config: { min: 5, max: 50, step: 1 },
      },
      {
        key: 'investment',
        label: '投入金额',
        type: 'number',
        value: 1000,
        level: 1,
        config: { min: 100, max: 10000, step: 100, unit: 'USDT' },
      },
    ],
    impact: {
      metrics: [
        { key: 'gridProfit', label: '单格利润', value: 2, unit: '%', trend: 'up' },
        { key: 'estimatedDailyTrades', label: '预估日交易', value: 3, unit: '次', trend: 'neutral' },
        { key: 'annualizedReturn', label: '年化收益', value: 45, unit: '%', trend: 'up' },
      ],
      confidence: 0.78,
      sample_size: 89,
    },
    explanation: '根据当前 BTC 波动特性，建议设置 40,000-48,000 USDT 区间，20 格网格。每格利润约 2%，适合当前震荡行情。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
  },
}

// =============================================================================
// 澄清问题测试响应 (SC06-SC09)
// =============================================================================

/**
 * SC06: 单步澄清
 */
export const singleClarificationResponse: InsightApiResponse = {
  success: true,
  message: '为了更好地帮您创建策略，我需要确认一些细节：',
  conversationId: 'conv_clarify_single_001',
  intent: 'clarification',
  confidence: 0.75,
  insight: {
    id: 'clarify_single_001',
    type: 'clarification',
    question: '您希望交易哪个交易对？',
    category: 'trading_pair',
    optionType: 'single',
    options: [
      { id: 'btc', label: 'BTC/USDT', description: '比特币，市值最大', recommended: true },
      { id: 'eth', label: 'ETH/USDT', description: '以太坊，智能合约平台' },
      { id: 'sol', label: 'SOL/USDT', description: '高性能公链' },
    ],
    allowCustomInput: true,
    customInputPlaceholder: '输入其他交易对...',
    skipLabel: '跳过，使用默认 BTC/USDT',
    contextHint: '不同交易对有不同的波动特性，选择合适的交易对可以提高策略收益。',
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
  } as ClarificationInsight,
}

/**
 * SC07: 多步澄清 - 第一步
 */
export const multiStepClarification1: InsightApiResponse = {
  success: true,
  message: '我需要了解更多信息来帮您创建最合适的策略：',
  conversationId: 'conv_clarify_multi_001',
  intent: 'clarification',
  confidence: 0.72,
  insight: {
    id: 'clarify_multi_001',
    type: 'clarification',
    question: '您偏好哪种策略类型？',
    category: 'strategy_type',
    optionType: 'single',
    options: [
      { id: 'trend', label: '趋势跟踪', description: '顺势而为，适合单边行情', icon: '📈' },
      { id: 'grid', label: '网格交易', description: '低买高卖，适合震荡行情', icon: '📊' },
      { id: 'dca', label: '定投策略', description: '分批买入，降低风险', icon: '💰' },
    ],
    allowCustomInput: false,
    remainingQuestions: 2,
    collectedParams: {},
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
  } as ClarificationInsight,
}

/**
 * SC07: 多步澄清 - 第二步
 */
export const multiStepClarification2: InsightApiResponse = {
  success: true,
  message: '好的，您选择了趋势跟踪策略。接下来：',
  conversationId: 'conv_clarify_multi_001',
  intent: 'clarification',
  confidence: 0.78,
  insight: {
    id: 'clarify_multi_002',
    type: 'clarification',
    question: '您的风险偏好是？',
    category: 'risk_preference',
    optionType: 'single',
    options: [
      { id: 'conservative', label: '保守型', description: '低风险低收益，最大回撤 5%', icon: '🛡️' },
      { id: 'moderate', label: '稳健型', description: '中等风险收益，最大回撤 10%', icon: '⚖️', recommended: true },
      { id: 'aggressive', label: '激进型', description: '高风险高收益，最大回撤 20%', icon: '🚀' },
    ],
    allowCustomInput: false,
    remainingQuestions: 1,
    collectedParams: { strategy_type: 'trend' },
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
  } as ClarificationInsight,
}

/**
 * SC07: 多步澄清 - 第三步 (最后)
 */
export const multiStepClarification3: InsightApiResponse = {
  success: true,
  message: '最后一个问题：',
  conversationId: 'conv_clarify_multi_001',
  intent: 'clarification',
  confidence: 0.82,
  insight: {
    id: 'clarify_multi_003',
    type: 'clarification',
    question: '您计划投入多少资金？',
    category: 'position_size',
    optionType: 'single',
    options: [
      { id: 'small', label: '少量 (100-500 USDT)', description: '试水阶段' },
      { id: 'medium', label: '中等 (500-2000 USDT)', description: '正常配置', recommended: true },
      { id: 'large', label: '较多 (2000+ USDT)', description: '重点投入' },
    ],
    allowCustomInput: true,
    customInputPlaceholder: '输入具体金额...',
    remainingQuestions: 0,
    collectedParams: { strategy_type: 'trend', risk_preference: 'moderate' },
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
  } as ClarificationInsight,
}

/**
 * SC07: 多步澄清完成后的 InsightCard
 */
export const multiStepClarificationComplete: InsightApiResponse = {
  success: true,
  message: '根据您的偏好，我为您设计了以下趋势跟踪策略：',
  conversationId: 'conv_clarify_multi_001',
  intent: 'create_strategy',
  confidence: 0.91,
  insight: {
    id: 'insight_trend_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_trend_001',
      name: 'BTC 均线趋势策略',
      symbol: 'BTC/USDT',
    },
    params: [
      {
        key: 'fast_ma',
        label: '快线周期',
        type: 'slider',
        value: 7,
        level: 1,
        config: { min: 3, max: 20, step: 1 },
      },
      {
        key: 'slow_ma',
        label: '慢线周期',
        type: 'slider',
        value: 25,
        level: 1,
        config: { min: 15, max: 100, step: 5 },
      },
      {
        key: 'position_size',
        label: '仓位比例',
        type: 'slider',
        value: 30,
        level: 1,
        config: { min: 10, max: 50, step: 5, unit: '%' },
      },
      {
        key: 'stop_loss',
        label: '止损幅度',
        type: 'slider',
        value: 5,
        level: 1,
        config: { min: 2, max: 15, step: 0.5, unit: '%' },
      },
    ],
    impact: {
      metrics: [
        { key: 'expectedReturn', label: '预期月收益', value: 8, unit: '%', trend: 'up' },
        { key: 'maxDrawdown', label: '最大回撤', value: 10, unit: '%', trend: 'down' },
        { key: 'winRate', label: '胜率', value: 58, unit: '%', trend: 'up' },
      ],
      confidence: 0.82,
      sample_size: 234,
    },
    explanation: '基于您选择的趋势跟踪 + 稳健型配置，我推荐使用 7/25 均线组合，配合 5% 止损控制风险。历史回测显示该策略在 2024 年表现优异。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
  },
}

// =============================================================================
// 策略创建测试响应 (SC10-SC14)
// =============================================================================

/**
 * SC10: 策略批准成功
 */
export const strategyApproveSuccess: InsightApiResponse = {
  success: true,
  message: '策略已成功创建！',
  conversationId: 'conv_approve_001',
  intent: 'strategy_approved',
  confidence: 1.0,
}

/**
 * SC13: 批量调整
 */
export const batchAdjustResponse: InsightApiResponse = {
  success: true,
  message: '我已为您准备好批量调整方案：',
  conversationId: 'conv_batch_001',
  intent: 'batch_adjust',
  confidence: 0.85,
  insight: {
    id: 'insight_batch_001',
    type: 'batch_adjust',
    params: [
      {
        key: 'stop_loss_all',
        label: '全局止损调整',
        type: 'slider',
        value: -2,
        old_value: 0,
        level: 1,
        config: { min: -10, max: 0, step: 0.5, unit: '%' },
        description: '将所有策略止损收紧 2%',
      },
      {
        key: 'position_reduce',
        label: '仓位缩减',
        type: 'slider',
        value: 20,
        level: 1,
        config: { min: 0, max: 50, step: 5, unit: '%' },
        description: '所有策略仓位缩减 20%',
      },
    ],
    impact: {
      metrics: [
        { key: 'riskLevel', label: '整体风险', value: '低', old_value: '中', trend: 'down' },
        { key: 'maxDrawdown', label: '预估回撤', value: 8, old_value: 15, unit: '%', trend: 'down' },
      ],
      confidence: 0.88,
      sample_size: 5,
    },
    explanation: '检测到市场波动加剧，建议收紧止损并降低仓位以控制整体风险。此调整将影响 5 个活跃策略。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject'],
  },
}

/**
 * SC14: 交易信号
 */
export const tradeSignalResponse: InsightApiResponse = {
  success: true,
  message: '检测到交易信号：',
  conversationId: 'conv_signal_001',
  intent: 'trade_signal',
  confidence: 0.92,
  insight: {
    id: 'signal_001',
    type: 'trade_signal',
    symbol: 'ETH/USDT',
    direction: 'long',
    strength: 'strong',
    entryPrice: 2280,
    stopLoss: 2200,
    takeProfit: 2450,
    riskRewardRatio: 2.1,
    triggers: ['RSI 超卖反弹', 'MACD 金叉确认', '成交量放大'],
    positionSize: 15,
    validUntil: Date.now() + 3600000, // 1 hour
    params: [
      {
        key: 'entry_price',
        label: '入场价',
        type: 'number',
        value: 2280,
        level: 1,
        config: { unit: 'USDT' },
      },
      {
        key: 'position_size',
        label: '建议仓位',
        type: 'slider',
        value: 15,
        level: 1,
        config: { min: 5, max: 30, step: 5, unit: '%' },
      },
    ],
    impact: {
      metrics: [
        { key: 'direction', label: '方向', value: '做多', trend: 'up' },
        { key: 'strength', label: '信号强度', value: '强', trend: 'up' },
        { key: 'riskRewardRatio', label: '盈亏比', value: 2.1, trend: 'up' },
      ],
      confidence: 0.92,
      sample_size: 1,
    },
    explanation: 'ETH 在 2280 USDT 附近形成强支撑，技术指标多重共振，建议做多。止损设在 2200，目标位 2450。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject'],
  } as TradeSignalInsight,
}

// =============================================================================
// 回测测试响应 (SC15-SC18)
// =============================================================================

/**
 * SC15-SC16: 回测成功 (通过标准)
 */
export const backtestSuccessResponse: InsightApiResponse = {
  success: true,
  message: '回测完成！策略表现优秀，建议进入部署阶段。',
  conversationId: 'conv_backtest_001',
  intent: 'backtest_complete',
  confidence: 1.0,
  insight: {
    id: 'backtest_001',
    type: 'backtest',
    strategy: {
      name: 'BTC 均线趋势策略',
      description: '使用 7/25 均线交叉作为买卖信号',
      symbol: 'BTC/USDT',
      timeframe: '4h',
      parameters: [
        {
          key: 'fast_ma',
          label: '快线周期',
          type: 'slider',
          value: 7,
          defaultValue: 7,
          config: { min: 3, max: 20 },
        },
        {
          key: 'slow_ma',
          label: '慢线周期',
          type: 'slider',
          value: 25,
          defaultValue: 25,
          config: { min: 15, max: 100 },
        },
      ],
      entryConditions: ['快线上穿慢线', 'RSI > 50'],
      exitConditions: ['快线下穿慢线', '达到止损/止盈'],
    },
    stats: {
      totalReturn: 42.5,
      annualizedReturn: 85.0,
      winRate: 62.3,
      profitFactor: 1.85,
      maxDrawdown: 12.4,
      maxDrawdownDays: 8,
      sharpeRatio: 1.52,
      sortinoRatio: 2.1,
      totalTrades: 48,
      winningTrades: 30,
      losingTrades: 18,
      avgWin: 450,
      avgLoss: 220,
      maxWin: 1200,
      maxLoss: 380,
      avgHoldingTime: 36,
      initialCapital: 10000,
      finalCapital: 14250,
      peakCapital: 15200,
      totalFees: 125.6,
    },
    trades: [
      {
        id: 't1',
        entryTime: Date.now() - 86400000 * 30,
        exitTime: Date.now() - 86400000 * 28,
        direction: 'long',
        entryPrice: 42000,
        exitPrice: 44100,
        quantity: 0.1,
        pnl: 210,
        pnlPercent: 5.0,
        status: 'closed',
        entrySignal: '均线金叉',
        exitSignal: '止盈',
        fee: 2.1,
      },
    ],
    equityCurve: [
      { timestamp: Date.now() - 86400000 * 30, equity: 10000, dailyPnl: 0, cumulativePnl: 0, drawdown: 0 },
      { timestamp: Date.now() - 86400000 * 15, equity: 12500, dailyPnl: 150, cumulativePnl: 2500, drawdown: 0 },
      { timestamp: Date.now(), equity: 14250, dailyPnl: 80, cumulativePnl: 4250, drawdown: 0 },
    ],
    chartData: {
      symbol: 'BTC/USDT',
      timeframe: '4h',
      candles: [],
      signals: [],
      overlays: [],
    },
    period: {
      start: Date.now() - 86400000 * 30,
      end: Date.now(),
    },
    aiSummary: '策略在过去 30 天表现优异，年化收益率 85%，夏普比率 1.52，超过 0.5 的通过标准。最大回撤 12.4% 在可控范围内。建议进入模拟部署阶段。',
    suggestions: ['可考虑增加趋势确认指标', '建议在高波动时期降低仓位'],
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
    actions: ['deploy_paper', 'deploy_live'],
  } as BacktestInsightData,
}

/**
 * SC17: 回测未通过
 */
export const backtestFailedCriteriaResponse: InsightApiResponse = {
  success: true,
  message: '回测完成，但策略表现未达到部署标准，建议优化后重试。',
  conversationId: 'conv_backtest_002',
  intent: 'backtest_complete',
  confidence: 1.0,
  insight: {
    id: 'backtest_002',
    type: 'backtest',
    strategy: {
      name: '高频交易策略',
      description: '基于短期价格波动的高频交易',
      symbol: 'BTC/USDT',
      timeframe: '1m',
      parameters: [],
      entryConditions: ['价格波动超过 0.1%'],
      exitConditions: ['盈利 0.2% 或亏损 0.1%'],
    },
    stats: {
      totalReturn: -5.2,
      annualizedReturn: -18.0,
      winRate: 45.2,
      profitFactor: 0.82,
      maxDrawdown: 22.5,
      maxDrawdownDays: 15,
      sharpeRatio: 0.32, // 未通过，< 0.5
      sortinoRatio: 0.45,
      totalTrades: 523,
      winningTrades: 236,
      losingTrades: 287,
      avgWin: 15,
      avgLoss: 18,
      maxWin: 85,
      maxLoss: 120,
      avgHoldingTime: 0.5,
      initialCapital: 10000,
      finalCapital: 9480,
      peakCapital: 10200,
      totalFees: 850.3,
    },
    trades: [],
    equityCurve: [],
    chartData: { symbol: 'BTC/USDT', timeframe: '1m', candles: [] },
    period: { start: Date.now() - 86400000 * 7, end: Date.now() },
    aiSummary: '**未通过部署标准**\n\n- 夏普比率 0.32 < 0.5 (未通过)\n- 总收益 -5.2% (亏损)\n- 最大回撤 22.5% 过高\n\n建议：降低交易频率，增加信号过滤条件。',
    suggestions: [
      '增加趋势过滤器，避免在震荡期交易',
      '提高止盈幅度，改善盈亏比',
      '考虑使用更长的时间周期',
    ],
    params: [],
    explanation: '',
    created_at: new Date().toISOString(),
    actions: ['run_backtest'], // 无部署选项
  } as BacktestInsightData,
}

/**
 * SC18: 回测失败 (API 错误)
 */
export const backtestErrorResponse: InsightApiResponse = {
  success: false,
  message: '',
  conversationId: 'conv_backtest_003',
  intent: 'backtest_error',
  confidence: 0,
  error: '回测服务暂时不可用，请稍后重试。如问题持续，请联系客服。',
}

// =============================================================================
// 部署测试响应 (SC19-SC22)
// =============================================================================

/**
 * SC19: Paper 部署成功
 */
export const deployPaperSuccess: InsightApiResponse = {
  success: true,
  message: '模拟交易代理已启动！您可以在监控面板查看实时表现。',
  conversationId: 'conv_deploy_paper_001',
  intent: 'deploy_success',
  confidence: 1.0,
  insight: {
    id: 'deploy_paper_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_001',
      name: 'BTC 均线趋势策略',
      symbol: 'BTC/USDT',
      agent_id: 'agent_paper_001',
    },
    params: [],
    explanation: '代理 ID: agent_paper_001，已开始模拟交易。初始资金: 10,000 USDT。',
    created_at: new Date().toISOString(),
    actions: ['stop_agent'],
  },
}

/**
 * SC20: Live 部署成功
 */
export const deployLiveSuccess: InsightApiResponse = {
  success: true,
  message: '真实交易代理已启动！请密切关注风险控制。',
  conversationId: 'conv_deploy_live_001',
  intent: 'deploy_success',
  confidence: 1.0,
  insight: {
    id: 'deploy_live_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_001',
      name: 'BTC 均线趋势策略',
      symbol: 'BTC/USDT',
      agent_id: 'agent_live_001',
    },
    params: [],
    explanation: '代理 ID: agent_live_001，真实交易已启动。请确保账户有足够余额。',
    created_at: new Date().toISOString(),
    actions: ['stop_agent'],
  },
}

/**
 * SC21: 部署失败
 */
export const deployFailedResponse: InsightApiResponse = {
  success: false,
  message: '',
  conversationId: 'conv_deploy_fail_001',
  intent: 'deploy_error',
  confidence: 0,
  error: '部署失败：账户余额不足，最低需要 100 USDT。请充值后重试。',
}

// =============================================================================
// 监控测试响应 (SC23-SC26)
// =============================================================================

/**
 * SC23: 获取代理状态
 */
export const agentStatusResponse: InsightApiResponse = {
  success: true,
  message: '代理运行状态正常',
  conversationId: 'conv_monitor_001',
  intent: 'agent_status',
  confidence: 1.0,
  insight: {
    id: 'monitor_001',
    type: 'strategy_modify',
    target: {
      strategy_id: 'strat_001',
      name: 'BTC 均线趋势策略',
      symbol: 'BTC/USDT',
      agent_id: 'agent_paper_001',
    },
    params: [],
    impact: {
      metrics: [
        { key: 'pnl', label: '当前盈亏', value: 235.5, unit: 'USDT', trend: 'up' },
        { key: 'winRate', label: '胜率', value: 66.7, unit: '%', trend: 'up' },
        { key: 'totalTrades', label: '交易次数', value: 12, trend: 'neutral' },
      ],
      confidence: 1.0,
      sample_size: 12,
    },
    explanation: '代理已运行 48 小时，完成 12 笔交易，累计盈利 235.5 USDT。',
    created_at: new Date().toISOString(),
    actions: ['stop_agent'],
  },
}

/**
 * SC24: 暂停代理
 */
export const agentPauseSuccess: InsightApiResponse = {
  success: true,
  message: '代理已暂停，当前持仓将保持不变。',
  conversationId: 'conv_pause_001',
  intent: 'agent_paused',
  confidence: 1.0,
}

/**
 * SC25: 恢复代理
 */
export const agentResumeSuccess: InsightApiResponse = {
  success: true,
  message: '代理已恢复运行，将继续监控市场信号。',
  conversationId: 'conv_resume_001',
  intent: 'agent_resumed',
  confidence: 1.0,
}

/**
 * SC26: 停止代理
 */
export const agentStopSuccess: InsightApiResponse = {
  success: true,
  message: '代理已停止，以下是最终运行统计：',
  conversationId: 'conv_stop_001',
  intent: 'agent_stopped',
  confidence: 1.0,
  insight: {
    id: 'stop_001',
    type: 'strategy_modify',
    target: {
      strategy_id: 'strat_001',
      name: 'BTC 均线趋势策略',
      symbol: 'BTC/USDT',
    },
    params: [],
    impact: {
      metrics: [
        { key: 'totalReturn', label: '总收益', value: 8.5, unit: '%', trend: 'up' },
        { key: 'totalTrades', label: '总交易', value: 24, trend: 'neutral' },
        { key: 'winRate', label: '最终胜率', value: 62.5, unit: '%', trend: 'up' },
      ],
      confidence: 1.0,
      sample_size: 24,
    },
    explanation: '代理运行 5 天，共完成 24 笔交易，总收益率 8.5%。表现优于基准 (BTC 同期 +3.2%)。',
    created_at: new Date().toISOString(),
  },
}

// =============================================================================
// 错误处理测试响应 (SC27-SC31)
// =============================================================================

/**
 * SC27: 后端未配置 (503)
 */
export const backendNotConfiguredResponse: InsightApiResponse = {
  success: false,
  message: '',
  conversationId: '',
  intent: 'error',
  confidence: 0,
  error: 'AI 服务未配置，请联系管理员设置 API 密钥。',
}

/**
 * SC28: 请求超时 (504)
 */
export const requestTimeoutResponse: InsightApiResponse = {
  success: false,
  message: '',
  conversationId: '',
  intent: 'error',
  confidence: 0,
  error: '请求超时，AI 服务响应时间过长。请稍后重试。',
}

/**
 * SC29: 网络错误
 */
export const networkErrorResponse: InsightApiResponse = {
  success: false,
  message: '',
  conversationId: '',
  intent: 'error',
  confidence: 0,
  error: '网络连接失败，请检查您的网络连接后重试。',
}

// =============================================================================
// 高级功能测试响应 (SC32-SC35)
// =============================================================================

/**
 * SC32: 模板选择
 */
export const templateSelectionResponse: InsightApiResponse = {
  success: true,
  message: '已加载网格交易模板，请根据需要调整参数：',
  conversationId: 'conv_template_001',
  intent: 'template_loaded',
  confidence: 1.0,
  insight: {
    id: 'template_grid_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_template_001',
      name: '经典网格策略模板',
      symbol: 'BTC/USDT',
    },
    params: [
      {
        key: 'lower_price',
        label: '下限价格',
        type: 'number',
        value: 40000,
        level: 1,
        config: { min: 20000, max: 60000, step: 1000, unit: 'USDT' },
      },
      {
        key: 'upper_price',
        label: '上限价格',
        type: 'number',
        value: 50000,
        level: 1,
        config: { min: 30000, max: 80000, step: 1000, unit: 'USDT' },
      },
      {
        key: 'grid_count',
        label: '网格数量',
        type: 'slider',
        value: 15,
        level: 1,
        config: { min: 5, max: 50, step: 1 },
      },
    ],
    explanation: '这是一个经典的网格交易模板，适合在 BTC 震荡行情中使用。请根据当前市场调整价格区间。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
  },
}

/**
 * SC33: 推理链展示
 */
export const reasoningChainResponse: InsightApiResponse = {
  success: true,
  message: '以下是我的分析过程和最终建议：',
  conversationId: 'conv_reasoning_001',
  intent: 'create_strategy',
  confidence: 0.88,
  insight: {
    id: 'insight_reasoning_001',
    type: 'strategy_create',
    target: {
      strategy_id: 'strat_reason_001',
      name: 'BTC 智能抄底策略',
      symbol: 'BTC/USDT',
    },
    params: [
      {
        key: 'entry_price',
        label: '入场价格',
        type: 'number',
        value: 42500,
        level: 1,
        config: { unit: 'USDT' },
      },
    ],
    explanation: '基于多维度分析，建议在 42,500 USDT 附近分批建仓。',
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
    show_reasoning: true,
    reasoning_display_mode: 'detailed',
    reasoning_chain: {
      id: 'chain_001',
      status: 'complete',
      steps: [
        {
          id: 'step_1',
          title: '市场环境分析',
          status: 'complete',
          reasoning: '当前 BTC 处于回调阶段，从 48,000 高点回落约 12%，符合健康回调特征。',
          conclusion: '市场处于调整期，非恐慌性抛售',
          confidence: 0.85,
          can_intervene: true,
        },
        {
          id: 'step_2',
          title: '支撑位确认',
          status: 'complete',
          reasoning: '42,000-42,500 区域是过去 3 个月的强支撑位，已被测试 4 次均未跌破。',
          conclusion: '42,500 USDT 为有效支撑位',
          confidence: 0.82,
          can_intervene: true,
        },
        {
          id: 'step_3',
          title: '技术指标分析',
          status: 'complete',
          reasoning: 'RSI(14) = 38，接近超卖区域；MACD 快线即将上穿慢线，形成金叉信号。',
          conclusion: '技术面偏多，反弹信号初现',
          confidence: 0.78,
          can_intervene: true,
        },
        {
          id: 'step_4',
          title: '风险评估',
          status: 'complete',
          reasoning: '设置 5% 止损可控制最大单笔亏损，历史同类行情反弹成功率 72%。',
          conclusion: '风险可控，建议入场',
          confidence: 0.88,
          can_intervene: false,
        },
      ],
      final_confidence: 0.88,
    },
  },
}

// =============================================================================
// 工具函数
// =============================================================================

/**
 * 创建延迟响应 (模拟网络延迟)
 */
export function withDelay<T>(response: T, delayMs: number = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(response), delayMs))
}

/**
 * 创建随机失败响应 (用于测试重试逻辑)
 */
export function withRandomFailure<T>(
  successResponse: T,
  failureRate: number = 0.3
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (Math.random() < failureRate) {
      reject(new Error('Random network failure'))
    } else {
      resolve(successResponse)
    }
  })
}

/**
 * 根据输入消息返回对应的 mock 响应
 */
export function getMockResponseForMessage(message: string): InsightApiResponse {
  const lowerMessage = message.toLowerCase()

  // 探索性查询
  if (
    lowerMessage.includes('行情') ||
    lowerMessage.includes('分析') ||
    lowerMessage.includes('怎么样')
  ) {
    return exploratoryResponse
  }

  // 否定句
  if (lowerMessage.includes('不要') || lowerMessage.includes('不想')) {
    return negationResponse
  }

  // 疑问句 (无动作词)
  if (
    (lowerMessage.includes('怎么') || lowerMessage.includes('什么')) &&
    !lowerMessage.includes('帮我') &&
    !lowerMessage.includes('创建')
  ) {
    return questionResponse
  }

  // 疑问句 + 动作词
  if (
    lowerMessage.includes('帮我') ||
    lowerMessage.includes('创建') ||
    lowerMessage.includes('设置')
  ) {
    return questionWithActionResponse
  }

  // 行动性请求
  if (
    lowerMessage.includes('买入') ||
    lowerMessage.includes('做多') ||
    lowerMessage.includes('抄底')
  ) {
    return actionableResponse
  }

  // 默认返回探索性响应
  return exploratoryResponse
}
