/**
 * AI Config Routing API Route
 *
 * 获取后端模型路由配置
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// GET /api/ai/config/routing - 获取后端路由配置
export async function GET(request: NextRequest) {
  try {
    // 获取用户 ID
    const userId = request.headers.get('x-user-id') || 'default-user'

    // 获取 NLP Processor 后端地址
    const nlpBackendUrl = process.env.NLP_PROCESSOR_URL || 'http://localhost:8001'

    // 从 NLP Processor 获取路由配置
    const response = await fetch(
      `${nlpBackendUrl}/api/v1/models/routing/config?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      // 返回默认配置
      return NextResponse.json({
        success: true,
        system_defaults: {},
        user_overrides: {},
        effective_config: {},
        available_tasks: [],
      })
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error('Error fetching routing config:', error)
    // 返回空配置，让前端使用本地默认值
    return NextResponse.json({
      success: true,
      system_defaults: {},
      user_overrides: {},
      effective_config: {},
      available_tasks: [],
    })
  }
}
