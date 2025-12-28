/**
 * Reasoning Chain Type Definitions for Frontend
 *
 * A2UI 2.0 Enhancement: Transparent AI reasoning visualization
 * 让用户看到 AI 的思考过程，而不是黑盒输出。
 */

// =============================================================================
// Reasoning Node Types
// =============================================================================

/**
 * 推理节点类型
 */
export type ReasoningNodeType =
  | 'understanding'    // 理解用户意图
  | 'analysis'         // 分析当前状态
  | 'decision'         // 做出决策
  | 'recommendation'   // 给出推荐
  | 'warning'          // 风险提示
  | 'branch';          // 探索其他可能性

/**
 * 推理节点状态
 */
export type ReasoningNodeStatus =
  | 'pending'          // 等待用户确认
  | 'confirmed'        // 用户已确认
  | 'challenged'       // 用户质疑
  | 'modified'         // 用户已修改
  | 'skipped'          // 用户跳过
  | 'auto';            // 自动确认（高置信度）

/**
 * 证据类型
 */
export type EvidenceType =
  | 'indicator'        // 技术指标值
  | 'price_level'      // 价格水平
  | 'volume'           // 成交量
  | 'pattern'          // 形态识别
  | 'news'             // 新闻/事件
  | 'history'          // 历史数据
  | 'correlation';     // 相关性分析

/**
 * 用户可对节点执行的操作
 */
export type NodeAction =
  | 'confirm'          // 确认这一步
  | 'challenge'        // 质疑这一步
  | 'modify'           // 修改这一步
  | 'expand'           // 展开详情
  | 'collapse'         // 收起详情
  | 'branch'           // 探索其他分支
  | 'skip';            // 跳过这一步

// =============================================================================
// Evidence Models
// =============================================================================

/**
 * 推理证据 - 支撑推理的数据
 */
export interface ReasoningEvidence {
  type: EvidenceType;
  label: string;
  value: string | number | Record<string, unknown>;
  significance: 'high' | 'medium' | 'low';
  source?: string;
  timestamp?: string;
  visualization?: Record<string, unknown>;
}

// =============================================================================
// User Interaction Models
// =============================================================================

/**
 * 用户与节点的交互记录
 */
export interface UserInteraction {
  action: NodeAction;
  timestamp: string;
  input?: string;
  feedback?: string;
}

// =============================================================================
// Reasoning Branch
// =============================================================================

/**
 * 推理分支 - 探索其他可能性
 */
export interface ReasoningBranch {
  id: string;
  label: string;
  description: string;
  probability: number;          // 0-1
  trade_offs: string[];
  child_nodes?: ReasoningNode[];
}

// =============================================================================
// Reasoning Node
// =============================================================================

/**
 * 推理节点 - 推理链的基本单元
 *
 * 每个节点代表 AI 思考过程中的一步：
 * - 理解用户说了什么
 * - 分析当前市场状态
 * - 做出决策
 * - 给出推荐
 */
export interface ReasoningNode {
  id: string;
  type: ReasoningNodeType;
  title: string;
  content: string;
  confidence: number;           // 0-1
  status: ReasoningNodeStatus;
  evidence: ReasoningEvidence[];
  branches: ReasoningBranch[];
  interactions: UserInteraction[];
  available_actions: NodeAction[];
  children: ReasoningNode[];
  created_at: string;
  expanded: boolean;
  highlight: boolean;
}

// =============================================================================
// Reasoning Chain
// =============================================================================

/**
 * 推理链状态
 */
export type ReasoningChainStatus =
  | 'in_progress'      // 进行中
  | 'completed'        // 已完成
  | 'needs_input'      // 需要用户输入
  | 'modified'         // 用户已修改
  | 'cancelled';       // 用户取消

/**
 * 推理链 - AI 完整的推理过程
 *
 * 包含从理解用户意图到给出最终推荐的完整链条。
 * 用户可以在任意节点介入、修改、探索其他分支。
 */
export interface ReasoningChain {
  id: string;
  user_input: string;
  nodes: ReasoningNode[];
  status: ReasoningChainStatus;
  active_node_id?: string;
  overall_confidence: number;   // 0-1
  confirmed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
  insight_id?: string;
}

// =============================================================================
// Display Configuration
// =============================================================================

/**
 * 推理链展示模式
 */
export type ReasoningDisplayMode =
  | 'collapsed'        // 收起模式（只显示标题）
  | 'expanded'         // 展开模式（显示全部详情）
  | 'highlight_only';  // 仅高亮模式（只显示高亮节点）

/**
 * ReasoningChainView Props
 */
export interface ReasoningChainViewProps {
  chain: ReasoningChain;
  displayMode?: ReasoningDisplayMode;
  defaultExpanded?: boolean;
  onNodeAction?: (nodeId: string, action: NodeAction, input?: string) => void;
  onBranchSelect?: (nodeId: string, branchId: string) => void;
  className?: string;
}

/**
 * ReasoningNode Props
 */
export interface ReasoningNodeViewProps {
  node: ReasoningNode;
  isActive?: boolean;
  onAction?: (action: NodeAction, input?: string) => void;
  onBranchSelect?: (branchId: string) => void;
  className?: string;
}
