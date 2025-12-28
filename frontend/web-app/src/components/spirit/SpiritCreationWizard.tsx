'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Brain, Check, ChevronRight, type LucideIcon, Sparkles, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useAgentStore } from '@/store/agent'

/**
 * -----------------------------------------------------------------------------
 * Constants & Config
 * -----------------------------------------------------------------------------
 */

type Archetype = 'trading_spirit' | 'research_analyst'

const ARCHETYPES: Record<
  Archetype,
  {
    name: string
    description: string
    icon: LucideIcon
    color: string
    gradient: string
    features: string[]
  }
> = {
  trading_spirit: {
    name: 'Trading Spirit',
    description: '专注于市场执行、策略生成与实时交易的守护灵。',
    icon: Sparkles,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-blue-500/20',
    features: ['高频策略生成', '实时信号捕捉', '自动风控管理', '多交易所执行'],
  },
  research_analyst: {
    name: 'Research Analyst',
    description: '专注于深度研报、链上数据与宏观分析的智慧体。',
    icon: Brain,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    features: ['深度基本面分析', '链上数据追踪', '宏观叙事捕捉', '长周期趋势研判'],
  },
}

const DEFAULT_TRAITS = {
  risk_aversion: 0.5, // 风险厌恶 (0=激进, 1=保守)
  decisiveness: 0.7, // 果断程度 (0=犹豫, 1=果断)
  creativity: 0.5, // 创新程度 (0=传统, 1=新颖)
}

/**
 * -----------------------------------------------------------------------------
 * Components
 * -----------------------------------------------------------------------------
 */

interface SpiritCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SpiritCreationWizard({ open, onOpenChange }: SpiritCreationWizardProps) {
  const router = useRouter()
  const { addAgent } = useAgentStore()

