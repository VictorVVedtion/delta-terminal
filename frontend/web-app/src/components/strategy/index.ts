/**
 * Strategy Components - 策略组件统一导出
 *
 * S12a: 策略删除与归档功能
 */

// 原有组件
export { StrategyList } from './StrategyList'
export { TemplateSelector } from './TemplateSelector'
export { ChatInterface } from './ChatInterface'

// 生命周期管理组件 (S12a)
export { StrategyListEnhanced } from './StrategyListEnhanced'
export {
  DeleteConfirmDialog,
  PermanentDeleteDialog,
} from './DeleteConfirmDialog'
export { RecycleBinPage } from './RecycleBinPage'
export {
  ArchivedStrategyView,
  ArchiveConfirmDialog,
} from './ArchivedStrategyView'
