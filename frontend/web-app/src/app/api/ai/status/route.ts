/**
 * AI Status API Route
 *
 * 获取用户 AI 服务状态
 *
 * ⚠️ MVP 阶段：返回企业版无限制状态
 * TODO: 生产环境需要实现以下功能：
 * - 从数据库获取用户订阅信息
 * - 从 Stripe/支付系统获取计费状态
 * - 计算实际配额使用量
 * - 检查用户权限和模型访问
 */

import { NextResponse } from 'next/server'

import type { AIUserStatus } from '@/types/ai'

export const dynamic = 'force-dynamic'

// =============================================================================
// Configuration
// =============================================================================

/**
 * MVP 阶段使用无限制状态
 * 生产环境应从数据库/缓存获取用户状态
 */
const IS_MVP_MODE = process.env.NODE_ENV !== 'production' || process.env.ENABLE_MVP_MODE === 'true'

// =============================================================================
// Route Handler
// =============================================================================

// GET /api/ai/status - 获取 AI 服务状态
export function GET() {
  if (IS_MVP_MODE) {
    // MVP 模式：返回企业版无限制状态，用于开发和测试
    const status: AIUserStatus = {
      subscription: {
        plan: 'enterprise',
        status: 'active',
        currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
      },
      credits: {
        balance: 999999,
        used: 0,
        includedRemaining: 999999,
      },
      usage: {
        monthCalls: 0,
        monthCost: 0,
      },
      limits: {
        canUseAI: true,
        allowedModels: ['*'], // 全部模型
        maxCallsPerDay: 999999,
        remainingCallsToday: 999999,
      },
    }

    return NextResponse.json(status)
  }

  // TODO: 生产环境实现
  // 1. 验证用户身份 (JWT)
  // 2. 查询数据库获取用户订阅状态
  // 3. 查询使用量统计
  // 4. 计算剩余配额
  // 5. 返回真实状态

  // 临时: 返回基础免费版状态
  const status: AIUserStatus = {
    subscription: {
      plan: 'free',
      status: 'active',
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
    },
    credits: {
      balance: 100,
      used: 0,
      includedRemaining: 100,
    },
    usage: {
      monthCalls: 0,
      monthCost: 0,
    },
    limits: {
      canUseAI: true,
      allowedModels: ['claude-3-5-sonnet-20241022', 'gpt-4o-mini'],
      maxCallsPerDay: 100,
      remainingCallsToday: 100,
    },
  }

  return NextResponse.json(status)
}
