/**
 * AIConfigPanel - AI 配置面板
 *
 * AI 引擎配置界面，包括模型选择、设置调整、使用统计
 * 简化版：无订阅限制，平台统一管理 API Key
 */

'use client'

import { useEffect,useState } from 'react'

import { cn } from '@/lib/utils'
import { useAIStore } from '@/store/ai'
import type { AIUserStatus} from '@/types/ai';
import { SUBSCRIPTION_PLANS } from '@/types/ai'

import { ModelSelector } from './ModelSelector'

// ============================================================================
// Types
// ============================================================================

interface AIConfigPanelProps {
  className?: string
  onClose?: () => void
}

type TabType = 'status' | 'models' | 'settings' | 'usage'

// ============================================================================
// Component
// ============================================================================

export function AIConfigPanel({ className, onClose }: AIConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status')
  const {
    config,
    usage,
    userStatus,
    userStatusLoading,
    refreshUserStatus,
    updateSettings,
    resetConfig
  } = useAIStore()

  // 加载用户状态
  useEffect(() => {
    void refreshUserStatus()
  }, [refreshUserStatus])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">AI 引擎配置</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 标签页 */}
      <div className="flex border-b">
        {[
          { id: 'status', label: '服务状态', icon: '✅' },
          { id: 'models', label: '模型配置', icon: '🧠' },
          { id: 'settings', label: '通用设置', icon: '⚙️' },
          { id: 'usage', label: '使用统计', icon: '📊' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as TabType); }}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 服务状态 */}
        {activeTab === 'status' && (
          <StatusTab
            userStatus={userStatus}
            loading={userStatusLoading}
            onRefresh={refreshUserStatus}
          />
        )}

        {/* 模型配置 */}
        {activeTab === 'models' && (
          <ModelSelector />
        )}

        {/* 通用设置 */}
        {activeTab === 'settings' && (
          <SettingsTab
            settings={config.settings}
            onSettingsChange={updateSettings}
            onReset={resetConfig}
          />
        )}

        {/* 使用统计 */}
        {activeTab === 'usage' && (
          <UsageTab usage={usage} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Status Tab
// ============================================================================

interface StatusTabProps {
  userStatus: AIUserStatus
  loading: boolean
  onRefresh: () => void
}

function StatusTab({ userStatus, loading, onRefresh }: StatusTabProps) {
  const planConfig = SUBSCRIPTION_PLANS[userStatus.subscription.plan]
  const isActive = userStatus.subscription.status === 'active'

  return (
    <div className="space-y-6">
      {/* AI 服务状态 */}
      <div className={cn(
        'p-6 rounded-lg border-2',
        isActive && userStatus.limits.canUseAI
          ? 'border-green-500 bg-green-500/5'
          : 'border-destructive bg-destructive/5'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {userStatus.limits.canUseAI ? '🟢' : '🔴'}
            </span>
            <div>
              <h3 className="text-xl font-bold">
                {planConfig.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {userStatus.limits.canUseAI
                  ? '所有 AI 功能均可正常使用'
                  : '请检查服务配置'}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            {loading ? '刷新中...' : '刷新状态'}
          </button>
        </div>

        {/* 功能列表 */}
        <ul className="space-y-2">
          {planConfig.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <span className="text-green-500">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* 可用模型 */}
      <div className="p-4 rounded-lg bg-secondary/30 border">
        <h4 className="text-sm font-medium mb-3">可用模型</h4>
        <div className="flex flex-wrap gap-2">
          {userStatus.limits.allowedModels.includes('*') ? (
            <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">
              ✅ 全部模型可用
            </span>
          ) : (
            userStatus.limits.allowedModels.map((model) => (
              <span
                key={model}
                className="px-3 py-1 rounded-full text-xs bg-secondary"
              >
                {model.split('/')[1] || model}
              </span>
            ))
          )}
        </div>
      </div>

      {/* 平台说明 */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <h4 className="text-sm font-medium mb-2 text-blue-400">💡 关于 AI 服务</h4>
        <p className="text-xs text-muted-foreground">
          Delta Terminal 使用平台统一的 AI 服务，您无需配置 API Key。
          所有 AI 调用费用由平台承担，请放心使用。
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Settings Tab
// ============================================================================

interface AISettings {
  streaming: boolean
  showThinking: boolean
  autoRoute: boolean
  maxTokens: number
  temperature: number
}

interface SettingsTabProps {
  settings: AISettings
  onSettingsChange: (settings: Partial<AISettings>) => void
  onReset: () => void
}

function SettingsTab({ settings, onSettingsChange, onReset }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* 开关设置 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">功能开关</h3>

        <ToggleSetting
          label="流式输出"
          description="实时显示 AI 生成的内容"
          checked={settings.streaming}
          onChange={(checked) => { onSettingsChange({ streaming: checked }); }}
        />

        <ToggleSetting
          label="显示思考过程"
          description="展示 AI 的推理步骤（部分模型支持）"
          checked={settings.showThinking}
          onChange={(checked) => { onSettingsChange({ showThinking: checked }); }}
        />

        <ToggleSetting
          label="自动路由"
          description="根据任务自动选择最佳模型"
          checked={settings.autoRoute}
          onChange={(checked) => { onSettingsChange({ autoRoute: checked }); }}
        />
      </div>

      {/* 参数设置 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">参数调整</h3>

        <SliderSetting
          label="最大 Tokens"
          description="单次回复的最大长度"
          value={settings.maxTokens}
          min={256}
          max={32768}
          step={256}
          onChange={(value) => { onSettingsChange({ maxTokens: value }); }}
          formatValue={(v) => `${v} tokens`}
        />

        <SliderSetting
          label="温度"
          description="控制输出的创造性（0=确定性，2=创造性）"
          value={settings.temperature}
          min={0}
          max={2}
          step={0.1}
          onChange={(value) => { onSettingsChange({ temperature: value }); }}
          formatValue={(v) => v.toFixed(1)}
        />
      </div>

      {/* 重置按钮 */}
      <div className="pt-4 border-t">
        <button
          onClick={onReset}
          className="text-sm text-red-500 hover:text-red-600"
        >
          重置为默认配置
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Usage Tab
// ============================================================================

interface UsageTabProps {
  usage: {
    today: { totalCalls: number; totalCost: number }
    thisWeek: { totalCalls: number; totalCost: number }
    thisMonth: { totalCalls: number; totalCost: number; byModel: Record<string, { calls: number; cost: number }> }
  }
}

function UsageTab({ usage }: UsageTabProps) {
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="今日"
          calls={usage.today.totalCalls}
          cost={usage.today.totalCost}
        />
        <StatCard
          label="本周"
          calls={usage.thisWeek.totalCalls}
          cost={usage.thisWeek.totalCost}
        />
        <StatCard
          label="本月"
          calls={usage.thisMonth.totalCalls}
          cost={usage.thisMonth.totalCost}
          highlight
        />
      </div>

      {/* 按模型统计 */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">按模型统计（本月）</h3>
        <div className="space-y-2">
          {Object.entries(usage.thisMonth.byModel).length > 0 ? (
            Object.entries(usage.thisMonth.byModel)
              .sort(([, a], [, b]) => b.cost - a.cost)
              .map(([model, stats]) => (
                <div
                  key={model}
                  className="flex items-center justify-between p-3 rounded-md bg-secondary/30"
                >
                  <div>
                    <div className="text-sm font-medium">{model.split('/')[1] || model}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.calls} 次调用
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">${stats.cost.toFixed(4)}</div>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无使用记录
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

interface ToggleSettingProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => { onChange(!checked); }}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-secondary'
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}

interface SliderSettingProps {
  label: string
  description: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue: (value: number) => string
}

function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatValue
}: SliderSettingProps) {
  return (
    <div className="p-3 rounded-md bg-secondary/30">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <span className="text-sm font-mono">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="w-full h-2 rounded-full bg-secondary appearance-none cursor-pointer"
      />
    </div>
  )
}

interface StatCardProps {
  label: string
  calls: number
  cost: number
  highlight?: boolean
}

function StatCard({ label, calls, cost, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      highlight ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30'
    )}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{calls}</div>
      <div className="text-xs text-muted-foreground">次调用</div>
      <div className="mt-2 text-sm font-mono text-primary">
        ${cost.toFixed(4)}
      </div>
    </div>
  )
}

export default AIConfigPanel
