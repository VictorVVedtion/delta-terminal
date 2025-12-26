/**
 * 配额管理服务
 *
 * 管理用户 AI 调用配额、成本控制
 */

import type { UserStatus, SubscriptionPlan, UsageStats } from '../types/index.js'

// =============================================================================
// 订阅计划配置
// =============================================================================

interface PlanConfig {
  monthlyCredits: number  // -1 = 无限
  maxCallsPerDay: number
  allowedTiers: string[]
  features: string[]
}

const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    monthlyCredits: 100,
    maxCallsPerDay: 50,
    allowedTiers: ['tier2', 'tier3'],
    features: ['基础模型访问', '每日限量调用'],
  },
  pro: {
    monthlyCredits: 5000,
    maxCallsPerDay: 500,
    allowedTiers: ['tier1', 'tier2', 'tier3'],
    features: ['全部模型访问', '优先响应', 'Agent 功能'],
  },
  enterprise: {
    monthlyCredits: -1,
    maxCallsPerDay: -1,
    allowedTiers: ['tier1', 'tier2', 'tier3'],
    features: ['无限制访问', '专属支持', '自定义配置'],
  },
}

// =============================================================================
// 内存存储 (生产环境应使用 Redis/数据库)
// =============================================================================

interface UserUsageRecord {
  userId: string
  plan: SubscriptionPlan
  monthlyUsed: number
  dailyCalls: number
  lastResetDate: string
  totalCost: number
}

const userUsageStore = new Map<string, UserUsageRecord>()

// =============================================================================
// 配额服务
// =============================================================================

export class QuotaService {
  /**
   * 获取用户状态
   */
  async getUserStatus(userId: string): Promise<UserStatus> {
    const record = this.getOrCreateRecord(userId)
    const planConfig = PLAN_CONFIGS[record.plan]

    // 检查是否需要重置每日调用次数
    const today = new Date().toISOString().split('T')[0]
    if (record.lastResetDate !== today) {
      record.dailyCalls = 0
      record.lastResetDate = today
    }

    const canUseAI = this.checkCanUseAI(record, planConfig)
    const remainingCredits = planConfig.monthlyCredits === -1
      ? 999999
      : Math.max(0, planConfig.monthlyCredits - record.monthlyUsed)

    return {
      userId,
      subscription: {
        plan: record.plan,
        status: 'active',
        currentPeriodEnd: this.getMonthEnd(),
      },
      credits: {
        balance: remainingCredits,
        used: record.monthlyUsed,
        monthlyLimit: planConfig.monthlyCredits,
      },
      limits: {
        canUseAI,
        allowedModels: this.getAllowedModels(record.plan),
        maxCallsPerDay: planConfig.maxCallsPerDay,
        remainingCallsToday: planConfig.maxCallsPerDay === -1
          ? 999999
          : Math.max(0, planConfig.maxCallsPerDay - record.dailyCalls),
      },
    }
  }

  /**
   * 检查用户是否可以调用指定模型
   */
  async checkModelAccess(userId: string, modelId: string): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getUserStatus(userId)

    if (!status.limits.canUseAI) {
      return { allowed: false, reason: '已达到调用限制' }
    }

    // Enterprise 用户可以使用所有模型
    if (status.subscription.plan === 'enterprise') {
      return { allowed: true }
    }

    // 检查模型是否在允许列表中
    if (status.limits.allowedModels.includes('*') || status.limits.allowedModels.includes(modelId)) {
      return { allowed: true }
    }

    return { allowed: false, reason: '当前订阅计划不支持此模型' }
  }

  /**
   * 记录使用量
   */
  async recordUsage(userId: string, usage: UsageStats): Promise<void> {
    const record = this.getOrCreateRecord(userId)

    record.monthlyUsed += usage.totalCost
    record.dailyCalls += 1
    record.totalCost += usage.totalCost

    userUsageStore.set(userId, record)

    // TODO: 持久化到数据库
    console.log(`[QuotaService] User ${userId} usage recorded:`, {
      cost: usage.totalCost.toFixed(6),
      monthlyUsed: record.monthlyUsed.toFixed(4),
      dailyCalls: record.dailyCalls,
    })
  }

  /**
   * 预估调用成本
   */
  estimateCost(modelId: string, estimatedTokens: number): number {
    // 简化估算：假设输入输出 1:1
    const { AI_MODELS } = require('./config.js')
    const model = AI_MODELS[modelId]
    if (!model) return 0

    const inputTokens = Math.floor(estimatedTokens * 0.6)
    const outputTokens = Math.floor(estimatedTokens * 0.4)

    return (inputTokens * model.inputPrice + outputTokens * model.outputPrice) / 1_000_000
  }

  // =============================================================================
  // 私有方法
  // =============================================================================

  private getOrCreateRecord(userId: string): UserUsageRecord {
    let record = userUsageStore.get(userId)

    if (!record) {
      record = {
        userId,
        plan: 'enterprise', // 默认企业版（开发阶段）
        monthlyUsed: 0,
        dailyCalls: 0,
        lastResetDate: new Date().toISOString().split('T')[0]!,
        totalCost: 0,
      }
      userUsageStore.set(userId, record)
    }

    return record
  }

  private checkCanUseAI(record: UserUsageRecord, planConfig: PlanConfig): boolean {
    // 企业版无限制
    if (record.plan === 'enterprise') return true

    // 检查月度额度
    if (record.monthlyUsed >= planConfig.monthlyCredits) return false

    // 检查每日调用次数
    if (record.dailyCalls >= planConfig.maxCallsPerDay) return false

    return true
  }

  private getAllowedModels(plan: SubscriptionPlan): string[] {
    if (plan === 'enterprise') return ['*']

    const planConfig = PLAN_CONFIGS[plan]
    const { AI_MODELS } = require('./config.js')

    return Object.values(AI_MODELS as Record<string, { id: string; tier: string }>)
      .filter(m => planConfig.allowedTiers.includes(m.tier))
      .map(m => m.id)
  }

  private getMonthEnd(): number {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.getTime()
  }
}

// 单例导出
export const quotaService = new QuotaService()
