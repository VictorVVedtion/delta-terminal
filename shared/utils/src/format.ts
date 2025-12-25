/**
 * 格式化工具函数
 */

/**
 * 格式化货币金额
 * @param value 数值
 * @param currency 货币符号
 * @param decimals 小数位数
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  decimals: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * 格式化加密货币金额
 * @param value 数值
 * @param symbol 货币符号 (如 BTC, ETH)
 * @param decimals 小数位数
 */
export function formatCryptoAmount(
  value: number,
  symbol: string,
  decimals: number = 8
): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${symbol}`;
}

/**
 * 格式化百分比
 * @param value 数值 (0-100 或小数)
 * @param decimals 小数位数
 * @param isDecimal 是否为小数形式 (0.1 = 10%)
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  isDecimal: boolean = false
): string {
  const percentValue = isDecimal ? value * 100 : value;
  const sign = percentValue >= 0 ? '+' : '';
  return `${sign}${percentValue.toFixed(decimals)}%`;
}

/**
 * 格式化大数字 (K, M, B)
 * @param value 数值
 * @param decimals 小数位数
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  }
  return `${sign}${absValue.toFixed(decimals)}`;
}

/**
 * 格式化交易对符号
 * @param symbol 交易对 (如 BTCUSDT)
 * @param separator 分隔符
 */
export function formatSymbol(symbol: string, separator: string = '/'): string {
  // 如果已经包含分隔符，直接返回
  if (symbol.includes(separator) || symbol.includes('/') || symbol.includes('-')) {
    return symbol;
  }

  // 常见的计价货币
  const quoteAssets = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB'];

  for (const quote of quoteAssets) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}${separator}${quote}`;
    }
  }

  return symbol;
}

/**
 * 截断字符串并添加省略号
 * @param str 字符串
 * @param maxLength 最大长度
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * 格式化地址 (如钱包地址、API Key)
 * @param address 地址
 * @param startChars 开头显示字符数
 * @param endChars 结尾显示字符数
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
