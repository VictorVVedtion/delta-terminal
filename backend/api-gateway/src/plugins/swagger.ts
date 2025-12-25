import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

/**
 * 注册 Swagger 文档插件
 */
export async function registerSwagger(app: FastifyInstance): Promise<void> {
  // 注册 Swagger 规范生成器
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Delta Terminal API Gateway',
        description: 'Delta Terminal AI 交易终端 API 网关文档',
        version: '1.0.0',
        contact: {
          name: 'Delta Terminal Team',
          email: 'support@delta-terminal.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: '本地开发环境',
        },
        {
          url: 'https://api.delta-terminal.com',
          description: '生产环境',
        },
      ],
      tags: [
        { name: 'Health', description: '健康检查相关接口' },
        { name: 'Auth', description: '认证授权相关接口' },
        { name: 'User', description: '用户管理相关接口' },
        { name: 'Strategy', description: '策略管理相关接口' },
        { name: 'Trading', description: '交易执行相关接口' },
        { name: 'Data', description: '数据分析相关接口' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT 认证令牌',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  // 注册 Swagger UI
  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  app.log.info('Swagger 文档已注册: http://localhost:3000/docs');
}
