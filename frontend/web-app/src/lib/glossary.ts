/**
 * 交易术语词典
 * 为新手用户提供专业术语的通俗解释
 */

export interface GlossaryTerm {
  term: string
  shortExplanation: string
  detailedExplanation: string
  example?: string
  riskLevel?: 'low' | 'medium' | 'high'
}

export const TRADING_GLOSSARY: Record<string, GlossaryTerm> = {
  // 策略类型
  grid: {
    term: '网格策略',
    shortExplanation: '在价格区间内自动低买高卖',
    detailedExplanation: '网格策略会在您设定的价格范围内，自动设置多个买入和卖出订单。当价格下跌时买入，上涨时卖出，通过价格波动赚取差价。',
    example: '比如设置 90000-100000 的网格，当价格跌到 95000 时买入，涨到 97000 时卖出',
    riskLevel: 'medium',
  },
  dca: {
    term: 'DCA 定投',
    shortExplanation: '定期定额买入，分散风险',
    detailedExplanation: 'Dollar Cost Averaging（美元成本平均法），即不管价格高低，定期投入固定金额。长期来看可以平滑买入成本，降低一次性买入的风险。',
    example: '每周一投入 100 元买比特币，无论当时价格是多少',
    riskLevel: 'low',
  },
  rsi: {
    term: 'RSI 指标',
    shortExplanation: '衡量价格涨跌强度的技术指标',
    detailedExplanation: '相对强弱指数（Relative Strength Index），数值范围 0-100。当 RSI 低于 30 表示可能超卖（价格被低估），高于 70 表示可能超买（价格被高估）。',
    example: 'RSI=25 时可能是买入机会，RSI=80 时可能需要考虑卖出',
    riskLevel: 'medium',
  },
  macd: {
    term: 'MACD 指标',
    shortExplanation: '判断价格趋势的技术指标',
    detailedExplanation: '移动平均收敛发散指标，通过两条移动平均线的交叉来判断买卖时机。当快线从下方穿越慢线时是买入信号，反之是卖出信号。',
    example: 'MACD 金叉（快线上穿慢线）通常被视为上涨信号',
    riskLevel: 'medium',
  },
  momentum: {
    term: '动量策略',
    shortExplanation: '追随价格上涨或下跌的趋势',
    detailedExplanation: '动量策略的核心理念是"强者恒强"，当价格持续上涨时买入，持续下跌时卖出，跟随市场趋势操作。',
    example: '当比特币连续3天上涨超过5%时买入',
    riskLevel: 'high',
  },

  // 风险管理术语
  stopLoss: {
    term: '止损',
    shortExplanation: '限制最大亏损的保护机制',
    detailedExplanation: '当价格跌到您设定的止损价时，系统会自动卖出，防止亏损继续扩大。这是保护资金安全的重要工具。',
    example: '买入价 100 元，设置 5% 止损，当价格跌到 95 元时自动卖出',
    riskLevel: 'low',
  },
  takeProfit: {
    term: '止盈',
    shortExplanation: '锁定利润的自动卖出机制',
    detailedExplanation: '当价格涨到您设定的目标价时，系统会自动卖出，确保利润落袋为安。防止因贪心而错失最佳卖点。',
    example: '买入价 100 元，设置 10% 止盈，当价格涨到 110 元时自动卖出',
    riskLevel: 'low',
  },
  maxDrawdown: {
    term: '最大回撤',
    shortExplanation: '从最高点跌到最低点的幅度',
    detailedExplanation: '最大回撤衡量的是在一段时间内，从资金最高点到最低点的下跌幅度。回撤越大说明风险越高。',
    example: '资金从 10000 涨到 12000 后跌到 9000，最大回撤是 (12000-9000)/12000 = 25%',
    riskLevel: 'high',
  },
  positionSize: {
    term: '仓位',
    shortExplanation: '投入资金的比例',
    detailedExplanation: '仓位是指您投入交易的资金占总资金的比例。仓位越大，盈亏幅度越大。建议新手从小仓位开始。',
    example: '总资金 10000 元，20% 仓位意味着用 2000 元交易',
    riskLevel: 'medium',
  },
  leverage: {
    term: '杠杆',
    shortExplanation: '借钱放大收益和风险',
    detailedExplanation: '杠杆允许您用少量资金控制更大的仓位。3倍杠杆意味着价格涨1%您赚3%，但跌1%您也亏3%。杠杆放大收益的同时也放大风险！',
    example: '用 1000 元开 3 倍杠杆，相当于操作 3000 元的仓位',
    riskLevel: 'high',
  },

  // 市场术语
  bullMarket: {
    term: '牛市',
    shortExplanation: '价格持续上涨的市场',
    detailedExplanation: '牛市是指市场整体呈现上涨趋势，投资者信心高涨，适合做多（买入持有）策略。',
    example: '2020-2021 年比特币从 1 万美元涨到 6 万美元就是牛市',
    riskLevel: 'low',
  },
  bearMarket: {
    term: '熊市',
    shortExplanation: '价格持续下跌的市场',
    detailedExplanation: '熊市是指市场整体呈现下跌趋势，投资者情绪低迷。此时需要更谨慎，或采用网格等震荡策略。',
    example: '2022 年比特币从 6 万美元跌到 1.5 万美元就是熊市',
    riskLevel: 'high',
  },
  volatility: {
    term: '波动率',
    shortExplanation: '价格变化的剧烈程度',
    detailedExplanation: '波动率越高，价格涨跌越剧烈。高波动率意味着更大的盈利机会，但也意味着更大的风险。',
    example: '比特币一天涨跌 10% 是高波动，黄金一天涨跌 1% 是低波动',
    riskLevel: 'medium',
  },

  // 交易术语
  slippage: {
    term: '滑点',
    shortExplanation: '实际成交价与预期价格的差距',
    detailedExplanation: '当市场波动剧烈或流动性不足时，您的订单可能无法以预期价格成交。滑点就是实际价格与预期价格的差异。',
    example: '您想以 100 元买入，但实际成交价是 100.5 元，滑点就是 0.5%',
    riskLevel: 'low',
  },
  orderBook: {
    term: '订单簿',
    shortExplanation: '所有买卖订单的列表',
    detailedExplanation: '订单簿显示当前市场上所有人的买入和卖出订单。绿色是买单（bid），红色是卖单（ask）。通过订单簿可以看出市场的买卖力量对比。',
    example: '订单簿显示 95000 有大量买单，说明这个价位有较强支撑',
    riskLevel: 'low',
  },
  paperTrading: {
    term: '模拟交易',
    shortExplanation: '用虚拟资金练习交易',
    detailedExplanation: 'Paper Trading 使用虚拟资金进行交易练习，真实价格数据，但不涉及真实资金。建议新手先用模拟交易熟悉系统后再投入真金白银。',
    example: '系统给您 10000 虚拟美元，您可以任意交易练习，亏了也不心疼',
    riskLevel: 'low',
  },

  // 回测术语
  backtest: {
    term: '回测',
    shortExplanation: '用历史数据测试策略效果',
    detailedExplanation: '回测是用过去的价格数据来模拟策略的表现。如果一个策略在历史数据上表现良好，可能（但不保证）在未来也有效。',
    example: '用过去 1 年的数据测试网格策略，看看能赚多少钱',
    riskLevel: 'low',
  },
  sharpeRatio: {
    term: '夏普比率',
    shortExplanation: '衡量风险调整后收益的指标',
    detailedExplanation: '夏普比率越高，说明每承担一单位风险获得的收益越多。一般来说，夏普比率大于 1 是不错的，大于 2 是优秀的。',
    example: '策略 A 收益 20% 风险大，策略 B 收益 15% 风险小，如果 B 的夏普比率更高，说明 B 更值得投资',
    riskLevel: 'low',
  },
  winRate: {
    term: '胜率',
    shortExplanation: '盈利交易的比例',
    detailedExplanation: '胜率是盈利交易次数占总交易次数的比例。但胜率高不一定赚钱，还要看每次盈利和亏损的金额。',
    example: '10 笔交易中 6 笔盈利，胜率就是 60%',
    riskLevel: 'low',
  },

  // API 相关
  apiKey: {
    term: 'API Key',
    shortExplanation: '连接交易所的密钥',
    detailedExplanation: 'API Key 是您在交易所创建的一组密钥，用于让第三方应用（如本平台）代您执行交易。请只授予必要权限，不要授予提现权限。',
    example: '在币安创建 API Key，只勾选"读取"和"现货交易"权限',
    riskLevel: 'medium',
  },
  apiSecret: {
    term: 'API Secret',
    shortExplanation: 'API 密钥的密码',
    detailedExplanation: 'API Secret 是 API Key 的配对密码，只在创建时显示一次。请妥善保管，不要泄露给任何人。如果泄露，请立即删除并重新创建。',
    example: '创建 API 后会显示一串很长的字符，这就是 Secret，只显示一次',
    riskLevel: 'high',
  },

  // 风控相关
  marginRate: {
    term: '保证金率',
    shortExplanation: '账户安全程度的指标',
    detailedExplanation: '保证金率越高，账户越安全。当保证金率低于交易所要求时，可能会被强制平仓（爆仓）。建议保持较高的保证金率。',
    example: '保证金率 150% 比较安全，低于 100% 就有爆仓风险',
    riskLevel: 'high',
  },
  exposure: {
    term: '总敞口',
    shortExplanation: '所有仓位的总价值',
    detailedExplanation: '总敞口是您所有未平仓头寸的市场价值总和。敞口越大，市场波动对您资金的影响越大。',
    example: '持有价值 5000 美元的 BTC 和 3000 美元的 ETH，总敞口是 8000 美元',
    riskLevel: 'medium',
  },
}

/**
 * 根据关键词获取术语解释
 */
export function getTermExplanation(term: string): GlossaryTerm | undefined {
  const lowerTerm = term.toLowerCase()
  return TRADING_GLOSSARY[lowerTerm]
}

/**
 * 在文本中查找并标记所有术语
 */
export function findTermsInText(text: string): string[] {
  const foundTerms: string[] = []
  const lowerText = text.toLowerCase()

  for (const key of Object.keys(TRADING_GLOSSARY)) {
    const entry = TRADING_GLOSSARY[key]
    if (entry) {
      const term = entry.term
      if (lowerText.includes(term.toLowerCase()) || lowerText.includes(key)) {
        foundTerms.push(key)
      }
    }
  }

  return foundTerms
}
