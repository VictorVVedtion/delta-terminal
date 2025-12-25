import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { AppConfig } from '../types/index.js';

// 加载环境变量
dotenvConfig();

/**
 * 环境变量验证 Schema
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().transform(Number).default('60000'),
  
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  STRATEGY_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  TRADING_ENGINE_URL: z.string().url().default('http://localhost:3004'),
  DATA_PIPELINE_URL: z.string().url().default('http://localhost:3005'),
  
  CORS_ORIGIN: z.string().default('http://localhost:3100'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),
  
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.string().transform(val => val === 'true').default('true'),
});

/**
 * 验证并解析环境变量
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('环境变量验证失败:');
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        console.error(`  - ${path}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

/**
 * 应用配置对象
 */
export const config: AppConfig = {
  env: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
  },
  
  cors: {
    origin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
    credentials: env.CORS_CREDENTIALS,
  },
  
  services: {
    auth: {
      url: env.AUTH_SERVICE_URL,
      timeout: 5000,
      retries: 3,
    },
    user: {
      url: env.USER_SERVICE_URL,
      timeout: 5000,
      retries: 3,
    },
    strategy: {
      url: env.STRATEGY_SERVICE_URL,
      timeout: 5000,
      retries: 3,
    },
    trading: {
      url: env.TRADING_ENGINE_URL,
      timeout: 10000,
      retries: 2,
    },
    data: {
      url: env.DATA_PIPELINE_URL,
      timeout: 15000,
      retries: 2,
    },
  },
  
  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },
};

/**
 * 验证配置是否有效
 */
export const validateConfig = (): boolean => {
  const requiredFields = [
    config.jwt.secret,
    config.services.auth.url,
    config.services.user.url,
  ];
  
  return requiredFields.every(field => field && field.length > 0);
};

export default config;
