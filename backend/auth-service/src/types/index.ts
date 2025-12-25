/**
 * 认证服务类型定义 - 钱包认证系统
 */

// 用户角色
export type UserRole = 'user' | 'admin' | 'moderator';

// 用户类型（钱包为主键）
export interface User {
  id: string;
  walletAddress: string;
  nonce: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

// 获取 Nonce 请求
export interface GetNonceInput {
  walletAddress: string;
}

// 钱包登录请求
export interface WalletLoginInput {
  walletAddress: string;
  signature: string;
}

// Token 对象
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  walletAddress: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  jti?: string;
}

// 认证响应
export interface AuthResponse {
  user: {
    id: string;
    walletAddress: string;
    role: UserRole;
  };
  tokens: TokenPair;
}

// Nonce 响应
export interface NonceResponse {
  nonce: string;
  message: string;  // 完整签名消息
}

// 审计日志操作类型
export type AuditAction =
  | 'wallet_connect'
  | 'wallet_login'
  | 'wallet_login_failed'
  | 'logout'
  | 'role_change'
  | 'account_disable'
  | 'account_enable'
  | 'token_refresh'
  | 'api_access';

// 审计日志
export interface AuditLog {
  id: string;
  userId: string | null;
  walletAddress?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// 创建审计日志输入
export interface CreateAuditLogInput {
  userId?: string | null;
  walletAddress?: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

// 错误类型
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// 配置类型
export interface AuthServiceConfig {
  port: number;
  host: string;
  jwtSecret: string;
  jwtAccessTokenExpiresIn: string;
  jwtRefreshTokenExpiresIn: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
}

// JWT 装饰器接口（用于服务层）
export interface JWTDecorator {
  sign: (payload: Record<string, unknown>, options?: { expiresIn?: string }) => string;
  verify: <T>(token: string) => T;
  decode: <T>(token: string) => T | null;
}

// Fastify 扩展类型
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    jwtVerify: () => Promise<void>;
  }
  interface FastifyInstance {
    jwt: JWTDecorator;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
