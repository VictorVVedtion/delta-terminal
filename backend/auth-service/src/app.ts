/**
 * Fastify 应用配置
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { config } from './config/index.js';
import { authRoutes } from './routes/auth.js';
import { AuthError } from './types/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  // 创建 Fastify 实例
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
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
    trustProxy: true,
    disableRequestLogging: process.env.NODE_ENV === 'production',
  });

  // ========== 注册插件 ==========

  // 安全头
  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // CORS
  await app.register(cors as any, {
    origin: config.cors.origin,
    credentials: true,
  });

  // 速率限制
  await app.register(rateLimit as any, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      error: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
    }),
  });

  // JWT
  await app.register(jwt as any, {
    secret: config.jwtSecret,
    sign: {
      algorithm: 'HS256',
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  // ========== 数据库连接 ==========

  const db = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // 测试数据库连接
  try {
    await db.query('SELECT NOW()');
    app.log.info('✅ 数据库连接成功');
  } catch (err) {
    app.log.error({ err }, '❌ 数据库连接失败');
    throw err;
  }

  // ========== Redis 连接 ==========

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  // 测试 Redis 连接
  redis.on('connect', () => {
    app.log.info('✅ Redis 连接成功');
  });

  redis.on('error', (err) => {
    app.log.error({ err }, '❌ Redis 连接错误');
  });

  // ========== 注册路由 ==========

  await app.register(authRoutes, { prefix: '/auth', db, redis });

  // ========== 错误处理 ==========

  app.setErrorHandler((error: FastifyError, request, reply) => {
    // 自定义认证错误
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({
        error: error.code || 'AUTH_ERROR',
        message: error.message,
      });
    }

    // JWT 错误
    if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: '未授权访问',
      });
    }

    // 速率限制错误
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
      });
    }

    // 验证错误
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: '请求数据验证失败',
        details: error.validation,
      });
    }

    // 数据库错误
    if (error.code === '23505') {
      // 唯一约束冲突
      return reply.status(400).send({
        error: 'DUPLICATE_ENTRY',
        message: '数据已存在',
      });
    }

    // 记录错误
    request.log.error(error);

    // 生产环境隐藏详细错误信息
    if (process.env.NODE_ENV === 'production') {
      return reply.status(error.statusCode || 500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误',
      });
    }

    // 开发环境返回详细错误
    return reply.status(error.statusCode || 500).send({
      error: error.name || 'INTERNAL_SERVER_ERROR',
      message: error.message,
      stack: error.stack,
    });
  });

  // ========== 优雅关闭 ==========

  const closeGracefully = async (signal: string) => {
    app.log.info(`收到 ${signal} 信号，准备关闭服务器...`);

    try {
      await db.end();
      app.log.info('✅ 数据库连接已关闭');

      await redis.quit();
      app.log.info('✅ Redis 连接已关闭');

      await app.close();
      app.log.info('✅ 服务器已关闭');

      process.exit(0);
    } catch (err) {
      app.log.error({ err }, '❌ 关闭过程中发生错误');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  process.on('SIGINT', () => closeGracefully('SIGINT'));

  return app;
}
