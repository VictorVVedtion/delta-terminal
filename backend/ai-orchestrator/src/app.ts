/**
 * AI Orchestrator Service - 主入口
 *
 * Delta Terminal Intelligence Layer 的核心服务
 * 负责 AI 编排、模型路由、配额管理、技能执行
 */

// 首先加载环境变量 - 必须在其他导入之前
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量 - 优先 .env.local
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

// 验证关键环境变量
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY 未配置')
  console.error('   请检查 .env.local 或 .env 文件')
  process.exit(1)
}
console.log('✅ API Key 已加载:', OPENROUTER_API_KEY.slice(0, 15) + '...')

// 动态导入其他模块（确保环境变量已加载）
const { default: Fastify } = await import('fastify')
const { default: cors } = await import('@fastify/cors')
const { default: helmet } = await import('@fastify/helmet')
const { default: rateLimit } = await import('@fastify/rate-limit')
const { registerRoutes } = await import('./routes/index.js')

// =============================================================================
// 环境配置
// =============================================================================

const PORT = parseInt(process.env.PORT || '4010', 10)
const HOST = process.env.HOST || '0.0.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'

// =============================================================================
// 创建 Fastify 实例
// =============================================================================

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
})

// =============================================================================
// 注册插件
// =============================================================================

async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: NODE_ENV === 'development'
      ? true  // 开发环境允许所有来源
      : ['https://delta-terminal.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  // 安全头
  await fastify.register(helmet, {
    contentSecurityPolicy: false,  // 允许 SSE
  })

  // 速率限制
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: '请求过于频繁，请稍后再试',
      retryAfter: context.after,
    }),
  })
}

// =============================================================================
// 启动服务
// =============================================================================

async function start() {
  try {
    // 注册插件
    await registerPlugins()

    // 注册路由
    await registerRoutes(fastify)

    // 启动服务
    await fastify.listen({ port: PORT, host: HOST })

    console.log('')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║        🤖 AI Orchestrator Service Started                  ║')
    console.log('╠════════════════════════════════════════════════════════════╣')
    console.log(`║  Environment: ${NODE_ENV.padEnd(43)}║`)
    console.log(`║  Server:      http://${HOST}:${PORT}`.padEnd(61) + '║')
    console.log('╠════════════════════════════════════════════════════════════╣')
    console.log('║  Endpoints:                                                ║')
    console.log('║    POST /api/ai/chat          - 非流式对话                 ║')
    console.log('║    POST /api/ai/chat/stream   - 流式对话 (SSE)             ║')
    console.log('║    GET  /api/ai/status        - 用户 AI 状态               ║')
    console.log('║    GET  /api/ai/config        - AI 配置                    ║')
    console.log('║    GET  /api/ai/skills        - 技能列表                   ║')
    console.log('║    POST /api/ai/skills/:id/execute - 执行技能              ║')
    console.log('║    GET  /api/ai/health        - 健康检查                   ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down AI Orchestrator...')
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down AI Orchestrator...')
  await fastify.close()
  process.exit(0)
})

// 启动
start()
