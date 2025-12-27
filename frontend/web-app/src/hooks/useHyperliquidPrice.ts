/**
 * Hyperliquid 价格订阅 Hook
 *
 * 提供实时价格数据订阅功能，支持自动刷新和多资产监听
 */

'use client';

import { useCallback, useEffect, useRef,useState } from 'react';

import { getBatchPrices } from '@/lib/hyperliquid';
import type {
  UseHyperliquidPriceOptions,
  UseHyperliquidPriceReturn,
} from '@/types/hyperliquid';

/**
 * 默认配置
 */
const DEFAULT_REFRESH_INTERVAL = 5000; // 5 秒

/**
 * Hyperliquid 价格订阅 Hook
 *
 * @param symbols 要监听的资产符号数组（如 ['BTC', 'ETH']）
 * @param options 配置选项
 * @returns 价格数据和控制方法
 *
 * @example
 * ```tsx
 * const { prices, loading, error } = useHyperliquidPrice(['BTC', 'ETH']);
 *
 * if (loading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error.message}</div>;
 *
 * return (
 *   <div>
 *     <p>BTC: ${prices.get('BTC')?.toFixed(2)}</p>
 *     <p>ETH: ${prices.get('ETH')?.toFixed(2)}</p>
 *   </div>
 * );
 * ```
 */
export function useHyperliquidPrice(
  symbols: string[],
  options: UseHyperliquidPriceOptions = {}
): UseHyperliquidPriceReturn {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    enabled = true,
    onError,
  } = options;

  // 状态管理
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // 使用 ref 避免闭包陷阱
  const symbolsRef = useRef<string[]>(symbols);
  const onErrorRef = useRef(onError);
  const isMountedRef = useRef(true);

  // 更新 refs
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * 获取价格数据
   */
  const fetchPrices = useCallback(async () => {
    if (!symbolsRef.current || symbolsRef.current.length === 0) {
      setError(new Error('未指定要监听的资产'));
      setLoading(false);
      return;
    }

    try {
      const pricesData = await getBatchPrices(symbolsRef.current);

      if (!isMountedRef.current) return;

      setPrices(pricesData);
      setLastUpdate(Date.now());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      // 调用错误回调
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * 手动刷新
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchPrices();
  }, [fetchPrices]);

  /**
   * 设置自动刷新定时器
   */
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // 立即获取一次数据
    void fetchPrices();

    // 设置定时刷新
    const intervalId = setInterval(() => {
      void fetchPrices();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, refreshInterval, fetchPrices]);

  return {
    prices,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}

/**
 * 单个资产价格订阅 Hook
 *
 * @param symbol 资产符号
 * @param options 配置选项
 * @returns 价格和状态
 *
 * @example
 * ```tsx
 * const { price, loading, error } = useSingleAssetPrice('BTC');
 * ```
 */
export function useSingleAssetPrice(
  symbol: string,
  options: UseHyperliquidPriceOptions = {}
) {
  const { prices, loading, error, lastUpdate, refresh } = useHyperliquidPrice(
    [symbol],
    options
  );

  return {
    price: prices.get(symbol) ?? null,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}

/**
 * 格式化价格显示
 */
export function formatPrice(
  price: number | null | undefined,
  options: {
    decimals?: number;
    currency?: string;
    fallback?: string;
  } = {}
): string {
  const { decimals = 2, currency = 'USD', fallback = '--' } = options;

  if (price === null || price === undefined || isNaN(price)) {
    return fallback;
  }

  if (currency === 'USD') {
    return `$${price.toFixed(decimals)}`;
  }

  return price.toFixed(decimals);
}

/**
 * 计算价格变化百分比
 */
export function calculatePriceChange(
  currentPrice: number,
  previousPrice: number
): {
  change: number;
  changePercent: number;
  isPositive: boolean;
} {
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;

  return {
    change,
    changePercent,
    isPositive: change >= 0,
  };
}
