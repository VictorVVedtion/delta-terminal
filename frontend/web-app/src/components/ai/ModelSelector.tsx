/**
 * ModelSelector - 模型选择器组件
 *
 * 支持简单模式（预设选择）和高级模式（按任务配置）
 */

'use client'

import { useState } from 'react'
import { useAIStore } from '@/store/ai'
import {
  AI_MODELS,
  SIMPLE_PRESETS,
  TASK_TYPES,
  AIModel,
  AITaskType,
  SimplePreset
} from '@/types/ai'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ModelSelectorProps {
  className?: string
  onConfigChange?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ModelSelector({ className, onConfigChange }: ModelSelectorProps) {
  const {
    config,
    setMode,
    setSimplePreset,
    setTaskModel,
    estimateCost
  } = useAIStore()

  const [expandedTask, setExpandedTask] = useState<AITaskType | null>(null)
  const costEstimate = estimateCost()

  return (
    <div className={cn('space-y-6', className)}>
      {/* 模式切换 */}
      <div className="flex gap-2 p-1 bg-secondary rounded-lg">
        <button
          onClick={() => {
            setMode('simple')
            onConfigChange?.()
          }}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            config.mode === 'simple'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          简单模式
        </button>
        <button
          onClick={() => {
            setMode('advanced')
            onConfigChange?.()
          }}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            config.mode === 'advanced'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          高级模式
        </button>
      </div>

      {/* 简单模式 */}
      {config.mode === 'simple' && (
        <SimpleMode
          currentPreset={config.simple.preset}
          onPresetChange={(preset) => {
            setSimplePreset(preset)
            onConfigChange?.()
          }}
        />
      )}

      {/* 高级模式 */}
      {config.mode === 'advanced' && (
        <AdvancedMode
          taskModels={config.advanced.taskModels}
          expandedTask={expandedTask}
          onExpandTask={setExpandedTask}
          onTaskModelChange={(taskType, model) => {
            setTaskModel(taskType, model)
            onConfigChange?.()
          }}
        />
      )}

      {/* 成本预估 */}
      <CostEstimateCard estimate={costEstimate} />
    </div>
  )
}

// ============================================================================
// Simple Mode
// ============================================================================

interface SimpleModeProps {
  currentPreset: SimplePreset
  onPresetChange: (preset: SimplePreset) => void
}

function SimpleMode({ currentPreset, onPresetChange }: SimpleModeProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">选择预设方案</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.values(SIMPLE_PRESETS).map((preset) => {
          const model = AI_MODELS[preset.defaultModel]
          const isSelected = currentPreset === preset.preset

          return (
            <button
              key={preset.preset}
              onClick={() => onPresetChange(preset.preset)}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{preset.icon}</span>
                <span className="font-medium">{preset.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {preset.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {model?.name || preset.defaultModel}
                </span>
                <span className="font-mono text-primary">
                  ~${preset.estimatedCostPerCall.toFixed(3)}/次
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Advanced Mode
// ============================================================================

interface AdvancedModeProps {
  taskModels: Record<AITaskType, string>
  expandedTask: AITaskType | null
  onExpandTask: (task: AITaskType | null) => void
  onTaskModelChange: (taskType: AITaskType, model: string) => void
}

function AdvancedMode({
  taskModels,
  expandedTask,
  onExpandTask,
  onTaskModelChange
}: AdvancedModeProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">按任务类型配置模型</h3>
      {Object.values(TASK_TYPES).map((task) => {
        const currentModel = taskModels[task.type]
        const modelInfo = AI_MODELS[currentModel]
        const isExpanded = expandedTask === task.type

        return (
          <div
            key={task.type}
            className="border rounded-lg overflow-hidden"
          >
            {/* 任务头部 */}
            <button
              onClick={() => onExpandTask(isExpanded ? null : task.type)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{task.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{task.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {task.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm">{modelInfo?.name || currentModel}</div>
                  <div className="text-xs text-muted-foreground">
                    优先: {getPriorityLabel(task.priority)}
                  </div>
                </div>
                <span className={cn(
                  'transition-transform',
                  isExpanded && 'rotate-180'
                )}>
                  ▼
                </span>
              </div>
            </button>

            {/* 模型选择列表 */}
            {isExpanded && (
              <div className="border-t bg-secondary/30 p-4 space-y-2">
                <div className="text-xs text-muted-foreground mb-3">
                  推荐: {AI_MODELS[task.recommendedModel]?.name || task.recommendedModel}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {getModelsForTask(task.type).map((model) => (
                    <ModelOption
                      key={model.id}
                      model={model}
                      isSelected={currentModel === model.id}
                      isRecommended={task.recommendedModel === model.id}
                      onSelect={() => onTaskModelChange(task.type, model.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Model Option
// ============================================================================

interface ModelOptionProps {
  model: AIModel
  isSelected: boolean
  isRecommended: boolean
  onSelect: () => void
}

function ModelOption({ model, isSelected, isRecommended, onSelect }: ModelOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'p-3 rounded-md border text-left transition-all',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span>{model.icon}</span>
          <span className="font-medium text-sm">{model.name}</span>
        </div>
        {isRecommended && (
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
            推荐
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>${model.inputPrice}/${model.outputPrice}</span>
        <span>{(model.contextLength / 1000).toFixed(0)}K</span>
        {model.supportsThinking && <span>🧠</span>}
      </div>
    </button>
  )
}

// ============================================================================
// Cost Estimate Card
// ============================================================================

interface CostEstimateCardProps {
  estimate: {
    daily: number
    weekly: number
    monthly: number
  }
}

function CostEstimateCard({ estimate }: CostEstimateCardProps) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">预估月费用</div>
          <div className="text-xs text-muted-foreground">
            基于当前配置 × 预估调用量
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            ${estimate.monthly.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            ≈ ${estimate.daily.toFixed(2)}/天
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    speed: '速度',
    intelligence: '智能',
    reliability: '可靠',
    natural: '自然',
    cost: '成本'
  }
  return labels[priority] || priority
}

function getModelsForTask(taskType: AITaskType): AIModel[] {
  const task = TASK_TYPES[taskType]

  // 获取推荐和备选模型
  const recommendedIds = [task.recommendedModel, ...task.alternativeModels]

  // 获取所有模型并排序
  return Object.values(AI_MODELS).sort((a, b) => {
    const aIndex = recommendedIds.indexOf(a.id)
    const bIndex = recommendedIds.indexOf(b.id)

    // 推荐的排前面
    if (aIndex !== -1 && bIndex === -1) return -1
    if (aIndex === -1 && bIndex !== -1) return 1
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex

    // 按 tier 排序
    const tierOrder = { tier1: 0, tier2: 1, tier3: 2 }
    return tierOrder[a.tier] - tierOrder[b.tier]
  })
}

export default ModelSelector
