import { PrismaClient, StrategyTemplate } from '@prisma/client';
import type { CreateTemplateRequest, ListTemplatesQuery } from '../types/strategy.js';

export class TemplateService {
  constructor(private prisma: PrismaClient) {}

  async createTemplate(userId: string, data: CreateTemplateRequest): Promise<StrategyTemplate> {
    return this.prisma.strategyTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        type: data.type,
        riskLevel: data.riskLevel,
        config: data.config as any,
        indicators: data.indicators as any,
        conditions: data.conditions as any,
        actions: data.actions as any,
        author: userId,
        isPublic: data.isPublic ?? true,
        tags: data.tags || [],
        expectedReturn: data.expectedReturn,
        expectedWinRate: data.expectedWinRate,
        minCapital: data.minCapital,
      },
    });
  }

  async getTemplate(id: string) {
    return this.prisma.strategyTemplate.findUnique({
      where: { id },
    });
  }

  async listTemplates(query: ListTemplatesQuery) {
    const { page = 1, pageSize = 20, category, type, isOfficial, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = { isPublic: true };
    if (category) where.category = category;
    if (type) where.type = type;
    if (isOfficial !== undefined) where.isOfficial = isOfficial;

    const [templates, total] = await Promise.all([
      this.prisma.strategyTemplate.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.strategyTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async deleteTemplate(id: string) {
    return this.prisma.strategyTemplate.delete({ where: { id } });
  }
}
