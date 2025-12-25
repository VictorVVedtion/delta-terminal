import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';
import { HealthCheckResponse } from '../types/index.js';

/**
 * 检查微服务健康状态
 */
async function checkServiceHealth(url: string): Promise<{
  status: 'up' | 'down';
  responseTime?: number;
}> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      status: response.ok ? 'up' : 'down',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * 健康检查路由
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * 简单健康检查
   */
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: '简单健康检查',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy'] },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * 详细健康检查
   */
  app.get(
    '/health/detailed',
    {
      schema: {
        tags: ['Health'],
        description: '详细健康检查,包含所有微服务状态',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'unhealthy'] },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              services: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    responseTime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 并行检查所有微服务健康状态
      const [authHealth, userHealth, strategyHealth, tradingHealth, dataHealth] =
        await Promise.all([
          checkServiceHealth(config.services.auth.url),
          checkServiceHealth(config.services.user.url),
          checkServiceHealth(config.services.strategy.url),
          checkServiceHealth(config.services.trading.url),
          checkServiceHealth(config.services.data.url),
        ]);

      const services = {
        auth: authHealth,
        user: userHealth,
        strategy: strategyHealth,
        trading: tradingHealth,
        data: dataHealth,
      };

      // 判断整体健康状态
      const allServicesUp = Object.values(services).every(
        (service) => service.status === 'up'
      );

      const response: HealthCheckResponse = {
        status: allServicesUp ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services,
      };

      return reply.send(response);
    }
  );

  /**
   * 就绪检查 (Kubernetes readiness probe)
   */
  app.get(
    '/ready',
    {
      schema: {
        tags: ['Health'],
        description: '就绪检查,用于 Kubernetes readiness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 检查关键服务是否可用
      const authHealth = await checkServiceHealth(config.services.auth.url);
      const ready = authHealth.status === 'up';

      if (!ready) {
        return reply.code(503).send({ ready: false });
      }

      return reply.send({ ready: true });
    }
  );

  /**
   * 存活检查 (Kubernetes liveness probe)
   */
  app.get(
    '/live',
    {
      schema: {
        tags: ['Health'],
        description: '存活检查,用于 Kubernetes liveness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              alive: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ alive: true });
    }
  );
}
