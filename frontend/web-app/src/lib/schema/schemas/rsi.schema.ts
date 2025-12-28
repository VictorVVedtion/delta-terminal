/**
 * RSI 反转策略 Schema
 *
 * 基于相对强弱指数(RSI)的超买超卖反转策略
 */

import type { StrategySchema } from '@/types/strategy-schema'

export const RSI_REVERSAL_SCHEMA: StrategySchema = {
  type: 'rsi_reversal',
  name: 'RSI 反转策略',
  description: '基于 RSI 指标的超买超卖反转策略，在 RSI 极值时进行反向操作',
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
      description: '选择要交易的币种',
    },
    {
      key: 'timeframe',
      label: '时间周期',
      type: 'button_group',
      defaultValue: '1h',
      required: true,
      level: 1,
      group: 'basic',
      order: 2,
      config: {
        options: [
          { value: '15m', label: '15分钟' },
          { value: '1h', label: '1小时' },
          { value: '4h', label: '4小时' },
          { value: '1d', label: '1天' },
        ],
      },
      description: 'K线时间周期',
    },

    // ========================================
    // 入场条件 - Level 1
    // ========================================
    {
      key: 'rsiPeriod',
      label: 'RSI 周期',
      type: 'slider',
      defaultValue: 14,
      required: true,
      level: 1,
      group: 'entry',
      order: 1,
      config: { min: 5, max: 30, step: 1 },
      description: '计算 RSI 使用的 K 线数量',
    },
    {
      key: 'rsiOversold',
      label: 'RSI 超卖阈值',
      type: 'slider',
      defaultValue: 30,
      required: true,
      level: 1,
      group: 'entry',
      order: 2,
      config: { min: 10, max: 40, step: 1 },
      description: 'RSI 低于此值视为超卖，触发买入',
    },
    {
      key: 'rsiOverbought',
      label: 'RSI 超买阈值',
      type: 'slider',
      defaultValue: 70,
      required: true,
      level: 1,
      group: 'entry',
      order: 3,
      config: { min: 60, max: 90, step: 1 },
      description: 'RSI 高于此值视为超买，触发卖出',
    },
    {
      key: 'positionSize',
      label: '仓位大小',
      type: 'slider',
      defaultValue: 20,
      required: true,
      level: 1,
      group: 'entry',
      order: 4,
      config: { min: 5, max: 100, step: 5, unit: '%' },
      description: '每次交易使用的资金比例',
    },

    // ========================================
    // 回测设置 - Level 1
    // ========================================
    {
      key: 'backtestDays',
      label: '回测时间',
      type: 'select',
      defaultValue: 90,
      required: false,
      level: 1,
      group: 'basic',
      order: 10,
      config: {
        options: [
          { value: 7, label: '7 天' },
          { value: 30, label: '30 天' },
          { value: 90, label: '90 天（推荐）' },
          { value: 180, label: '180 天' },
          { value: 365, label: '1 年' },
          { value: 730, label: '2 年' },
          { value: 1095, label: '3 年' },
          { value: 1825, label: '5 年' },
        ],
      },
      description: '选择回测使用的历史数据时间范围',
    },

    // ========================================
    // 计算字段
    // ========================================
    {
      key: 'rsiRange',
      label: 'RSI 交易区间',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'entry',
      order: 5,
      config: { precision: 0 },
      description: '超买与超卖阈值之间的范围',
      computed: true,
      formula: 'rsiOverbought - rsiOversold',
      dependsOn: ['rsiOverbought', 'rsiOversold'],
      readonly: true,
    },

    // ========================================
    // 风险管理 - Level 2
    // ========================================
    {
      key: 'stopLossPercent',
      label: '止损比例',
      type: 'slider',
      defaultValue: 5,
      required: false,
      level: 2,
      group: 'risk',
      order: 1,
      config: { min: 1, max: 20, step: 0.5, unit: '%' },
      description: '单笔交易最大亏损比例',
    },
    {
      key: 'takeProfitPercent',
      label: '止盈比例',
      type: 'slider',
      defaultValue: 10,
      required: false,
      level: 2,
      group: 'risk',
      order: 2,
      config: { min: 2, max: 50, step: 1, unit: '%' },
      description: '单笔交易目标盈利比例',
    },
    {
      key: 'maxOpenPositions',
      label: '最大持仓数',
      type: 'slider',
      defaultValue: 3,
      required: false,
      level: 2,
      group: 'risk',
      order: 3,
      config: { min: 1, max: 10, step: 1 },
      description: '同时持有的最大仓位数量',
    },

    // ========================================
    // 高级设置 - Level 2
    // ========================================
    {
      key: 'confirmationCandles',
      label: '确认 K 线数',
      type: 'slider',
      defaultValue: 1,
      required: false,
      level: 2,
      group: 'advanced',
      order: 1,
      config: { min: 0, max: 5, step: 1 },
      description: '信号触发后等待几根 K 线确认',
    },
    {
      key: 'useVolumeFilter',
      label: '成交量过滤',
      type: 'toggle',
      defaultValue: false,
      required: false,
      level: 2,
      group: 'advanced',
      order: 2,
      config: {},
      description: '只在成交量放大时执行交易',
    },
    {
      key: 'volumeMultiplier',
      label: '成交量倍数',
      type: 'slider',
      defaultValue: 1.5,
      required: false,
      level: 2,
      group: 'advanced',
      order: 3,
      config: { min: 1, max: 3, step: 0.1 },
      description: '成交量需要超过平均的多少倍',
      showWhen: 'useVolumeFilter === true',
    },
  ],

  validators: [
    {
      name: 'rsiThresholdsValid',
      expression: 'rsiOverbought > rsiOversold + 20',
      message: 'RSI 超买阈值应比超卖阈值至少高 20',
      severity: 'error',
    },
    {
      name: 'rsiRangeReasonable',
      expression: 'rsiOverbought - rsiOversold >= 30',
      message: 'RSI 交易区间建议至少 30，避免频繁交易',
      severity: 'warning',
    },
    {
      name: 'positionSizeReasonable',
      expression: 'positionSize <= 50',
      message: '单次仓位超过 50% 风险较高',
      severity: 'warning',
    },
  ],

  recommendedSymbols: ['BTC/USDT', 'ETH/USDT'],
  recommendedTimeframes: ['1h', '4h'],

  meta: {
    author: 'Delta Terminal',
    createdAt: '2024-12-27',
    tags: ['RSI', '反转', '技术指标', '中等风险'],
  },
}
