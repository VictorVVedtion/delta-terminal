import { z } from 'zod';

/**
 * 用户状态
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * 用户角色
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  TRADER = 'trader',
}

/**
 * 用户 Schema
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * 用户创建请求
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

/**
 * 用户登录请求
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

/**
 * 用户认证响应
 */
export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
