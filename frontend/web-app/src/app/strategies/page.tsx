'use client'

import { Activity, Bot, Grid, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { TermTooltip } from '@/components/common/TermTooltip'
import { A2UILayout } from '@/components/layout/A2UILayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'

/**
 * Strategies Page - 策略概览页面
 *
 * 展示所有策略的列表和快速创建入口
 */
export default function StrategiesPage() {
  const { agents } = useAgentStore()

  // 策略类型图标映射
  const strategyIcons: Record<string, React.ReactNode> = {
    grid: <Grid className="h-5 w-5" />,
    dca: <TrendingUp className="h-5 w-5" />,
    momentum: <Activity className="h-5 w-5" />,
    rsi: <Zap className="h-5 w-5" />,
  }

  return (
    <A2UILayout>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">策略管理</h1>
              <p className="text-muted-foreground">
                管理您的交易策略，查看运行状态和历史表现
              </p>
            </div>
            <Link href="/chat">
              <Button className="gap-2">
                <Bot className="h-4 w-4" />
                AI 创建策略
              </Button>
            </Link>
          </div>

          {/* 策略类型说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">策略类型说明</CardTitle>
              <CardDescription>
                不同策略适合不同的市场环境，点击了解更多
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <TermTooltip term="grid" showIcon>
                    <span className="font-medium">网格策略</span>
                  </TermTooltip>
                  <p className="text-xs text-muted-foreground">
                    适合震荡行情，自动低买高卖
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <TermTooltip term="dca" showIcon>
                    <span className="font-medium">DCA 定投</span>
                  </TermTooltip>
                  <p className="text-xs text-muted-foreground">
                    定期定额投资，分散风险
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <TermTooltip term="rsi" showIcon>
                    <span className="font-medium">RSI 策略</span>
                  </TermTooltip>
                  <p className="text-xs text-muted-foreground">
                    基于超买超卖指标交易
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <TermTooltip term="momentum" showIcon>
                    <span className="font-medium">动量策略</span>
                  </TermTooltip>
                  <p className="text-xs text-muted-foreground">
                    追随趋势，强者恒强
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 策略列表 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              我的策略 ({agents.length})
            </h2>

            {agents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">还没有策略</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    使用 AI 助手快速创建您的第一个交易策略
                  </p>
                  <Link href="/chat">
                    <Button>开始创建</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Card key={agent.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {strategyIcons[agent.name.toLowerCase()] || <Bot className="h-5 w-5" />}
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                        </div>
                        <Badge
                          variant={agent.status === 'live' || agent.status === 'paper' ? 'success' : agent.status === 'shadow' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {agent.status === 'live' ? '实盘' : agent.status === 'paper' ? '模拟' : agent.status === 'shadow' ? '观望' : agent.status === 'paused' ? '暂停' : '已停止'}
                        </Badge>
                      </div>
                      <CardDescription>{agent.symbol}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">盈亏</div>
                          <div className={cn(
                            'font-medium',
                            agent.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {agent.pnl >= 0 ? '+' : ''}{agent.pnl.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">
                            <TermTooltip term="winRate" showIcon={false}>胜率</TermTooltip>
                          </div>
                          <div className="font-medium">{(agent.winRate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">交易次数</div>
                          <div className="font-medium">{agent.trades}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </A2UILayout>
  )
}
