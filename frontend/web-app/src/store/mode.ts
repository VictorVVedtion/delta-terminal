/**
 * Mode Store - 工作模式状态管理
 * 基于 PRD S76 模式选择器规范
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// 6 种工作模式
export type WorkMode =
  | 'chat'        // 对话模式
  | 'research'    // 深度研究模式
  | 'code'        // 代码模式
  | 'onchain'     // 链上分析模式
  | 'monitor'     // 监控模式
  | 'sleep'       // 安睡模式

// 模式配置
export interface ModeConfig {
  id: WorkMode
  name: string
  icon: string
  description: string
  model?: string        // 使用的 AI 模型
  features: string[]    // 模式特性
}

// 所有模式配置
export const MODE_CONFIGS: Record<WorkMode, ModeConfig> = {
  chat: {
    id: 'chat',
    name: '对话模式',
    icon: '💬',
    description: '日常聊天、策略讨论、教学问答',
    model: 'Claude Sonnet',
    features: ['InsightCard', 'Canvas', '策略创建'],
  },
  research: {
    id: 'research',
    name: '深度研究',
    icon: '🔬',
    description: '综合分析技术面、链上数据、宏观事件',
    model: 'Claude Opus',
    features: ['深度报告', '多维分析', '长上下文'],
  },
  code: {
    id: 'code',
    name: '代码模式',
    icon: '💻',
    description: '策略代码编写、调试、优化',
    model: 'Claude Sonnet',
    features: ['代码生成', '语法高亮', '调试辅助'],
  },
  onchain: {
    id: 'onchain',
    name: '链上分析',
    icon: '⛓️',
    description: '链上数据分析、巨鲸追踪、资金流向',
    model: 'Claude Sonnet',
    features: ['链上数据', '巨鲸监控', '资金流向'],
  },
  monitor: {
    id: 'monitor',
    name: '监控模式',
    icon: '📊',
    description: '实时监控所有运行中的策略',
    model: 'Claude Haiku',
    features: ['实时数据', '风险预警', '快速响应'],
  },
  sleep: {
    id: 'sleep',
    name: '安睡模式',
    icon: '😴',
    description: '自动化运行，仅紧急事件通知',
    model: 'Claude Haiku',
    features: ['自动化', '低干扰', '紧急通知'],
  },
}

interface ModeState {
  currentMode: WorkMode
  previousMode: WorkMode | null
  isTransitioning: boolean

  setMode: (mode: WorkMode) => void
  toggleMode: () => void  // 快速切换到上一个模式
}

export const useModeStore = create<ModeState>()(
  devtools(
    persist(
      (set, get) => ({
        currentMode: 'chat',
        previousMode: null,
        isTransitioning: false,

        setMode: (mode) => {
          const current = get().currentMode
          if (mode !== current) {
            set(
              {
                currentMode: mode,
                previousMode: current,
                isTransitioning: true,
              },
              false,
              'mode/setMode'
            )
            // 模拟过渡动画
            setTimeout(() => {
              set({ isTransitioning: false }, false, 'mode/transitionEnd')
            }, 300)
          }
        },

        toggleMode: () => {
          const { previousMode, currentMode } = get()
          if (previousMode) {
            set(
              {
                currentMode: previousMode,
                previousMode: currentMode,
              },
              false,
              'mode/toggleMode'
            )
          }
        },
      }),
      {
        name: 'mode-storage',
      }
    )
  )
)
