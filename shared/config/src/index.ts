/**
 * Delta Terminal 配置管理
 *
 * 集中管理所有服务的配置，避免 URL 硬编码
 * 服务发现遵循统一规范：
 * - 开发环境使用 localhost + 固定端口
 * - 生产环境通过环境变量配置
 */

import { Environment } from '@delta/common-types'
import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// 加载 .env 文件
loadDotenv()

/**
 * 服务端口规范 (开发环境)
 * - 3000-3999: Frontend & API Gateway
 * - 4000-4999: Backend Services (Node.js)
 * - 8000-8999: Python Services (AI/Trading/Data)
 */
export const SERVICE_PORTS = {
  // Frontend
  WEB_APP: 3000,
  API_GATEWAY: 3001,

  // Backend Services (Node.js)
  AUTH_SERVICE: 4001,
  USER_SERVICE: 4002,
  STRATEGY_SERVICE: 4003,
  AI_ORCHESTRATOR: 4010,

  // AI Engine (Python)
  NLP_PROCESSOR: 8001,
  STRATEGY_GENERATOR: 8002,
  SIGNAL_ANALYZER: 8003,

  // Trading Engine (Python)
  ORDER_EXECUTOR: 8101,
  RISK_MANAGER: 8102,
  EXCHANGE_CONNECTOR: 8103,

  // Data Pipeline (Python)
  MARKET_DATA_COLLECTOR: 8201,
  BACKTEST_ENGINE: 8202,
  ANALYTICS_SERVICE: 8203,
} as const

/**
 * 环境变量配置 Schema
 */
const EnvConfigSchema = z.object({
  // 环境
  NODE_ENV: z.nativeEnum(Environment).default(Environment.DEVELOPMENT),

  // 应用配置
  APP_NAME: z.string().default('Delta Terminal'),
  APP_VERSION: z.string().default('0.1.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // 数据库
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('delta_terminal'),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // JWT
  JWT_SECRET: z.string().min(32).default('your-secret-key-change-this-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // 交易所 API Keys (示例 - 实际应使用更安全的方式存储)
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),

  // 日志
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ========== 服务 URL 配置 ==========
  // Frontend & Gateway
  WEB_APP_URL: z.string().optional(),
  API_GATEWAY_URL: z.string().optional(),

  // Backend Services
  AUTH_SERVICE_URL: z.string().optional(),
  USER_SERVICE_URL: z.string().optional(),
  STRATEGY_SERVICE_URL: z.string().optional(),
  AI_ORCHESTRATOR_URL: z.string().optional(),

  // AI Engine
  NLP_PROCESSOR_URL: z.string().optional(),
  STRATEGY_GENERATOR_URL: z.string().optional(),
  SIGNAL_ANALYZER_URL: z.string().optional(),

  // Trading Engine
  ORDER_EXECUTOR_URL: z.string().optional(),
  RISK_MANAGER_URL: z.string().optional(),
  EXCHANGE_CONNECTOR_URL: z.string().optional(),

  // Data Pipeline
  MARKET_DATA_COLLECTOR_URL: z.string().optional(),
  BACKTEST_ENGINE_URL: z.string().optional(),
  ANALYTICS_SERVICE_URL: z.string().optional(),

  // CORS Origins
  CORS_ORIGINS: z.string().optional(),
})

export type EnvConfig = z.infer<typeof EnvConfigSchema>

/**
 * 解析并验证环境变量
 */
function parseEnvConfig(): EnvConfig {
  try {
    return EnvConfigSchema.parse(process.env)
  } catch (error) {
    console.error('环境变量验证失败:', error)
    throw new Error('Invalid environment configuration')
  }
}

/**
 * 导出配置对象
 */
export const config: EnvConfig = parseEnvConfig()

/**
 * 数据库配置
 */
export const databaseConfig = {
  url:
    config.DATABASE_URL ||
    `postgresql://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`,
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
}

/**
 * Redis 配置
 */
export const redisConfig = {
  url: config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`,
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
}

/**
 * JWT 配置
 */
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
}

/**
 * 应用配置
 */
export const appConfig = {
  name: config.APP_NAME,
  version: config.APP_VERSION,
  env: config.NODE_ENV,
  port: config.PORT,
  host: config.HOST,
  isDevelopment: config.NODE_ENV === Environment.DEVELOPMENT,
  isProduction: config.NODE_ENV === Environment.PRODUCTION,
}

/**
 * 日志配置
 */
export const logConfig = {
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV !== Environment.PRODUCTION,
}

/**
 * 服务 URL 配置
 *
 * 统一管理所有服务的 URL，避免硬编码
 * 优先使用环境变量，fallback 到开发环境默认值
 */
export const serviceUrls = {
  // Frontend & Gateway
  webApp: config.WEB_APP_URL || `http://localhost:${SERVICE_PORTS.WEB_APP}`,
  apiGateway: config.API_GATEWAY_URL || `http://localhost:${SERVICE_PORTS.API_GATEWAY}`,

  // Backend Services (Node.js)
  authService: config.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS.AUTH_SERVICE}`,
  userService: config.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS.USER_SERVICE}`,
  strategyService:
    config.STRATEGY_SERVICE_URL || `http://localhost:${SERVICE_PORTS.STRATEGY_SERVICE}`,
  aiOrchestrator: config.AI_ORCHESTRATOR_URL || `http://localhost:${SERVICE_PORTS.AI_ORCHESTRATOR}`,

  // AI Engine (Python)
  nlpProcessor: config.NLP_PROCESSOR_URL || `http://localhost:${SERVICE_PORTS.NLP_PROCESSOR}`,
  strategyGenerator:
    config.STRATEGY_GENERATOR_URL || `http://localhost:${SERVICE_PORTS.STRATEGY_GENERATOR}`,
  signalAnalyzer: config.SIGNAL_ANALYZER_URL || `http://localhost:${SERVICE_PORTS.SIGNAL_ANALYZER}`,

  // Trading Engine (Python)
  orderExecutor: config.ORDER_EXECUTOR_URL || `http://localhost:${SERVICE_PORTS.ORDER_EXECUTOR}`,
  riskManager: config.RISK_MANAGER_URL || `http://localhost:${SERVICE_PORTS.RISK_MANAGER}`,
  exchangeConnector:
    config.EXCHANGE_CONNECTOR_URL || `http://localhost:${SERVICE_PORTS.EXCHANGE_CONNECTOR}`,

  // Data Pipeline (Python)
  marketDataCollector:
    config.MARKET_DATA_COLLECTOR_URL || `http://localhost:${SERVICE_PORTS.MARKET_DATA_COLLECTOR}`,
  backtestEngine: config.BACKTEST_ENGINE_URL || `http://localhost:${SERVICE_PORTS.BACKTEST_ENGINE}`,
  analyticsService:
    config.ANALYTICS_SERVICE_URL || `http://localhost:${SERVICE_PORTS.ANALYTICS_SERVICE}`,
}

/**
 * CORS 配置
 */
export const corsConfig = {
  origins: config.CORS_ORIGINS?.split(',').map((s) => s.trim()) || [
    `http://localhost:${SERVICE_PORTS.WEB_APP}`,
    `http://localhost:${SERVICE_PORTS.API_GATEWAY}`,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}

/**
 * 获取服务 URL 的辅助函数
 */
export function getServiceUrl(serviceName: keyof typeof serviceUrls): string {
  return serviceUrls[serviceName]
}

/**
 * 检查是否为生产环境 URL
 */
export function isProductionUrl(url: string): boolean {
  return !url.includes('localhost') && !url.includes('127.0.0.1')
}

/**
 * 事件系统
 */
export * from './events'
