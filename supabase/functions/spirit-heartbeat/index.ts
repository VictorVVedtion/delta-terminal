// Spirit Heartbeat Edge Function
// 通过 Supabase Cron 或外部调用触发
// 每次调用会插入一条心跳事件到 spirit_events 表

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpiritEvent {
  type: string
  priority: string
  spirit_state: string
  title: string
  content: string
  metadata?: Record<string, any>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建 Supabase 客户端 (使用 service_role 权限)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 解析请求体 (可选，支持自定义事件)
    let event: SpiritEvent = {
      type: 'heartbeat',
      priority: 'p4',
      spirit_state: 'monitoring',
      title: 'Heartbeat',
      content: 'System active',
      metadata: { timestamp: Date.now() }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      event = { ...event, ...body }
    }

    // 插入事件到 spirit_events 表
    const { data, error } = await supabase
      .from('spirit_events')
      .insert([event])
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, event: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

