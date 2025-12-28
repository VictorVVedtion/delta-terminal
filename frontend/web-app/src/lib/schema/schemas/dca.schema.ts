/**
 * DCA 定投策略 Schema
 *
 * 定期定额投资策略，通过分散买入降低成本波动
 */

import type { StrategySchema } from '@/types/strategy-schema'

export const DCA_STRATEGY_SCHEMA: StrategySchema = {
  type: 'dca',
  name: 'DCA 定投策略',
  description: '定期定额投资，通过分散买入时间降低成本波动，适合长期投资',
  version: '1.0.0',

  fields: [
    // ========================================
    // 基础设置 - Level 1
    // ========================================
    {
      key: 'symbol',
      label: '交易对',
      type: 'select',
      defaultValue: 'BTC/USDT',
      required: true,
      level: 1,
      group: 'basic',
      order: 1,
      config: {
        options: [
          { value: 'BTC/USDT', label: 'BTC/USDT' },
          { value: 'ETH/USDT', label: 'ETH/USDT' },
          { value: 'SOL/USDT', label: 'SOL/USDT' },
          { value: 'BNB/USDT', label: 'BNB/USDT' },
        ],
      },
      description: '选择要定投的币种',
    },
    {
      key: 'investmentAmount',
      label: '每次投入金额',
      type: 'number',
      defaultValue: 100,
      required: true,
      level: 1,
      group: 'basic',
      order: 2,
      config: { min: 10, max: 100000, step: 10, unit: 'USDT', precision: 2 },
      description: '每次定投的固定金额',
    },
    {
      key: 'frequency',
      label: '定投频率',
      type: 'button_group',
      defaultValue: 'weekly',
      required: true,
      level: 1,
      group: 'basic',
      order: 3,
      config: {
        options: [
          { value: 'daily', label: '每天' },
          { value: 'weekly', label: '每周' },
          { value: 'biweekly', label: '每两周' },
          { value: 'monthly', label: '每月' },
        ],
      },
      description: '定投执行的时间间隔',
    },
    {
      key: 'totalInvestment',
      label: '计划总投入',
      type: 'number',
      defaultValue: 10000,
      required: true,
      level: 1,
      group: 'basic',
      order: 4,
      config: { min: 100, max: 10000000, step: 100, unit: 'USDT', precision: 2 },
      description: '定投计划的总投资金额',
    },

    // ========================================
    // 回测设置 - Level 1
    // ========================================
    {
      key: 'backtestDays',
      label: '回测时间',
      type: 'select',
      defaultValue: 365,
      required: false,
      level: 1,
      group: 'basic',
      order: 10,
      config: {
        options: [
          { value: 30, label: '30 天' },
          { value: 90, label: '90 天' },
          { value: 180, label: '180 天' },
          { value: 365, label: '1 年（推荐）' },
          { value: 730, label: '2 年' },
          { value: 1095, label: '3 年' },
          { value: 1825, label: '5 年' },
        ],
      },
      description: '选择回测使用的历史数据时间范围（DCA 建议用更长时间）',
    },

    // ========================================
    // 计算字段
    // ========================================
    {
      key: 'estimatedPurchases',
      label: '预计购买次数',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'basic',
      order: 5,
      config: { precision: 0 },
      description: '自动计算：计划总投入 / 每次投入',
      computed: true,
      formula: 'floor(totalInvestment / investmentAmount)',
      dependsOn: ['totalInvestment', 'investmentAmount'],
      readonly: true,
    },
    {
      key: 'estimatedDuration',
      label: '预计持续时间',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'basic',
      order: 6,
      config: { unit: '期' },
      description: '预计执行期数（根据频率计算实际时间）',
      computed: true,
      formula: 'estimatedPurchases',
      dependsOn: ['estimatedPurchases', 'frequency'],
      readonly: true,
    },

    // ========================================
    // 入场条件 - Level 1
    // ========================================
    {
      key: 'executionTime',
      label: '执行时间',
      type: 'select',
      defaultValue: '09:00',
      required: false,
      level: 1,
      group: 'entry',
      order: 1,
      config: {
        options: [
          { value: '00:00', label: '00:00 UTC' },
          { value: '06:00', label: '06:00 UTC' },
          { value: '09:00', label: '09:00 UTC' },
          { value: '12:00', label: '12:00 UTC' },
          { value: '18:00', label: '18:00 UTC' },
        ],
      },
      description: '每次定投的执行时间',
    },
    {
      key: 'executionDay',
      label: '执行日期',
      type: 'select',
      defaultValue: 'monday',
      required: false,
      level: 1,
      group: 'entry',
      order: 2,
      config: {
        options: [
          { value: 'monday', label: '周一' },
          { value: 'tuesday', label: '周二' },
          { value: 'wednesday', label: '周三' },
          { value: 'thursday', label: '周四' },
          { value: 'friday', label: '周五' },
          { value: 'saturday', label: '周六' },
          { value: 'sunday', label: '周日' },
        ],
      },
      description: '每周定投的执行日期（仅周定投适用）',
      showWhen: "frequency === 'weekly' || frequency === 'biweekly'",
    },

    // ========================================
    // 风险管理 - Level 2
    // ========================================
    {
      key: 'enableDipBuying',
      label: '启用抄底加仓',
      type: 'toggle',
      defaultValue: false,
      required: false,
      level: 2,
      group: 'risk',
      order: 1,
      config: {},
      description: '当价格大幅下跌时额外加仓',
    },
    {
      key: 'dipThreshold',
      label: '抄底触发跌幅',
      type: 'slider',
      defaultValue: 10,
      required: false,
      level: 2,
      group: 'risk',
      order: 2,
      config: { min: 5, max: 30, step: 1, unit: '%' },
      description: '价格下跌超过此比例时触发额外买入',
      showWhen: 'enableDipBuying === true',
    },
    {
      key: 'dipMultiplier',
      label: '抄底加仓倍数',
      type: 'slider',
      defaultValue: 2,
      required: false,
      level: 2,
      group: 'risk',
      order: 3,
      config: { min: 1.5, max: 5, step: 0.5 },
      description: '抄底时买入金额 = 正常金额 × 此倍数',
      showWhen: 'enableDipBuying === true',
    },
    {
      key: 'takeProfitEnabled',
      label: '启用止盈',
      type: 'toggle',
      defaultValue: false,
      required: false,
      level: 2,
      group: 'risk',
      order: 4,
      config: {},
      description: '当持仓收益达到目标时卖出',
    },
    {
      key: 'takeProfitPercent',
      label: '止盈比例',
      type: 'slider',
      defaultValue: 50,
      required: false,
      level: 2,
      group: 'risk',
      order: 5,
      config: { min: 10, max: 200, step: 10, unit: '%' },
      description: '持仓收益达到此比例时卖出',
      showWhen: 'takeProfitEnabled === true',
    },

    // ========================================
    // 高级设置 - Level 2
    // ========================================
    {
      key: 'slippageTolerance',
      label: '滑点容忍度',
      type: 'slider',
      defaultValue: 0.5,
      required: false,
      level: 2,
      group: 'advanced',
      order: 1,
      config: { min: 0.1, max: 2, step: 0.1, unit: '%' },
      description: '允许的最大价格滑点',
    },
    {
      key: 'retryOnFail',
      label: '失败重试',
      type: 'toggle',
      defaultValue: true,
      required: false,
      level: 2,
      group: 'advanced',
      order: 2,
      config: {},
      description: '定投失败时自动重试',
    },
  ],

  validators: [
    {
      name: 'investmentReasonable',
      expression: 'investmentAmount >= 10',
      message: '每次投入金额至少需要 10 USDT',
      severity: 'error',
    },
    {
      name: 'totalGreaterThanSingle',
      expression: 'totalInvestment >= investmentAmount * 4',
      message: '计划总投入建议至少是单次金额的 4 倍',
      severity: 'warning',
    },
  ],

  recommendedSymbols: ['BTC/USDT', 'ETH/USDT'],
  recommendedTimeframes: [],

  meta: {
    author: 'Delta Terminal',
    createdAt: '2024-12-27',
    tags: ['DCA', '定投', '长期', '低风险'],
  },
}
