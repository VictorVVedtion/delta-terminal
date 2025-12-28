/**
 * HealthScoreRing - 健康评分环形进度指示器
 *
 * @module S74 策略健康评分
 *
 * 使用 SVG 绘制的环形进度条，展示健康评分
 */

'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { HealthGrade, HealthStatus } from '@/types/health'
import { GRADE_COLORS, HEALTH_STATUS_COLORS } from '@/types/health'

export interface HealthScoreRingProps {
  /** 分数 (0-100) */
  score: number
  /** 等级 */
  grade: HealthGrade
  /** 状态 */
  status: HealthStatus
  /** 环形大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否显示等级标签 */
  showGrade?: boolean
  /** 是否显示分数 */
  showScore?: boolean
  /** 趋势指示 */
  trend?: 'up' | 'down' | 'stable'
  /** 变化值 */
  change?: number
  /** 自定义样式 */
  className?: string
}

const SIZE_CONFIG = {
  sm: { diameter: 64, strokeWidth: 4, fontSize: 'text-lg', gradeSize: 'text-xs' },
  md: { diameter: 96, strokeWidth: 6, fontSize: 'text-2xl', gradeSize: 'text-sm' },
  lg: { diameter: 128, strokeWidth: 8, fontSize: 'text-3xl', gradeSize: 'text-base' },
  xl: { diameter: 160, strokeWidth: 10, fontSize: 'text-4xl', gradeSize: 'text-lg' },
}

export function HealthScoreRing({
  score,
  grade,
  status,
  size = 'md',
  showGrade = true,
  showScore = true,
  trend,
  change,
  className,
}: HealthScoreRingProps) {
  const config = SIZE_CONFIG[size]
  const radius = (config.diameter - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  // 渐变颜色
  const color = useMemo(() => {
    return GRADE_COLORS[grade] || HEALTH_STATUS_COLORS[status]
  }, [grade, status])

  // 趋势箭头
  const trendIcon = useMemo(() => {
    if (!trend || trend === 'stable') return null
    if (trend === 'up') {
      return (
        <span className="text-green-500 text-xs ml-1">
          ↑ {change !== undefined && `+${change.toFixed(1)}`}
        </span>
      )
    }
    return (
      <span className="text-red-500 text-xs ml-1">
        ↓ {change !== undefined && change.toFixed(1)}
      </span>
    )
  }, [trend, change])

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* SVG 环形 */}
      <svg
        width={config.diameter}
        height={config.diameter}
        className="transform -rotate-90"
      >
        {/* 背景环 */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-muted/20"
        />
        {/* 进度环 */}
        <circle
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* 中心内容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showGrade && (
          <span
            className={cn('font-bold', config.gradeSize)}
            style={{ color }}
          >
            {grade}
          </span>
        )}
        {showScore && (
          <span className={cn('font-semibold text-foreground', config.fontSize)}>
            {Math.round(score)}
          </span>
        )}
        {trendIcon}
      </div>
    </div>
  )
}

export default HealthScoreRing
