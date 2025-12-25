import { PrismaClient, User, UserProfile, UserSettings, Prisma } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '../types';

const prisma = new PrismaClient();

export class UserRepository {
  /**
   * 创建用户
   */
  async create(data: CreateUserInput & { password: string }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string, includeRelations = false): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: includeRelations
        ? {
            profile: true,
            settings: true,
            apiKeys: true,
          }
        : undefined,
    });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * 分页查询用户
   */
  async findMany(params: UserQueryInput) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', search, role, isActive, isVerified } = params;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // 执行查询
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          profile: true,
          settings: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 更新用户
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * 更新密码
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * 创建或更新用户资料
   */
  async upsertProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * 获取用户资料
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  /**
   * 创建或更新用户设置
   */
  async upsertSettings(userId: string, data: Partial<UserSettings>): Promise<UserSettings> {
    return prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * 获取用户设置
   */
  async getSettings(userId: string): Promise<UserSettings | null> {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  /**
   * 检查邮箱是否已存在
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = { email };
    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }
    const count = await prisma.user.count({ where });
    return count > 0;
  }

  /**
   * 检查用户名是否已存在
   */
  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    const where: Prisma.UserWhereInput = { username };
    if (excludeUserId) {
      where.id = { not: excludeUserId };
    }
    const count = await prisma.user.count({ where });
    return count > 0;
  }
}

export const userRepository = new UserRepository();
