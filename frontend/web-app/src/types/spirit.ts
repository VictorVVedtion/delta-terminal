/**
 * Spirit 核心类型定义 (Frontend Copy)
 * TODO: Use @delta/common-types when workspace linking is stable
 */

// Spirit 的生命周期状态
export type SpiritState = 
  | 'dormant'    // 静默: 无后端活动 (深灰色)
  | 'monitoring' // 监控: WebSocket 接收数据 (青色，低强度脉冲)
  | 'analyzing'  // 分析: AI 处理中 (青→紫渐变，活跃动画)
  | 'executing'  // 执行: 订单进行中 (荧光绿，节奏脉冲)
  | 'alerting'   // 警告: 风险告警 (金/橙色，不规则闪烁)
  | 'error';     // 错误: 连接失败 (红色闪烁)

// 事件优先级
export type SpiritPriority = 
  | 'p0' // Critical: 风险警告，立即通知
  | 'p1' // High: 信号发现，尽快通知
  | 'p2' // Normal: 订单成交，标准通知
  | 'p3' // Low: 性能里程碑，可延迟
  | 'p4'; // Silent: 心跳，仅记录

// 事件类型枚举
export enum SpiritEventType {
  HEARTBEAT = 'heartbeat',
  MARKET_SCAN = 'market_scan',
  SIGNAL_DETECTED = 'signal_detected',
  STRATEGY_DECISION = 'strategy_decision',
  ORDER_SUBMITTED = 'order_submitted',
  ORDER_FILLED = 'order_filled',
  RISK_ALERT = 'risk_alert',
  SYSTEM_STATUS = 'system_status',
  ERROR = 'error'
}

// 可执行的操作 (Frontend Action)
export interface SpiritEventAction {
  label: string;
  type: 'link' | 'callback';
  payload: string; // URL or Callback ID
}

// 核心事件负载结构
export interface SpiritEvent {
  id: string;
  timestamp: number;
  type: SpiritEventType;
  priority: SpiritPriority;
  title: string;
  content: string;
  
  // 关键：此事件发生时 Spirit 的心情/状态
  // 用于驱动前端 Orb 的颜色和动画
  spiritState: SpiritState;
  
  // 可选：关联的元数据 (Symbol, OrderID, etc)
  metadata?: Record<string, any>;
  
  // 可选：用户可交互的操作
  actions?: SpiritEventAction[];
}


