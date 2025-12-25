import { FastifyRequest } from 'fastify';

/**
 * 服务配置类型
 */
export interface ServiceConfig {
  url: string;
  timeout?: number;
  retries?: number;
}

/**
 * 微服务路由配置
 */
export interface ServiceRouteConfig {
  auth: ServiceConfig;
  user: ServiceConfig;
  strategy: ServiceConfig;
  trading: ServiceConfig;
  data: ServiceConfig;
}

/**
 * 应用配置类型
 */
export interface AppConfig {
  env: string;
  port: number;
  host: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    max: number;
    timeWindow: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  services: ServiceRouteConfig;
  logging: {
    level: string;
    pretty: boolean;
  };
}

/**
 * JWT 载荷类型
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 认证请求类型
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
}

/**
 * API 错误响应
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
}

/**
 * 代理选项
 */
export interface ProxyOptions {
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  timeout?: number;
}
