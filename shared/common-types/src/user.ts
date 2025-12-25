import { z } from 'zod';

/**
 * 用户角色枚举
 */
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  PREMIUM: 'premium',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * 用户状态枚举
 */
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * 用户基础信息 Schema
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50).optional(),
  role: z.enum(['admin', 'user', 'premium']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended', 'pending_verification']).default('pending_verification'),
  emailVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * 用户注册请求 Schema
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .regex(/[A-Z]/, '密码需要包含至少一个大写字母')
    .regex(/[a-z]/, '密码需要包含至少一个小写字母')
    .regex(/[0-9]/, '密码需要包含至少一个数字')
    .regex(/[^A-Za-z0-9]/, '密码需要包含至少一个特殊字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * 用户登录请求 Schema
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * 登录响应 Schema
 */
export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserSchema.pick({
    id: true,
    email: true,
    username: true,
    role: true,
    emailVerified: true,
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * JWT Payload 类型
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
