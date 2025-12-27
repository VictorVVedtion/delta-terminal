/**
 * Risk Management Components
 *
 * EPIC-010: Kill Switch & Circuit Breaker (existing at components/KillSwitch.tsx)
 * EPIC-011: Sentinel Warning System
 */

// Re-export KillSwitch from main components
export { KillSwitch } from '@/components/KillSwitch'

// Sentinel Alerts
export {
  type AlertSeverity,
  type AlertType,
  type SentinelAlert,
  SentinelAlerts,
  type SentinelAlertsProps,
} from './SentinelAlerts'
