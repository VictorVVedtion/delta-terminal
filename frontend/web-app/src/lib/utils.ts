import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化数字为货币显示
 */
export function formatCurrency(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * 格式化价格变化
 */
export function formatPriceChange(value: number): { formatted: string; isPositive: boolean } {
  return {
    formatted: formatPercentage(value),
    isPositive: value >= 0,
  }
}

/**
 * 计算价格变化百分比
 */
export function calculatePriceChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number, includeTime = true): string {
  const date = new Date(timestamp)
  if (includeTime) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * 验证交易对格式
 */
export function isValidTradingPair(pair: string): boolean {
  return /^[A-Z]{2,10}\/[A-Z]{2,10}$/.test(pair)
}

/**
 * 截断长文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
