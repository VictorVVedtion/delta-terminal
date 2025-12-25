/**
 * 认证服务核心逻辑 - 钱包认证
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { verifyMessage, getAddress } from 'ethers';
import crypto from 'crypto';
import {
  User,
  GetNonceInput,
  WalletLoginInput,
  AuthResponse,
  NonceResponse,
  AuthError,
  TokenPair,
  JWTDecorator,
} from '../types/index.js';
import { TokenService } from './token.service.js';

// 签名消息模板
const SIGN_MESSAGE_TEMPLATE = `Welcome to Delta Terminal!

Please sign this message to verify your wallet ownership.

Nonce: {nonce}

This signature will not trigger any blockchain transaction or cost any gas fees.`;

export class AuthService {
  private db: Pool;
  private tokenService: TokenService;

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.tokenService = new TokenService(redis);
  }

  /**
   * 生成随机 Nonce
   */
  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 构建签名消息
   */
  private buildSignMessage(nonce: string): string {
    return SIGN_MESSAGE_TEMPLATE.replace('{nonce}', nonce);
  }

  /**
   * 标准化钱包地址（checksum 格式）
   */
  private normalizeAddress(address: string): string {
    try {
      return getAddress(address);
    } catch {
      throw new AuthError('无效的钱包地址', 400, 'INVALID_WALLET_ADDRESS');
    }
  }

  /**
   * 获取或创建用户的 Nonce
   */
  async getNonce(input: GetNonceInput): Promise<NonceResponse> {
    const walletAddress = this.normalizeAddress(input.walletAddress);

    // 查找现有用户
    let user = await this.findUserByWallet(walletAddress);

    if (!user) {
      // 新用户，创建并生成 nonce
      user = await this.createUser(walletAddress);
    } else {
      // 现有用户，更新 nonce（每次登录都更新）
      user = await this.updateNonce(user.id);
    }

    return {
      nonce: user.nonce,
      message: this.buildSignMessage(user.nonce),
    };
  }

  /**
   * 钱包登录验证
   */
  async login(jwt: JWTDecorator, input: WalletLoginInput): Promise<AuthResponse> {
    const walletAddress = this.normalizeAddress(input.walletAddress);

    // 查找用户
    const user = await this.findUserByWallet(walletAddress);
    if (!user) {
      throw new AuthError('用户不存在，请先获取 Nonce', 404, 'USER_NOT_FOUND');
    }

    // 检查账户是否激活
    if (!user.isActive) {
      throw new AuthError('账户已被禁用', 403, 'ACCOUNT_DISABLED');
    }

    // 构建预期的签名消息
    const expectedMessage = this.buildSignMessage(user.nonce);

    // 验证签名
    try {
      const recoveredAddress = verifyMessage(expectedMessage, input.signature);

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new AuthError('签名验证失败', 401, 'INVALID_SIGNATURE');
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('签名验证失败', 401, 'INVALID_SIGNATURE');
    }

    // 登录成功，更新 nonce（防止重放攻击）和最后登录时间
    await this.updateNonceAndLastLogin(user.id);

    // 生成 Token
    const tokens = await this.tokenService.generateTokenPair(
      jwt,
      user.id,
      user.walletAddress,
      user.role
    );

    return {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(jwt: JWTDecorator, refreshToken: string): Promise<TokenPair> {
    // 验证刷新令牌
    const payload = await this.tokenService.verifyRefreshToken(jwt, refreshToken);

    // 查找用户
    const user = await this.findUserById(payload.userId);
    if (!user) {
      throw new AuthError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AuthError('账户已被禁用', 403, 'ACCOUNT_DISABLED');
    }

    // 生成新的 Token 对
    const tokens = await this.tokenService.generateTokenPair(
      jwt,
      user.id,
      user.walletAddress,
      user.role
    );

    // 将旧的刷新令牌加入黑名单
    const ttl = this.tokenService.getTokenTTL(payload);
    await this.tokenService.blacklistToken(refreshToken, ttl);

    return tokens;
  }

  /**
   * 登出
   */
  async logout(jwt: JWTDecorator, accessToken: string): Promise<void> {
    // 解码 Token 获取用户信息
    const payload = this.tokenService.decodeToken(jwt, accessToken);
    if (!payload) {
      throw new AuthError('无效的令牌', 401, 'INVALID_TOKEN');
    }

    // 将访问令牌加入黑名单
    const ttl = this.tokenService.getTokenTTL(payload);
    await this.tokenService.blacklistToken(accessToken, ttl);
  }

  /**
   * 验证访问令牌
   */
  async verifyAccessToken(jwt: JWTDecorator, token: string) {
    return this.tokenService.verifyAccessToken(jwt, token);
  }

  // ========== 数据库操作 ==========

  /**
   * 创建用户
   */
  private async createUser(walletAddress: string): Promise<User> {
    const nonce = this.generateNonce();

    const query = `
      INSERT INTO users (wallet_address, nonce, role)
      VALUES ($1, $2, 'user')
      RETURNING
        id,
        wallet_address as "walletAddress",
        nonce,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
    `;

    const result = await this.db.query<User>(query, [walletAddress, nonce]);
    return result.rows[0]!;
  }

  /**
   * 根据钱包地址查找用户
   */
  private async findUserByWallet(walletAddress: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        wallet_address as "walletAddress",
        nonce,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE wallet_address = $1
    `;

    const result = await this.db.query<User>(query, [walletAddress]);
    return result.rows[0] || null;
  }

  /**
   * 根据 ID 查找用户
   */
  private async findUserById(id: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        wallet_address as "walletAddress",
        nonce,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
      FROM users
      WHERE id = $1
    `;

    const result = await this.db.query<User>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * 更新用户 Nonce
   */
  private async updateNonce(userId: string): Promise<User> {
    const nonce = this.generateNonce();

    const query = `
      UPDATE users
      SET nonce = $2
      WHERE id = $1
      RETURNING
        id,
        wallet_address as "walletAddress",
        nonce,
        role,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_login_at as "lastLoginAt"
    `;

    const result = await this.db.query<User>(query, [userId, nonce]);
    return result.rows[0]!;
  }

  /**
   * 更新 Nonce 和最后登录时间
   */
  private async updateNonceAndLastLogin(userId: string): Promise<void> {
    const nonce = this.generateNonce();

    const query = `
      UPDATE users
      SET nonce = $2, last_login_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [userId, nonce]);
  }
}
