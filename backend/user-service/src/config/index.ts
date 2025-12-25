import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 服务配置
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  host: process.env.HOST || '0.0.0.0',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 加密
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!!',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  },

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIME_WINDOW || '60000', 10),
  },

  // Swagger
  swagger: {
    routePrefix: '/docs',
    exposeRoute: process.env.NODE_ENV !== 'production',
  },
} as const;

export default config;
