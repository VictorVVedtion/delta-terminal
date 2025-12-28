/**
 * 网格交易策略 Schema
 *
 * 网格策略在设定的价格区间内自动低买高卖，适合震荡行情
 */

import type { StrategySchema } from '@/types/strategy-schema'

export const GRID_STRATEGY_SCHEMA: StrategySchema = {
  type: 'grid',
  name: '网格交易策略',
  description: '在价格区间内设置网格，低买高卖赚取差价，适合震荡行情',
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
      key: 'upperBound',
      label: '价格上界',
      type: 'number',
      defaultValue: 0,
      required: true,
      level: 1,
      group: 'basic',
      order: 2,
      config: { min: 0, step: 0.01, unit: 'USDT', precision: 2 },
      description: '网格的价格上限，超过此价格策略暂停买入',
      constraints: [
        {
          type: 'dependency',
          related_param: 'lowerBound',
          rule: 'value > related',
          message: '上界必须大于下界',
          severity: 'error',
        },
      ],
    },
    {
      key: 'lowerBound',
      label: '价格下界',
      type: 'number',
      defaultValue: 0,
      required: true,
      level: 1,
      group: 'basic',
      order: 3,
      config: { min: 0, step: 0.01, unit: 'USDT', precision: 2 },
      description: '网格的价格下限，低于此价格策略暂停卖出',
    },
    {
      key: 'gridCount',
      label: '网格数量',
      type: 'slider',
      defaultValue: 10,
      required: true,
      level: 1,
      group: 'basic',
      order: 4,
      config: { min: 2, max: 100, step: 1 },
      description: '把区间分成多少格？格子越多，交易越频繁',
    },
    {
      key: 'investment',
      label: '投入金额',
      type: 'number',
      defaultValue: 1000,
      required: true,
      level: 1,
      group: 'basic',
      order: 5,
      config: { min: 10, max: 1000000, step: 10, unit: 'USDT', precision: 2 },
      description: '用于网格交易的总资金',
    },

    // ========================================
    // 计算字段 - 自动生成
    // ========================================
    {
      key: 'gridSpacing',
      label: '每格间距',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'basic',
      order: 6,
      config: { unit: 'USDT', precision: 4 },
      description: '自动计算：(上界 - 下界) / 网格数',
      computed: true,
      formula: 'toFixed((upperBound - lowerBound) / gridCount, 4)',
      dependsOn: ['upperBound', 'lowerBound', 'gridCount'],
      readonly: true,
    },
    {
      key: 'gridProfitPercent',
      label: '每格收益率',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'basic',
      order: 7,
      config: { unit: '%', precision: 2 },
      description: '自动计算：每格间距 / 下界价格',
      computed: true,
      formula: 'lowerBound > 0 ? toFixed((gridSpacing / lowerBound) * 100, 2) : 0',
      dependsOn: ['gridSpacing', 'lowerBound'],
      readonly: true,
    },
    {
      key: 'amountPerGrid',
      label: '每格资金',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 1,
      group: 'basic',
      order: 8,
      config: { unit: 'USDT', precision: 2 },
      description: '自动计算：投入资金 / 网格数',
      computed: true,
      formula: 'toFixed(investment / gridCount, 2)',
      dependsOn: ['investment', 'gridCount'],
      readonly: true,
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
      order: 9,
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
    // 风险管理 - Level 2
    // ========================================
    {
      key: 'stopLossEnabled',
      label: '启用止损',
      type: 'toggle',
      defaultValue: true,
      required: false,
      level: 2,
      group: 'risk',
      order: 1,
      config: {},
      description: '当价格大幅下跌时自动停止策略',
    },
    {
      key: 'stopLossPercent',
      label: '止损比例',
      type: 'slider',
      defaultValue: 15,
      required: false,
      level: 2,
      group: 'risk',
      order: 2,
      config: { min: 5, max: 50, step: 1, unit: '%' },
      description: '跌破下界此比例后停止策略',
      showWhen: 'stopLossEnabled === true',
    },
    {
      key: 'takeProfitEnabled',
      label: '启用止盈',
      type: 'toggle',
      defaultValue: false,
      required: false,
      level: 2,
      group: 'risk',
      order: 3,
      config: {},
      description: '当累计收益达到目标时自动停止策略',
    },
    {
      key: 'takeProfitPercent',
      label: '止盈比例',
      type: 'slider',
      defaultValue: 50,
      required: false,
      level: 2,
      group: 'risk',
      order: 4,
      config: { min: 10, max: 200, step: 5, unit: '%' },
      description: '累计收益达到此比例后停止策略',
      showWhen: 'takeProfitEnabled === true',
    },

    // ========================================
    // 高级设置 - Level 2
    // ========================================
    {
      key: 'gridMode',
      label: '网格模式',
      type: 'button_group',
      defaultValue: 'arithmetic',
      required: false,
      level: 2,
      group: 'advanced',
      order: 1,
      config: {
        options: [
          { value: 'arithmetic', label: '等差网格' },
          { value: 'geometric', label: '等比网格' },
        ],
      },
      description: '等差：价格间距相同；等比：百分比间距相同',
    },
    {
      key: 'triggerPrice',
      label: '触发价格',
      type: 'number',
      defaultValue: 0,
      required: false,
      level: 2,
      group: 'advanced',
      order: 2,
      config: { min: 0, step: 0.01, unit: 'USDT', precision: 2 },
      description: '设置后，价格到达此值才开始运行策略（0 表示立即运行）',
    },
    {
      key: 'baseAssetRatio',
      label: '初始持仓比例',
      type: 'slider',
      defaultValue: 50,
      required: false,
      level: 2,
      group: 'advanced',
      order: 3,
      config: { min: 0, max: 100, step: 5, unit: '%' },
      description: '开始时已持有多少比例的基础货币',
    },
  ],

  validators: [
    {
      name: 'priceRangeValid',
      expression: 'upperBound > lowerBound * 1.01',
      message: '价格区间太小，上界应至少比下界高 1%',
      severity: 'warning',
    },
    {
      name: 'gridCountReasonable',
      expression: 'gridCount >= 5 && gridCount <= 50',
      message: '网格数量建议在 5-50 之间，过多或过少可能影响收益',
      severity: 'warning',
    },
    {
      name: 'investmentPerGrid',
      expression: 'investment / gridCount >= 10',
      message: '每格资金过少（< 10 USDT），可能无法下单',
      severity: 'error',
    },
    {
      name: 'priceRangeNotTooWide',
      expression: '(upperBound - lowerBound) / lowerBound <= 2',
      message: '价格区间跨度超过 200%，资金利用率可能较低',
      severity: 'warning',
    },
  ],

  recommendedSymbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
  recommendedTimeframes: ['15m', '1h', '4h'],

  meta: {
    author: 'Delta Terminal',
    createdAt: '2024-12-27',
    tags: ['网格', '震荡', '中等风险', '自动化'],
  },
}
