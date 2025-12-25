import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config/index.js';
import { JWTPayload, AuthenticatedRequest } from '../types/index.js';

/**
 * 注册 JWT 插件
 */
export async function registerJWT(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  app.log.info('JWT 认证插件已注册');
}

/**
 * JWT 认证装饰器
 * 验证请求中的 JWT token 并提取用户信息
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // 从 Authorization header 中提取 token
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '缺少认证令牌',
        timestamp: new Date().toISOString(),
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '令牌格式错误,应为: Bearer <token>',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);

    // 验证 token
    const decoded = await request.server.jwt.verify<JWTPayload>(token);

    // 将用户信息附加到请求对象
    (request as AuthenticatedRequest).user = decoded;

    request.log.info({
      userId: decoded.userId,
      email: decoded.email,
    }, 'JWT 认证成功');

  } catch (error) {
    if (error instanceof Error) {
      request.log.warn({
        error: error.message,
      }, 'JWT 认证失败');

      if (error.message.includes('expired')) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: '令牌已过期',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '令牌无效',
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: '认证过程发生错误',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 可选的 JWT 认证
 * 如果 token 存在则验证,否则继续处理
 */
export async function optionalAuthenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    await authenticateJWT(request, reply);
  }
}

/**
 * 检查用户角色权限
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '未认证的请求',
        timestamp: new Date().toISOString(),
      });
    }

    if (!allowedRoles.includes(authRequest.user.role)) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: '权限不足',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
