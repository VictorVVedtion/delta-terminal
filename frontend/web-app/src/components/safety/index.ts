/**
 * Safety Components
 * V3 Design Document: S28, S29, S30, S31, S44
 *
 * Components for trading safety:
 * - Kill Switch (S30)
 * - Approval Flow (S31)
 * - Margin Alert (S28)
 * - Circuit Breaker (S29) - EPIC-007 Story 7.1
 * - Extreme Market (S44) - EPIC-007 Story 7.3
 */

export { CircuitBreakerPanel } from './CircuitBreakerPanel'
export { ExtremeMarketPanel } from './ExtremeMarketPanel'
export { KillSwitch } from './KillSwitch'
export { KillSwitchModal } from './KillSwitchModal'
export { MarginAlert, MarginAlertBadge } from './MarginAlert'
