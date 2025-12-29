/**
 * Spirit LLM Analysis API Route
 * 用于处理复杂市场信号的 AI 分析
 * 
 * POST /api/spirit/analyze
 * Body: { signal: { symbol, price, indicators }, context?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface MarketSignal {
  symbol: string
  price: number
  indicators: {
    rsi?: number
    macd?: { histogram: number; signal: number; value: number }
    change24h?: number
    [key: string]: any
  }
}

interface AnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reasoning: string
  suggestedAction: 'buy' | 'sell' | 'hold'
}

// 创建 Supabase Admin 客户端
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, serviceKey)
}

// 简化的 LLM 分析逻辑 (实际生产中应调用 OpenRouter/OpenAI)
async function analyzeWithLLM(signal: MarketSignal, context?: string): Promise<AnalysisResult> {
  const rsi = signal.indicators?.rsi || 50
  const change24h = signal.indicators?.change24h || 0
  
  // 基于规则的分析 (可以替换为真正的 LLM 调用)
  if (rsi < 30) {
    return {
      sentiment: 'bullish',
      confidence: 0.85,
      reasoning: `RSI (${rsi}) indicates oversold conditions. Combined with ${change24h > 0 ? 'positive' : 'negative'} 24h change, this suggests a potential reversal opportunity.`,
      suggestedAction: 'buy'
    }
  } else if (rsi > 70) {
    return {
      sentiment: 'bearish',
      confidence: 0.82,
      reasoning: `RSI (${rsi}) indicates overbought conditions. Price may be due for a correction.`,
      suggestedAction: 'sell'
    }
  } else if (Math.abs(change24h) > 10) {
    return {
      sentiment: change24h > 0 ? 'bullish' : 'bearish',
      confidence: 0.75,
      reasoning: `High volatility detected (${change24h}% 24h change). Caution advised.`,
      suggestedAction: 'hold'
    }
  }
  
  return {
    sentiment: 'neutral',
    confidence: 0.6,
    reasoning: 'Market conditions are neutral. No clear directional bias.',
    suggestedAction: 'hold'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signal, context } = body as { signal: MarketSignal; context?: string }
    
    if (!signal || !signal.symbol) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: signal.symbol' },
        { status: 400 }
      )
    }
    
    // 1. 发送 "分析中" 状态事件
    const supabase = getSupabaseAdmin()
    await supabase.from('spirit_events').insert([{
      type: 'system_status',
      priority: 'p2',
      spirit_state: 'analyzing',
      title: 'Spirit Analyzing',
      content: `Consulting AI for ${signal.symbol}...`,
      metadata: { symbol: signal.symbol }
    }])
    
    // 2. 执行分析
    const analysis = await analyzeWithLLM(signal, context)
    
    // 3. 发送分析结果事件
    await supabase.from('spirit_events').insert([{
      type: 'strategy_decision',
      priority: 'p1',
      spirit_state: analysis.suggestedAction === 'hold' ? 'monitoring' : 'executing',
      title: `AI Decision: ${analysis.suggestedAction.toUpperCase()}`,
      content: analysis.reasoning,
      metadata: {
        symbol: signal.symbol,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence
      }
    }])
    
    return NextResponse.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('[Spirit Analyze API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


