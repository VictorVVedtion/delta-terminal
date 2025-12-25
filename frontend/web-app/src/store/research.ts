/**
 * Research Store - 深度研究模式状态管理
 * 基于 PRD S78 - 深度研究模式规范
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ResearchSession,
  ResearchStep,
  ResearchStepId,
  ResearchStepStatus,
  ResearchReport,
} from '@/types/research'
import { createDefaultResearchSteps } from '@/types/research'

// =============================================================================
// State Interface
// =============================================================================

interface ResearchState {
  // Current session
  currentSession: ResearchSession | null
  sessions: ResearchSession[]

  // Actions
  startResearch: (symbol: string, query: string) => void
  updateStepStatus: (stepId: ResearchStepId, status: ResearchStepStatus, progress?: number) => void
  setStepResult: (stepId: ResearchStepId, result: ResearchStep['result']) => void
  setStepError: (stepId: ResearchStepId, error: string) => void
  advanceToNextStep: () => void
  completeResearch: (report: ResearchReport) => void
  cancelResearch: () => void
  clearSession: () => void

  // Computed
  getCurrentStep: () => ResearchStep | null
  getProgress: () => number
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useResearchStore = create<ResearchState>()(
  devtools(
    (set, get) => ({
      currentSession: null,
      sessions: [],

      startResearch: (symbol: string, query: string) => {
        const session: ResearchSession = {
          id: `research_${Date.now()}`,
          symbol,
          query,
          status: 'planning',
          steps: createDefaultResearchSteps(),
          currentStepIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        set(
          (state) => ({
            currentSession: session,
            sessions: [...state.sessions, session],
          }),
          false,
          'research/startResearch'
        )

        // 模拟开始第一步
        setTimeout(() => {
          get().updateStepStatus('technical', 'running', 0)
          set(
            (state) => ({
              currentSession: state.currentSession
                ? { ...state.currentSession, status: 'researching' }
                : null,
            }),
            false,
            'research/beginResearch'
          )
        }, 500)
      },

      updateStepStatus: (stepId, status, progress = 0) => {
        set(
          (state) => {
            if (!state.currentSession) return state

            const steps = state.currentSession.steps.map((step) =>
              step.id === stepId
                ? { ...step, status, progress }
                : step
            )

            return {
              currentSession: {
                ...state.currentSession,
                steps,
                updatedAt: Date.now(),
              },
            }
          },
          false,
          'research/updateStepStatus'
        )
      },

      setStepResult: (stepId, result) => {
        set(
          (state) => {
            if (!state.currentSession) return state

            const steps = state.currentSession.steps.map((step) =>
              step.id === stepId
                ? { ...step, result, status: 'completed' as ResearchStepStatus, progress: 100 }
                : step
            )

            return {
              currentSession: {
                ...state.currentSession,
                steps,
                updatedAt: Date.now(),
              },
            }
          },
          false,
          'research/setStepResult'
        )
      },

      setStepError: (stepId, error) => {
        set(
          (state) => {
            if (!state.currentSession) return state

            const steps = state.currentSession.steps.map((step) =>
              step.id === stepId
                ? { ...step, error, status: 'failed' as ResearchStepStatus }
                : step
            )

            return {
              currentSession: {
                ...state.currentSession,
                steps,
                updatedAt: Date.now(),
              },
            }
          },
          false,
          'research/setStepError'
        )
      },

      advanceToNextStep: () => {
        set(
          (state) => {
            if (!state.currentSession) return state

            const nextIndex = state.currentSession.currentStepIndex + 1
            if (nextIndex >= state.currentSession.steps.length) {
              return state
            }

            const steps = state.currentSession.steps.map((step, index) =>
              index === nextIndex
                ? { ...step, status: 'running' as ResearchStepStatus, progress: 0 }
                : step
            )

            return {
              currentSession: {
                ...state.currentSession,
                steps,
                currentStepIndex: nextIndex,
                updatedAt: Date.now(),
              },
            }
          },
          false,
          'research/advanceToNextStep'
        )
      },

      completeResearch: (report) => {
        set(
          (state) => {
            if (!state.currentSession) return state

            const completedSession: ResearchSession = {
              ...state.currentSession,
              status: 'completed',
              report,
              completedAt: Date.now(),
              updatedAt: Date.now(),
            }

            return {
              currentSession: completedSession,
              sessions: state.sessions.map((s) =>
                s.id === completedSession.id ? completedSession : s
              ),
            }
          },
          false,
          'research/completeResearch'
        )
      },

      cancelResearch: () => {
        set(
          (state) => {
            if (!state.currentSession) return state

            return {
              currentSession: {
                ...state.currentSession,
                status: 'failed',
                updatedAt: Date.now(),
              },
            }
          },
          false,
          'research/cancelResearch'
        )
      },

      clearSession: () => {
        set({ currentSession: null }, false, 'research/clearSession')
      },

      getCurrentStep: () => {
        const session = get().currentSession
        if (!session) return null
        return session.steps[session.currentStepIndex] || null
      },

      getProgress: () => {
        const session = get().currentSession
        if (!session) return 0

        const completedSteps = session.steps.filter(
          (s) => s.status === 'completed'
        ).length
        const totalSteps = session.steps.length

        // 计算包含当前步骤进度的总进度
        const currentStep = session.steps[session.currentStepIndex]
        const currentProgress = currentStep?.progress || 0

        return Math.round(
          ((completedSteps + currentProgress / 100) / totalSteps) * 100
        )
      },
    }),
    { name: 'research-store' }
  )
)
