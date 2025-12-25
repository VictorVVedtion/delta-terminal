import { userRepository } from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../utils/encryption';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdatePasswordInput,
  UpdateProfileInput,
  UpdateSettingsInput,
  UserQueryInput,
} from '../types';

export class UserService {
  /**
   * 创建新用户
   */
  async createUser(data: CreateUserInput) {
    // 检查邮箱是否已存在
    const emailExists = await userRepository.emailExists(data.email);
    if (emailExists) {
      throw new Error('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    const usernameExists = await userRepository.usernameExists(data.username);
    if (usernameExists) {
      throw new Error('该用户名已被使用');
    }

    // 哈希密码
    const hashedPassword = await hashPassword(data.password);

    // 创建用户
    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
    });

    // 创建默认资料和设置
    await Promise.all([
      userRepository.upsertProfile(user.id, {}),
      userRepository.upsertSettings(user.id, {}),
    ]);

    // 移除密码字段
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 获取用户详情
   */
  async getUserById(id: string, includeRelations = true) {
    const user = await userRepository.findById(id, includeRelations);
    if (!user) {
      throw new Error('用户不存在');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('用户不存在');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 分页查询用户
   */
  async getUsers(params: UserQueryInput) {
    const result = await userRepository.findMany(params);

    // 移除密码字段
    const usersWithoutPassword = result.data.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      ...result,
      data: usersWithoutPassword,
    };
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, data: UpdateUserInput) {
    // 检查用户是否存在
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    // 如果更新邮箱，检查是否已被使用
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await userRepository.emailExists(data.email, id);
      if (emailExists) {
        throw new Error('该邮箱已被使用');
      }
    }

    // 如果更新用户名，检查是否已被使用
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await userRepository.usernameExists(data.username, id);
      if (usernameExists) {
        throw new Error('该用户名已被使用');
      }
    }

    // 更新用户
    const user = await userRepository.update(id, data);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 更新密码
   */
  async updatePassword(id: string, data: UpdatePasswordInput) {
    // 检查用户是否存在
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证当前密码
    const isValid = await verifyPassword(data.currentPassword, user.password);
    if (!isValid) {
      throw new Error('当前密码不正确');
    }

    // 哈希新密码
    const hashedPassword = await hashPassword(data.newPassword);

    // 更新密码
    await userRepository.updatePassword(id, hashedPassword);

    return { message: '密码更新成功' };
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    await userRepository.delete(id);
    return { message: '用户已删除' };
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // 检查用户是否存在
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    return await userRepository.upsertProfile(userId, data);
  }

  /**
   * 获取用户资料
   */
  async getProfile(userId: string) {
    const profile = await userRepository.getProfile(userId);
    if (!profile) {
      // 如果不存在，创建默认资料
      return await userRepository.upsertProfile(userId, {});
    }
    return profile;
  }

  /**
   * 更新用户设置
   */
  async updateSettings(userId: string, data: UpdateSettingsInput) {
    // 检查用户是否存在
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    return await userRepository.upsertSettings(userId, data);
  }

  /**
   * 获取用户设置
   */
  async getSettings(userId: string) {
    const settings = await userRepository.getSettings(userId);
    if (!settings) {
      // 如果不存在，创建默认设置
      return await userRepository.upsertSettings(userId, {});
    }
    return settings;
  }
}

export const userService = new UserService();
