/**
 * Hyperliquid 价格显示组件示例
 *
 * 展示如何使用 useHyperliquidPrice Hook
 */

'use client';

import { useHyperliquidPrice, formatPrice } from '@/hooks/useHyperliquidPrice';

/**
 * 基础价格显示示例
 */
export function BasicPriceDisplay() {
  const { prices, loading, error, lastUpdate } = useHyperliquidPrice(['BTC', 'ETH']);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
        <p className="text-red-600 text-sm">错误: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <h3 className="text-sm text-gray-500 mb-1">比特币 (BTC)</h3>
        <p className="text-2xl font-bold">
          {formatPrice(prices.get('BTC'), { decimals: 2 })}
        </p>
      </div>

      <div className="p-4 border rounded-lg">
        <h3 className="text-sm text-gray-500 mb-1">以太坊 (ETH)</h3>
        <p className="text-2xl font-bold">
          {formatPrice(prices.get('ETH'), { decimals: 2 })}
        </p>
      </div>

      {lastUpdate && (
        <p className="text-xs text-gray-400">
          最后更新: {new Date(lastUpdate).toLocaleTimeString('zh-CN')}
        </p>
      )}
    </div>
  );
}

/**
 * 带刷新按钮的价格显示
 */
export function PriceDisplayWithRefresh() {
  const { prices, loading, error, refresh } = useHyperliquidPrice(['BTC', 'ETH', 'SOL']);

  return (
    <div className="p-6 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">实时价格</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '刷新中...' : '手动刷新'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['BTC', 'ETH', 'SOL'].map(symbol => (
          <div key={symbol} className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600 mb-1">{symbol}</div>
            <div className="text-xl font-bold">
              {loading ? (
                <span className="text-gray-400">--</span>
              ) : (
                formatPrice(prices.get(symbol))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 自定义刷新间隔示例
 */
export function CustomIntervalPriceDisplay() {
  const { prices, loading, lastUpdate } = useHyperliquidPrice(['BTC', 'ETH'], {
    refreshInterval: 10000, // 10 秒刷新一次
    onError: (error) => {
      console.error('价格获取失败:', error);
      // 可以在这里添加错误上报逻辑
    },
  });

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">BTC/ETH 价格（10秒刷新）</h3>
        {loading && (
          <span className="text-xs text-gray-500 animate-pulse">更新中...</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>BTC:</span>
          <span className="font-mono">{formatPrice(prices.get('BTC'))}</span>
        </div>
        <div className="flex justify-between">
          <span>ETH:</span>
          <span className="font-mono">{formatPrice(prices.get('ETH'))}</span>
        </div>
      </div>

      {lastUpdate && (
        <div className="mt-4 pt-4 border-t text-xs text-gray-400">
          最后更新: {new Date(lastUpdate).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  );
}

/**
 * 禁用自动刷新示例
 */
export function ManualRefreshOnly() {
  const { prices, loading, error, refresh, lastUpdate } = useHyperliquidPrice(
    ['BTC'],
    { enabled: false } // 禁用自动刷新
  );

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">手动刷新模式</h3>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-1">比特币价格</div>
        <div className="text-3xl font-bold">
          {prices.get('BTC') ? formatPrice(prices.get('BTC')) : '--'}
        </div>
      </div>

      <button
        onClick={refresh}
        disabled={loading}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? '获取中...' : '获取最新价格'}
      </button>

      {error && (
        <div className="mt-3 text-sm text-red-600">
          错误: {error.message}
        </div>
      )}

      {lastUpdate && (
        <div className="mt-3 text-xs text-gray-400">
          最后更新: {new Date(lastUpdate).toLocaleTimeString('zh-CN')}
        </div>
      )}
    </div>
  );
}

/**
 * 完整示例页面
 */
export default function HyperliquidPriceExamples() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Hyperliquid 价格显示示例</h1>
        <p className="text-gray-600">
          展示如何使用 useHyperliquidPrice Hook 获取和显示实时价格
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">基础用法</h2>
          <BasicPriceDisplay />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">自定义刷新间隔</h2>
          <CustomIntervalPriceDisplay />
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">带刷新按钮</h2>
          <PriceDisplayWithRefresh />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">手动刷新模式</h2>
          <ManualRefreshOnly />
        </div>
      </div>
    </div>
  );
}
