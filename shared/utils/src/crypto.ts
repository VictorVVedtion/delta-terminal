/**
 * 加密工具函数
 * 注意：生产环境应使用更安全的加密库
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 生成随机字符串
 * @param length 长度
 */
export function generateRandomString(length: number): string {
  return randomBytes(length).toString('hex').slice(0, length);
}

/**
 * 生成 UUID v4
 */
export function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * 计算 SHA256 哈希
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 计算 HMAC-SHA256
 */
export function hmacSha256(data: string, secret: string): string {
  const hmac = createHash('sha256');
  hmac.update(secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * AES-256-GCM 加密
 * @param plaintext 明文
 * @param key 加密密钥 (32 字节)
 * @returns 加密后的字符串 (iv:tag:ciphertext)
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM 解密
 * @param ciphertext 密文 (iv:tag:ciphertext)
 * @param key 解密密钥 (32 字节)
 * @returns 解密后的明文
 */
export function decrypt(ciphertext: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const tag = Buffer.from(parts[1]!, 'hex');
  const encrypted = parts[2]!;

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 安全比较两个字符串 (防止时序攻击)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * 遮蔽敏感字符串 (如 API Key)
 * @param str 原字符串
 * @param visibleStart 开头可见字符数
 * @param visibleEnd 结尾可见字符数
 */
export function maskSensitiveString(
  str: string,
  visibleStart: number = 4,
  visibleEnd: number = 4
): string {
  if (str.length <= visibleStart + visibleEnd) {
    return '*'.repeat(str.length);
  }

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const masked = '*'.repeat(str.length - visibleStart - visibleEnd);

  return `${start}${masked}${end}`;
}
