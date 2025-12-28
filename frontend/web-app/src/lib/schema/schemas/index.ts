/**
 * Schema 导出入口
 */

// 导出所有 Schema 列表
import { DCA_STRATEGY_SCHEMA } from './dca.schema'
import { GRID_STRATEGY_SCHEMA } from './grid.schema'
import { RSI_REVERSAL_SCHEMA } from './rsi.schema'

export { DCA_STRATEGY_SCHEMA } from './dca.schema'
export { GRID_STRATEGY_SCHEMA } from './grid.schema'
export { RSI_REVERSAL_SCHEMA } from './rsi.schema'

export const ALL_SCHEMAS = [
  GRID_STRATEGY_SCHEMA,
  RSI_REVERSAL_SCHEMA,
  DCA_STRATEGY_SCHEMA,
]
