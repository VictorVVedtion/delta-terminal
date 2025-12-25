import { z } from 'zod';

// ============ 用户相关 Schema ============

export const CreateUserSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(8, '密码至少8个字符'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

// ============ 用户资料 Schema ============

export const UpdateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  experience: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
});

// ============ 用户设置 Schema ============

export const UpdateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  tradeNotifications: z.boolean().optional(),
  marketAlerts: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
  defaultExchange: z.string().optional(),
  defaultTradingPair: z.string().optional(),
  defaultOrderType: z.enum(['market', 'limit', 'stop']).optional(),
  twoFactorEnabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currency: z.string().optional(),
});

// ============ API 密钥 Schema ============

export const CreateApiKeySchema = z.object({
  exchange: z.string().min(1, '交易所名称不能为空'),
  name: z.string().min(1, 'API密钥名称不能为空'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  apiSecret: z.string().min(1, 'API Secret 不能为空'),
  passphrase: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// ============ 查询参数 Schema ============

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const UserQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  role: z.enum(['USER', 'PREMIUM', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
});

// ============ TypeScript 类型导出 ============

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;

// ============ 响应类型 ============

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
