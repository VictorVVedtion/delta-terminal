// 策略服务配置

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 服务配置
  service: {
    name: 'strategy-service',
    version: '1.0.0',
    port: parseInt(process.env.PORT || '3002', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/delta_strategy',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV === 'development',
  },

  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // 限流配置
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },

  // 策略配置
  strategy: {
    maxStrategiesPerUser: parseInt(process.env.MAX_STRATEGIES_PER_USER || '50', 10),
    maxActiveStrategies: parseInt(process.env.MAX_ACTIVE_STRATEGIES || '10', 10),
    defaultMaxOrders: parseInt(process.env.DEFAULT_MAX_ORDERS || '10', 10),
    defaultOrderInterval: parseInt(process.env.DEFAULT_ORDER_INTERVAL || '60', 10),
    maxVersionsToKeep: parseInt(process.env.MAX_VERSIONS_TO_KEEP || '10', 10),
  },

  // 分享码配置
  shareCode: {
    length: parseInt(process.env.SHARE_CODE_LENGTH || '8', 10),
    expiresIn: parseInt(process.env.SHARE_CODE_EXPIRES_IN || '2592000000', 10), // 30天
  },

  // 外部服务
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    tradingEngine: process.env.TRADING_ENGINE_URL || 'http://localhost:3003',
    dataService: process.env.DATA_SERVICE_URL || 'http://localhost:3004',
  },
};

export default config;
