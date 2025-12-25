import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategyService } from '../services/strategy.service';
import { StrategyRepository } from '../repositories/strategy.repository';

describe('StrategyService', () => {
  let service: StrategyService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    };
    service = new StrategyService(mockRepository);
  });

  describe('createStrategy', () => {
    it('should create a strategy', async () => {
      const userId = 'user-123';
      const strategyData = {
        name: 'Test Strategy',
        type: 'GRID' as any,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        initialCapital: 10000,
        config: {},
      };

      const mockStrategy = { id: 'strategy-123', ...strategyData };
      mockRepository.create.mockResolvedValue(mockStrategy);

      const result = await service.createStrategy(userId, strategyData);

      expect(mockRepository.create).toHaveBeenCalledWith(userId, strategyData);
      expect(result).toEqual(mockStrategy);
    });
  });

  describe('getStrategy', () => {
    it('should get a strategy by id', async () => {
      const strategyId = 'strategy-123';
      const mockStrategy = { id: strategyId, name: 'Test Strategy' };
      mockRepository.findById.mockResolvedValue(mockStrategy);

      const result = await service.getStrategy(strategyId);

      expect(mockRepository.findById).toHaveBeenCalledWith(strategyId);
      expect(result).toEqual(mockStrategy);
    });
  });

  describe('startStrategy', () => {
    it('should start a strategy', async () => {
      const strategyId = 'strategy-123';
      const mockStrategy = { id: strategyId, status: 'ACTIVE' };
      mockRepository.updateStatus.mockResolvedValue(mockStrategy);

      const result = await service.startStrategy(strategyId);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(strategyId, 'ACTIVE');
      expect(result.status).toBe('ACTIVE');
    });
  });
});
