/**
 * 路由入口
 */

import type { FastifyInstance } from 'fastify'
import { chatRoutes } from './chat.js'
import { statusRoutes } from './status.js'

export async function registerRoutes(fastify: FastifyInstance) {
  // API 前缀
  fastify.register(async (app) => {
    // Chat 相关路由
    await app.register(chatRoutes)

    // Status 相关路由
    await app.register(statusRoutes)

  }, { prefix: '/api/ai' })

  // 根路由健康检查
  fastify.get('/', async () => ({
    service: 'ai-orchestrator',
    version: '0.1.0',
    status: 'running',
  }))
}
