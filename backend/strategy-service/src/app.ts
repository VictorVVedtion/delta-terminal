import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';
import { StrategyRepository } from './repositories/strategy.repository.js';
import { StrategyService } from './services/strategy.service.js';
import { TemplateService } from './services/template.service.js';
import { ExecutionService } from './services/execution.service.js';
import { strategyRoutes } from './routes/strategies.js';
import { templateRoutes } from './routes/templates.js';
import { executionRoutes } from './routes/executions.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      transport: config.logging.pretty
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  });

  // 数据库连接
  const prisma = new PrismaClient();

  // 注册插件
  await fastify.register(helmet);
  await fastify.register(cors, config.cors);
  await fastify.register(jwt, { secret: config.jwt.secret });
  await fastify.register(rateLimit, config.rateLimit);

  // JWT 认证装饰器
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // 健康检查
  fastify.get('/health', async () => {
    return { status: 'ok', service: config.service.name, version: config.service.version };
  });

  // 初始化服务
  const strategyRepository = new StrategyRepository(prisma);
  const strategyService = new StrategyService(strategyRepository);
  const templateService = new TemplateService(prisma);
  const executionService = new ExecutionService(prisma);

  // 注册路由
  await fastify.register(
    async (instance) => {
      instance.addHook('onRequest', fastify.authenticate as any);
      await strategyRoutes(instance, strategyService);
      await templateRoutes(instance, templateService);
      await executionRoutes(instance, executionService);
    },
    { prefix: '/api/v1' }
  );

  // 错误处理
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  });

  // 优雅关闭
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return fastify;
}
