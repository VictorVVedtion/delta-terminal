/**
 * StrategyHealthCard - 策略健康评分卡片
 *
 * @module S74 策略健康评分
 * @module S76 性能衰退预警
 *
 * 完整展示策略健康状况，包含评分环、维度条、预警信息
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthScoreRing } from './HealthScoreRing'
import { DimensionBar } from './DimensionBar'
import type { StrategyHealthScore, DecayWarning, HealthDimension } from '@/types/health'
import { DECAY_SEVERITY_LABELS, HEALTH_STATUS_COLORS } from '@/types/health'

export interface StrategyHealthCardProps {
  /** 健康评分数据 */
  healthScore: StrategyHealthScore
  /** 衰退预警 */
  decayWarning?: DecayWarning | null
  /** 策略名称 */
  strategyName?: string
  /** 是否显示详情 */
  showDetails?: boolean
  /** 是否紧凑模式 */
  compact?: boolean
  /** 确认预警回调 */
  onAcknowledgeWarning?: (warningId: string) => void
  /** 查看详情回调 */
  onViewDetails?: () => void
  /** 自定义样式 */
  className?: string
}

export function StrategyHealthCard({
  healthScore,
  decayWarning,
  strategyName,
  showDetails = true,
  compact = false,
  onAcknowledgeWarning,
  onViewDetails,
  className,
}: StrategyHealthCardProps) {
  const [expandedDimension, setExpandedDimension] = useState<HealthDimension | null>(null)

  // 评估时间格式化
  const evaluatedTime = useMemo(() => {
    const date = new Date(healthScore.evaluatedAt)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [healthScore.evaluatedAt])

  // 状态标签颜色
  const statusVariant = useMemo(() => {
    switch (healthScore.status) {
      case 'excellent':
        return 'success'
      case 'good':
        return 'success'
      case 'fair':
        return 'warning'
      case 'poor':
        return 'destructive'
      case 'critical':
        return 'destructive'
      default:
        return 'secondary'
    }
  }, [healthScore.status]) as 'success' | 'warning' | 'destructive' | 'secondary'

  // 紧凑模式
  if (compact) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <HealthScoreRing
              score={healthScore.totalScore}
              grade={healthScore.grade}
              status={healthScore.status}
              size="sm"
              trend={healthScore.trend}
              change={healthScore.change}
            />
            <div className="flex-1 min-w-0">
              {strategyName && (
                <h4 className="font-medium text-sm truncate">{strategyName}</h4>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusVariant} className="text-xs">
                  {healthScore.status === 'excellent' && '优秀'}
                  {healthScore.status === 'good' && '良好'}
                  {healthScore.status === 'fair' && '一般'}
                  {healthScore.status === 'poor' && '较差'}
                  {healthScore.status === 'critical' && '危急'}
                </Badge>
                {decayWarning && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    ⚠️ {DECAY_SEVERITY_LABELS[decayWarning.overallSeverity]}
                  </Badge>
                )}
              </div>
            </div>
            {onViewDetails && (
              <Button variant="ghost" size="sm" onClick={onViewDetails}>
                详情
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {strategyName ? `${strategyName} 健康评估` : '策略健康评估'}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {evaluatedTime} 评估
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 评分环和状态 */}
        <div className="flex items-center gap-6">
          <HealthScoreRing
            score={healthScore.totalScore}
            grade={healthScore.grade}
            status={healthScore.status}
            size="lg"
            trend={healthScore.trend}
            change={healthScore.change}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant}>
                {healthScore.status === 'excellent' && '健康状态: 优秀'}
                {healthScore.status === 'good' && '健康状态: 良好'}
                {healthScore.status === 'fair' && '健康状态: 一般'}
                {healthScore.status === 'poor' && '健康状态: 较差'}
                {healthScore.status === 'critical' && '健康状态: 危急'}
              </Badge>
              <span
                className="text-lg font-bold"
                style={{ color: HEALTH_STATUS_COLORS[healthScore.status] }}
              >
                {healthScore.grade}级
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              综合评分 {healthScore.totalScore.toFixed(1)} 分
              {healthScore.trend === 'up' && (
                <span className="text-green-500 ml-2">
                  较上次提升 {healthScore.change.toFixed(1)}
                </span>
              )}
              {healthScore.trend === 'down' && (
                <span className="text-red-500 ml-2">
                  较上次下降 {Math.abs(healthScore.change).toFixed(1)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 衰退预警 */}
        {decayWarning && !decayWarning.acknowledged && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-500 animate-pulse">⚠️</span>
                <span className="font-medium text-red-500">
                  {DECAY_SEVERITY_LABELS[decayWarning.overallSeverity]}性能衰退预警
                </span>
              </div>
              {onAcknowledgeWarning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledgeWarning(decayWarning.id)}
                >
                  知道了
                </Button>
              )}
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {decayWarning.indicators.map((ind) => (
                <li key={ind.type} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {ind.name}: {ind.changePercent.toFixed(1)}%
                </li>
              ))}
            </ul>
            {decayWarning.recommendations.length > 0 && (
              <div className="pt-2 border-t border-red-500/20">
                <p className="text-xs text-muted-foreground mb-1">建议操作:</p>
                <ul className="text-sm space-y-1">
                  {decayWarning.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="text-yellow-500">💡 {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 维度评分详情 */}
        {showDetails && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">维度评分</h4>
            {healthScore.dimensions.map((dim) => (
              <DimensionBar
                key={dim.dimension}
                dimension={dim}
                expanded={expandedDimension === dim.dimension}
                onToggle={() =>
                  setExpandedDimension(
                    expandedDimension === dim.dimension ? null : dim.dimension
                  )
                }
              />
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        {onViewDetails && (
          <div className="pt-2 border-t">
            <Button variant="outline" className="w-full" onClick={onViewDetails}>
              查看完整报告
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StrategyHealthCard