  // Steps: 0: Intro, 1: Archetype, 2: Traits, 3: Summoning
  const [step, setStep] = React.useState(0)
  const [selectedArchetype, setSelectedArchetype] = React.useState<Archetype>('trading_spirit')
  const [traits, setTraits] = React.useState(DEFAULT_TRAITS)

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setStep(0)
      setTraits(DEFAULT_TRAITS)
    }
  }, [open])

  const handleSummon = async () => {
    setStep(3) // Move to animation

    // Simulate "Ritual" delay
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Create Agent
    const now = Date.now()
    const newAgentId = `agent_${now}`

    addAgent({
      id: newAgentId,
      name:
        selectedArchetype === 'trading_spirit'
          ? `Trade Spirit #${now.toString().slice(-4)}`
          : `Analyst #${now.toString().slice(-4)}`,
      symbol: 'BTC/USDT', // Default
      status: 'shadow',
      pnl: 0,
      pnlPercent: 0,
      trades: 0,
      winRate: 0,
      createdAt: now,
      updatedAt: now,
      archetype: selectedArchetype,
      traits: traits,
    })

    // Navigate & Close
    onOpenChange(false)
    router.push(`/chat?agent=${newAgentId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border/50 bg-background/95 p-0 backdrop-blur-xl sm:max-w-[600px]">
        <DialogHeader className="border-b border-border/50 p-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-light tracking-wide">
            <Wand2 className="h-5 w-5 text-primary" />
            召唤仪式
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              STEP {step + 1}/4
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            创建您的交易 Spirit 代理，选择原型并配置性格特质
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[400px] p-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 py-4"
              >
                <div className="space-y-4 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
                      <Wand2 className="relative z-10 h-16 w-16 text-primary" />
                    </div>
                  </div>
                  <h3 className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-2xl font-semibold text-transparent">
                    什么是 Spirit?
                  </h3>
                  <p className="mx-auto max-w-sm leading-relaxed text-muted-foreground">
                    Spirit 是您的自主交易代理，也是在这个数字领域中的智慧化身。
                    它们不仅执行交易，更拥有独特的性格与决策模式。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 px-4">
                  <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/30 p-4">
                    <Brain className="h-5 w-5 text-emerald-400" />
                    <h4 className="text-sm font-medium">智慧引擎</h4>
                    <p className="text-xs text-muted-foreground">
                      基于 LLM 驱动的市场洞察与策略生成
                    </p>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/30 p-4">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h4 className="text-sm font-medium">全天候运行</h4>
                    <p className="text-xs text-muted-foreground">
                      7x24 小时监控市场，不错过任何机会
                    </p>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => setStep(1)}
                    size="lg"
                    className="h-12 min-w-[200px] gap-2 text-lg shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                  >
                    开始召唤仪式
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="mb-8 space-y-2 text-center">
                  <h3 className="text-2xl font-semibold">选择你的 Spirit 原型</h3>
                  <p className="text-sm text-muted-foreground">
                    不同的原型拥有不同的核心能力与思维模式
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(ARCHETYPES) as Archetype[]).map((type) => {
                    const config = ARCHETYPES[type]
                    const isSelected = selectedArchetype === type
                    return (
                      <div
                        key={type}
                        onClick={() => setSelectedArchetype(type)}
                        className={cn(
                          'relative cursor-pointer overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 hover:scale-[1.02]',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity',
                            config.gradient,
                            isSelected && 'opacity-100'
                          )}
                        />
                        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                          <config.icon className={cn('h-10 w-10', config.color)} />
                          <div>
                            <div className="font-semibold">{config.name}</div>
                            <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
                              {config.description}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap justify-center gap-1">
                            {config.features.slice(0, 2).map((f) => (
                              <Badge
                                key={f}
                                variant="outline"
                                className="h-5 bg-background/50 text-[9px]"
                              >
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute right-2 top-2 text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <Button variant="ghost" onClick={() => setStep(0)} className="mr-auto gap-2">
                    返回
                  </Button>
                  <Button onClick={() => setStep(2)} className="group gap-2">
                    下一步
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="mb-4 space-y-2 text-center">
                  <h3 className="text-2xl font-semibold">注入性格特质</h3>
                  <p className="text-sm text-muted-foreground">调整滑块以定制 Agent 的决策风格</p>
                </div>

                <div className="space-y-6 px-4">
                  {/* Risk Aversion */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">激进 (Degen)</span>
                      <span className="font-medium">风险偏好</span>
                      <span className="text-muted-foreground">保守 (Safe)</span>
                    </div>
                    <Slider
                      value={traits.risk_aversion}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(v: number) => setTraits({ ...traits, risk_aversion: v })}
                      className="py-2"
                      showValue={false}
                    />
                  </div>

                  {/* Decisiveness */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">深思熟虑</span>
                      <span className="font-medium">决策速度</span>
                      <span className="text-muted-foreground">雷厉风行</span>
                    </div>
                    <Slider
                      value={traits.decisiveness}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(v: number) => setTraits({ ...traits, decisiveness: v })}
                      className="py-2"
                      showValue={false}
                    />
                  </div>

                  {/* Creativity */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">遵循经典</span>
                      <span className="font-medium">创新思维</span>
                      <span className="text-muted-foreground">非常规</span>
                    </div>
                    <Slider
                      value={traits.creativity}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(v: number) => setTraits({ ...traits, creativity: v })}
                      className="py-2"
                      showValue={false}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                    返回
                  </Button>
                  <Button onClick={handleSummon} className="min-w-[120px] gap-2">
                    <Sparkles className="h-4 w-4" />
                    开始召唤
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={cn(
                      'absolute inset-0 h-24 w-24 rounded-full blur-xl',
                      selectedArchetype === 'trading_spirit'
                        ? 'bg-purple-500/50'
                        : 'bg-emerald-500/50'
                    )}
                  />
                  <div
                    className={cn(
                      'relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-4 bg-background',
                      selectedArchetype === 'trading_spirit'
                        ? 'border-purple-500 text-purple-500'
                        : 'border-emerald-500 text-emerald-500'
                    )}
                  >
                    {selectedArchetype === 'trading_spirit' ? (
                      <Sparkles className="h-10 w-10 animate-pulse" />
                    ) : (
                      <Brain className="h-10 w-10 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-light">正在建立链接...</h3>
                  <p className="animate-pulse text-muted-foreground">
                    初始化神经接口 · 配置个性特征 · 同步市场数据
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
