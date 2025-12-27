/**
 * Intervention Store
 * EPIC-009 Story 9.2: 干预记录状态管理
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type {
  EmergencyAction,
  InterventionFilter,
  InterventionRecord,
  ParamChange,
} from '@/types/intervention'

// =============================================================================
// Types
// =============================================================================

interface InterventionState {
  // 干预记录 (按 agentId 分组)
  records: Record<string, InterventionRecord[]>

  // 最大记录数
  maxRecords: number

  // Actions
  addRecord: (record: Omit<InterventionRecord, 'id' | 'timestamp'>) => string
  addParamChangeRecord: (
    agentId: string,
    strategyName: string,
    paramChanges: ParamChange[],
    reason?: string
  ) => string
  addEmergencyActionRecord: (
    agentId: string,
    strategyName: string,
    action: EmergencyAction,
    reason?: string
  ) => string
  getRecordsByAgent: (agentId: string) => InterventionRecord[]
  getFilteredRecords: (filter: InterventionFilter) => InterventionRecord[]
  clearRecords: (agentId: string) => void
  exportRecordsCSV: (agentId: string) => string
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateRecordId(): string {
  return `intervention_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function formatValueForCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
  if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
  return String(value)
}

// =============================================================================
// Store
// =============================================================================

export const useInterventionStore = create<InterventionState>()(
  devtools(
    persist(
      (set, get) => ({
        records: {},
        maxRecords: 100,

        addRecord: (recordData) => {
          const id = generateRecordId()
          const record: InterventionRecord = {
            ...recordData,
            id,
            timestamp: Date.now(),
          }

          set((state) => {
            const agentRecords = state.records[record.agentId] ?? []
            const updatedRecords = [record, ...agentRecords].slice(0, state.maxRecords)

            return {
              records: {
                ...state.records,
                [record.agentId]: updatedRecords,
              },
            }
          })

          return id
        },

        addParamChangeRecord: (agentId, strategyName, paramChanges, reason) => {
          const record: Omit<InterventionRecord, 'id' | 'timestamp'> = {
            agentId,
            strategyName,
            type: 'param_change',
            paramChanges,
            operator: 'user', // TODO: 从 auth store 获取实际用户
          }
          if (reason) {
            record.reason = reason
          }
          return get().addRecord(record)
        },

        addEmergencyActionRecord: (agentId, strategyName, action, reason) => {
          const record: Omit<InterventionRecord, 'id' | 'timestamp'> = {
            agentId,
            strategyName,
            type: 'emergency_action',
            action,
            actionStatus: 'completed',
            operator: 'user', // TODO: 从 auth store 获取实际用户
          }
          if (reason) {
            record.reason = reason
          }
          return get().addRecord(record)
        },

        getRecordsByAgent: (agentId) => {
          return get().records[agentId] ?? []
        },

        getFilteredRecords: (filter) => {
          const { records } = get()
          let allRecords: InterventionRecord[] = []

          if (filter.agentId) {
            allRecords = records[filter.agentId] ?? []
          } else {
            allRecords = Object.values(records).flat()
          }

          return allRecords.filter((record) => {
            if (filter.type && record.type !== filter.type) return false
            if (filter.action && record.action !== filter.action) return false
            if (filter.startTime && record.timestamp < filter.startTime) return false
            if (filter.endTime && record.timestamp > filter.endTime) return false
            return true
          })
        },

        clearRecords: (agentId) => {
          set((state) => {
            const newRecords = { ...state.records }
            delete newRecords[agentId]
            return { records: newRecords }
          })
        },

        exportRecordsCSV: (agentId) => {
          const records = get().getRecordsByAgent(agentId)

          if (records.length === 0) {
            return ''
          }

          const headers = [
            '时间',
            '类型',
            '操作',
            '参数变更',
            '原因',
            '操作人',
          ]

          const rows = records.map((record) => {
            const time = new Date(record.timestamp).toLocaleString('zh-CN')
            const type = record.type === 'param_change' ? '参数调整' : '紧急操作'
            const action = record.action ?? ''
            const paramChanges = record.paramChanges
              ? record.paramChanges.map(p => `${p.label}: ${p.oldValue} → ${p.newValue}`).join('; ')
              : ''
            const reason = record.reason ?? ''
            const operator = record.operator

            return [time, type, action, paramChanges, reason, operator].map(formatValueForCSV).join(',')
          })

          return [headers.join(','), ...rows].join('\n')
        },
      }),
      {
        name: 'delta-intervention-storage',
        partialize: (state) => ({
          records: state.records,
        }),
      }
    ),
    { name: 'InterventionStore' }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectAgentRecords = (agentId: string) => (state: InterventionState) =>
  state.records[agentId] ?? []

export const selectRecentRecords = (agentId: string, limit = 20) => (state: InterventionState) =>
  (state.records[agentId] ?? []).slice(0, limit)
