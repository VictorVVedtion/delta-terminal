/**
 * 密码服务测试
 */

import { describe, it, expect } from 'vitest';
import { passwordService } from '../src/services/password.service.js';

describe('PasswordService', () => {
  describe('hash', () => {
    it('应该成功哈希密码', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('相同密码应该生成不同的哈希', async () => {
      const password = 'SecurePass123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('应该验证正确的密码', async () => {
      const password = 'SecurePass123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'SecurePass123!';
      const wrongPassword = 'WrongPass456!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('checkStrength', () => {
    it('强密码应该得到高分', () => {
      const password = 'SecurePass123!@#';
      const result = passwordService.checkStrength(password);

      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('弱密码应该得到低分', () => {
      const password = 'weak';
      const result = passwordService.checkStrength(password);

      expect(result.score).toBeLessThan(3);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('应该检测到常见模式', () => {
      const password = 'password123';
      const result = passwordService.checkStrength(password);

      expect(result.feedback).toContain('避免使用常见的密码模式');
    });
  });
});
