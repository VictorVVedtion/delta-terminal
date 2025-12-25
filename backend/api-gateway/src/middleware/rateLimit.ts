import { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from '../config/index.js';

/**
 * 注册限流插件
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    cache: 10000, // 缓存最多 10000 个 IP
    allowList: ['127.0.0.1'], // 白名单
    redis: undefined, // 生产环境可配置 Redis
    skipOnError: true, // 出错时跳过限流
    keyGenerator: (request) => {
      // 使用 IP 地址作为限流键
      return request.ip;
    },
    errorResponseBuilder: (request, context) => {
      const seconds = Math.ceil(context.ttl / 1000);
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `请求过于频繁,请在 ${seconds} 秒后重试`,
        retryAfter: context.ttl,
      };
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  app.log.info({
    max: config.rateLimit.max,
    timeWindow: `${config.rateLimit.timeWindow}ms`,
  }, '限流中间件已注册');
}

/**
 * 为特定路由设置自定义限流
 */
export const createCustomRateLimit = (max: number, timeWindow: number) => {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow,
      },
    },
  };
};
