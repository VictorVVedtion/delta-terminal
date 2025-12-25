/**
 * 认证相关验证规则 - 钱包认证
 */

import { z } from 'zod';

// 以太坊地址正则
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * 钱包地址验证
 */
export const walletAddressSchema = z
  .string()
  .regex(ETHEREUM_ADDRESS_REGEX, '无效的以太坊钱包地址');

/**
 * 获取 Nonce 请求
 */
export const getNonceSchema = z.object({
  walletAddress: walletAddressSchema,
});

export type GetNonceInput = z.infer<typeof getNonceSchema>;

/**
 * 钱包登录请求
 */
export const walletLoginSchema = z.object({
  walletAddress: walletAddressSchema,
  signature: z
    .string()
    .min(1, '签名不能为空')
    .regex(/^0x[a-fA-F0-9]+$/, '无效的签名格式'),
});

export type WalletLoginInput = z.infer<typeof walletLoginSchema>;

/**
 * 刷新 Token 请求
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token 不能为空'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
