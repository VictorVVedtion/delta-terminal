/**
 * Strategy Assistant System Prompt
 *
 * 指导 AI 返回结构化的 InsightData 用于 A2UI 渲染
 */

export const STRATEGY_ASSISTANT_SYSTEM_PROMPT = `你是 Delta AI，专业的加密货币交易策略助手。

## 响应规则

当用户请求创建或修改策略时，在回复末尾附加 \`\`\`insight-data JSON块：

示例：
\`\`\`insight-data
{
  "type": "strategy_create",
  "target": {"strategy_id": "new", "name": "RSI策略", "symbol": "BTC/USDT"},
  "params": [
    {"key": "rsi_period", "label": "RSI周期", "type": "slider", "value": 14, "level": 1, "config": {"min": 5, "max": 30, "step": 1}},
    {"key": "rsi_oversold", "label": "超卖阈值", "type": "slider", "value": 30, "level": 1, "config": {"min": 10, "max": 40, "step": 1}},
    {"key": "rsi_overbought", "label": "超买阈值", "type": "slider", "value": 70, "level": 1, "config": {"min": 60, "max": 90, "step": 1}},
    {"key": "position_size", "label": "仓位比例", "type": "slider", "value": 10, "level": 1, "config": {"min": 1, "max": 50, "step": 1, "unit": "%"}},
    {"key": "stop_loss", "label": "止损", "type": "slider", "value": 5, "level": 1, "config": {"min": 1, "max": 15, "step": 0.5, "unit": "%"}},
    {"key": "take_profit", "label": "止盈", "type": "slider", "value": 15, "level": 1, "config": {"min": 5, "max": 50, "step": 1, "unit": "%"}}
  ],
  "impact": {
    "metrics": [
      {"key": "expectedReturn", "label": "预期年化收益", "value": 35, "unit": "%", "trend": "up"},
      {"key": "winRate", "label": "胜率", "value": 62, "unit": "%", "trend": "up"},
      {"key": "maxDrawdown", "label": "最大回撤", "value": 12, "unit": "%", "trend": "down"}
    ],
    "confidence": 0.72,
    "sample_size": 90
  },
  "actions": ["approve", "reject", "run_backtest"]
}
\`\`\`

## 参数类型
- slider: 数值滑块
- number: 数字输入
- select: 下拉选择
- toggle: 开关
- heatmap_slider: 热力图滑块(用于风险等级)

## 重要
1. 仅在策略相关请求时返回 insight-data
2. JSON必须有效可解析
3. 用中文回复
`

/**
 * 从 AI 响应中提取 InsightData JSON
 */
export function extractInsightData(content: string): {
  textContent: string
  insightData: Record<string, unknown> | null
} {
  // 匹配 ```insight-data ... ``` 块
  const insightRegex = /```insight-data\s*([\s\S]*?)```/
  const match = content.match(insightRegex)

  if (!match || !match[1]) {
    return { textContent: content, insightData: null }
  }

  // 提取 JSON 文本
  const jsonText = match[1].trim()

  // 移除 insight-data 块后的文本内容
  const textContent = content.replace(insightRegex, '').trim()

  try {
    const insightData = JSON.parse(jsonText)
    return { textContent, insightData }
  } catch (e) {
    console.error('[extractInsightData] JSON parse error:', e)
    return { textContent: content, insightData: null }
  }
}

/**
 * 验证 InsightData 结构
 */
export function validateInsightData(data: Record<string, unknown>): boolean {
  // 基本字段检查
  if (!data.type || typeof data.type !== 'string') return false
  if (!Array.isArray(data.params)) return false

  // 类型检查
  const validTypes = ['strategy_create', 'strategy_modify', 'batch_adjust', 'risk_alert', 'backtest']
  if (!validTypes.includes(data.type as string)) return false

  return true
}

/**
 * 生成带上下文的 System Prompt
 */
export function generateSystemPrompt(context?: {
  marketData?: Record<string, unknown>
  currentStrategy?: Record<string, unknown>
  userPreferences?: Record<string, unknown>
}): string {
  let prompt = STRATEGY_ASSISTANT_SYSTEM_PROMPT

  if (context?.marketData) {
    prompt += `\n\n当前市场: ${JSON.stringify(context.marketData)}`
  }

  return prompt
}
