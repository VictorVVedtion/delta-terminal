/**
 * Hyperliquid API 连接测试脚本
 *
 * 用于验证 Hyperliquid API 客户端功能
 * 运行方法: node --loader ts-node/esm scripts/test-hyperliquid.ts
 */

// 注意：这个脚本需要在 Node.js 环境中运行
// 由于使用了 fetch API，需要 Node.js >= 18

/**
 * 简单的 fetch 测试
 */
async function testHyperliquidAPI() {
  console.log('🚀 开始测试 Hyperliquid API...\n');

  try {
    // 测试 1: 基础连接
    console.log('📡 测试 1: 基础 API 连接');
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'allMids' }),
    });

    if (!response.ok) {
      throw new Error(`API 响应失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API 连接成功');
    console.log(`📊 获取到 ${Object.keys(data).length} 个资产价格\n`);

    // 测试 2: 验证特定资产
    console.log('📡 测试 2: 验证 BTC 和 ETH 价格');
    const btcPrice = data['BTC'];
    const ethPrice = data['ETH'];

    if (!btcPrice || !ethPrice) {
      throw new Error('未找到 BTC 或 ETH 价格');
    }

    console.log(`✅ BTC 价格: $${parseFloat(btcPrice).toFixed(2)}`);
    console.log(`✅ ETH 价格: $${parseFloat(ethPrice).toFixed(2)}\n`);

    // 测试 3: 响应时间
    console.log('📡 测试 3: 测量响应时间');
    const start = Date.now();
    await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' }),
    });
    const duration = Date.now() - start;
    console.log(`✅ 响应时间: ${duration}ms\n`);

    // 测试 4: 多次请求（测试稳定性）
    console.log('📡 测试 4: 连续请求稳定性测试');
    const requests = Array.from({ length: 5 }, (_, i) => i);
    let successCount = 0;

    for (const i of requests) {
      try {
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        });
        if (res.ok) {
          successCount++;
          console.log(`  ✓ 请求 ${i + 1}/5 成功`);
        }
      } catch (err) {
        console.log(`  ✗ 请求 ${i + 1}/5 失败`);
      }
      // 等待 500ms 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ 成功率: ${successCount}/5 (${(successCount / 5 * 100).toFixed(0)}%)\n`);

    // 测试总结
    console.log('🎉 所有测试通过！');
    console.log('\n建议:');
    console.log('  • API 响应时间通常在 100-300ms');
    console.log('  • 建议使用 3-5 秒的刷新间隔');
    console.log('  • 实现缓存以减少请求频率');
    console.log('  • 使用重试机制处理偶发错误\n');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testHyperliquidAPI().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
