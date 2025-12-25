/**
 * 数字计算工具函数
 */

/**
 * 精确加法 (避免浮点数精度问题)
 */
export function add(a: number, b: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return Math.round((a * factor + b * factor)) / factor;
}

/**
 * 精确减法
 */
export function subtract(a: number, b: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return Math.round((a * factor - b * factor)) / factor;
}

/**
 * 精确乘法
 */
export function multiply(a: number, b: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return Math.round(a * b * factor) / factor;
}

/**
 * 精确除法
 */
export function divide(a: number, b: number, decimals: number = 8): number {
  if (b === 0) throw new Error('Division by zero');
  const factor = Math.pow(10, decimals);
  return Math.round((a / b) * factor) / factor;
}

/**
 * 四舍五入到指定小数位
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 向下取整到指定小数位
 */
export function floor(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/**
 * 向上取整到指定小数位
 */
export function ceil(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

/**
 * 计算百分比变化
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * 限制数值在范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 计算数组平均值
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 计算数组标准差
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

/**
 * 计算最大回撤
 * @param equityCurve 权益曲线 (时间序列)
 */
export function maxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;

  let maxValue = equityCurve[0]!;
  let maxDD = 0;

  for (const value of equityCurve) {
    if (value > maxValue) {
      maxValue = value;
    }
    const drawdown = (maxValue - value) / maxValue;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }

  return maxDD * 100; // 返回百分比
}

/**
 * 计算夏普比率
 * @param returns 收益率数组 (百分比)
 * @param riskFreeRate 无风险利率 (年化, 百分比)
 * @param periodsPerYear 年化系数 (日数据=252, 小时数据=252*24)
 */
export function sharpeRatio(
  returns: number[],
  riskFreeRate: number = 0,
  periodsPerYear: number = 252
): number {
  if (returns.length < 2) return 0;

  const avgReturn = average(returns);
  const stdDev = standardDeviation(returns);

  if (stdDev === 0) return 0;

  const excessReturn = avgReturn - riskFreeRate / periodsPerYear;
  return (excessReturn / stdDev) * Math.sqrt(periodsPerYear);
}

/**
 * 计算胜率
 * @param trades 交易盈亏数组 (正数为盈利)
 */
export function winRate(trades: number[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t > 0).length;
  return (wins / trades.length) * 100;
}

/**
 * 计算盈亏比
 */
export function profitFactor(trades: number[]): number {
  const wins = trades.filter((t) => t > 0);
  const losses = trades.filter((t) => t < 0);

  const totalWin = wins.reduce((sum, t) => sum + t, 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t, 0));

  if (totalLoss === 0) return totalWin > 0 ? Infinity : 0;
  return totalWin / totalLoss;
}

/**
 * 根据精度调整数量
 * @param quantity 原始数量
 * @param stepSize 步长 (如 0.001)
 */
export function adjustQuantity(quantity: number, stepSize: number): number {
  if (stepSize <= 0) return quantity;
  return Math.floor(quantity / stepSize) * stepSize;
}

/**
 * 根据精度调整价格
 * @param price 原始价格
 * @param tickSize 价格精度 (如 0.01)
 */
export function adjustPrice(price: number, tickSize: number): number {
  if (tickSize <= 0) return price;
  return Math.round(price / tickSize) * tickSize;
}
