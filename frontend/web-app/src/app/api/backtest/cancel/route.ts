/**
 * POST /api/backtest/cancel
 *
 * 取消正在运行的回测任务
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

// 实际环境会维护任务状态，这里简化处理
const runningJobs = new Map<string, boolean>()

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // 标记任务为已取消
    runningJobs.set(jobId, false)

    return NextResponse.json({
      success: true,
      message: `Backtest ${jobId} cancelled`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
