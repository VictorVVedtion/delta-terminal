/**
 * A2UI Insight Store
 *
 * Manages the state for A2UI system:
 * - Active insight being displayed
 * - Canvas panel state
 * - Edited parameters
 * - Validation errors
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  CanvasMode,
  InsightCardStatus,
  InsightData,
  InsightParam,
} from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface InsightState {
  // Active insight
  activeInsight: InsightData | null

  // Canvas state
  canvasOpen: boolean
  canvasMode: CanvasMode

  // Edited parameters (key -> value)
  editedParams: Map<string, InsightParam['value']>

  // Validation state
  errors: Map<string, string>
  warnings: Map<string, string>

  // Loading state
  isLoading: boolean
  isValidating: boolean

  // Insight history for the current session
  insightHistory: InsightData[]

  // Insight status tracking (id -> status)
  insightStatuses: Map<string, InsightCardStatus>
}

interface InsightActions {
  // Canvas actions
  openCanvas: (insight: InsightData, mode?: CanvasMode) => void
  closeCanvas: () => void
  setCanvasMode: (mode: CanvasMode) => void

  // Parameter actions
  updateParam: (key: string, value: InsightParam['value']) => void
  resetParams: () => void
  getEditedParams: () => InsightParam[]

  // Validation actions
  setErrors: (errors: Map<string, string>) => void
  setWarnings: (warnings: Map<string, string>) => void
  clearValidation: () => void

  // Status actions
  setInsightStatus: (id: string, status: InsightCardStatus) => void

  // Loading actions
  setLoading: (loading: boolean) => void
  setValidating: (validating: boolean) => void

  // History actions
  addToHistory: (insight: InsightData) => void
  clearHistory: () => void

  // Reset
  reset: () => void
}

type InsightStore = InsightState & InsightActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: InsightState = {
  activeInsight: null,
  canvasOpen: false,
  canvasMode: 'proposal',
  editedParams: new Map(),
  errors: new Map(),
  warnings: new Map(),
  isLoading: false,
  isValidating: false,
  insightHistory: [],
  insightStatuses: new Map(),
}

// =============================================================================
// Store
// =============================================================================

export const useInsightStore = create<InsightStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Canvas actions
      openCanvas: (insight, mode = 'proposal') => {
        // Initialize edited params from insight
        const editedParams = new Map<string, InsightParam['value']>()
        insight.params.forEach(p => {
          editedParams.set(p.key, p.value)
        })

        set({
          activeInsight: insight,
          canvasOpen: true,
          canvasMode: mode,
          editedParams,
          errors: new Map(),
          warnings: new Map(),
        }, false, 'insight/openCanvas')
      },

      closeCanvas: () => {
        set({
          canvasOpen: false,
        }, false, 'insight/closeCanvas')
      },

      setCanvasMode: (mode) => {
        set({ canvasMode: mode }, false, 'insight/setCanvasMode')
      },

      // Parameter actions
      updateParam: (key, value) => {
        const { editedParams } = get()
        const newParams = new Map(editedParams)
        newParams.set(key, value)
        set({ editedParams: newParams }, false, 'insight/updateParam')
      },

      resetParams: () => {
        const { activeInsight } = get()
        if (!activeInsight) return

        const editedParams = new Map<string, InsightParam['value']>()
        activeInsight.params.forEach(p => {
          editedParams.set(p.key, p.value)
        })
        set({
          editedParams,
          errors: new Map(),
          warnings: new Map(),
        }, false, 'insight/resetParams')
      },

      getEditedParams: () => {
        const { activeInsight, editedParams } = get()
        if (!activeInsight) return []

        return activeInsight.params.map(p => ({
          ...p,
          value: editedParams.get(p.key) ?? p.value,
        }))
      },

      // Validation actions
      setErrors: (errors) => {
        set({ errors }, false, 'insight/setErrors')
      },

      setWarnings: (warnings) => {
        set({ warnings }, false, 'insight/setWarnings')
      },

      clearValidation: () => {
        set({
          errors: new Map(),
          warnings: new Map(),
        }, false, 'insight/clearValidation')
      },

      // Status actions
      setInsightStatus: (id, status) => {
        const { insightStatuses } = get()
        const newStatuses = new Map(insightStatuses)
        newStatuses.set(id, status)
        set({ insightStatuses: newStatuses }, false, 'insight/setStatus')
      },

      // Loading actions
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'insight/setLoading')
      },

      setValidating: (isValidating) => {
        set({ isValidating }, false, 'insight/setValidating')
      },

      // History actions
      addToHistory: (insight) => {
        const { insightHistory } = get()
        // Keep last 50 insights
        const newHistory = [insight, ...insightHistory].slice(0, 50)
        set({ insightHistory: newHistory }, false, 'insight/addToHistory')
      },

      clearHistory: () => {
        set({ insightHistory: [] }, false, 'insight/clearHistory')
      },

      // Reset
      reset: () => {
        set(initialState, false, 'insight/reset')
      },
    }),
    { name: 'insight-store' }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectActiveInsight = (state: InsightStore) => state.activeInsight
export const selectCanvasOpen = (state: InsightStore) => state.canvasOpen
export const selectCanvasMode = (state: InsightStore) => state.canvasMode
export const selectEditedParams = (state: InsightStore) => state.editedParams
export const selectErrors = (state: InsightStore) => state.errors
export const selectWarnings = (state: InsightStore) => state.warnings
export const selectIsLoading = (state: InsightStore) => state.isLoading
export const selectHasErrors = (state: InsightStore) => state.errors.size > 0

// Check if params have been modified
export const selectHasChanges = (state: InsightStore): boolean => {
  const { activeInsight, editedParams } = state
  if (!activeInsight) return false

  return activeInsight.params.some(p => {
    const editedValue = editedParams.get(p.key)
    return JSON.stringify(editedValue) !== JSON.stringify(p.value)
  })
}

// Get insight status by ID
export const selectInsightStatus = (id: string) => (state: InsightStore) =>
  state.insightStatuses.get(id) ?? 'pending'

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to manage a single insight's interaction
 */
export function useInsight() {
  const store = useInsightStore()

  return {
    insight: store.activeInsight,
    isOpen: store.canvasOpen,
    mode: store.canvasMode,
    errors: store.errors,
    warnings: store.warnings,
    isLoading: store.isLoading,
    hasChanges: selectHasChanges(store),
    hasErrors: store.errors.size > 0,

    open: store.openCanvas,
    close: store.closeCanvas,
    updateParam: store.updateParam,
    resetParams: store.resetParams,
    getEditedParams: store.getEditedParams,
    setLoading: store.setLoading,
    setStatus: store.setInsightStatus,
  }
}

export default useInsightStore
