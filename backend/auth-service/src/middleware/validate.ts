/**
 * 请求验证中间件
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

/**
 * 验证请求体
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
}

/**
 * 验证查询参数
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: '查询参数验证失败',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
}

/**
 * 验证路径参数
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: '路径参数验证失败',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      throw error;
    }
  };
}
