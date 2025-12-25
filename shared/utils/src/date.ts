/**
 * 日期时间工具函数
 */

/**
 * 获取当前 ISO 时间戳
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * 格式化日期时间
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = 'zh-CN'
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

/**
 * 格式化相对时间 (例如: "2小时前")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = 'zh-CN'
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return locale === 'zh-CN' ? '刚刚' : 'just now';
  }
  if (diffMinutes < 60) {
    return locale === 'zh-CN' ? `${diffMinutes}分钟前` : `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return locale === 'zh-CN' ? `${diffHours}小时前` : `${diffHours}h ago`;
  }
  if (diffDays < 30) {
    return locale === 'zh-CN' ? `${diffDays}天前` : `${diffDays}d ago`;
  }

  return formatDateTime(d, locale);
}

/**
 * 将时间戳转换为日期
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * 将日期转换为时间戳
 */
export function dateToTimestamp(date: Date): number {
  return date.getTime();
}
