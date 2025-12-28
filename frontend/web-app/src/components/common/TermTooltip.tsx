'use client'

import { HelpCircle } from 'lucide-react'
import React from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type GlossaryTerm,TRADING_GLOSSARY } from '@/lib/glossary'
import { cn } from '@/lib/utils'

interface TermTooltipProps {
  /** 术语 key（如 'rsi', 'grid'）或中文名称 */
  term: string
  /** 是否显示问号图标 */
  showIcon?: boolean
  /** 自定义样式类 */
  className?: string
  /** 子元素（如果不提供，则显示术语名称） */
  children?: React.ReactNode
}

/**
 * 术语解释 Tooltip 组件
 * 为专业术语提供通俗易懂的解释
 */
export function TermTooltip({
  term,
  showIcon = true,
  className,
  children,
}: TermTooltipProps) {
  // 尝试直接匹配 key，或通过中文名称查找
  let glossaryTerm: GlossaryTerm | undefined = TRADING_GLOSSARY[term.toLowerCase()]

  if (!glossaryTerm) {
    // 尝试通过中文名称查找
    for (const key of Object.keys(TRADING_GLOSSARY)) {
      const entry = TRADING_GLOSSARY[key]
      if (entry && entry.term === term) {
        glossaryTerm = entry
        break
      }
    }
  }

  if (!glossaryTerm) {
    // 如果找不到术语，直接返回子元素或术语名称
    return <span className={className}>{children || term}</span>
  }

  const riskColors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 cursor-help border-b border-dotted border-zinc-500 hover:border-zinc-300 transition-colors',
              className
            )}
          >
            {children || glossaryTerm.term}
            {showIcon && (
              <HelpCircle className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-3 bg-zinc-900 border border-zinc-700"
        >
          <div className="space-y-2">
            {/* 术语名称和风险等级 */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-100">
                {glossaryTerm.term}
              </span>
              {glossaryTerm.riskLevel && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    riskColors[glossaryTerm.riskLevel],
                    glossaryTerm.riskLevel === 'low' && 'bg-green-500/10',
                    glossaryTerm.riskLevel === 'medium' && 'bg-yellow-500/10',
                    glossaryTerm.riskLevel === 'high' && 'bg-red-500/10'
                  )}
                >
                  {glossaryTerm.riskLevel === 'low' && '低风险'}
                  {glossaryTerm.riskLevel === 'medium' && '中风险'}
                  {glossaryTerm.riskLevel === 'high' && '高风险'}
                </span>
              )}
            </div>

            {/* 简短解释 */}
            <p className="text-sm text-zinc-300">
              {glossaryTerm.shortExplanation}
            </p>

            {/* 详细解释 */}
            <p className="text-xs text-zinc-400">
              {glossaryTerm.detailedExplanation}
            </p>

            {/* 示例 */}
            {glossaryTerm.example && (
              <div className="pt-2 border-t border-zinc-700">
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-400">例如：</span>
                  {glossaryTerm.example}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 批量术语解释组件
 * 自动识别文本中的术语并添加 Tooltip
 */
export function TermsText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  // 简单实现：检测术语并替换
  // 实际使用中可能需要更复杂的解析逻辑
  return <span className={className}>{text}</span>
}

export default TermTooltip
