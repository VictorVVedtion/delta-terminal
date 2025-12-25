'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useModeStore, MODE_CONFIGS, WorkMode } from '@/store/mode'
import { ChevronDown } from 'lucide-react'

/**
 * 模式选择器组件
 * 基于 PRD S76 规范
 */
export function ModeSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentMode, setMode } = useModeStore()
  const currentConfig = MODE_CONFIGS[currentMode]

  const handleSelect = (mode: WorkMode) => {
    setMode(mode)
    setIsOpen(false)
  }

  return (
    <div className="relative p-3 border-b border-border">
      {/* 当前模式按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5',
          'bg-muted/50 hover:bg-muted',
          'border border-border rounded-lg',
          'transition-colors cursor-pointer'
        )}
      >
        <span className="text-lg">{currentConfig.icon}</span>
        <span className="flex-1 text-left text-sm font-semibold">
          {currentConfig.name}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 模型标签 */}
      {currentConfig.model && (
        <div className="mt-2 text-center">
          <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded">
            {currentConfig.model}
          </span>
        </div>
      )}

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 模式列表 */}
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
            {Object.values(MODE_CONFIGS).map((config) => (
              <button
                key={config.id}
                onClick={() => handleSelect(config.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3',
                  'hover:bg-muted transition-colors text-left',
                  config.id === currentMode && 'bg-primary/10'
                )}
              >
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.name}</span>
                    {config.model && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                        {config.model}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {config.description}
                  </p>
                </div>
                {config.id === currentMode && (
                  <span className="text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
