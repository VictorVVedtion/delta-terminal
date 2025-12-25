import { PrismaClient, StrategyExecution, ExecutionStatus } from '@prisma/client';
import type { ExecuteStrategyRequest, ListExecutionsQuery } from '../types/strategy.js';

export class ExecutionService {
  constructor(private prisma: PrismaClient) {}

  async createExecution(data: ExecuteStrategyRequest): Promise<StrategyExecution> {
    return this.prisma.strategyExecution.create({
      data: {
        strategyId: data.strategyId,
        executionType: data.executionType,
        side: data.side,
        type: data.type,
        amount: data.amount,
        price: data.price,
        total: data.price ? data.price * data.amount : 0,
        exchange: '',
        symbol: '',
        status: ExecutionStatus.PENDING,
        signalData: data.signalData as any,
      },
    });
  }

  async getExecution(id: string) {
    return this.prisma.strategyExecution.findUnique({
      where: { id },
      include: {
        strategy: true,
      },
    });
  }

  async listExecutions(query: ListExecutionsQuery) {
    const {
      page = 1,
      pageSize = 20,
      strategyId,
      status,
      exchange,
      symbol,
      startDate,
      endDate,
    } = query;

    const where: any = {};
    if (strategyId) where.strategyId = strategyId;
    if (status) where.status = status;
    if (exchange) where.exchange = exchange;
    if (symbol) where.symbol = symbol;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [executions, total] = await Promise.all([
      this.prisma.strategyExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          strategy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.strategyExecution.count({ where }),
    ]);

    return {
      data: executions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async updateExecutionStatus(id: string, status: ExecutionStatus, data?: any) {
    return this.prisma.strategyExecution.update({
      where: { id },
      data: {
        status,
        ...data,
        completedAt: status === ExecutionStatus.SUCCESS || status === ExecutionStatus.FAILED ? new Date() : undefined,
      },
    });
  }
}
