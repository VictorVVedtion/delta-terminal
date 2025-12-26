'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  Bot,
  BarChart3,
  Wallet,
  History,
  Settings,
  BookOpen,
  LifeBuoy,
  Target,
  type LucideIcon,
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
}

const navigationItems: NavigationItem[] = [
  {
    title: '仪表盘',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '交易',
    href: '/trading',
    icon: TrendingUp,
  },
  {
    title: 'AI 策略',
    href: '/strategies',
    icon: Bot,
  },
  {
    title: '回测',
    href: '/backtest',
    icon: BarChart3,
  },
  {
    title: 'Paper Trading',
    href: '/paper-trading',
    icon: Target,
    badge: 'NEW',
  },
  {
    title: '资产',
    href: '/portfolio',
    icon: Wallet,
  },
  {
    title: '历史记录',
    href: '/history',
    icon: History,
  },
]

const bottomItems = [
  {
    title: '文档',
    href: '/docs',
    icon: BookOpen,
  },
  {
    title: '帮助',
    href: '/help',
    icon: LifeBuoy,
  },
  {
    title: '设置',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background">
      <nav className="flex h-full flex-col p-4">
        {/* Main Navigation */}
        <div className="flex-1 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isPaperTrading = item.href === '/paper-trading'

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isPaperTrading && !isActive && 'hover:bg-[hsl(var(--rb-yellow))]/10'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5',
                  isPaperTrading && !isActive && 'text-[hsl(var(--rb-yellow))]'
                )} />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[hsl(var(--rb-yellow))]/20 text-[hsl(var(--rb-yellow))]">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="space-y-1 border-t pt-4">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
