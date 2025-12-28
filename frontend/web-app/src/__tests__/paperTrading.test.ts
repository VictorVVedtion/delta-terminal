/**
 * Paper Trading Unit Tests
 * Story 2: 虚拟账户与模拟订单系统
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { act,renderHook } from '@testing-library/react'

import { usePaperTrading } from '@/hooks/usePaperTrading'
import { usePaperTradingStore } from '@/store/paperTrading'

describe('Paper Trading System', () => {
  beforeEach(() => {
    // 重置 Store
    const { reset } = usePaperTradingStore.getState()
    reset()
  })

  describe('Account Management', () => {
    it('should initialize account with initial capital', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        const accountId = result.current.initAccount('agent_test', 10000)
        expect(accountId).toBeDefined()
      })

      expect(result.current.account).toBeDefined()
      expect(result.current.account?.initialCapital).toBe(10000)
      expect(result.current.account?.currentBalance).toBe(10000)
      expect(result.current.account?.positions).toHaveLength(0)
      expect(result.current.account?.trades).toHaveLength(0)
    })

    it('should calculate correct account stats', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      const stats = result.current.stats
      expect(stats).toBeDefined()
      expect(stats?.totalEquity).toBe(10000)
      expect(stats?.totalPnl).toBe(0)
      expect(stats?.totalPnlPercent).toBe(0)
    })
  })

  describe('Trading Operations', () => {
    it('should execute buy order successfully', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      act(() => {
        const buyResult = result.current.buy('BTC/USDT', 0.1, 50000)
        expect(buyResult.success).toBe(true)
        expect(buyResult.trade).toBeDefined()
      })

      // 检查持仓
      expect(result.current.account?.positions).toHaveLength(1)
      const position = result.current.account?.positions[0]
      expect(position?.symbol).toBe('BTC/USDT')
      expect(position?.side).toBe('long')
      expect(position?.size).toBe(0.1)
      expect(position?.entryPrice).toBe(50000)

      // 检查余额 (10000 - 5000 - 5)
      const expectedBalance = 10000 - (0.1 * 50000) - (0.1 * 50000 * 0.001)
      expect(result.current.account?.currentBalance).toBeCloseTo(expectedBalance, 2)
    })

    it('should execute sell order successfully', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
      })

      act(() => {
        const sellResult = result.current.sell('BTC/USDT', 0.1, 51000)
        expect(sellResult.success).toBe(true)
        expect(sellResult.trade?.realizedPnl).toBeGreaterThan(0)
      })

      // 持仓应该被平仓
      expect(result.current.account?.positions).toHaveLength(0)

      // 检查余额增加 (考虑盈利和手续费)
      expect(result.current.account?.currentBalance).toBeGreaterThan(10000)
    })

    it('should reject buy order when insufficient balance', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 100)
      })

      act(() => {
        const buyResult = result.current.buy('BTC/USDT', 0.1, 50000)
        expect(buyResult.success).toBe(false)
        expect(buyResult.error).toBe('余额不足')
      })
    })

    it('should reject sell order when insufficient position', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      act(() => {
        const sellResult = result.current.sell('BTC/USDT', 0.1, 50000)
        expect(sellResult.success).toBe(false)
        expect(sellResult.error).toBe('持仓不足')
      })
    })

    it('should reject order below minimum value', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      act(() => {
        const buyResult = result.current.buy('BTC/USDT', 0.0001, 50000)
        expect(buyResult.success).toBe(false)
        expect(buyResult.error).toContain('订单金额不足')
      })
    })
  })

  describe('Position Updates', () => {
    it('should update position price and unrealized PnL', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
      })

      act(() => {
        result.current.updatePrice('BTC/USDT', 51000)
      })

      const position = result.current.getPositionBySymbol('BTC/USDT')
      expect(position?.currentPrice).toBe(51000)

      // 未实现盈亏 = (51000 - 50000) * 0.1 = 100
      expect(position?.unrealizedPnl).toBeCloseTo(100, 2)

      // 盈亏百分比 = 100 / (50000 * 0.1) * 100 = 2%
      expect(position?.unrealizedPnlPercent).toBeCloseTo(2, 2)
    })

    it('should calculate negative unrealized PnL correctly', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
      })

      act(() => {
        result.current.updatePrice('BTC/USDT', 49000)
      })

      const position = result.current.getPositionBySymbol('BTC/USDT')

      // 未实现盈亏 = (49000 - 50000) * 0.1 = -100
      expect(position?.unrealizedPnl).toBeCloseTo(-100, 2)

      // 盈亏百分比 = -100 / (50000 * 0.1) * 100 = -2%
      expect(position?.unrealizedPnlPercent).toBeCloseTo(-2, 2)
    })
  })

  describe('Statistics Calculation', () => {
    it('should calculate win rate correctly', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)

        // 盈利交易
        result.current.buy('BTC/USDT', 0.1, 50000)
        result.current.sell('BTC/USDT', 0.1, 51000)

        // 亏损交易
        result.current.buy('BTC/USDT', 0.1, 51000)
        result.current.sell('BTC/USDT', 0.1, 50000)

        // 盈利交易
        result.current.buy('BTC/USDT', 0.1, 50000)
        result.current.sell('BTC/USDT', 0.1, 52000)
      })

      const stats = result.current.stats
      expect(stats?.totalTrades).toBe(3)
      expect(stats?.winTrades).toBe(2)
      expect(stats?.lossTrades).toBe(1)
      expect(stats?.winRate).toBeCloseTo(66.67, 1)
    })

    it('should calculate total PnL correctly', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
        result.current.sell('BTC/USDT', 0.1, 51000)
      })

      const stats = result.current.stats

      // 买入: -5000 - 5 (手续费)
      // 卖出: +5100 - 5.1 (手续费)
      // 盈利: 5100 - 5.1 - 5000 - 5 = 89.9
      expect(stats?.realizedPnl).toBeCloseTo(89.9, 1)
    })

    it('should calculate fees correctly', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
        result.current.sell('BTC/USDT', 0.1, 50000)
      })

      const stats = result.current.stats

      // 买入手续费: 5000 * 0.001 = 5
      // 卖出手续费: 5000 * 0.001 = 5
      // 总手续费: 10
      expect(stats?.totalFees).toBeCloseTo(10, 2)
    })
  })

  describe('Helper Functions', () => {
    it('should check if can buy', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      const check = result.current.canBuy('BTC/USDT', 0.1, 50000)
      expect(check.can).toBe(true)

      const checkInsufficient = result.current.canBuy('BTC/USDT', 1, 50000)
      expect(checkInsufficient.can).toBe(false)
      expect(checkInsufficient.reason).toBe('余额不足')
    })

    it('should check if can sell', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
        result.current.buy('BTC/USDT', 0.1, 50000)
      })

      const check = result.current.canSell('BTC/USDT', 0.1)
      expect(check.can).toBe(true)

      const checkInsufficient = result.current.canSell('BTC/USDT', 1)
      expect(checkInsufficient.can).toBe(false)
      expect(checkInsufficient.reason).toBe('持仓不足')
    })

    it('should check if has position', () => {
      const { result } = renderHook(() => usePaperTrading())

      act(() => {
        result.current.initAccount('agent_test', 10000)
      })

      expect(result.current.hasPosition('BTC/USDT')).toBe(false)

      act(() => {
        result.current.buy('BTC/USDT', 0.1, 50000)
      })

      expect(result.current.hasPosition('BTC/USDT')).toBe(true)
    })
  })
})
