/**
 * 认证与授权中间件
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuthError, UserRole, JwtPayload } from '../types/index.js';

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (error) {
    throw new AuthError('未授权访问', 401, 'UNAUTHORIZED');
  }
}

/**
 * 可选认证中间件
 * Token 存在时验证，不存在时继续
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    const authorization = request.headers.authorization;
    if (authorization && authorization.startsWith('Bearer ')) {
      await request.jwtVerify();
    }
  } catch {
    // 静默失败，继续处理请求
  }
}

/**
 * 角色检查中间件工厂
 * 创建一个验证用户是否具有指定角色的中间件
 *
 * @param roles - 允许访问的角色列表
 * @returns Fastify 中间件函数
 *
 * @example
 * // 单个角色
 * app.get('/admin', { preHandler: [authenticate, requireRole('admin')] }, handler)
 *
 * // 多个角色
 * app.get('/manage', { preHandler: [authenticate, requireRole('admin', 'moderator')] }, handler)
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    // 确保用户已认证
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new AuthError('未授权访问', 401, 'UNAUTHORIZED');
    }

    // 检查用户角色
    if (!user.role || !roles.includes(user.role)) {
      throw new AuthError(
        `需要 ${roles.join(' 或 ')} 角色才能访问此资源`,
        403,
        'FORBIDDEN'
      );
    }
  };
}

/**
 * 仅管理员访问中间件
 */
export const requireAdmin = requireRole('admin');

/**
 * 管理员或版主访问中间件
 */
export const requireModerator = requireRole('admin', 'moderator');

/**
 * 检查用户是否为资源所有者
 *
 * @param getResourceOwnerId - 从请求中获取资源所有者 ID 的函数
 * @returns Fastify 中间件函数
 *
 * @example
 * app.put('/users/:id', {
 *   preHandler: [authenticate, requireOwnerOrAdmin((req) => req.params.id)]
 * }, handler)
 */
export function requireOwnerOrAdmin(
  getResourceOwnerId: (request: FastifyRequest) => string | Promise<string>
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new AuthError('未授权访问', 401, 'UNAUTHORIZED');
    }

    // 管理员可以访问任何资源
    if (user.role === 'admin') {
      return;
    }

    // 检查是否为资源所有者
    const ownerId = await getResourceOwnerId(request);
    if (user.userId !== ownerId) {
      throw new AuthError('无权访问此资源', 403, 'FORBIDDEN');
    }
  };
}

/**
 * 验证邮箱已确认中间件
 * 确保用户邮箱已验证才能访问某些功能
 */
export async function requireEmailVerified(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const user = request.user as JwtPayload | undefined;

  if (!user) {
    throw new AuthError('未授权访问', 401, 'UNAUTHORIZED');
  }

  // 这里需要查询数据库获取邮箱验证状态
  // 或者在 JWT payload 中包含此信息
  // 暂时跳过，后续可以扩展
}

/**
 * 速率限制检查中间件（与登录尝试相关）
 * 检查 IP 或用户是否被临时锁定
 */
export function createRateLimitCheck(
  checkFunction: (ip: string, userId?: string) => Promise<boolean>
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const ip = request.ip;
    const user = request.user as JwtPayload | undefined;

    const isBlocked = await checkFunction(ip, user?.userId);

    if (isBlocked) {
      throw new AuthError(
        '请求过于频繁，请稍后再试',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  };
}

/**
 * 添加审计日志钩子
 * 在请求完成后记录审计日志
 */
export function createAuditHook(
  fastify: FastifyInstance,
  auditService: { createLog: Function }
) {
  fastify.addHook('onResponse', async (request, reply) => {
    const user = request.user as JwtPayload | undefined;

    // 只记录需要审计的请求
    const auditPaths = ['/auth', '/users', '/admin'];
    const shouldAudit = auditPaths.some(path => request.url.startsWith(path));

    if (!shouldAudit) return;

    try {
      await auditService.createLog({
        userId: user?.userId || null,
        action: 'api_access',
        requestMethod: request.method,
        requestPath: request.url,
        responseStatus: reply.statusCode,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        success: reply.statusCode < 400,
      });
    } catch (error) {
      // 审计日志失败不应影响请求响应
      fastify.log.error({ error }, 'Failed to create audit log');
    }
  });
}
