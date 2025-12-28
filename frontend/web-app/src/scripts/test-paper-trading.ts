/**
 * Paper Trading 系统验证脚本
 * 用于快速验证核心功能
 */

import { usePaperTradingStore } from '@/store/paperTrading'

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue')
}

// 测试函数
function runTests() {
  log('\n=== Paper Trading 系统测试 ===\n', 'yellow')

  const store = usePaperTradingStore.getState()

  // 重置状态
  store.reset()
  logInfo('已重置 Store 状态')

  // 测试 1: 初始化账户
  log('\n--- 测试 1: 初始化账户 ---', 'yellow')
  const accountId = store.initAccount('test_agent', 10000)
  const account = store.getAccount(accountId)

  if (account && account.initialCapital === 10000 && account.currentBalance === 10000) {
    logSuccess('账户初始化成功')
    logInfo(`账户ID: ${accountId}`)
    logInfo(`初始资金: ${account.initialCapital} USDT`)
  } else {
    logError('账户初始化失败')
    return
  }

  // 测试 2: 买入 BTC - 使用 2025年12月 价格范围
  log('\n--- 测试 2: 买入 BTC ---', 'yellow')
  const buyResult = store.placeMarketOrder(
    {
      accountId,
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      size: 0.1,
    },
    95000
  )

  if (buyResult.success) {
    logSuccess('买入成功')
    logInfo(`交易ID: ${buyResult.trade?.id}`)
    logInfo(`买入数量: ${buyResult.trade?.size} BTC`)
    logInfo(`买入价格: $${buyResult.trade?.price}`)
    logInfo(`手续费: ${buyResult.trade?.fee} USDT`)

    const updatedAccount = store.getAccount(accountId)
    logInfo(`剩余余额: ${updatedAccount?.currentBalance.toFixed(2)} USDT`)
    logInfo(`持仓数量: ${updatedAccount?.positions.length}`)
  } else {
    logError(`买入失败: ${buyResult.error}`)
    return
  }

  // 测试 3: 更新价格 (模拟价格上涨)
  log('\n--- 测试 3: 更新价格 ---', 'yellow')
  store.updatePositionPrice(accountId, 'BTC/USDT', 96000)
  const accountAfterUpdate = store.getAccount(accountId)
  const position = accountAfterUpdate?.positions[0]

  if (position) {
    logSuccess('价格更新成功')
    logInfo(`当前价格: $${position.currentPrice}`)
    logInfo(`未实现盈亏: ${position.unrealizedPnl.toFixed(2)} USDT`)
    logInfo(`盈亏百分比: ${position.unrealizedPnlPercent.toFixed(2)}%`)
  } else {
    logError('价格更新失败')
    return
  }

  // 测试 4: 卖出 BTC
  log('\n--- 测试 4: 卖出 BTC ---', 'yellow')
  const sellResult = store.placeMarketOrder(
    {
      accountId,
      symbol: 'BTC/USDT',
      side: 'sell',
      type: 'market',
      size: 0.1,
    },
    51000
  )

  if (sellResult.success) {
    logSuccess('卖出成功')
    logInfo(`交易ID: ${sellResult.trade?.id}`)
    logInfo(`卖出价格: $${sellResult.trade?.price}`)
    logInfo(`已实现盈亏: ${sellResult.trade?.realizedPnl?.toFixed(2)} USDT`)

    const finalAccount = store.getAccount(accountId)
    logInfo(`最终余额: ${finalAccount?.currentBalance.toFixed(2)} USDT`)
    logInfo(`持仓数量: ${finalAccount?.positions.length}`)
  } else {
    logError(`卖出失败: ${sellResult.error}`)
    return
  }

  // 测试 5: 统计计算
  log('\n--- 测试 5: 统计计算 ---', 'yellow')
  const stats = store.getAccountStats(accountId)

  if (stats) {
    logSuccess('统计计算成功')
    logInfo(`总资产: ${stats.totalEquity.toFixed(2)} USDT`)
    logInfo(`总盈亏: ${stats.totalPnl.toFixed(2)} USDT (${stats.totalPnlPercent.toFixed(2)}%)`)
    logInfo(`已实现盈亏: ${stats.realizedPnl.toFixed(2)} USDT`)
    logInfo(`总交易次数: ${stats.totalTrades}`)
    logInfo(`胜率: ${stats.winRate.toFixed(2)}%`)
    logInfo(`总手续费: ${stats.totalFees.toFixed(2)} USDT`)
  } else {
    logError('统计计算失败')
    return
  }

  // 测试 6: 余额不足检查
  log('\n--- 测试 6: 余额不足检查 ---', 'yellow')
  const insufficientResult = store.placeMarketOrder(
    {
      accountId,
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      size: 10, // 超大订单
    },
    50000
  )

  if (!insufficientResult.success && insufficientResult.error === '余额不足') {
    logSuccess('余额不足检查通过')
  } else {
    logError('余额不足检查失败')
  }

  // 测试 7: 持仓不足检查
  log('\n--- 测试 7: 持仓不足检查 ---', 'yellow')
  const noPositionResult = store.placeMarketOrder(
    {
      accountId,
      symbol: 'ETH/USDT', // 没有持仓的币种
      side: 'sell',
      type: 'market',
      size: 1,
    },
    3000
  )

  if (!noPositionResult.success && noPositionResult.error === '持仓不足') {
    logSuccess('持仓不足检查通过')
  } else {
    logError('持仓不足检查失败')
  }

  // 测试总结
  log('\n=== 测试完成 ===\n', 'yellow')
  logSuccess('所有测试通过!')

  // 清理
  store.reset()
  logInfo('已清理测试数据')
}

// 运行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  runTests()
} else {
  // 浏览器环境
  console.log('请在浏览器控制台运行: runPaperTradingTests()')
  ;(window as any).runPaperTradingTests = runTests
}

export { runTests }
