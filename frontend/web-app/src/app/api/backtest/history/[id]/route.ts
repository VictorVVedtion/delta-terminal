/**
 * GET /api/backtest/history/[id]
 *
 * 获取历史回测详情
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

// 实际环境会从数据库读取，这里返回模拟数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // TODO: 从数据库加载完整回测结果
    // 目前返回 404，实际数据保存在前端 localStorage
    return NextResponse.json(
      { error: 'History item not found in server storage' },
      { status: 404 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
