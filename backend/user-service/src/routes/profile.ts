import { FastifyInstance } from 'fastify';
import { userService } from '../services/user.service';
import { UpdateProfileSchema } from '../types';

export async function profileRoutes(fastify: FastifyInstance) {
  // 获取用户资料
  fastify.get('/users/:userId/profile', {
    schema: {
      description: '获取用户资料',
      tags: ['profile'],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: '用户资料获取成功',
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
        const profile = await userService.getProfile(userId);
        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(404).send({
          success: false,
          error: error instanceof Error ? error.message : '获取资料失败',
        });
      }
    },
  });

  // 更新用户资料
  fastify.patch('/users/:userId/profile', {
    schema: {
      description: '更新用户资料',
      tags: ['profile'],
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
          bio: { type: 'string', maxLength: 500 },
          phoneNumber: { type: 'string' },
          country: { type: 'string' },
          city: { type: 'string' },
          riskTolerance: { type: 'string', enum: ['low', 'medium', 'high'] },
          experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
          twitter: { type: 'string' },
          telegram: { type: 'string' },
          discord: { type: 'string' },
        },
      },
      response: {
        200: {
          description: '用户资料更新成功',
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
        const validatedData = UpdateProfileSchema.parse(request.body);
        const profile = await userService.updateProfile(userId, validatedData);
        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '更新资料失败',
        });
      }
    },
  });
}
