import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { config } from '../config/index.js';

/**
 * 注册 CORS 插件
 */
export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24小时
  });

  app.log.info('CORS 中间件已注册');
}
