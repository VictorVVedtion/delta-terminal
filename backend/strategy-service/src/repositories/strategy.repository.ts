// 策略数据仓库层

import { PrismaClient, Strategy, StrategyStatus } from '@prisma/client';
// StrategyType imported from Prisma but used via types/strategy.ts
import type { CreateStrategyRequest, UpdateStrategyRequest, ListStrategiesQuery } from '../types/strategy.js';

export class StrategyRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, data: CreateStrategyRequest): Promise<Strategy> {
    return this.prisma.strategy.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        type: data.type,
        exchange: data.exchange,
        symbol: data.symbol,
        riskLevel: data.riskLevel,
        initialCapital: data.initialCapital,
        currentCapital: data.initialCapital,
        config: data.config as any,
        indicators: data.indicators as any,
        conditions: data.conditions as any,
        actions: data.actions as any,
        templateId: data.templateId,
        autoStart: data.autoStart,
        maxOrders: data.maxOrders,
        orderInterval: data.orderInterval,
        maxDrawdown: data.maxDrawdown,
      },
      include: {
        template: true,
      },
    });
  }

  async findById(id: string): Promise<Strategy | null> {
    return this.prisma.strategy.findUnique({
      where: { id },
      include: {
        template: true,
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findByUserId(userId: string, query: ListStrategiesQuery) {
    const {
      page = 1,
      pageSize = 20,
      status,
      type,
      exchange,
      symbol,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (exchange) where.exchange = exchange;
    if (symbol) where.symbol = symbol;

    const [strategies, total] = await Promise.all([
      this.prisma.strategy.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.strategy.count({ where }),
    ]);

    return { data: strategies, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async update(id: string, data: UpdateStrategyRequest): Promise<Strategy> {
    return this.prisma.strategy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        indicators: data.indicators as any,
        conditions: data.conditions as any,
        actions: data.actions as any,
      },
    });
  }

  async updateStatus(id: string, status: StrategyStatus): Promise<Strategy> {
    return this.prisma.strategy.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<Strategy> {
    return this.prisma.strategy.delete({ where: { id } });
  }

  async generateShareCode(id: string): Promise<Strategy> {
    const shareCode = this.generateRandomCode(8);
    return this.prisma.strategy.update({
      where: { id },
      data: { isPublic: true, shareCode },
    });
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
