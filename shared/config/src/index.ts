/**
 * Delta Terminal 配置管理
 */

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

import { Environment } from '@delta/common-types';

// 加载 .env 文件
loadDotenv();

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
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

/**
 * 解析并验证环境变量
 */
function parseEnvConfig(): EnvConfig {
  try {
    return EnvConfigSchema.parse(process.env);
  } catch (error) {
    console.error('环境变量验证失败:', error);
    throw new Error('Invalid environment configuration');
  }
}

/**
 * 导出配置对象
 */
export const config: EnvConfig = parseEnvConfig();

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
};

/**
 * Redis 配置
 */
export const redisConfig = {
  url: config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`,
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
};

/**
 * JWT 配置
 */
export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

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
};

/**
 * 日志配置
 */
export const logConfig = {
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV !== Environment.PRODUCTION,
};
