/**
 * Monitor Components
 * V3 Design Document: S47, S48
 *
 * Components for real-time monitoring:
 * - Signal Log (S47)
 * - Performance Dashboard
 * - Order Tracker
 */

export { SignalBadge,SignalLog } from './SignalLog'

// Re-export types
export type {
  SignalBadgeProps,
  SignalDirection,
  SignalIndicator,
  SignalLogProps,
  SignalStatus,
  SignalType,
  TradingSignal,
} from './SignalLog'
