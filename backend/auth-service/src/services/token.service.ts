/**
 * Token 管理服务
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { JwtPayload, TokenPair, AuthError, UserRole, JWTDecorator } from '../types/index.js';

export class TokenService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * 生成访问令牌
   */
  async generateAccessToken(
    jwt: JWTDecorator,
    payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>
  ): Promise<string> {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
      },
      {
        expiresIn: config.jwtAccessTokenExpiresIn,
      }
    );
  }

  /**
   * 生成刷新令牌
   */
  async generateRefreshToken(
    jwt: JWTDecorator,
    payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>
  ): Promise<string> {
    const jti = uuidv4(); // 用于标识和撤销 token

    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        jti,
      },
      {
        expiresIn: config.jwtRefreshTokenExpiresIn,
      }
    );
  }

  /**
   * 生成 Token 对
   */
  async generateTokenPair(
    jwt: JWTDecorator,
    userId: string,
    walletAddress: string,
    role: UserRole = 'user'
  ): Promise<TokenPair> {
    const payload = { userId, walletAddress, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(jwt, payload),
      this.generateRefreshToken(jwt, payload),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * 验证访问令牌
   */
  async verifyAccessToken(jwt: JWTDecorator, token: string): Promise<JwtPayload> {
    try {
      const payload = jwt.verify<JwtPayload>(token);

      if (payload.type !== 'access') {
        throw new AuthError('无效的令牌类型', 401, 'INVALID_TOKEN_TYPE');
      }

      // 检查是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthError('令牌已被撤销', 401, 'TOKEN_REVOKED');
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('无效的访问令牌', 401, 'INVALID_ACCESS_TOKEN');
    }
  }

  /**
   * 验证刷新令牌
   */
  async verifyRefreshToken(jwt: JWTDecorator, token: string): Promise<JwtPayload> {
    try {
      const payload = jwt.verify<JwtPayload>(token);

      if (payload.type !== 'refresh') {
        throw new AuthError('无效的令牌类型', 401, 'INVALID_TOKEN_TYPE');
      }

      // 检查是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthError('令牌已被撤销', 401, 'TOKEN_REVOKED');
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('无效的刷新令牌', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * 将 Token 加入黑名单
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const key = this.getBlacklistKey(token);
    await this.redis.setex(key, expiresIn, '1');
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = this.getBlacklistKey(token);
    const result = await this.redis.get(key);
    return result !== null;
  }

  /**
   * 撤销用户的所有 Refresh Token
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const key = this.getUserTokensKey(userId);
    await this.redis.del(key);
  }

  /**
   * 获取黑名单 Key
   */
  private getBlacklistKey(token: string): string {
    return `auth:blacklist:${token}`;
  }

  /**
   * 获取用户 Token Key
   */
  private getUserTokensKey(userId: string): string {
    return `auth:user:${userId}:tokens`;
  }

  /**
   * 解析 Token 而不验证
   */
  decodeToken(jwt: JWTDecorator, token: string): JwtPayload | null {
    try {
      return jwt.decode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  /**
   * 获取 Token 剩余有效期（秒）
   */
  getTokenTTL(payload: JwtPayload): number {
    if (!payload.exp) return 0;
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }
}
