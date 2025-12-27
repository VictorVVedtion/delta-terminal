/**
 * AI Status API Route
 *
 * 获取用户 AI 服务状态（简化版，无订阅限制）
 */

import { NextResponse } from 'next/server'

import type { AIUserStatus } from '@/types/ai'

// GET /api/ai/status - 获取 AI 服务状态
export function GET() {
  // 简化版：返回企业版无限制状态
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
      allowedModels: ['*'],  // 全部模型
      maxCallsPerDay: 999999,
      remainingCallsToday: 999999,
    },
  }

  return NextResponse.json(status)
}
