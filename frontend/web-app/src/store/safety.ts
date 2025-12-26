/**
 * Safety Store
 * Manages kill switch, margin alerts, circuit breaker, and approval flow state
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  SafetyStatus,
  SafetyConfig,
  KillSwitchStatus,
  KillSwitchResult,
  MarginStatus,
  MarginAlertLevel,
  CircuitBreakerStatus,
  CircuitBreakerTrigger,
  ApprovalState,
  ApprovalStep,
  ApprovalRecord,
  DEFAULT_SAFETY_CONFIG,
  calculateMarginAlertLevel,
  calculateSafetyHealth,
  generateApprovalToken,
} from '@/types/safety'

// ============================================================================
// Store Interface
// ============================================================================

interface SafetyStore {
  // Status
  status: SafetyStatus
  config: SafetyConfig
  approvalState: ApprovalState | null
  approvalHistory: ApprovalRecord[]

  // Kill Switch Actions
  triggerKillSwitch: (closePositions: boolean) => Promise<KillSwitchResult>
  resetKillSwitch: () => void
  setKillSwitchStatus: (status: KillSwitchStatus) => void

  // Margin Actions
  updateMarginStatus: (margin: Partial<MarginStatus>) => void
  setMarginAlertLevel: (level: MarginAlertLevel) => void

  // Circuit Breaker Actions
  triggerCircuitBreaker: (reason: CircuitBreakerTrigger) => void
  resetCircuitBreaker: () => void
  updateCircuitBreakerMetrics: (metrics: {
    dailyLoss?: number
    hourlyLoss?: number
    consecutiveLosses?: number
  }) => void

  // Approval Flow Actions
  startApprovalFlow: () => void
  advanceApprovalStep: () => void
  goBackApprovalStep: () => void
  acknowledgeRisk: () => void
  confirmCapital: () => void
  completeApproval: () => string | null // returns approval token
  cancelApproval: () => void
  addApprovalRecord: (record: Omit<ApprovalRecord, 'id'>) => void

  // Config Actions
  updateConfig: (config: Partial<SafetyConfig>) => void

  // Utility
  getOverallHealth: () => 'healthy' | 'warning' | 'critical'
  isKillSwitchReady: () => boolean
  canDeploy: () => boolean
}

// ============================================================================
// Initial State
// ============================================================================

const initialMarginStatus: MarginStatus = {
  marginRatio: 100,
  usedMargin: 0,
  availableMargin: 0,
  totalEquity: 0,
  alertLevel: 'safe',
  lastUpdated: Date.now(),
}

const initialCircuitBreaker: CircuitBreakerStatus = {
  triggered: false,
  currentDailyLoss: 0,
  currentHourlyLoss: 0,
  consecutiveLosses: 0,
  canResume: true,
}

const initialStatus: SafetyStatus = {
  killSwitch: {
    status: 'ready',
  },
  margin: initialMarginStatus,
  circuitBreaker: initialCircuitBreaker,
  lastUpdated: Date.now(),
  overallHealth: 'healthy',
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSafetyStore = create<SafetyStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      status: initialStatus,
      config: DEFAULT_SAFETY_CONFIG,
      approvalState: null,
      approvalHistory: [],

      // ========================================================================
      // Kill Switch Actions
      // ========================================================================

      triggerKillSwitch: async (closePositions: boolean) => {
        const startTime = Date.now()

        set((state) => ({
          status: {
            ...state.status,
            killSwitch: {
              status: 'triggered',
              lastTriggered: Date.now(),
              cooldownUntil: Date.now() + state.config.killSwitch.cooldownDuration,
            },
            lastUpdated: Date.now(),
          },
        }))

        // Simulate stopping strategies and cancelling orders
        // In production, this would call actual API endpoints
        const result: KillSwitchResult = {
          success: true,
          stoppedStrategies: 0,
          cancelledOrders: 0,
          closedPositions: closePositions ? 0 : 0,
          timestamp: Date.now(),
          executionTime: Date.now() - startTime,
        }

        // TODO: Integrate with AgentStore to stop all running agents
        // TODO: Integrate with Exchange API to cancel all orders
        // TODO: Optionally close all positions

        // Set cooldown status
        setTimeout(() => {
          set((state) => ({
            status: {
              ...state.status,
              killSwitch: {
                ...state.status.killSwitch,
                status: 'cooldown',
              },
            },
          }))

          // Reset to ready after cooldown
          setTimeout(() => {
            get().resetKillSwitch()
          }, get().config.killSwitch.cooldownDuration)
        }, 100)

        return result
      },

      resetKillSwitch: () => {
        set((state) => {
          const killSwitchUpdate: SafetyStatus['killSwitch'] = {
            status: 'ready',
          }
          if (state.status.killSwitch.lastTriggered !== undefined) {
            killSwitchUpdate.lastTriggered = state.status.killSwitch.lastTriggered
          }
          return {
            status: {
              ...state.status,
              killSwitch: killSwitchUpdate,
              lastUpdated: Date.now(),
            },
          }
        })
      },

      setKillSwitchStatus: (status: KillSwitchStatus) => {
        set((state) => ({
          status: {
            ...state.status,
            killSwitch: {
              ...state.status.killSwitch,
              status,
            },
            lastUpdated: Date.now(),
          },
        }))
      },

      // ========================================================================
      // Margin Actions
      // ========================================================================

      updateMarginStatus: (margin: Partial<MarginStatus>) => {
        set((state) => {
          const newMargin = {
            ...state.status.margin,
            ...margin,
            lastUpdated: Date.now(),
          }

          // Recalculate alert level if margin ratio changed
          if (margin.marginRatio !== undefined) {
            newMargin.alertLevel = calculateMarginAlertLevel(
              margin.marginRatio,
              state.config.marginAlert.thresholds
            )
          }

          const newStatus = {
            ...state.status,
            margin: newMargin,
            lastUpdated: Date.now(),
          }

          newStatus.overallHealth = calculateSafetyHealth(newStatus)

          return { status: newStatus }
        })
      },

      setMarginAlertLevel: (level: MarginAlertLevel) => {
        set((state) => ({
          status: {
            ...state.status,
            margin: {
              ...state.status.margin,
              alertLevel: level,
            },
            lastUpdated: Date.now(),
          },
        }))
      },

      // ========================================================================
      // Circuit Breaker Actions
      // ========================================================================

      triggerCircuitBreaker: (reason: CircuitBreakerTrigger) => {
        const config = get().config.circuitBreaker
        const resumeAt = config.autoResume
          ? Date.now() + config.resumeAfterMinutes * 60 * 1000
          : undefined

        set((state) => {
          const circuitBreakerUpdate: CircuitBreakerStatus = {
            ...state.status.circuitBreaker,
            triggered: true,
            triggerReason: reason,
            triggeredAt: Date.now(),
            canResume: !config.autoResume,
          }
          if (resumeAt !== undefined) {
            circuitBreakerUpdate.resumeAt = resumeAt
          }
          return {
            status: {
              ...state.status,
              circuitBreaker: circuitBreakerUpdate,
              overallHealth: 'critical',
              lastUpdated: Date.now(),
            },
          }
        })

        // Auto resume if configured
        if (config.autoResume && resumeAt) {
          setTimeout(() => {
            get().resetCircuitBreaker()
          }, config.resumeAfterMinutes * 60 * 1000)
        }
      },

      resetCircuitBreaker: () => {
        set((state) => {
          // Create a new circuit breaker status without the triggered state properties
          const resetCB: CircuitBreakerStatus = {
            triggered: false,
            canResume: true,
            currentDailyLoss: state.status.circuitBreaker.currentDailyLoss,
            currentHourlyLoss: state.status.circuitBreaker.currentHourlyLoss,
            consecutiveLosses: state.status.circuitBreaker.consecutiveLosses,
          }
          return {
            status: {
              ...state.status,
              circuitBreaker: resetCB,
              lastUpdated: Date.now(),
            },
          }
        })
      },

      updateCircuitBreakerMetrics: (metrics) => {
        const config = get().config.circuitBreaker

        set((state) => {
          const newCB = {
            ...state.status.circuitBreaker,
          }

          if (metrics.dailyLoss !== undefined) {
            newCB.currentDailyLoss = metrics.dailyLoss
          }
          if (metrics.hourlyLoss !== undefined) {
            newCB.currentHourlyLoss = metrics.hourlyLoss
          }
          if (metrics.consecutiveLosses !== undefined) {
            newCB.consecutiveLosses = metrics.consecutiveLosses
          }

          return {
            status: {
              ...state.status,
              circuitBreaker: newCB,
              lastUpdated: Date.now(),
            },
          }
        })

        // Check if circuit breaker should trigger
        const currentCB = get().status.circuitBreaker
        if (!currentCB.triggered && config.enabled) {
          if (currentCB.currentDailyLoss >= config.dailyLossLimit) {
            get().triggerCircuitBreaker('daily_loss_limit')
          } else if (currentCB.currentHourlyLoss >= config.hourlyLossLimit) {
            get().triggerCircuitBreaker('hourly_loss_limit')
          } else if (currentCB.consecutiveLosses >= config.consecutiveLossLimit) {
            get().triggerCircuitBreaker('consecutive_losses')
          }
        }
      },

      // ========================================================================
      // Approval Flow Actions
      // ========================================================================

      startApprovalFlow: () => {
        set({
          approvalState: {
            currentStep: 'risk_review',
            completedSteps: [],
            riskAcknowledged: false,
            capitalConfirmed: false,
          },
        })
      },

      advanceApprovalStep: () => {
        set((state) => {
          if (!state.approvalState) return state

          const steps: ApprovalStep[] = ['risk_review', 'capital_confirm', 'final_confirm']
          const currentIndex = steps.indexOf(state.approvalState.currentStep)
          const nextStep = steps[currentIndex + 1]

          if (currentIndex < steps.length - 1 && nextStep) {
            return {
              approvalState: {
                ...state.approvalState,
                currentStep: nextStep,
                completedSteps: [...state.approvalState.completedSteps, state.approvalState.currentStep],
              },
            }
          }

          return state
        })
      },

      goBackApprovalStep: () => {
        set((state) => {
          if (!state.approvalState) return state

          const steps: ApprovalStep[] = ['risk_review', 'capital_confirm', 'final_confirm']
          const currentIndex = steps.indexOf(state.approvalState.currentStep)
          const prevStep = steps[currentIndex - 1]

          if (currentIndex > 0 && prevStep) {
            const newCompleted = [...state.approvalState.completedSteps]
            newCompleted.pop()

            return {
              approvalState: {
                ...state.approvalState,
                currentStep: prevStep,
                completedSteps: newCompleted,
              },
            }
          }

          return state
        })
      },

      acknowledgeRisk: () => {
        set((state) => {
          if (!state.approvalState) return state
          return {
            approvalState: {
              ...state.approvalState,
              riskAcknowledged: true,
            },
          }
        })
      },

      confirmCapital: () => {
        set((state) => {
          if (!state.approvalState) return state
          return {
            approvalState: {
              ...state.approvalState,
              capitalConfirmed: true,
            },
          }
        })
      },

      completeApproval: () => {
        const state = get()
        if (!state.approvalState) return null
        if (state.approvalState.currentStep !== 'final_confirm') return null
        if (!state.approvalState.riskAcknowledged) return null

        const token = generateApprovalToken()
        const expiresAt = Date.now() + state.config.approval.tokenValidityMinutes * 60 * 1000

        set((state) => ({
          approvalState: {
            ...state.approvalState!,
            approvalToken: token,
            expiresAt,
            completedSteps: ['risk_review', 'capital_confirm', 'final_confirm'],
          },
        }))

        return token
      },

      cancelApproval: () => {
        set({ approvalState: null })
      },

      addApprovalRecord: (record) => {
        const id = `approval_${Date.now()}`
        set((state) => ({
          approvalHistory: [{ ...record, id }, ...state.approvalHistory].slice(0, 100), // Keep last 100
        }))
      },

      // ========================================================================
      // Config Actions
      // ========================================================================

      updateConfig: (config: Partial<SafetyConfig>) => {
        set((state) => ({
          config: {
            ...state.config,
            ...config,
            killSwitch: { ...state.config.killSwitch, ...config.killSwitch },
            approval: { ...state.config.approval, ...config.approval },
            marginAlert: { ...state.config.marginAlert, ...config.marginAlert },
            circuitBreaker: { ...state.config.circuitBreaker, ...config.circuitBreaker },
          },
        }))
      },

      // ========================================================================
      // Utility
      // ========================================================================

      getOverallHealth: () => {
        return get().status.overallHealth
      },

      isKillSwitchReady: () => {
        return get().status.killSwitch.status === 'ready'
      },

      canDeploy: () => {
        const status = get().status
        return (
          status.killSwitch.status === 'ready' &&
          !status.circuitBreaker.triggered &&
          status.margin.alertLevel !== 'critical'
        )
      },
    }),
    { name: 'safety-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectKillSwitchStatus = (state: SafetyStore) => state.status.killSwitch
export const selectMarginStatus = (state: SafetyStore) => state.status.margin
export const selectCircuitBreakerStatus = (state: SafetyStore) => state.status.circuitBreaker
export const selectSafetyHealth = (state: SafetyStore) => state.status.overallHealth
export const selectApprovalState = (state: SafetyStore) => state.approvalState
export const selectSafetyConfig = (state: SafetyStore) => state.config
