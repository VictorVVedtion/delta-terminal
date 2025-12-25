/**
 * 认证路由 - 钱包认证
 */

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import {
  getNonceSchema,
  walletLoginSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';

export async function authRoutes(
  fastify: FastifyInstance,
  options: { db: Pool; redis: Redis }
) {
  const authService = new AuthService(options.db, options.redis);

  /**
   * POST /auth/nonce
   * 获取用于签名的 Nonce
   */
  fastify.post(
    '/nonce',
    {
      preHandler: validateBody(getNonceSchema),
      schema: {
        description: '获取钱包签名 Nonce',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['walletAddress'],
          properties: {
            walletAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              nonce: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as typeof getNonceSchema._type;
      const result = await authService.getNonce(body);
      return reply.send(result);
    }
  );

  /**
   * POST /auth/login
   * 钱包签名登录
   */
  fastify.post(
    '/login',
    {
      preHandler: validateBody(walletLoginSchema),
      schema: {
        description: '钱包签名登录',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['walletAddress', 'signature'],
          properties: {
            walletAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
            signature: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  walletAddress: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as typeof walletLoginSchema._type;
      const result = await authService.login(fastify.jwt, body);
      return reply.send(result);
    }
  );

  /**
   * POST /auth/refresh
   * 刷新访问令牌
   */
  fastify.post(
    '/refresh',
    {
      preHandler: validateBody(refreshTokenSchema),
      schema: {
        description: '刷新访问令牌',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as typeof refreshTokenSchema._type;
      const tokens = await authService.refreshToken(fastify.jwt, refreshToken);
      return reply.send(tokens);
    }
  );

  /**
   * POST /auth/logout
   * 用户登出
   */
  fastify.post(
    '/logout',
    {
      preHandler: authenticate,
      schema: {
        description: '用户登出',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // 从请求头获取 token
      const token = request.headers.authorization?.replace('Bearer ', '') || '';
      await authService.logout(fastify.jwt, token);
      return reply.send({ message: '登出成功' });
    }
  );

  /**
   * GET /auth/me
   * 获取当前用户信息
   */
  fastify.get(
    '/me',
    {
      preHandler: authenticate,
      schema: {
        description: '获取当前用户信息',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              walletAddress: { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.send(request.user);
    }
  );

  /**
   * GET /auth/health
   * 健康检查
   */
  fastify.get(
    '/health',
    {
      schema: {
        description: '健康检查',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }
  );
}
