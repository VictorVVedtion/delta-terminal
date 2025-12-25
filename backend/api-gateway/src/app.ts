import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { config } from './config/index.js';
import { registerCors } from './middleware/cors.js';
import { registerRateLimit } from './middleware/rateLimit.js';
import { registerJWT } from './middleware/auth.js';
import { loggerMiddleware } from './middleware/logger.js';
import { registerSwagger } from './plugins/swagger.js';
import { registerRoutes } from './routes/index.js';

/**
 * 创建 Fastify 应用实例
 */
export async function buildApp(): Promise<FastifyInstance> {
  // 创建 Fastify 实例
  const app = Fastify({
    logger: {
      level: config.logging.level,
      transport: config.logging.pretty
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // 注册安全头插件
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // 注册压缩插件
  await app.register(compress, {
    global: true,
    threshold: 1024, // 仅压缩大于 1KB 的响应
  });

  // 注册中间件
  await registerCors(app);
  await registerRateLimit(app);
  await registerJWT(app);

  // 注册全局请求日志
  app.addHook('onRequest', loggerMiddleware);

  // 全局错误处理
  app.setErrorHandler((error, request, reply) => {
    request.log.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      method: request.method,
      url: request.url,
    }, '请求处理错误');

    // 处理验证错误
    if (error.validation) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: '请求参数验证失败',
        details: error.validation,
        timestamp: new Date().toISOString(),
      });
    }

    // 处理未找到错误
    if (error.statusCode === 404) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: '请求的资源不存在',
        timestamp: new Date().toISOString(),
      });
    }

    // 处理限流错误
    if (error.statusCode === 429) {
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: '请求过于频繁,请稍后重试',
        timestamp: new Date().toISOString(),
      });
    }

    // 其他服务器错误
    return reply.code(error.statusCode || 500).send({
      statusCode: error.statusCode || 500,
      error: error.name || 'Internal Server Error',
      message: config.env === 'production'
        ? '服务器内部错误'
        : error.message,
      timestamp: new Date().toISOString(),
    });
  });

  // 处理 404
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `路由 ${request.method} ${request.url} 不存在`,
      timestamp: new Date().toISOString(),
    });
  });

  // 注册 Swagger 文档
  await registerSwagger(app);

  // 注册路由
  await registerRoutes(app);

  // 优雅关闭处理
  const closeListeners: (() => Promise<void>)[] = [];

  app.addHook('onClose', async (instance) => {
    instance.log.info('开始优雅关闭...');

    // 执行所有关闭监听器
    await Promise.all(closeListeners.map(listener => listener()));

    instance.log.info('优雅关闭完成');
  });

  // 添加关闭监听器
  app.decorate('addCloseListener', (listener: () => Promise<void>) => {
    closeListeners.push(listener);
  });

  return app;
}

// 扩展 FastifyInstance 类型
declare module 'fastify' {
  interface FastifyInstance {
    addCloseListener(listener: () => Promise<void>): void;
  }
}
