'use client'

import React from 'react'
import { Header } from './Header'
import { FunctionalSidebar } from '@/components/sidebar'
import { MobileBottomNav } from './MobileBottomNav'

/**
 * MainLayout - 通用布局组件
 * 用于非 Chat 页面 (如 backtest, trading 等)
 *
 * 对于主要的 AI 对话页面，请使用 A2UILayout
 */

interface MainLayoutProps {
  children: React.ReactNode
  /** 是否显示 Sidebar (默认 true) */
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Sidebar - 桌面端显示 */}
        {showSidebar && (
          <div className="hidden md:block">
            <FunctionalSidebar />
          </div>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${showSidebar ? 'md:ml-[260px]' : ''} p-6 pb-[100px] md:pb-6`}>
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
