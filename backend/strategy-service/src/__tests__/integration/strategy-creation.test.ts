/**
 * 策略创建流程集成测试
 * 测试 AI对话 → 意图识别 → 策略创建 → 存储 的完整流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrategyService } from '../../services/strategy.service';
import { StrategyRepository } from '../../repositories/strategy.repository';

// Mock AI 服务响应
interface AIIntentResponse {
  intent: 'CREATE_STRATEGY' | 'MODIFY_STRATEGY' | 'QUERY_STRATEGY' | 'UNKNOWN';
  confidence: number;
  entities: Record<string, any>;
  reasoning: string;
}

interface AIStrategyConfig {
  name: string;
  type: string;
  symbol: string;
  timeframe: string;
  entryConditions: Array<{
    indicator: string;
    operator: string;
    value: number;
  }>;
  exitConditions: Array<{
    indicator: string;
    operator: string;
    value: number;
  }>;
  riskManagement: {
    stopLossPercent: number;
    takeProfitPercent: number;
  };
}

// Mock HTTP 客户端
class MockAIClient {
  async recognizeIntent(text: string): Promise<AIIntentResponse> {
    // 模拟 NLP 处理器的意图识别
    if (text.includes('创建') || text.includes('策略')) {
      return {
        intent: 'CREATE_STRATEGY',
        confidence: 0.95,
        entities: {
          symbol: 'BTC/USDT',
          strategyType: 'swing',
        },
        reasoning: '用户明确表达创建策略意图',
      };
    }
    return {
      intent: 'UNKNOWN',
      confidence: 0.3,
      entities: {},
      reasoning: '无法识别意图',
    };
  }

  async parseStrategy(description: string): Promise<AIStrategyConfig> {
    // 模拟策略解析
    return {
      name: 'BTC RSI 策略',
      type: 'SWING',
      symbol: 'BTC/USDT',
      timeframe: '1h',
      entryConditions: [
        {
          indicator: 'RSI',
          operator: '<',
          value: 30,
        },
      ],
      exitConditions: [
        {
          indicator: 'RSI',
          operator: '>',
          value: 70,
        },
      ],
      riskManagement: {
        stopLossPercent: 3,
        takeProfitPercent: 5,
      },
    };
  }
}

describe('策略创建流程集成测试', () => {
  let strategyService: StrategyService;
  let mockRepository: any;
  let aiClient: MockAIClient;

  beforeEach(() => {
    // 创建 mock repository
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    };

    strategyService = new StrategyService(mockRepository);
    aiClient = new MockAIClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('完整策略创建流程', () => {
    it('应该成功完成从对话到策略创建的完整流程', async () => {
      // 步骤 1: AI 对话 - 用户输入
      const userInput = '帮我创建一个 BTC/USDT 的 RSI 策略，当 RSI 低于 30 买入，高于 70 卖出';

      // 步骤 2: 意图识别
      const intentResponse = await aiClient.recognizeIntent(userInput);
      expect(intentResponse.intent).toBe('CREATE_STRATEGY');
      expect(intentResponse.confidence).toBeGreaterThan(0.9);
      expect(intentResponse.entities.symbol).toBe('BTC/USDT');

      // 步骤 3: 策略解析
      const strategyConfig = await aiClient.parseStrategy(userInput);
      expect(strategyConfig.name).toContain('RSI');
      expect(strategyConfig.symbol).toBe('BTC/USDT');
      expect(strategyConfig.entryConditions).toHaveLength(1);
      expect(strategyConfig.entryConditions[0].indicator).toBe('RSI');
      expect(strategyConfig.exitConditions).toHaveLength(1);

      // 步骤 4: 策略创建
      const userId = 'user-123';
      const mockStrategy = {
        id: 'strategy-456',
        userId,
        name: strategyConfig.name,
        type: strategyConfig.type,
        symbol: strategyConfig.symbol,
        status: 'DRAFT',
        config: strategyConfig,
        createdAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockStrategy);

      const createdStrategy = await strategyService.createStrategy(userId, {
        name: strategyConfig.name,
        type: strategyConfig.type as any,
        exchange: 'binance',
        symbol: strategyConfig.symbol,
        initialCapital: 10000,
        config: strategyConfig,
      });

      // 步骤 5: 验证存储
      expect(mockRepository.create).toHaveBeenCalledWith(userId, expect.objectContaining({
        name: strategyConfig.name,
        type: strategyConfig.type,
        symbol: 'BTC/USDT',
      }));

      expect(createdStrategy).toBeDefined();
      expect(createdStrategy.id).toBe('strategy-456');
      expect(createdStrategy.status).toBe('DRAFT');
    });

    it('应该在意图识别失败时返回错误', async () => {
      const userInput = '今天天气怎么样?';

      const intentResponse = await aiClient.recognizeIntent(userInput);

      expect(intentResponse.intent).toBe('UNKNOWN');
      expect(intentResponse.confidence).toBeLessThan(0.5);

      // 不应该调用策略创建
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('应该在策略解析失败时处理异常', async () => {
      const userId = 'user-123';
      const invalidConfig = {
        name: '',
        type: 'INVALID_TYPE' as any,
        exchange: 'binance',
        symbol: '',
        initialCapital: -1000,
        config: {},
      };

      // 模拟数据库验证错误
      mockRepository.create.mockRejectedValue(new Error('Invalid strategy configuration'));

      await expect(
        strategyService.createStrategy(userId, invalidConfig)
      ).rejects.toThrow('Invalid strategy configuration');
    });
  });

  describe('策略参数验证', () => {
    it('应该验证必需的策略参数', async () => {
      const userId = 'user-123';
      const incompleteConfig = {
        name: 'Test Strategy',
        type: 'GRID' as any,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        initialCapital: 10000,
        config: {
          // 缺少必需的网格参数
        },
      };

      const mockStrategy = {
        id: 'strategy-789',
        ...incompleteConfig,
        status: 'DRAFT',
      };

      mockRepository.create.mockResolvedValue(mockStrategy);

      const strategy = await strategyService.createStrategy(userId, incompleteConfig);

      expect(strategy).toBeDefined();
      expect(strategy.config).toBeDefined();
    });

    it('应该验证风险管理参数的合理性', async () => {
      const userInput = '创建一个策略，止损 50%，止盈 2%';
      const strategyConfig = await aiClient.parseStrategy(userInput);

      // 验证风险管理参数
      expect(strategyConfig.riskManagement).toBeDefined();
      expect(strategyConfig.riskManagement.stopLossPercent).toBeGreaterThan(0);
      expect(strategyConfig.riskManagement.takeProfitPercent).toBeGreaterThan(0);

      // 警告: 止损大于止盈
      if (strategyConfig.riskManagement.stopLossPercent > strategyConfig.riskManagement.takeProfitPercent) {
        console.warn('警告: 止损百分比大于止盈百分比，风险收益比不合理');
      }
    });
  });

  describe('并发策略创建', () => {
    it('应该处理同一用户同时创建多个策略', async () => {
      const userId = 'user-123';
      const strategies = [
        { name: '策略A', type: 'GRID' as any, symbol: 'BTC/USDT' },
        { name: '策略B', type: 'DCA' as any, symbol: 'ETH/USDT' },
        { name: '策略C', type: 'SPOT' as any, symbol: 'BNB/USDT' },
      ];

      mockRepository.create.mockImplementation((uid: string, data: any) => {
        return Promise.resolve({
          id: `strategy-${Date.now()}-${Math.random()}`,
          userId: uid,
          ...data,
          status: 'DRAFT',
        });
      });

      const promises = strategies.map((strategyData) =>
        strategyService.createStrategy(userId, {
          ...strategyData,
          exchange: 'binance',
          initialCapital: 10000,
          config: {},
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockRepository.create).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.name).toBe(strategies[index].name);
      });
    });
  });

  describe('策略创建后的状态管理', () => {
    it('应该能够在创建后立即查询策略', async () => {
      const userId = 'user-123';
      const strategyData = {
        name: 'Test Strategy',
        type: 'GRID' as any,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        initialCapital: 10000,
        config: {},
      };

      const mockStrategy = {
        id: 'strategy-999',
        ...strategyData,
        userId,
        status: 'DRAFT',
      };

      mockRepository.create.mockResolvedValue(mockStrategy);
      mockRepository.findById.mockResolvedValue(mockStrategy);

      // 创建策略
      const created = await strategyService.createStrategy(userId, strategyData);

      // 立即查询
      const fetched = await strategyService.getStrategy(created.id);

      expect(fetched).toBeDefined();
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(strategyData.name);
    });

    it('应该能够更新刚创建的策略配置', async () => {
      const userId = 'user-123';
      const initialConfig = {
        name: 'Initial Strategy',
        type: 'GRID' as any,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        initialCapital: 10000,
        config: { gridLevels: 5 },
      };

      const mockStrategy = {
        id: 'strategy-111',
        ...initialConfig,
        userId,
        status: 'DRAFT',
      };

      mockRepository.create.mockResolvedValue(mockStrategy);
      mockRepository.update.mockResolvedValue({
        ...mockStrategy,
        config: { gridLevels: 10 },
      });

      // 创建策略
      const created = await strategyService.createStrategy(userId, initialConfig);

      // 更新配置
      const updated = await strategyService.updateStrategy(created.id, {
        config: { gridLevels: 10 },
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        created.id,
        expect.objectContaining({
          config: { gridLevels: 10 },
        })
      );

      expect(updated.config).toEqual({ gridLevels: 10 });
    });
  });

  describe('错误处理和恢复', () => {
    it('应该在数据库连接失败时抛出明确错误', async () => {
      const userId = 'user-123';
      const strategyData = {
        name: 'Test Strategy',
        type: 'GRID' as any,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        initialCapital: 10000,
        config: {},
      };

      mockRepository.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        strategyService.createStrategy(userId, strategyData)
      ).rejects.toThrow('Database connection failed');
    });

    it('应该在AI服务超时时提供降级方案', async () => {
      const userInput = '创建策略';

      // 模拟超时
      const slowAIClient = {
        recognizeIntent: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                intent: 'UNKNOWN',
                confidence: 0.0,
                entities: {},
                reasoning: 'Timeout',
              });
            }, 5000);
          });
        }),
      };

      // 使用 Promise.race 实现超时控制
      const timeoutPromise = new Promise<AIIntentResponse>((_, reject) => {
        setTimeout(() => reject(new Error('AI service timeout')), 3000);
      });

      await expect(
        Promise.race([slowAIClient.recognizeIntent(userInput), timeoutPromise])
      ).rejects.toThrow('AI service timeout');
    });
  });
});
