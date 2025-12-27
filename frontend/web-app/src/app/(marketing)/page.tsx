'use client'

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Globe,
  LineChart,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <header 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
          scrolled ? "bg-background/80 backdrop-blur-md border-border py-3" : "bg-transparent py-5"
        )}
      >
        <div className="container px-4 mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
              Δ
            </div>
            <span className="font-bold text-xl tracking-tight">Delta Terminal</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">功能</Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">如何运作</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">价格</Link>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/chat">
                <Button>
                  进入终端
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">登录</Button>
                </Link>
                <Link href="/register">
                  <Button>免费开始</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="container px-4 mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="h-4 w-4" />
            <span>AI 驱动的新一代交易终端</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            对话即可创建
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 block mt-2">
              专业级交易策略
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-900">
            无需编程，只需用自然语言描述你的想法。
            Delta Terminal 帮你自动生成、回测并部署 7x24 小时自动交易策略。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link href={isAuthenticated ? "/chat" : "/register"}>
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                立即免费开始
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full">
              观看演示视频
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-20 pt-10 border-t border-border/50 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">10,000+</div>
              <div className="text-sm text-muted-foreground">活跃交易者</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">$500M+</div>
              <div className="text-sm text-muted-foreground">月交易量</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">99.9%</div>
              <div className="text-sm text-muted-foreground">系统可用性</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">自动运行</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">为什么选择 Delta Terminal</h2>
            <p className="text-lg text-muted-foreground">
              我们将量化基金级别的工具带给每一位投资者，让交易更简单、更智能。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI 策略生成</h3>
              <p className="text-muted-foreground">
                &quot;当比特币跌破 4 万时分批买入...&quot; —— 只要说出你的想法，AI 就能将其转化为可执行的代码。
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 mb-6">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">专业级回测</h3>
              <p className="text-muted-foreground">
                使用历史数据验证策略表现。包含滑点、手续费等真实市场因素，拒绝过度拟合。
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">智能风控</h3>
              <p className="text-muted-foreground">
                内置熔断机制、最大回撤限制和仓位管理系统，全方位保护你的资金安全。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">3 步开启自动交易</h2>
              
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                  <div className="w-0.5 h-full bg-border my-2" />
                </div>
                <div className="pb-8">
                  <h3 className="text-xl font-bold mb-2">描述你的策略</h3>
                  <p className="text-muted-foreground">告诉 AI 你想怎么交易。支持定投、网格、趋势跟踪等多种逻辑。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                  <div className="w-0.5 h-full bg-border my-2" />
                </div>
                <div className="pb-8">
                  <h3 className="text-xl font-bold mb-2">回测与优化</h3>
                  <p className="text-muted-foreground">查看策略在历史行情下的表现，根据 AI 建议优化参数。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">实盘部署</h3>
                  <p className="text-muted-foreground">连接交易所 API，一键启动。支持模拟盘练习，零风险上手。</p>
                </div>
              </div>
            </div>

            <div className="flex-1">
              {/* Abstract UI Representation */}
              <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Bot className="h-6 w-6 text-primary" />
                    <div className="flex-1 bg-muted/50 h-8 rounded-md px-3 flex items-center text-sm text-muted-foreground">
                      当比特币 RSI 低于 30 时买入...
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <div className="text-sm font-medium text-primary mb-2">策略已生成: RSI 均值回归</div>
                      <div className="flex items-center justify-between text-sm">
                        <span>预期年化: <span className="text-green-500 font-bold">+45.2%</span></span>
                        <span>胜率: <span className="font-bold">68%</span></span>
                      </div>
                    </div>
                    <div className="h-32 bg-muted/30 rounded-lg flex items-end p-2 gap-1">
                      {[40, 60, 45, 70, 55, 80, 65, 90].map((h, i) => (
                        <div key={i} className="flex-1 bg-primary/20 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -right-6 -bottom-6 bg-background p-4 rounded-xl border border-border shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">交易执行成功</div>
                      <div className="text-xs text-muted-foreground">刚刚 • BTC/USDT</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">连接全球主流交易所</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all">
            {['Binance', 'OKX', 'Coinbase', 'Bybit', 'Kraken'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-xl font-bold">
                <Globe className="h-6 w-6" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 mx-auto text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-b from-primary/10 to-transparent p-12 rounded-3xl border border-primary/20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">准备好开始了吗？</h2>
            <p className="text-xl text-muted-foreground mb-10">
              加入数千名智能交易者的行列，让 AI 为你的资产增值。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-14 px-10 text-lg rounded-full">
                  免费创建账户
                </Button>
              </Link>
              <div className="text-sm text-muted-foreground mt-4 sm:mt-0">
                <div className="flex items-center gap-1 justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  无需信用卡
                </div>
                <div className="flex items-center gap-1 justify-center mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  包含模拟盘功能
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                Δ
              </div>
              <span className="font-bold text-lg">Delta Terminal</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground">服务条款</Link>
              <Link href="#" className="hover:text-foreground">隐私政策</Link>
              <Link href="#" className="hover:text-foreground">帮助中心</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Delta Terminal. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

