'use client'

/**
 * TemplateSelector Component
 *
 * EPIC-010 Story 10.3: 策略模板选择器
 * 提供策略模板浏览和一键应用功能
 */

import React from 'react'
import { X, Search, ChevronRight, TrendingUp, Percent, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  STRATEGY_TEMPLATES,
  TEMPLATE_CATEGORIES,
  RISK_LEVEL_CONFIG,
  templateToInsightData,
  type StrategyTemplate,
  type TemplateCategory,
} from '@/lib/templates/strategies'
import type { InsightData } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface TemplateSelectorProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal is closed */
  onClose: () => void
  /** Called when a template is selected */
  onSelect: (template: StrategyTemplate, insight: InsightData) => void
}

// =============================================================================
// TemplateSelector Component
// =============================================================================

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [previewTemplate, setPreviewTemplate] = React.useState<StrategyTemplate | null>(null)

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    let templates = STRATEGY_TEMPLATES

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.marketConditions.some((c) => c.toLowerCase().includes(query))
      )
    }

    return templates
  }, [selectedCategory, searchQuery])

  // Handle template selection
  const handleSelect = React.useCallback(
    (template: StrategyTemplate) => {
      const insight = templateToInsightData(template)
      onSelect(template, insight)
      onClose()
    },
    [onSelect, onClose]
  )

  // Close preview when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setPreviewTemplate(null)
      setSearchQuery('')
      setSelectedCategory('all')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">策略模板库</h2>
              <p className="text-sm text-muted-foreground">选择模板快速创建交易策略</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-border space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索策略模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full h-10 pl-10 pr-4 rounded-lg',
                'bg-muted/50 border border-border',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'transition-all duration-200'
              )}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0"
            >
              全部
            </Button>
            {(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]).map((category) => {
              const config = TEMPLATE_CATEGORIES[category]
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex-shrink-0 gap-1.5"
                >
                  <span>{config.icon}</span>
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Template List */}
          <div className={cn(
            'flex-1 overflow-y-auto p-4',
            previewTemplate && 'lg:w-1/2'
          )}>
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">未找到匹配的模板</p>
                <p className="text-sm text-muted-foreground/70 mt-1">尝试其他关键词或分类</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={previewTemplate?.id === template.id}
                    onSelect={() => handleSelect(template)}
                    onPreview={() => setPreviewTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel (Desktop) */}
          {previewTemplate && (
            <div className="hidden lg:block w-1/2 border-l border-border overflow-y-auto bg-muted/20">
              <TemplatePreview
                template={previewTemplate}
                onSelect={() => handleSelect(previewTemplate)}
                onClose={() => setPreviewTemplate(null)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            共 {STRATEGY_TEMPLATES.length} 个模板 · 选择后可调整参数
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
        </footer>
      </div>
    </div>
  )
}

// =============================================================================
// TemplateCard Component
// =============================================================================

interface TemplateCardProps {
  template: StrategyTemplate
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
}

function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  const categoryConfig = TEMPLATE_CATEGORIES[template.category]
  const riskConfig = RISK_LEVEL_CONFIG[template.riskLevel]

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
      )}
      onClick={onPreview}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Template Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-medium text-sm truncate">{template.name}</h3>
            <Badge variant="outline" className="flex-shrink-0 text-xs">
              {riskConfig.icon} {riskConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {template.description}
          </p>

          {/* Metrics */}
          {template.backtestMetrics && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">胜率</span>
                <span className="font-medium">{template.backtestMetrics.winRate}%</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">收益</span>
                <span className={cn(
                  'font-medium',
                  template.backtestMetrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {template.backtestMetrics.totalReturn > 0 ? '+' : ''}
                  {template.backtestMetrics.totalReturn}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span className="text-muted-foreground">回撤</span>
                <span className="font-medium text-red-500">{template.backtestMetrics.maxDrawdown}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Badge & Arrow */}
        <div className="flex flex-col items-end gap-2">
          <Badge variant="secondary" className="text-xs">
            {categoryConfig.icon} {categoryConfig.label}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
          >
            立即使用
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// TemplatePreview Component
// =============================================================================

interface TemplatePreviewProps {
  template: StrategyTemplate
  onSelect: () => void
  onClose: () => void
}

function TemplatePreview({ template, onSelect, onClose }: TemplatePreviewProps) {
  const categoryConfig = TEMPLATE_CATEGORIES[template.category]
  const riskConfig = RISK_LEVEL_CONFIG[template.riskLevel]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <h3 className="text-xl font-semibold">{template.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{categoryConfig.label}</Badge>
            <Badge variant="outline" className={riskConfig.color}>
              {riskConfig.icon} {riskConfig.label}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-6">{template.description}</p>

      {/* Metrics */}
      {template.backtestMetrics && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border mb-6">
          <h4 className="text-sm font-medium mb-3">📊 历史表现</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {template.backtestMetrics.winRate}%
              </div>
              <div className="text-xs text-muted-foreground">胜率</div>
            </div>
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                template.backtestMetrics.totalReturn > 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {template.backtestMetrics.totalReturn > 0 ? '+' : ''}
                {template.backtestMetrics.totalReturn}%
              </div>
              <div className="text-xs text-muted-foreground">总收益</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {template.backtestMetrics.maxDrawdown}%
              </div>
              <div className="text-xs text-muted-foreground">最大回撤</div>
            </div>
          </div>
        </div>
      )}

      {/* Market Conditions */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">🎯 适用场景</h4>
        <div className="flex flex-wrap gap-2">
          {template.marketConditions.map((condition, index) => (
            <Badge key={index} variant="outline">
              {condition}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">💡 使用提示</h4>
        <ul className="space-y-1.5">
          {template.tips.map((tip, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Default Config */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">⚙️ 默认配置</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">交易对</span>
            <span className="font-medium">{template.defaultConfig.symbol}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">时间周期</span>
            <span className="font-medium">{template.defaultConfig.timeframe}</span>
          </div>
          {template.defaultConfig.riskSettings.stopLoss.enabled && (
            <div className="flex justify-between p-2 rounded bg-muted/30">
              <span className="text-muted-foreground">止损</span>
              <span className="font-medium">{template.defaultConfig.riskSettings.stopLoss.value}%</span>
            </div>
          )}
          {template.defaultConfig.riskSettings.takeProfit.enabled && (
            <div className="flex justify-between p-2 rounded bg-muted/30">
              <span className="text-muted-foreground">止盈</span>
              <span className="font-medium">{template.defaultConfig.riskSettings.takeProfit.value}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Parameters Preview */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-2">📐 可调参数 ({template.params.length})</h4>
        <div className="space-y-1">
          {template.params.filter((p) => p.level === 1).map((param) => (
            <div key={param.key} className="flex justify-between p-2 rounded bg-muted/30 text-sm">
              <span className="text-muted-foreground">{param.label}</span>
              <span className="font-medium">
                {typeof param.value === 'boolean'
                  ? param.value ? '开启' : '关闭'
                  : Array.isArray(param.value)
                    ? `${param.value.length} 项`
                    : String(param.value)}
                {param.config.unit}
              </span>
            </div>
          ))}
        </div>
        {template.params.filter((p) => p.level === 2).length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            + {template.params.filter((p) => p.level === 2).length} 个高级参数
          </p>
        )}
      </div>

      {/* Action Button */}
      <Button className="w-full" size="lg" onClick={onSelect}>
        <Sparkles className="h-4 w-4 mr-2" />
        使用此模板
      </Button>
    </div>
  )
}

export default TemplateSelector
