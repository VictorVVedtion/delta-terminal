import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import httpProxy from 'http-proxy';
import { config } from '../config/index.js';
import { authenticateJWT } from '../middleware/auth.js';

/**
 * 创建 HTTP 代理实例
 */
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  xfwd: true,
});

/**
 * 代理错误处理
 */
proxy.on('error', (err, req, res) => {
  console.error('代理错误:', err);

  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      statusCode: 502,
      error: 'Bad Gateway',
      message: '上游服务不可用',
      timestamp: new Date().toISOString(),
    }));
  }
});

/**
 * 通用代理处理函数
 */
async function proxyRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  target: string,
  pathPrefix: string
) {
  try {
    // 移除路径前缀
    const targetPath = request.url.replace(pathPrefix, '');

    // 设置代理目标
    const proxyTarget = `${target}${targetPath}`;

    request.log.info({
      from: request.url,
      to: proxyTarget,
    }, '代理请求');

    // 使用原生 HTTP 响应对象进行代理
    proxy.web(
      request.raw,
      reply.raw,
      {
        target,
        changeOrigin: true,
      },
      (err) => {
        if (err) {
          request.log.error({ error: err }, '代理失败');

          if (!reply.sent) {
            reply.code(502).send({
              statusCode: 502,
              error: 'Bad Gateway',
              message: '服务暂时不可用',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    );

    // 告诉 Fastify 我们已经处理了响应
    reply.hijack();
  } catch (error) {
    request.log.error({ error }, '代理异常');

    if (!reply.sent) {
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: '内部服务器错误',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * 代理路由配置
 */
export async function proxyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * 认证服务代理
   * 路径: /api/auth/*
   * 不需要 JWT 认证(登录注册接口)
   */
  app.all('/api/auth/*', async (request, reply) => {
    await proxyRequest(
      request,
      reply,
      config.services.auth.url,
      '/api/auth'
    );
  });

  /**
   * 用户服务代理
   * 路径: /api/users/*
   * 需要 JWT 认证
   */
  app.all(
    '/api/users/*',
    {
      preHandler: authenticateJWT,
      schema: {
        tags: ['User'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      await proxyRequest(
        request,
        reply,
        config.services.user.url,
        '/api/users'
      );
    }
  );

  /**
   * 策略服务代理
   * 路径: /api/strategies/*
   * 需要 JWT 认证
   */
  app.all(
    '/api/strategies/*',
    {
      preHandler: authenticateJWT,
      schema: {
        tags: ['Strategy'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      await proxyRequest(
        request,
        reply,
        config.services.strategy.url,
        '/api/strategies'
      );
    }
  );

  /**
   * 交易引擎代理
   * 路径: /api/trading/*
   * 需要 JWT 认证
   */
  app.all(
    '/api/trading/*',
    {
      preHandler: authenticateJWT,
      schema: {
        tags: ['Trading'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      await proxyRequest(
        request,
        reply,
        config.services.trading.url,
        '/api/trading'
      );
    }
  );

  /**
   * 数据管道代理
   * 路径: /api/data/*
   * 需要 JWT 认证
   */
  app.all(
    '/api/data/*',
    {
      preHandler: authenticateJWT,
      schema: {
        tags: ['Data'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      await proxyRequest(
        request,
        reply,
        config.services.data.url,
        '/api/data'
      );
    }
  );

  app.log.info('代理路由已注册');
}
