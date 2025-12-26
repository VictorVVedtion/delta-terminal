#!/usr/bin/env npx tsx
/**
 * AI API 连接测试脚本
 *
 * 测试 OpenRouter API 连接和响应
 *
 * 使用方式:
 *   npx tsx scripts/test-ai-api.ts
 *   或
 *   pnpm test:ai
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// 加载 .env.local 文件
config({ path: resolve(process.cwd(), '.env.local') })

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  dim: (msg: string) => console.log(`${colors.dim}${msg}${colors.reset}`),
}

// 配置
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// 测试模型列表
const TEST_MODELS = [
  'anthropic/claude-3.5-haiku',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
]

interface TestResult {
  name: string
  success: boolean
  duration: number
  error?: string
  details?: Record<string, unknown>
}

const results: TestResult[] = []

// ============================================
// 测试 1: 检查环境变量配置
// ============================================
async function testEnvConfig(): Promise<TestResult> {
  const start = Date.now()
  log.step('测试环境变量配置...')

  if (!OPENROUTER_API_KEY) {
    return {
      name: '环境变量配置',
      success: false,
      duration: Date.now() - start,
      error: 'OPENROUTER_API_KEY 未配置',
    }
  }

  if (OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
    return {
      name: '环境变量配置',
      success: false,
      duration: Date.now() - start,
      error: 'OPENROUTER_API_KEY 使用了占位符值',
    }
  }

  const keyPreview = `${OPENROUTER_API_KEY.slice(0, 12)}...${OPENROUTER_API_KEY.slice(-4)}`

  return {
    name: '环境变量配置',
    success: true,
    duration: Date.now() - start,
    details: {
      apiUrl: OPENROUTER_API_URL,
      keyPreview,
      keyLength: OPENROUTER_API_KEY.length,
    },
  }
}

// ============================================
// 测试 2: 检查 API 可达性
// ============================================
async function testApiReachability(): Promise<TestResult> {
  const start = Date.now()
  log.step('测试 API 可达性...')

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        name: 'API 可达性',
        success: false,
        duration: Date.now() - start,
        error: `HTTP ${response.status}: ${error.error?.message || response.statusText}`,
      }
    }

    const data = await response.json()
    const modelCount = data.data?.length || 0

    return {
      name: 'API 可达性',
      success: true,
      duration: Date.now() - start,
      details: {
        status: response.status,
        modelsAvailable: modelCount,
      },
    }
  } catch (error) {
    return {
      name: 'API 可达性',
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// 测试 3: 非流式 Chat Completion
// ============================================
async function testChatCompletion(model: string): Promise<TestResult> {
  const start = Date.now()
  log.step(`测试模型 ${model} (非流式)...`)

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://delta-terminal.app',
        'X-Title': 'Delta Terminal API Test',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: '回复 "API 测试成功" 这五个字，不要其他内容。' }
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        name: `Chat Completion (${model})`,
        success: false,
        duration: Date.now() - start,
        error: `HTTP ${response.status}: ${error.error?.message || response.statusText}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage || {}

    return {
      name: `Chat Completion (${model})`,
      success: true,
      duration: Date.now() - start,
      details: {
        response: content.slice(0, 100),
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    }
  } catch (error) {
    return {
      name: `Chat Completion (${model})`,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// 测试 4: 流式 Chat Completion
// ============================================
async function testStreamingCompletion(model: string): Promise<TestResult> {
  const start = Date.now()
  log.step(`测试模型 ${model} (流式 SSE)...`)

  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://delta-terminal.app',
        'X-Title': 'Delta Terminal API Test',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: '数到5，每个数字一行。' }
        ],
        max_tokens: 100,
        temperature: 0,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        name: `Streaming (${model})`,
        success: false,
        duration: Date.now() - start,
        error: `HTTP ${response.status}: ${error.error?.message || response.statusText}`,
      }
    }

    // 读取流式响应
    const reader = response.body?.getReader()
    if (!reader) {
      return {
        name: `Streaming (${model})`,
        success: false,
        duration: Date.now() - start,
        error: '无法读取响应流',
      }
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let chunkCount = 0
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        if (!data) continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content) {
            fullContent += content
            chunkCount++
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return {
      name: `Streaming (${model})`,
      success: true,
      duration: Date.now() - start,
      details: {
        response: fullContent.slice(0, 100).replace(/\n/g, ' '),
        chunks: chunkCount,
        contentLength: fullContent.length,
      },
    }
  } catch (error) {
    return {
      name: `Streaming (${model})`,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// 测试 5: 检查账户余额/限制
// ============================================
async function testAccountLimits(): Promise<TestResult> {
  const start = Date.now()
  log.step('检查账户状态...')

  try {
    // OpenRouter 的 /auth/key 端点可以检查 API Key 状态
    const response = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
    })

    if (!response.ok) {
      // 某些 API 可能不支持此端点
      return {
        name: '账户状态',
        success: true,
        duration: Date.now() - start,
        details: {
          note: '无法获取账户详情（端点可能不可用）',
        },
      }
    }

    const data = await response.json()

    return {
      name: '账户状态',
      success: true,
      duration: Date.now() - start,
      details: {
        label: data.data?.label,
        limit: data.data?.limit,
        usage: data.data?.usage,
        rateLimitRequests: data.data?.rate_limit?.requests,
        rateLimitInterval: data.data?.rate_limit?.interval,
      },
    }
  } catch (error) {
    return {
      name: '账户状态',
      success: true,
      duration: Date.now() - start,
      details: {
        note: '无法获取账户详情',
      },
    }
  }
}

// ============================================
// 主测试流程
// ============================================
async function runTests() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           🤖 Delta Terminal AI API 连接测试                ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  // 测试 1: 环境变量
  const envResult = await testEnvConfig()
  results.push(envResult)
  if (envResult.success) {
    log.success(`${envResult.name} (${envResult.duration}ms)`)
    log.dim(`  API URL: ${envResult.details?.apiUrl}`)
    log.dim(`  API Key: ${envResult.details?.keyPreview}`)
  } else {
    log.error(`${envResult.name}: ${envResult.error}`)
    console.log('\n❌ 环境变量配置失败，无法继续测试。')
    console.log('   请检查 .env.local 文件中的 OPENROUTER_API_KEY 配置。')
    process.exit(1)
  }

  console.log('')

  // 测试 2: API 可达性
  const reachResult = await testApiReachability()
  results.push(reachResult)
  if (reachResult.success) {
    log.success(`${reachResult.name} (${reachResult.duration}ms)`)
    log.dim(`  可用模型数: ${reachResult.details?.modelsAvailable}`)
  } else {
    log.error(`${reachResult.name}: ${reachResult.error}`)
  }

  console.log('')

  // 测试 3: 账户状态
  const accountResult = await testAccountLimits()
  results.push(accountResult)
  if (accountResult.success) {
    log.success(`${accountResult.name} (${accountResult.duration}ms)`)
    if (accountResult.details?.label) {
      log.dim(`  标签: ${accountResult.details.label}`)
    }
    if (accountResult.details?.limit) {
      log.dim(`  额度: $${accountResult.details.limit}`)
    }
    if (accountResult.details?.usage) {
      log.dim(`  已用: $${accountResult.details.usage}`)
    }
  }

  console.log('')

  // 测试 4: 选择一个模型进行 Chat Completion 测试
  const testModel = TEST_MODELS[0]! // 使用 Claude Haiku 作为测试模型

  const chatResult = await testChatCompletion(testModel)
  results.push(chatResult)
  if (chatResult.success) {
    log.success(`${chatResult.name} (${chatResult.duration}ms)`)
    log.dim(`  响应: "${chatResult.details?.response}"`)
    log.dim(`  Tokens: ${chatResult.details?.inputTokens} in / ${chatResult.details?.outputTokens} out`)
  } else {
    log.error(`${chatResult.name}: ${chatResult.error}`)
  }

  console.log('')

  // 测试 5: 流式响应
  const streamResult = await testStreamingCompletion(testModel!)
  results.push(streamResult)
  if (streamResult.success) {
    log.success(`${streamResult.name} (${streamResult.duration}ms)`)
    log.dim(`  响应: "${streamResult.details?.response}"`)
    log.dim(`  Chunks: ${streamResult.details?.chunks}, 长度: ${streamResult.details?.contentLength}`)
  } else {
    log.error(`${streamResult.name}: ${streamResult.error}`)
  }

  // 汇总结果
  console.log('')
  console.log('────────────────────────────────────────────────────────────────')
  console.log('')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  if (failed === 0) {
    console.log(`${colors.green}✅ 所有测试通过！${colors.reset}`)
  } else {
    console.log(`${colors.red}❌ ${failed} 个测试失败${colors.reset}`)
  }

  console.log(`   通过: ${passed}, 失败: ${failed}, 总耗时: ${totalDuration}ms`)
  console.log('')

  // 返回退出码
  process.exit(failed > 0 ? 1 : 0)
}

// 运行测试
runTests().catch(error => {
  log.error(`测试运行失败: ${error.message}`)
  process.exit(1)
})
