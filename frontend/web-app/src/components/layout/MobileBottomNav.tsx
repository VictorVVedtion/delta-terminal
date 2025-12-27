'use client'

import {
  BarChart3,
  LayoutGrid,
  Plus,
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
    id: 'strategies',
    label: '策略',
    href: '/strategies',
    icon: LayoutGrid,
  },
  {
    id: 'backtest',
    label: '回测',
    href: '/backtest',
    icon: BarChart3,
  },
  {
    id: 'chat', // Center item
    label: '创建',
    href: '/chat',
    icon: Plus,
    isCenter: true,
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
  const _modeConfig = MODE_CONFIGS[currentMode]

  // Hide nav on landing page and auth pages
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return null
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/80 backdrop-blur-xl border-t border-border',
        'md:hidden', // 仅移动端显示
        'pb-[env(safe-area-inset-bottom)]' // iOS safe area
      )}
    >
      {/* 导航项 */}
      <div className="flex items-end justify-around h-16 pb-2 relative">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.isCenter) {
            return (
              <div key={item.id} className="relative -top-5">
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center w-14 h-14 rounded-full',
                    'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
                    'transition-transform active:scale-95'
                  )}
                >
                  <Icon className="h-6 w-6" />
                </Link>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 min-w-[60px]',
                'transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-current/20')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
