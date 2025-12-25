import { userService } from '../src/services/user.service';
import { userRepository } from '../src/repositories/user.repository';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    userSettings: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  })),
}));

describe('UserService', () => {
  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        avatar: null,
        timezone: 'UTC',
        language: 'zh-CN',
        isActive: true,
        isVerified: false,
        emailVerified: false,
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      jest.spyOn(userRepository, 'emailExists').mockResolvedValue(false);
      jest.spyOn(userRepository, 'usernameExists').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'upsertProfile').mockResolvedValue({} as any);
      jest.spyOn(userRepository, 'upsertSettings').mockResolvedValue({} as any);

      const result = await userService.createUser({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('邮箱已存在时应该抛出错误', async () => {
      jest.spyOn(userRepository, 'emailExists').mockResolvedValue(true);

      await expect(
        userService.createUser({
          email: 'existing@example.com',
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow('该邮箱已被注册');
    });
  });

  describe('getUserById', () => {
    it('应该返回用户信息（不含密码）', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        avatar: null,
        timezone: 'UTC',
        language: 'zh-CN',
        isActive: true,
        isVerified: false,
        emailVerified: false,
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);

      const result = await userService.getUserById('123');

      expect(result.id).toBe('123');
      expect(result).not.toHaveProperty('password');
    });

    it('用户不存在时应该抛出错误', async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);

      await expect(userService.getUserById('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});
