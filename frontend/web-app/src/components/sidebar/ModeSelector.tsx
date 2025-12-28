'use client'

import { Activity, ChevronDown, HelpCircle, Link, type LucideIcon, MessageSquare, Microscope, Moon, Terminal } from 'lucide-react'
import React, { useState } from 'react'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAIStore } from '@/store/ai'
import type { WorkMode } from '@/store/mode';
import { MODE_CONFIGS, useModeStore } from '@/store/mode'
import { AI_MODELS, SIMPLE_PRESETS } from '@/types/ai'

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Microscope,
  Terminal,
  Link,
  Activity,
  Moon,
}

/**
 * 模式选择器组件
 * 基于 PRD S76 规范
 */
export function ModeSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentMode, setMode } = useModeStore()
  const currentConfig = MODE_CONFIGS[currentMode]

  // 获取实际的 AI 模型信息
  const { config: aiConfig } = useAIStore()
  const currentPreset = aiConfig.simple.preset
  const currentPresetConfig = SIMPLE_PRESETS[currentPreset]
  const actualModelId = aiConfig.simple.customModel || currentPresetConfig.defaultModel
  const actualModelInfo = AI_MODELS[actualModelId]
  const actualModelName = actualModelInfo.name || currentPresetConfig.name

  const handleSelect = (mode: WorkMode) => {
    setMode(mode)
    setIsOpen(false)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative p-3 border-b border-border">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            工作模式
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">
                选择不同的工作模式，AI 将针对不同场景优化响应。
                例如「对话模式」适合日常交流，「深度研究」适合复杂分析。
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 当前模式按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { setIsOpen(!isOpen); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5',
                'bg-muted/50 hover:bg-muted',
                'border border-border rounded-lg',
                'transition-colors cursor-pointer'
              )}
            >
              <span className="text-lg">
                {(() => {
                  const Icon = ICON_MAP[currentConfig.icon] || MessageSquare
                  return <Icon className="w-5 h-5" />
                })()}
              </span>
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
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">{currentConfig.description}</p>
          </TooltipContent>
        </Tooltip>

        {/* 模型标签 - 显示实际选中的模型 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-2 text-center cursor-help">
              <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded inline-flex items-center gap-1">
                <span>{currentPresetConfig.icon}</span>
                <span>{actualModelName}</span>
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            <div className="text-xs space-y-1">
              <p className="font-medium">{currentPresetConfig.name} 模式</p>
              <p className="text-muted-foreground">{currentPresetConfig.description}</p>
              <p className="text-[10px] text-muted-foreground/70">
                预估成本: ${currentPresetConfig.estimatedCostPerCall.toFixed(3)}/次调用
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* 下拉菜单 */}
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => { setIsOpen(false); }}
            />

            {/* 模式列表 */}
            <div className="absolute left-3 right-3 top-full mt-1 z-50 glass-strong rounded-lg shadow-lg overflow-hidden">
              {Object.values(MODE_CONFIGS).map((modeItem) => (
                <button
                  key={modeItem.id}
                  onClick={() => { handleSelect(modeItem.id); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3',
                    'hover:bg-muted transition-colors text-left',
                    modeItem.id === currentMode && 'bg-primary/10'
                  )}
                >
                  <span className="text-lg">
                    {(() => {
                      const Icon = ICON_MAP[modeItem.icon] || MessageSquare
                      return <Icon className="w-5 h-5" />
                    })()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{modeItem.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {modeItem.description}
                    </p>
                  </div>
                  {modeItem.id === currentMode && (
                    <span className="text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
