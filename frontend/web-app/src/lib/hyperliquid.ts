/**
 * Hyperliquid API 客户端
 *
 * 提供与 Hyperliquid 交易所的数据连接功能
 */

import type {
  AllMidsResponse,
  HyperliquidError,
  HyperliquidRequest,
  MarketDataCache,
  PriceData,
} from '@/types/hyperliquid';

/**
 * Hyperliquid API 配置
 */
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info';
const DEFAULT_TIMEOUT = 10000; // 10 秒
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 秒
const CACHE_TTL = 3000; // 缓存 3 秒

/**
 * 市场数据缓存
 */
let marketDataCache: MarketDataCache | null = null;

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 执行 HTTP 请求（带超时）
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

/**
 * 执行 Hyperliquid API 请求（带重试）
 */
async function requestWithRetry<T>(
  request: HyperliquidRequest,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        HYPERLIQUID_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as HyperliquidError;
        throw new Error(
          errorData.error ||
          errorData.message ||
          `API 请求失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // 检查是否是错误响应
      if (data && typeof data === 'object' && ('error' in data || 'message' in data)) {
        const errorData = data as HyperliquidError;
        throw new Error(errorData.error || errorData.message || '未知 API 错误');
      }

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === retries) {
        break;
      }

      // 等待后重试
      await delay(RETRY_DELAY * (attempt + 1));
      console.warn(`Hyperliquid API 请求失败，正在重试 (${attempt + 1}/${retries})...`, lastError.message);
    }
  }

  throw new Error(`Hyperliquid API 请求失败（已重试 ${retries} 次）: ${lastError?.message}`);
}

/**
 * 获取所有资产的中间价格
 *
 * @returns 所有资产的价格映射
 */
export async function getAllMidPrices(): Promise<AllMidsResponse> {
  // 检查缓存
  const now = Date.now();
  if (marketDataCache && marketDataCache.expiresAt > now) {
    return marketDataCache.data;
  }

  try {
    const data = await requestWithRetry<AllMidsResponse>({
      type: 'allMids',
    });

    // 更新缓存
    marketDataCache = {
      data,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    };

    return data;
  } catch (error) {
    // 如果有缓存数据，即使过期也返回（降级策略）
    if (marketDataCache) {
      console.warn('使用过期缓存数据作为降级方案');
      return marketDataCache.data;
    }
    throw error;
  }
}

/**
 * 获取单个资产的价格
 *
 * @param symbol 资产符号（如 'BTC', 'ETH'）
 * @returns 价格数据，如果资产不存在返回 null
 */
export async function getAssetPrice(symbol: string): Promise<PriceData | null> {
  try {
    const allPrices = await getAllMidPrices();
    const priceStr = allPrices[symbol];

    if (!priceStr) {
      console.warn(`未找到资产 ${symbol} 的价格数据`);
      return null;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      console.error(`无法解析 ${symbol} 的价格: ${priceStr}`);
      return null;
    }

    return {
      symbol,
      price,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`获取 ${symbol} 价格失败:`, error);
    throw error;
  }
}

/**
 * 批量获取多个资产的价格
 *
 * @param symbols 资产符号数组
 * @returns 价格数据映射（symbol -> price）
 */
export async function getBatchPrices(symbols: string[]): Promise<Map<string, number>> {
  try {
    const allPrices = await getAllMidPrices();
    const result = new Map<string, number>();

    for (const symbol of symbols) {
      const priceStr = allPrices[symbol];
      if (priceStr) {
        const price = parseFloat(priceStr);
        if (!isNaN(price)) {
          result.set(symbol, price);
        } else {
          console.warn(`无法解析 ${symbol} 的价格: ${priceStr}`);
        }
      } else {
        console.warn(`未找到资产 ${symbol} 的价格数据`);
      }
    }

    return result;
  } catch (error) {
    console.error('批量获取价格失败:', error);
    throw error;
  }
}

/**
 * 清除价格缓存
 */
export function clearPriceCache(): void {
  marketDataCache = null;
}

/**
 * 验证 Hyperliquid API 连接
 *
 * @returns 连接是否正常
 */
export async function validateConnection(): Promise<boolean> {
  try {
    const prices = await getAllMidPrices();
    return Object.keys(prices).length > 0;
  } catch (error) {
    console.error('Hyperliquid 连接验证失败:', error);
    return false;
  }
}
