import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { proxyRoutes } from './proxy.js';

/**
 * 注册所有路由
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // 根路径欢迎信息
  app.get('/', {
    schema: {
      tags: ['General'],
      description: 'API 网关欢迎页面',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            documentation: { type: 'string' },
            health: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({
      name: 'Delta Terminal API Gateway',
      version: '1.0.0',
      description: 'AI 交易终端 API 网关服务',
      documentation: '/docs',
      health: '/health',
    });
  });

  // 注册健康检查路由
  await app.register(healthRoutes);

  // 注册代理路由
  await app.register(proxyRoutes);

  app.log.info('所有路由已注册');
}
