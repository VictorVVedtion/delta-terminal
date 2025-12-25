import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/detailed', () => {
    it('应该返回详细健康状态', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('services');
      expect(body.services).toHaveProperty('auth');
      expect(body.services).toHaveProperty('user');
    });
  });

  describe('GET /ready', () => {
    it('应该返回就绪状态', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      // 可能返回 200 或 503,取决于 Auth Service 是否运行
      expect([200, 503]).toContain(response.statusCode);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('ready');
    });
  });

  describe('GET /live', () => {
    it('应该返回存活状态', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alive', true);
    });
  });
});
