import { PrismaClient, ApiKey } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';
import type { CreateApiKeyInput, UpdateApiKeyInput } from '../types';

const prisma = new PrismaClient();

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
   * 获取用户的所有 API 密钥
   */
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据 ID 获取 API 密钥
   */
  async getApiKeyById(id: string, userId: string): Promise<ApiKey | null> {
    return prisma.apiKey.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * 获取解密后的 API 密钥
   */
  async getDecryptedApiKey(id: string, userId: string) {
    const apiKey = await this.getApiKeyById(id, userId);
    if (!apiKey) {
      throw new Error('API 密钥不存在');
    }

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
   * 根据交易所获取用户的 API 密钥
   */
  async getApiKeysByExchange(userId: string, exchange: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: {
        userId,
        exchange,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const apiKeyService = new ApiKeyService();
