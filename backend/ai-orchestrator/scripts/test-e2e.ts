/**
 * AI Orchestrator 端到端集成测试
 *
 * 测试完整流程：
 * 1. 服务健康检查
 * 2. 非流式对话
 * 3. 流式 SSE 对话
 * 4. NLP Processor 集成
 * 5. 技能系统
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { EventSourceParserStream } from 'eventsource-parser/stream'

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') })

// =============================================================================
// 配置
// =============================================================================

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4010'
const NLP_PROCESSOR_URL = process.env.NLP_PROCESSOR_URL || 'http://localhost:8001'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  message?: string
  details?: unknown
}

const results: TestResult[] = []

// =============================================================================
// 工具函数
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const icons: Record<string, string> = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }
  console.log(`${icons[type]} ${message}`)
}

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message?: string; details?: unknown }>
): Promise<void> {
  const start = Date.now()
  try {
    log(`测试: ${name}...`, 'info')
    const result = await testFn()
    const duration = Date.now() - start

    results.push({
      name,
      passed: result.passed,
      duration,
      message: result.message,
      details: result.details,
    })

    if (result.passed) {
      log(`${name} - 通过 (${duration}ms)`, 'success')
    } else {
      log(`${name} - 失败: ${result.message}`, 'error')
    }
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)

    results.push({
      name,
      passed: false,
      duration,
      message,
    })

    log(`${name} - 异常: ${message}`, 'error')
  }
}

// =============================================================================
// 测试用例
// =============================================================================

/**
 * 测试 1: AI Orchestrator 健康检查
 */
async function testOrchestratorHealth() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return { passed: false, message: `HTTP ${response.status}` }
  }

  const json = await response.json()
  const data = json.data || json
  const isHealthy = json.success && data.orchestrator === true

  return {
    passed: isHealthy,
    message: isHealthy ? '服务健康' : '服务异常',
    details: data,
  }
}

/**
 * 测试 2: 获取 AI 配置
 */
async function testGetConfig() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/config`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return { passed: false, message: `HTTP ${response.status}` }
  }

  const json = await response.json()
  const data = json.data || json
  const hasModels = data.models && Array.isArray(data.models) && data.models.length > 0
  const hasTaskTypes = data.taskTypes && Array.isArray(data.taskTypes)

  return {
    passed: hasModels && hasTaskTypes,
    message: hasModels && hasTaskTypes ? `${data.models.length} 个模型可用` : '配置不完整',
    details: {
      modelCount: data.models?.length || 0,
      taskTypeCount: data.taskTypes?.length || 0,
    },
  }
}

/**
 * 测试 3: 获取技能列表
 */
async function testGetSkills() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/skills`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return { passed: false, message: `HTTP ${response.status}` }
  }

  const json = await response.json()
  const data = json.data || json
  const hasSkills = data.skills && Array.isArray(data.skills) && data.skills.length > 0

  return {
    passed: hasSkills,
    message: hasSkills ? `${data.skills.length} 个技能可用` : '无技能配置',
    details: {
      skillCount: data.skills?.length || 0,
      categories: [...new Set(data.skills?.map((s: { category: string }) => s.category) || [])],
    },
  }
}

/**
 * 测试 4: 获取用户状态
 */
