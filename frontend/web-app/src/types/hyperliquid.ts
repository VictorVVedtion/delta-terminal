/**
 * Hyperliquid API 类型定义
 */

/**
 * 所有资产的中间价格响应
 */
export type AllMidsResponse = Record<string, string>;

/**
 * Hyperliquid API 请求类型
 */
export interface HyperliquidRequest {
  type: 'allMids' | 'meta' | 'metaAndAssetCtxs';
  [key: string]: any;
}

/**
 * API 错误响应
 */
export interface HyperliquidError {
  error?: string;
  message?: string;
}

/**
 * 价格数据
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

/**
 * 市场数据缓存
 */
export interface MarketDataCache {
  data: AllMidsResponse;
  timestamp: number;
  expiresAt: number;
}

/**
 * Hook 配置选项
 */
export interface UseHyperliquidPriceOptions {
  /** 刷新间隔（毫秒），默认 5000 */
  refreshInterval?: number;
  /** 是否启用自动刷新，默认 true */
  enabled?: boolean;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * Hook 返回值
 */
export interface UseHyperliquidPriceReturn {
  /** 价格数据映射 */
  prices: Map<string, number>;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 最后更新时间 */
  lastUpdate: number | null;
  /** 手动刷新 */
  refresh: () => Promise<void>;
}
