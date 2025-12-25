import { FastifyInstance } from 'fastify';
import { userService } from '../services/user.service';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UpdatePasswordSchema,
  UserQuerySchema,
} from '../types';

export async function userRoutes(fastify: FastifyInstance) {
  // 创建用户
  fastify.post('/users', {
    schema: {
      description: '创建新用户',
      tags: ['users'],
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      response: {
        201: {
          description: '用户创建成功',
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
        const validatedData = CreateUserSchema.parse(request.body);
        const user = await userService.createUser(validatedData);
        return reply.code(201).send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '创建用户失败',
        });
      }
    },
  });

  // 获取用户列表（分页）
  fastify.get('/users', {
    schema: {
      description: '获取用户列表',
      tags: ['users'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'PREMIUM', 'ADMIN', 'SUPER_ADMIN'] },
          isActive: { type: 'boolean' },
          isVerified: { type: 'boolean' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
      response: {
        200: {
          description: '用户列表获取成功',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            pagination: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const validatedQuery = UserQuerySchema.parse(request.query);
        const result = await userService.getUsers(validatedQuery);
        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '获取用户列表失败',
        });
      }
    },
  });

  // 获取单个用户
  fastify.get('/users/:id', {
    schema: {
      description: '获取用户详情',
      tags: ['users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: '用户详情获取成功',
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
        const { id } = request.params as { id: string };
        const user = await userService.getUserById(id);
        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(404).send({
          success: false,
          error: error instanceof Error ? error.message : '用户不存在',
        });
      }
    },
  });

  // 更新用户
  fastify.patch('/users/:id', {
    schema: {
      description: '更新用户信息',
      tags: ['users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          timezone: { type: 'string' },
          language: { type: 'string' },
        },
      },
      response: {
        200: {
          description: '用户更新成功',
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
        const { id } = request.params as { id: string };
        const validatedData = UpdateUserSchema.parse(request.body);
        const user = await userService.updateUser(id, validatedData);
        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '更新用户失败',
        });
      }
    },
  });

  // 更新密码
  fastify.post('/users/:id/password', {
    schema: {
      description: '更新用户密码',
      tags: ['users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 8 },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          description: '密码更新成功',
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
        const { id } = request.params as { id: string };
        const validatedData = UpdatePasswordSchema.parse(request.body);
        const result = await userService.updatePassword(id, validatedData);
        return reply.send({
          success: true,
          message: result.message,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '更新密码失败',
        });
      }
    },
  });

  // 删除用户
  fastify.delete('/users/:id', {
    schema: {
      description: '删除用户',
      tags: ['users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: '用户删除成功',
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
        const { id } = request.params as { id: string };
        const result = await userService.deleteUser(id);
        return reply.send({
          success: true,
          message: result.message,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({
          success: false,
          error: error instanceof Error ? error.message : '删除用户失败',
        });
      }
    },
  });
}
