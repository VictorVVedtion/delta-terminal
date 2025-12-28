import { PrismaClient, ApiKey } from '@prisma/client';
import { encrypt, decrypt, maskSensitiveString, logAuditEvent } from '../utils/encryption';
import type { CreateApiKeyInput, UpdateApiKeyInput } from '../types';

const prisma = new PrismaClient();

/**
 * API 密钥返回类型 (安全版本，不包含敏感信息)
 */
export type SafeApiKey = Omit<ApiKey, 'apiSecret' | 'passphrase'> & {
  apiSecret: string; // 掩码版本
  passphrase: string | null; // 掩码版本
};

export class ApiKeyService {
  /**
   * 创建 API 密钥
   */
  async createApiKey(userId: string, data: CreateApiKeyInput): Promise<ApiKey> {
    // 加密敏感信息
    const encryptedApiKey = encrypt(data.apiKey);
    const encryptedApiSecret = encrypt(data.apiSecret);
    const encryptedPassphrase = data.passphrase ? encrypt(data.passphrase) : null;

    return prisma.apiKey.create({
      data: {
        userId,
        exchange: data.exchange,
        name: data.name,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        passphrase: encryptedPassphrase,
        permissions: data.permissions || [],
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * 获取用户的所有 API 密钥 (安全版本 - 掩码敏感信息)
   */
  async getApiKeys(userId: string): Promise<SafeApiKey[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // 掩码敏感信息
    return apiKeys.map(key => this._maskApiKey(key));
  }

  /**
   * 掩码 API 密钥敏感信息
   */
  private _maskApiKey(apiKey: ApiKey): SafeApiKey {
    return {
      ...apiKey,
      apiKey: maskSensitiveString(decrypt(apiKey.apiKey)), // 解密后掩码
      apiSecret: '***masked***', // 完全掩码
      passphrase: apiKey.passphrase ? '***masked***' : null, // 完全掩码
    };
  }

  /**
   * 根据 ID 获取 API 密钥 (安全版本 - 掩码敏感信息)
   */
  async getApiKeyById(id: string, userId: string): Promise<SafeApiKey | null> {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!apiKey) {
      return null;
    }

    return this._maskApiKey(apiKey);
  }

  /**
   * 获取解密后的 API 密钥 (仅用于内部交易引擎调用)
   *
   * ⚠️ 安全警告:
   * - 此方法返回明文密钥，仅应在服务端内部使用
   * - 调用会被记录到审计日志
   * - 禁止将返回值直接暴露给前端或 API 响应
   *
   * @param id - API 密钥 ID
   * @param userId - 用户 ID
   * @param requestContext - 请求上下文 (用于审计)
   */
  async getDecryptedApiKey(
    id: string,
    userId: string,
    requestContext?: { ipAddress?: string; userAgent?: string; purpose?: string }
  ) {
    // 先获取原始数据（需要从数据库重新查询，不能用掩码版本）
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new Error('API 密钥不存在');
    }

    // 记录审计日志
    logAuditEvent({
      timestamp: new Date(),
      userId,
      action: 'API_KEY_DECRYPT',
      resource: 'ApiKey',
      resourceId: id,
      ipAddress: requestContext?.ipAddress,
      userAgent: requestContext?.userAgent,
      metadata: {
        exchange: apiKey.exchange,
        purpose: requestContext?.purpose || 'trading_execution',
      },
    });

    // 解密并返回
    return {
      ...apiKey,
      apiKey: decrypt(apiKey.apiKey),
      apiSecret: decrypt(apiKey.apiSecret),
      passphrase: apiKey.passphrase ? decrypt(apiKey.passphrase) : null,
    };
  }

  /**
   * 更新 API 密钥
   */
  async updateApiKey(id: string, userId: string, data: UpdateApiKeyInput): Promise<ApiKey> {
    // 检查 API 密钥是否存在且属于该用户
    const existingKey = await this.getApiKeyById(id, userId);
    if (!existingKey) {
      throw new Error('API 密钥不存在');
    }

    return prisma.apiKey.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.isActive,
        permissions: data.permissions,
        metadata: data.metadata,
      },
    });
  }

  /**
   * 删除 API 密钥
   */
  async deleteApiKey(id: string, userId: string): Promise<void> {
    // 检查 API 密钥是否存在且属于该用户
    const existingKey = await this.getApiKeyById(id, userId);
    if (!existingKey) {
      throw new Error('API 密钥不存在');
    }

    await prisma.apiKey.delete({
      where: { id },
    });
  }

  /**
   * 更新 API 密钥最后使用时间
   */
  async updateLastUsed(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * 根据交易所获取用户的 API 密钥 (安全版本 - 掩码敏感信息)
   */
  async getApiKeysByExchange(userId: string, exchange: string): Promise<SafeApiKey[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId,
        exchange,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(key => this._maskApiKey(key));
  }
}

export const apiKeyService = new ApiKeyService();
