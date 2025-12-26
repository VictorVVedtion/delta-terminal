/**
 * Monitor Components
 * V3 Design Document: S47, S48
 *
 * Components for real-time monitoring:
 * - Signal Log (S47)
 * - Performance Dashboard
 * - Order Tracker
 */

export { SignalLog, SignalBadge } from './SignalLog'

// Re-export types
export type {
  SignalLogProps,
  SignalBadgeProps,
  TradingSignal,
  SignalType,
  SignalDirection,
  SignalStatus,
  SignalIndicator,
} from './SignalLog'
