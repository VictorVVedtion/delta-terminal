/**
 * Spirit Event API Route
 * 用于从前端或 Cron 触发 Spirit 事件
 * 
 * POST /api/spirit/event
 * Body: { type, priority, spirit_state, title, content, metadata? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 创建 Supabase Admin 客户端
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, serviceKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证必填字段
    const { type, priority = 'p4', spirit_state = 'monitoring', title, content } = body
    
    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title' },
        { status: 400 }
      )
    }
    
    const supabase = getSupabaseAdmin()
    
    // 插入事件到 spirit_events 表
    const { data, error } = await supabase
      .from('spirit_events')
      .insert([{
        type,
        priority,
        spirit_state,
        title,
        content: content || '',
        metadata: body.metadata || {}
      }])
      .select()
      .single()
    
    if (error) {
      console.error('[Spirit API] Insert error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, event: data })
  } catch (error) {
    console.error('[Spirit API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 心跳端点 - 可以被 Vercel Cron 调用
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('spirit_events')
      .insert([{
        type: 'heartbeat',
        priority: 'p4',
        spirit_state: 'monitoring',
        title: 'Heartbeat',
        content: 'System active',
        metadata: { timestamp: Date.now() }
      }])
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, event: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

