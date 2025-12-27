/**
 * Hyperliquid API 客户端测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPriceCache,
  getAllMidPrices,
  getAssetPrice,
  getBatchPrices,
  validateConnection,
} from '../hyperliquid';

// Mock global fetch
global.fetch = vi.fn();

describe('Hyperliquid API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPriceCache();
  });

  describe('getAllMidPrices', () => {
    it('应该成功获取所有价格', async () => {
      const mockResponse = {
        BTC: '45000.50',
        ETH: '3000.25',
        SOL: '100.75',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getAllMidPrices();

      expect(prices).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.hyperliquid.xyz/info',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'allMids' }),
        })
      );
    });

    it('应该使用缓存数据', async () => {
      const mockResponse = {
        BTC: '45000.50',
        ETH: '3000.25',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // 第一次调用
      await getAllMidPrices();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 第二次调用应该使用缓存
      await getAllMidPrices();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该处理 API 错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      await expect(getAllMidPrices()).rejects.toThrow();
    });

    it('应该在重试后成功', async () => {
      const mockResponse = {
        BTC: '45000.50',
      };

      // 前两次失败，第三次成功
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const prices = await getAllMidPrices();
      expect(prices).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getAssetPrice', () => {
    it('应该获取单个资产价格', async () => {
      const mockResponse = {
        BTC: '45000.50',
        ETH: '3000.25',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const btcPrice = await getAssetPrice('BTC');

      expect(btcPrice).toEqual({
        symbol: 'BTC',
        price: 45000.5,
        timestamp: expect.any(Number),
      });
    });

    it('应该返回 null 当资产不存在时', async () => {
      const mockResponse = {
        BTC: '45000.50',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await getAssetPrice('INVALID');
      expect(price).toBeNull();
    });

    it('应该处理无效的价格格式', async () => {
      const mockResponse = {
        BTC: 'invalid',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await getAssetPrice('BTC');
      expect(price).toBeNull();
    });
  });

  describe('getBatchPrices', () => {
    it('应该批量获取多个资产价格', async () => {
      const mockResponse = {
        BTC: '45000.50',
        ETH: '3000.25',
        SOL: '100.75',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getBatchPrices(['BTC', 'ETH', 'SOL']);

      expect(prices.size).toBe(3);
      expect(prices.get('BTC')).toBe(45000.5);
      expect(prices.get('ETH')).toBe(3000.25);
      expect(prices.get('SOL')).toBe(100.75);
    });

    it('应该忽略不存在的资产', async () => {
      const mockResponse = {
        BTC: '45000.50',
        ETH: '3000.25',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getBatchPrices(['BTC', 'ETH', 'INVALID']);

      expect(prices.size).toBe(2);
      expect(prices.has('INVALID')).toBe(false);
    });

    it('应该处理空数组', async () => {
      const mockResponse = {};

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await getBatchPrices([]);
      expect(prices.size).toBe(0);
    });
  });

  describe('validateConnection', () => {
    it('应该验证连接成功', async () => {
      const mockResponse = {
        BTC: '45000.50',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isValid = await validateConnection();
      expect(isValid).toBe(true);
    });

    it('应该在连接失败时返回 false', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const isValid = await validateConnection();
      expect(isValid).toBe(false);
    });

    it('应该在空响应时返回 false', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const isValid = await validateConnection();
      expect(isValid).toBe(false);
    });
  });
});
