'use client'

import {
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { MainLayout } from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { type Agent, type AgentStatus,useAgentStore } from '@/store/agent'

export default function StrategiesPage() {
  const router = useRouter()
  const { agents, removeAgent, updateAgent } = useAgentStore()
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    // Status filter
    if (filter !== 'all' && agent.status !== filter) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.symbol.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Handlers
  const handleStatusChange = (id: string, newStatus: AgentStatus) => {
    updateAgent(id, { status: newStatus })
    toast.success(`策略状态已更新为 ${newStatus}`)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此策略吗？此操作无法撤销。')) {
      removeAgent(id)
      toast.success('策略已删除')
    }
  }

  const handleCreate = () => {
    router.push('/chat?action=create')
  }

  // Helper to get status badge variant
  const _getStatusBadgeVariant = (status: AgentStatus) => {
    switch (status) {
      case 'live':
        return 'success'
      case 'paper':
        return 'warning'
      case 'paused':
        return 'secondary'
      case 'stopped':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">策略管理</h1>
            <p className="text-muted-foreground mt-1">
              管理您的所有交易策略，监控表现并调整参数
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            创建新策略
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="live">实盘</TabsTrigger>
              <TabsTrigger value="paper">模拟</TabsTrigger>
              <TabsTrigger value="paused">暂停</TabsTrigger>
              <TabsTrigger value="shadow">草稿</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索策略..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Grid */}
        {filteredAgents.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground">没有找到符合条件的策略</p>
            {filter !== 'all' && (
              <Button variant="link" onClick={() => setFilter('all')}>
                查看所有策略
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <StrategyCard
                key={agent.id}
                agent={agent}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

// Strategy Card Component
interface StrategyCardProps {
  agent: Agent
  onStatusChange: (id: string, status: AgentStatus) => void
  onDelete: (id: string) => void
}

function StrategyCard({ agent, onStatusChange, onDelete }: StrategyCardProps) {
  const isRunning = agent.status === 'live' || agent.status === 'paper'
  const isProfit = agent.pnl >= 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold truncate pr-4">
              {agent.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
                {agent.symbol}
              </span>
              <span className="text-xs text-muted-foreground">
                ID: {agent.id.slice(-6)}
              </span>
            </CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(agent.status) as any}>
            {agent.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">总盈亏</p>
            <div className={cn("text-lg font-bold flex items-center gap-1", isProfit ? "text-green-500" : "text-red-500")}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isProfit ? '+' : ''}{agent.pnl.toLocaleString()}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">收益率</p>
            <div className={cn("text-lg font-bold", isProfit ? "text-green-500" : "text-red-500")}>
              {isProfit ? '+' : ''}{agent.pnlPercent.toFixed(2)}%
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">胜率</p>
            <div className="font-mono font-medium">{agent.winRate}%</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">交易次数</p>
            <div className="font-mono font-medium">{agent.trades}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex justify-between">
        <div className="flex gap-2">
          {isRunning ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => onStatusChange(agent.id, 'paused')}
              title="暂停"
            >
              <PauseCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => onStatusChange(agent.id, 'paper')}
              title="启动 (Paper)"
            >
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/chat?agent=${agent.id}`}>
                查看详情
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/backtest?strategy=${agent.id}`}>
                运行回测
              </Link>
            </DropdownMenuItem>
            {isRunning && (
              <DropdownMenuItem onClick={() => onStatusChange(agent.id, 'paused')}>
                暂停策略
              </DropdownMenuItem>
            )}
            {!isRunning && (
              <DropdownMenuItem onClick={() => onStatusChange(agent.id, 'paper')}>
                启动模拟盘
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除策略
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}

function getStatusBadgeVariant(status: AgentStatus) {
  switch (status) {
    case 'live': return 'success'
    case 'paper': return 'warning'
    case 'paused': return 'secondary'
    case 'stopped': return 'destructive'
    default: return 'outline'
  }
}
