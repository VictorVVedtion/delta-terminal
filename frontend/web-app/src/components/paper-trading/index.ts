/**
 * Paper Trading Components
 *
 * 导出所有 Paper Trading 相关组件
 */

// 主要组件
export { PaperTradingExample } from './PaperTradingExample'
export { PaperTradingDashboard } from './PaperTradingDashboard'
export { PaperTradingPanel } from './PaperTradingPanel'
export { PaperTradingStatusCard, PaperTradingStatusBadge } from './PaperTradingStatusCard'
export { PositionCard } from './PositionCard'
export { QuickTradeButtons } from './QuickTradeButtons'
export { TradeHistory } from './TradeHistory'

// 类型重导出
export type { PaperAccount, PaperPosition, PaperTrade, PaperAccountStats } from '@/types/paperTrading'
