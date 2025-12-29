import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 * Delta Terminal - 完整 E2E 测试配置
 *
 * 测试分组:
 * - ai-chat: AI 聊天流程测试 (SC01-SC14)
 * - ai-backtest: 回测部署测试 (SC15-SC22)
 * - ai-monitor: 监控测试 (SC23-SC26)
 * - ai-error: 错误处理测试 (SC27-SC31)
 * - ai-advanced: 高级功能测试 (SC32-SC35)
 *
 * 运行命令:
 * - pnpm test:e2e           # 运行所有测试
 * - pnpm test:e2e:chat      # 仅聊天流程
 * - pnpm test:e2e:backtest  # 仅回测部署
 * - pnpm test:e2e:ci        # CI 模式
 */

// 环境变量
const CI = !!process.env.CI
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',

  // 并行执行配置
  fullyParallel: true,
  workers: CI ? 1 : 4,

  // CI 模式下禁止 .only
  forbidOnly: CI,

  // 重试配置
  retries: CI ? 2 : 0,

  // 超时配置
  timeout: 60 * 1000, // 单个测试 60 秒
  expect: {
    timeout: 10 * 1000, // expect 超时 10 秒
  },

  // 报告配置
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ...(CI ? [['github'] as const] : []),
  ],

  // 全局设置
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 默认超时
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,

    // 本地化
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  // 项目配置 (浏览器)
  projects: [
    // === 主要测试 (Chromium) ===
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // === 按功能分组的测试 ===
    {
      name: 'ai-chat',
      testMatch: /ai-chat-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai-backtest',
      testMatch: /ai-backtest-deploy\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai-monitor',
      testMatch: /ai-monitor\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai-error',
      testMatch: /ai-error-handling\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai-advanced',
      testMatch: /ai-advanced-features\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // === 移动端测试 (可选) ===
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 开发服务器配置
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // 全局设置/清理
  globalSetup: undefined,
  globalTeardown: undefined,

  // 输出目录
  outputDir: './e2e/test-results',
})
