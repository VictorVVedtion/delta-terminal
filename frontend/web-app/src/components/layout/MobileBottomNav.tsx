'use client'

import {
  BarChart3,
  Bot,
  MessageSquare,
  Settings,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { cn } from '@/lib/utils'
import { MODE_CONFIGS,useModeStore } from '@/store/mode'

/**
 * 移动端底部导航组件
 * 基于 PRD 决策: 移动端使用底部 Tab 切换
 */

const navItems = [
  {
    id: 'chat',
    label: '对话',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    id: 'agents',
    label: 'Agents',
    href: '/strategies',
    icon: Bot,
  },
  {
    id: 'backtest',
    label: '回测',
    href: '/backtest',
    icon: BarChart3,
  },
  {
    id: 'risk',
    label: '风控',
    href: '/risk',
    icon: Shield,
  },
  {
    id: 'settings',
    label: '设置',
    href: '/settings',
    icon: Settings,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { currentMode } = useModeStore()
  const modeConfig = MODE_CONFIGS[currentMode]

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur border-t border-border',
        'md:hidden', // 仅移动端显示
        'safe-area-pb' // iOS safe area
      )}
    >
      {/* 当前模式指示器 */}
      <div className="flex items-center justify-center gap-1.5 py-1 bg-muted/50 text-xs">
        <span>{modeConfig.icon}</span>
        <span className="text-muted-foreground">{modeConfig.name}</span>
      </div>

      {/* 导航项 */}
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                'transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
