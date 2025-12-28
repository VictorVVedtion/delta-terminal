import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';
import { StrategyRepository } from './repositories/strategy.repository.js';
import { StrategyService } from './services/strategy.service.js';
import { TemplateService } from './services/template.service.js';
import { ExecutionService } from './services/execution.service.js';
import { SpiritDaemon } from './services/spirit/daemon.js';
import { strategyRoutes } from './routes/strategies.js';
import { templateRoutes } from './routes/templates.js';
import { executionRoutes } from './routes/executions.js';
import { spiritRoutes } from './routes/spirit.js';

// 扩展 Fastify 类型以支持 authenticate 方法
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

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
  await fastify.register(helmet as any);
  await fastify.register(cors as any, config.cors);
  await fastify.register(jwt as any, { secret: config.jwt.secret });
  await fastify.register(rateLimit as any, config.rateLimit);
  await fastify.register(websocket as any);

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
  
  // 初始化 Spirit Daemon
  const spiritDaemon = new SpiritDaemon(fastify.log);
  try {
    await spiritDaemon.start();
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start Spirit Daemon');
  }

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

  // Spirit 实时事件路由 (无需认证，用于 WebSocket 连接)
  await fastify.register(spiritRoutes, { prefix: '/api/v1' });

  // 错误处理
  fastify.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  });

  // 优雅关闭
  fastify.addHook('onClose', async () => {
    await spiritDaemon.shutdown();
    await prisma.$disconnect();
  });

  return fastify;
}
