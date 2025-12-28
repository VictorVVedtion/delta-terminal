import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { userRoutes } from './routes/users';
import { profileRoutes } from './routes/profile';
import { settingsRoutes } from './routes/settings';
import { apiKeyRoutes } from './routes/api-keys';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.env === 'development'
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

  // 安全插件
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, config.cors);

  // Rate Limiting
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
  });

  // Swagger 文档
  if (config.swagger.exposeRoute) {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Delta Terminal User Service API',
          description: 'Delta Terminal 用户管理服务 API 文档',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://${config.host}:${config.port}`,
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'users', description: '用户管理' },
          { name: 'profile', description: '用户资料' },
          { name: 'settings', description: '用户设置' },
          { name: 'api-keys', description: 'API 密钥管理' },
        ],
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: config.swagger.routePrefix,
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // 健康检查
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
    };
  });

  // 注册路由
  await fastify.register(userRoutes, { prefix: '/api/v1' });
  await fastify.register(profileRoutes, { prefix: '/api/v1' });
  await fastify.register(settingsRoutes, { prefix: '/api/v1' });
  await fastify.register(apiKeyRoutes, { prefix: '/api/v1' });

  // 全局错误处理
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    reply.status(statusCode).send({
      success: false,
      error: message,
      statusCode,
    });
  });

  // 404 处理
  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: 'Route not found',
      statusCode: 404,
    });
  });

  return fastify;
}
