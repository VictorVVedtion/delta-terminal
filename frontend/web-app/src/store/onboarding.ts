/**
 * Onboarding Store
 *
 * EPIC-010 Story 10.1: 新手引导状态管理
 * 管理用户引导流程状态，持久化到 localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

export interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string | null // CSS selector for spotlight, null for modal-only steps
}

export interface OnboardingState {
  // State
  completed: boolean
  skipped: boolean
  currentStep: number
  lastShownAt: number | null

  // Actions
  startOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  skipOnboarding: () => void
  completeOnboarding: () => void
  resetOnboarding: () => void
  setStep: (step: number) => void
}

// =============================================================================
// Onboarding Steps Configuration
// =============================================================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用 Delta Terminal',
    description: 'AI 驱动的智能交易终端，让我们用 1 分钟带你了解核心功能',
    target: null, // Full screen modal
  },
  {
    id: 'chat',
    title: 'AI 对话创建策略',
    description: '在这里与 Delta AI 对话，用自然语言描述你的交易想法，例如："创建一个 RSI 超卖买入策略"',
    target: '.chat-interface', // Spotlight on chat area
  },
  {
    id: 'strategies',
    title: '策略管理',
    description: '查看和管理你的所有交易策略，包括启动、暂停、调整参数等操作',
    target: '.agent-list', // Spotlight on sidebar agent list
  },
  {
    id: 'complete',
    title: '准备就绪！',
    description: '现在试试创建你的第一个策略吧，可以从模板库开始，或者直接与 AI 对话',
    target: null, // Full screen modal
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Onboarding state data (without actions)
 */
export type OnboardingStateData = Pick<
  OnboardingState,
  'completed' | 'skipped' | 'currentStep' | 'lastShownAt'
>

/**
 * Check if onboarding should be shown
 */
export function shouldShowOnboarding(state: OnboardingStateData): boolean {
  // Already completed or skipped
  if (state.completed || state.skipped) {
    return false
  }

  // First visit
  if (!state.lastShownAt) {
    return true
  }

  // Show reminder if not completed after 7 days
  const daysSinceLastShown = (Date.now() - state.lastShownAt) / (1000 * 60 * 60 * 24)
  return daysSinceLastShown > 7
}

// =============================================================================
// Store
// =============================================================================

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      completed: false,
      skipped: false,
      currentStep: 0,
      lastShownAt: null,

      // Actions
      startOnboarding: () =>
        set({
          currentStep: 0,
          lastShownAt: Date.now(),
        }),

      nextStep: () => {
        const { currentStep } = get()
        const nextStep = currentStep + 1

        if (nextStep >= ONBOARDING_STEPS.length) {
          // Completed all steps
          set({
            completed: true,
            currentStep: ONBOARDING_STEPS.length - 1,
          })
        } else {
          set({ currentStep: nextStep })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 })
        }
      },

      skipOnboarding: () =>
        set({
          skipped: true,
          lastShownAt: Date.now(),
        }),

      completeOnboarding: () =>
        set({
          completed: true,
          lastShownAt: Date.now(),
        }),

      resetOnboarding: () =>
        set({
          completed: false,
          skipped: false,
          currentStep: 0,
          lastShownAt: null,
        }),

      setStep: (step: number) => {
        if (step >= 0 && step < ONBOARDING_STEPS.length) {
          set({ currentStep: step })
        }
      },
    }),
    {
      name: 'delta-onboarding',
      version: 1,
    }
  )
)
