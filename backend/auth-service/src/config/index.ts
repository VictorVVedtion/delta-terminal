/**
 * 认证服务配置管理
 */

import 'dotenv/config';
import { AuthServiceConfig } from '../types/index.js';

/**
 * 从环境变量获取配置
 */
function getConfig(): AuthServiceConfig {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  // 验证必需的环境变量
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  const config: AuthServiceConfig = {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',

    jwtSecret: process.env.JWT_SECRET!,
    jwtAccessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    jwtRefreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',

    database: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!, 10),
      name: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
    },

    redis: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!, 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },

    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
    },

    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '15m',
    },
  };

  return config;
}

export const config = getConfig();

/**
 * 解析时间字符串为毫秒
 * @param timeString - 例如: '15m', '7d', '1h'
 */
export function parseTimeToMs(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit!] || 1000);
}

/**
 * 解析时间字符串为秒
 */
export function parseTimeToSeconds(timeString: string): number {
  return Math.floor(parseTimeToMs(timeString) / 1000);
}
