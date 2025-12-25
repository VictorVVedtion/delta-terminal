import { FastifyInstance } from 'fastify';
import { apiKeyService } from '../services/apiKey.service';
import { CreateApiKeySchema, UpdateApiKeySchema } from '../types';

export async function apiKeyRoutes(fastify: FastifyInstance) {
  // 创建 API 密钥
  fastify.post('/users/:userId/api-keys', {
    schema: {
      description: '创建交易所 API 密钥',
      tags: ['api-keys'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['exchange', 'name', 'apiKey', 'apiSecret'],
        properties: {
          exchange: { type: 'string' },
          name: { type: 'string' },
          apiKey: { type: 'string' },
          apiSecret: { type: 'string' },
          passphrase: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
        },
      },
      response: {
        201: {
          description: 'API 密钥创建成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const validatedData = CreateApiKeySchema.parse(request.body);
        const apiKey = await apiKeyService.createApiKey(userId, validatedData);

        // 不返回加密的密钥
        const { apiKey: encryptedKey, apiSecret: encryptedSecret, passphrase, ...safeData } = apiKey;

        return reply.code(201).send({
          success: true,
          data: safeData,
          message: 'API 密钥已安全存储',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '创建 API 密钥失败',
        });
      }
    },
  });

  // 获取用户的所有 API 密钥
  fastify.get('/users/:userId/api-keys', {
    schema: {
      description: '获取用户的所有 API 密钥',
      tags: ['api-keys'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          exchange: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'API 密钥列表获取成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { exchange } = request.query as { exchange?: string };

        let apiKeys;
        if (exchange) {
          apiKeys = await apiKeyService.getApiKeysByExchange(userId, exchange);
        } else {
          apiKeys = await apiKeyService.getApiKeys(userId);
        }

        // 移除加密的密钥字段
        const safeApiKeys = apiKeys.map(({ apiKey, apiSecret, passphrase, ...rest }) => rest);

        return reply.send({
          success: true,
          data: safeApiKeys,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '获取 API 密钥失败',
        });
      }
    },
  });

  // 获取单个 API 密钥
  fastify.get('/users/:userId/api-keys/:keyId', {
    schema: {
      description: '获取单个 API 密钥详情',
      tags: ['api-keys'],
      params: {
        type: 'object',
        required: ['userId', 'keyId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          keyId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'API 密钥详情获取成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId, keyId } = request.params as { userId: string; keyId: string };
        const apiKey = await apiKeyService.getApiKeyById(keyId, userId);

        if (!apiKey) {
          return reply.code(404).send({
            success: false,
            error: 'API 密钥不存在',
          });
        }

        // 移除加密的密钥字段
        const { apiKey: encryptedKey, apiSecret: encryptedSecret, passphrase, ...safeData } = apiKey;

        return reply.send({
          success: true,
          data: safeData,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '获取 API 密钥失败',
        });
      }
    },
  });

  // 更新 API 密钥
  fastify.patch('/users/:userId/api-keys/:keyId', {
    schema: {
      description: '更新 API 密钥信息',
      tags: ['api-keys'],
      params: {
        type: 'object',
        required: ['userId', 'keyId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          keyId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isActive: { type: 'boolean' },
          permissions: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
        },
      },
      response: {
        200: {
          description: 'API 密钥更新成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId, keyId } = request.params as { userId: string; keyId: string };
        const validatedData = UpdateApiKeySchema.parse(request.body);
        const apiKey = await apiKeyService.updateApiKey(keyId, userId, validatedData);

        // 移除加密的密钥字段
        const { apiKey: encryptedKey, apiSecret: encryptedSecret, passphrase, ...safeData } = apiKey;

        return reply.send({
          success: true,
          data: safeData,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '更新 API 密钥失败',
        });
      }
    },
  });

  // 删除 API 密钥
  fastify.delete('/users/:userId/api-keys/:keyId', {
    schema: {
      description: '删除 API 密钥',
      tags: ['api-keys'],
      params: {
        type: 'object',
        required: ['userId', 'keyId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          keyId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'API 密钥删除成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId, keyId } = request.params as { userId: string; keyId: string };
        await apiKeyService.deleteApiKey(keyId, userId);

        return reply.send({
          success: true,
          message: 'API 密钥已删除',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '删除 API 密钥失败',
        });
      }
    },
  });
}
