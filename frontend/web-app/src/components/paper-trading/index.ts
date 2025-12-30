/**
 * Paper Trading Components
 *
 * 导出所有 Paper Trading 相关组件
 */

// 主要组件
export { PaperTradingDashboard } from './PaperTradingDashboard'
export { PaperTradingExample } from './PaperTradingExample'
export { PaperTradingPanel } from './PaperTradingPanel'
export { PaperTradingStatusBadge,PaperTradingStatusCard } from './PaperTradingStatusCard'
export { PositionCard } from './PositionCard'
export { QuickTradeButtons } from './QuickTradeButtons'
export { TradeHistory } from './TradeHistory'

// 永续合约 Paper Trading
export { PerpetualPaperTradingPanel } from './PerpetualPaperTradingPanel'

// 类型重导出
export type { PaperAccount, PaperAccountStats, PaperPosition, PaperTrade } from '@/types/paperTrading'
export type {
  PerpetualPaperAccount,
  PerpetualPaperPosition,
  PerpetualPaperTrade,
  PerpetualPaperAccountStats,
} from '@/types/perpetualPaperTrading'
