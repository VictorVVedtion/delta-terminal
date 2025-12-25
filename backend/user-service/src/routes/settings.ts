import { FastifyInstance } from 'fastify';
import { userService } from '../services/user.service';
import { UpdateSettingsSchema } from '../types';

export async function settingsRoutes(fastify: FastifyInstance) {
  // 获取用户设置
  fastify.get('/users/:userId/settings', {
    schema: {
      description: '获取用户设置',
      tags: ['settings'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: '用户设置获取成功',
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
        const settings = await userService.getSettings(userId);
        return reply.send({
          success: true,
          data: settings,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(404).send({
          success: false,
          error: error instanceof Error ? error.message : '获取设置失败',
        });
      }
    },
  });

  // 更新用户设置
  fastify.patch('/users/:userId/settings', {
    schema: {
      description: '更新用户设置',
      tags: ['settings'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          emailNotifications: { type: 'boolean' },
          tradeNotifications: { type: 'boolean' },
          marketAlerts: { type: 'boolean' },
          systemNotifications: { type: 'boolean' },
          defaultExchange: { type: 'string' },
          defaultTradingPair: { type: 'string' },
          defaultOrderType: { type: 'string', enum: ['market', 'limit', 'stop'] },
          twoFactorEnabled: { type: 'boolean' },
          theme: { type: 'string', enum: ['light', 'dark'] },
          currency: { type: 'string' },
        },
      },
      response: {
        200: {
          description: '用户设置更新成功',
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
        const validatedData = UpdateSettingsSchema.parse(request.body);
        const settings = await userService.updateSettings(userId, validatedData);
        return reply.send({
          success: true,
          data: settings,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '更新设置失败',
        });
      }
    },
  });
}
