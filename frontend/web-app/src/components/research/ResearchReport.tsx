'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
  BookmarkPlus,
  Share2,
} from 'lucide-react'
import type { ResearchReport, ResearchSection, ResearchRecommendation } from '@/types/research'

/**
 * ResearchReportCard - 研究报告展示组件
 * 基于 PRD S78 - 深度研究模式规范
 */

interface ResearchReportCardProps {
  report: ResearchReport
  className?: string
  onSave?: () => void
  onShare?: () => void
}

// Recommendation badge color mapping
function getRecommendationColor(action: ResearchRecommendation['action']) {
  switch (action) {
    case 'buy':
      return 'bg-green-500/20 text-green-500 border-green-500/30'
    case 'sell':
      return 'bg-red-500/20 text-red-500 border-red-500/30'
    case 'hold':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
    case 'wait':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getStrengthLabel(strength: ResearchRecommendation['strength']) {
  switch (strength) {
    case 'strong':
      return '强烈'
    case 'moderate':
      return '中等'
    case 'weak':
      return '轻度'
    default:
      return ''
  }
}

function getActionLabel(action: ResearchRecommendation['action']) {
  switch (action) {
    case 'buy':
      return '买入'
    case 'sell':
      return '卖出'
    case 'hold':
      return '持有'
    case 'wait':
      return '观望'
    default:
      return ''
  }
}

// Section card
function SectionCard({ section }: { section: ResearchSection }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <span>{section.icon}</span>
        <h4 className="text-sm font-medium">{section.title}</h4>
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
        {section.content}
      </p>
      {section.metrics && section.metrics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {section.metrics.map((metric, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-background rounded text-xs"
            >
              <span className="text-muted-foreground">{metric.label}:</span>
              <span
                className={cn(
                  'font-medium',
                  metric.trend === 'up' && 'text-green-500',
                  metric.trend === 'down' && 'text-red-500'
                )}
              >
                {metric.value}
                {metric.unit}
              </span>
              {metric.trend === 'up' && <ArrowUp className="w-3 h-3 text-green-500" />}
              {metric.trend === 'down' && <ArrowDown className="w-3 h-3 text-red-500" />}
              {metric.trend === 'neutral' && <Minus className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Recommendation card
function RecommendationCard({ recommendation }: { recommendation: ResearchRecommendation }) {
  return (
    <div className="p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">投资建议</h4>
        <Badge
          variant="outline"
          className={cn('font-medium', getRecommendationColor(recommendation.action))}
        >
          {getStrengthLabel(recommendation.strength)}
          {getActionLabel(recommendation.action)}
        </Badge>
      </div>

      <p className="text-sm mb-3">{recommendation.rationale}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>⏱️ {recommendation.timeframe}</span>
      </div>

      {recommendation.risks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">⚠️ 风险提示</p>
          <ul className="text-xs space-y-1">
            {recommendation.risks.map((risk, index) => (
              <li key={index} className="text-muted-foreground">
                • {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ResearchReportCard({
  report,
  className,
  onSave,
  onShare,
}: ResearchReportCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>📋</span>
              {report.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {report.symbol} · 置信度 {Math.round(report.confidence * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onSave && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            )}
            {onShare && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="text-sm text-muted-foreground">{report.summary}</div>

        {/* Recommendation */}
        <RecommendationCard recommendation={report.recommendation} />

        {/* Sections */}
        <div className="space-y-3">
          {report.sections.map((section, index) => (
            <SectionCard key={index} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t text-xs text-muted-foreground text-center">
          报告生成时间: {new Date(report.createdAt).toLocaleString('zh-CN')}
        </div>
      </CardContent>
    </Card>
  )
}
