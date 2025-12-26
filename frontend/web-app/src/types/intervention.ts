/**
 * Intervention Types
 * EPIC-009 Story 9.1, 9.2: 手动干预面板和历史记录类型
 */

// =============================================================================
// Emergency Action Types
// =============================================================================

/** 紧急操作类型 */
export type EmergencyAction =
  | 'close_all_positions'   // 平仓所有持仓
  | 'disable_new_positions' // 禁用新开仓
  | 'restart_strategy'      // 重启策略
  | 'pause_strategy'        // 暂停策略

/** 紧急操作状态 */
export type EmergencyActionStatus = 'pending' | 'executing' | 'completed' | 'failed'

/** 紧急操作配置 */
export interface EmergencyActionConfig {
  action: EmergencyAction
  label: string
  description: string
  icon: string
  confirmRequired: boolean
  severity: 'warning' | 'danger'
}

// =============================================================================
// Intervention Record Types
// =============================================================================

/** 干预类型 */
export type InterventionType = 'param_change' | 'emergency_action'

/** 参数变更记录 */
export interface ParamChange {
  key: string
  label: string
  oldValue: unknown
  newValue: unknown
  unit: string | undefined
}

/** 干预记录 */
export interface InterventionRecord {
  id: string
  agentId: string
  strategyName: string
  timestamp: number
  type: InterventionType
  action?: EmergencyAction
  actionStatus?: EmergencyActionStatus
  paramChanges?: ParamChange[]
  reason?: string
  operator: string // 用户 ID 或名称
}

/** 干预记录筛选条件 */
export interface InterventionFilter {
  agentId?: string
  type?: InterventionType
  action?: EmergencyAction
  startTime?: number
  endTime?: number
}

// =============================================================================
// Emergency Action Configurations
// =============================================================================

export const EMERGENCY_ACTIONS: EmergencyActionConfig[] = [
  {
    action: 'close_all_positions',
    label: '平仓所有持仓',
    description: '立即平仓该策略的所有持仓，可能产生滑点损失',
    icon: 'Square',
    confirmRequired: true,
    severity: 'danger',
  },
  {
    action: 'disable_new_positions',
    label: '禁用新开仓',
    description: '策略将只能平仓现有持仓，不再开设新仓位',
    icon: 'Ban',
    confirmRequired: true,
    severity: 'warning',
  },
  {
    action: 'restart_strategy',
    label: '重启策略',
    description: '清除策略当前状态并重新启动，不影响持仓',
    icon: 'RotateCcw',
    confirmRequired: true,
    severity: 'warning',
  },
  {
    action: 'pause_strategy',
    label: '暂停策略',
    description: '暂停策略运行，不会关闭持仓，可随时恢复',
    icon: 'Pause',
    confirmRequired: false,
    severity: 'warning',
  },
]

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 获取紧急操作配置
 */
export function getEmergencyActionConfig(action: EmergencyAction): EmergencyActionConfig | undefined {
  return EMERGENCY_ACTIONS.find(a => a.action === action)
}

/**
 * 格式化干预类型
 */
export function formatInterventionType(type: InterventionType): string {
  const typeMap: Record<InterventionType, string> = {
    param_change: '参数调整',
    emergency_action: '紧急操作',
  }
  return typeMap[type]
}

/**
 * 格式化紧急操作
 */
export function formatEmergencyAction(action: EmergencyAction): string {
  const config = getEmergencyActionConfig(action)
  return config?.label ?? action
}