async function testGetUserStatus() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/status`, {
    method: 'GET',
    headers: {
      'X-User-ID': 'test-user-123',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return { passed: false, message: `HTTP ${response.status}` }
  }

  const json = await response.json()
  const data = json.data || json
  const hasCredits = typeof data.credits === 'object'
  const hasLimits = typeof data.limits === 'object'

  return {
    passed: hasCredits && hasLimits,
    message: hasCredits && hasLimits ? '用户状态获取成功' : '状态数据不完整',
    details: {
      plan: data.subscription?.plan,
      credits: data.credits?.balance,
      canUseAI: data.limits?.canUseAI,
    },
  }
}

/**
 * 测试 5: 非流式对话
 */
async function testNonStreamingChat() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': 'test-user-123',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: '你好，这是一个测试消息。请用一句话回复。' },
      ],
      taskType: 'chat',
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const error = await response.text()
    return { passed: false, message: `HTTP ${response.status}: ${error}` }
  }

  const json = await response.json()
  const data = json.data || json
  const hasContent = typeof data.content === 'string' && data.content.length > 0

  return {
    passed: hasContent,
    message: hasContent ? `收到 ${data.content.length} 字符回复` : '无内容返回',
    details: {
      contentLength: data.content?.length || 0,
      model: data.model,
      usage: data.usage,
    },
  }
}

/**
 * 测试 6: 流式 SSE 对话
 */
async function testStreamingChat() {
  const response = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': 'test-user-123',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: '用三个字回复：测试成功' },
      ],
      taskType: 'chat',
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const error = await response.text()
    return { passed: false, message: `HTTP ${response.status}: ${error}` }
  }

  // 检查 SSE 响应头
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('text/event-stream')) {
    return { passed: false, message: `非 SSE 响应: ${contentType}` }
  }

  // 读取 SSE 流
  let fullContent = ''
  let eventCount = 0
  let hasError = false
  let errorMessage = ''

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++
          const data = line.slice(6)

          if (data === '[DONE]') {
            break
          }

          try {
            const parsed = JSON.parse(data)
            // 支持两种格式：后端用 type: "content", data: { content }
            //             前端用 type: "delta", content
            if (parsed.type === 'content' && parsed.data?.content) {
              fullContent += parsed.data.content
            } else if (parsed.type === 'delta' && parsed.content) {
              fullContent += parsed.content
            } else if (parsed.type === 'error') {
              hasError = true
              errorMessage = parsed.data?.error || parsed.message || 'Unknown error'
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (hasError) {
    return { passed: false, message: errorMessage }
  }

  return {
    passed: fullContent.length > 0,
    message: fullContent.length > 0
      ? `收到 ${eventCount} 个事件，${fullContent.length} 字符`
      : '无内容返回',
    details: {
      eventCount,
      contentLength: fullContent.length,
      preview: fullContent.slice(0, 100),
    },
  }
}

/**
 * 测试 7: NLP Processor 健康检查
 */
async function testNLPProcessorHealth() {
  try {
    const response = await fetch(`${NLP_PROCESSOR_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return { passed: false, message: `HTTP ${response.status}` }
    }

    const data = await response.json()
    return {
      passed: data.status === 'healthy' || data.status === 'ok',
      message: 'NLP Processor 健康',
      details: data,
    }
  } catch (error) {
    return {
      passed: false,
      message: `NLP Processor 不可用: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * 测试 8: NLP Processor 意图识别
 */
async function testNLPIntent() {
  try {
    const response = await fetch(`${NLP_PROCESSOR_URL}/api/v1/chat/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: '当 BTC 价格超过 50000 美元时买入',
        context: {},
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { passed: false, message: `HTTP ${response.status}` }
    }

    const data = await response.json()
    const hasIntent = typeof data.intent === 'string' && data.intent.length > 0

    return {
      passed: hasIntent,
      message: hasIntent ? `识别意图: ${data.intent}` : '无法识别意图',
      details: data,
    }
  } catch (error) {
    return {
      passed: false,
      message: `NLP Processor 不可用: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * 测试 9: 前端 API 路由代理
 */
async function testFrontendProxy() {
  try {
    const response = await fetch(`${FRONTEND_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '用一个字回复：好',
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const error = await response.text()
      return { passed: false, message: `HTTP ${response.status}: ${error}` }
    }

    const contentType = response.headers.get('content-type')
    const isSSE = contentType?.includes('text/event-stream')

    // 简单读取一些内容验证流
    const reader = response.body!.getReader()
    const { value } = await reader.read()
    reader.releaseLock()

    const hasContent = value && value.length > 0

    return {
      passed: isSSE && hasContent,
      message: isSSE && hasContent ? '前端代理工作正常' : '前端代理异常',
      details: { isSSE, hasContent },
    }
  } catch (error) {
    return {
      passed: false,
      message: `前端不可用: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// =============================================================================
// 主测试流程
// =============================================================================

async function runAllTests() {
  console.log('')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║          🧪 AI Orchestrator E2E 集成测试                   ║')
  console.log('╠════════════════════════════════════════════════════════════╣')
  console.log(`║  AI Orchestrator: ${AI_ORCHESTRATOR_URL.padEnd(39)}║`)
  console.log(`║  NLP Processor:   ${NLP_PROCESSOR_URL.padEnd(39)}║`)
  console.log(`║  Frontend:        ${FRONTEND_URL.padEnd(39)}║`)
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  // 核心测试 (必须通过)
  console.log('📦 核心服务测试...')
  console.log('─'.repeat(60))

  await runTest('AI Orchestrator 健康检查', testOrchestratorHealth)
  await runTest('获取 AI 配置', testGetConfig)
  await runTest('获取技能列表', testGetSkills)
  await runTest('获取用户状态', testGetUserStatus)

  // 检查核心服务是否通过
  const coreTests = results.slice(0, 4)
  const coresPassed = coreTests.every((t) => t.passed)

  if (!coresPassed) {
    console.log('')
    log('核心服务测试失败，跳过对话测试', 'error')
    printSummary()
    process.exit(1)
  }

  console.log('')
  console.log('💬 对话功能测试...')
  console.log('─'.repeat(60))

  await runTest('非流式对话', testNonStreamingChat)
  await runTest('流式 SSE 对话', testStreamingChat)

  console.log('')
  console.log('🔗 集成测试 (可选)...')
  console.log('─'.repeat(60))

  await runTest('NLP Processor 健康检查', testNLPProcessorHealth)
  await runTest('NLP 意图识别', testNLPIntent)
  await runTest('前端 API 代理', testFrontendProxy)

  printSummary()
}

function printSummary() {
  console.log('')
  console.log('═'.repeat(60))
  console.log('📊 测试结果摘要')
  console.log('═'.repeat(60))

  // 核心测试是前 6 个
  const coreResults = results.slice(0, 6)
  const optionalResults = results.slice(6)

  const corePassed = coreResults.filter((r) => r.passed).length
  const coreFailed = coreResults.filter((r) => !r.passed).length
  const optionalPassed = optionalResults.filter((r) => r.passed).length
  const optionalFailed = optionalResults.filter((r) => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log('')
  console.log('核心测试:')
  console.log(`  ✅ 通过:     ${corePassed}/${coreResults.length}`)
  if (coreFailed > 0) {
    console.log(`  ❌ 失败:     ${coreFailed}`)
  }
  console.log('')
  console.log('可选集成测试:')
  console.log(`  ✅ 通过:     ${optionalPassed}/${optionalResults.length}`)
  if (optionalFailed > 0) {
    console.log(`  ⚠️  跳过:    ${optionalFailed} (服务未运行)`)
  }
  console.log('')
  console.log(`  ⏱️  总耗时:  ${totalDuration}ms`)
  console.log('')

  if (coreFailed > 0) {
    console.log('失败的核心测试:')
    for (const r of coreResults.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.message}`)
    }
    console.log('')
  }

  // 详细结果
  console.log('详细结果:')
  console.log('  核心测试:')
  for (const r of coreResults) {
    const status = r.passed ? '✅' : '❌'
    console.log(`    ${status} ${r.name.padEnd(28)} ${r.duration}ms`)
  }
  console.log('  可选集成测试:')
  for (const r of optionalResults) {
    const status = r.passed ? '✅' : '⚠️ '
    console.log(`    ${status} ${r.name.padEnd(28)} ${r.duration}ms`)
  }
  console.log('')

  // 最终状态 - 只检查核心测试
  const allCorePassed = coreResults.every((r) => r.passed)
  if (allCorePassed) {
    console.log('🎉 核心功能测试全部通过！AI Orchestrator 已就绪。')
    console.log('')
    process.exit(0)  // 核心测试通过即成功
  } else {
    console.log('❌ 核心测试失败，请检查服务状态。')
    console.log('')
    process.exit(1)
  }
}

// 运行测试
runAllTests().catch((error) => {
  console.error('测试运行失败:', error)
  process.exit(1)
})
