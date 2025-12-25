// 策略服务类型定义

import { Decimal } from '@prisma/client/runtime/library';

// 策略状态
export enum StrategyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR',
}

// 策略类型
export enum StrategyType {
  SPOT = 'SPOT',
  FUTURES = 'FUTURES',
  GRID = 'GRID',
  DCA = 'DCA',
  ARBITRAGE = 'ARBITRAGE',
  CUSTOM = 'CUSTOM',
}

// 风险等级
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EXTREME = 'EXTREME',
}

// 执行状态
export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// 策略配置接口
export interface StrategyConfig {
  // 基础参数
  leverage?: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  
  // 网格策略专用
  gridLevels?: number;
  gridSpacing?: number;
  upperPrice?: number;
  lowerPrice?: number;
  
  // DCA策略专用
  investmentAmount?: number;
  investmentInterval?: number;
  totalInvestments?: number;
  
  // 套利策略专用
  minSpread?: number;
  exchanges?: string[];
  
  // 自定义参数
  [key: string]: any;
}

// 指标配置
export interface IndicatorConfig {
  name: string;
  type: string;
  params: Record<string, any>;
}

// 条件配置
export interface ConditionConfig {
  type: 'AND' | 'OR';
  rules: ConditionRule[];
}

export interface ConditionRule {
  indicator: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number | string;
}

// 动作配置
export interface ActionConfig {
  type: 'BUY' | 'SELL' | 'CLOSE' | 'NOTIFY';
  params: Record<string, any>;
}

// 创建策略请求
export interface CreateStrategyRequest {
  name: string;
  description?: string;
  type: StrategyType;
  exchange: string;
  symbol: string;
  initialCapital: number;
  riskLevel?: RiskLevel;
  config: StrategyConfig;
  indicators?: IndicatorConfig[];
  conditions?: ConditionConfig;
  actions?: ActionConfig[];
  templateId?: string;
  autoStart?: boolean;
  maxOrders?: number;
  orderInterval?: number;
  maxDrawdown?: number;
}

// 更新策略请求
export interface UpdateStrategyRequest {
  name?: string;
  description?: string;
  config?: StrategyConfig;
  indicators?: IndicatorConfig[];
  conditions?: ConditionConfig;
  actions?: ActionConfig[];
  riskLevel?: RiskLevel;
  maxOrders?: number;
  orderInterval?: number;
  maxDrawdown?: number;
}

// 策略响应
export interface StrategyResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: StrategyType;
  status: StrategyStatus;
  riskLevel: RiskLevel;
  exchange: string;
  symbol: string;
  initialCapital: string;
  currentCapital: string;
  totalProfit: string;
  profitRate: string;
  totalTrades: number;
  winRate?: string;
  config: StrategyConfig;
  version: number;
  isPublic: boolean;
  shareCode?: string;
  forkCount: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  stoppedAt?: string;
}

// 策略执行请求
export interface ExecuteStrategyRequest {
  strategyId: string;
  executionType: 'BUY' | 'SELL' | 'CLOSE';
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  amount: number;
  price?: number;
  signalData?: Record<string, any>;
}

// 策略执行响应
export interface ExecutionResponse {
  id: string;
  strategyId: string;
  status: ExecutionStatus;
  executionType: string;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  price?: string;
  amount: string;
  total: string;
  orderId?: string;
  filled: string;
  avgPrice?: string;
  fee: string;
  profit?: string;
  profitRate?: string;
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
}

// 策略模板请求
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: string;
  type: StrategyType;
  riskLevel?: RiskLevel;
  config: StrategyConfig;
  indicators?: IndicatorConfig[];
  conditions?: ConditionConfig;
  actions?: ActionConfig[];
  tags?: string[];
  isPublic?: boolean;
  expectedReturn?: number;
  expectedWinRate?: number;
  minCapital?: number;
}

// 策略模板响应
export interface TemplateResponse {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: StrategyType;
  riskLevel: RiskLevel;
  config: StrategyConfig;
  author: string;
  isOfficial: boolean;
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  rating?: string;
  ratingCount: number;
  expectedReturn?: string;
  expectedWinRate?: string;
  minCapital?: string;
  createdAt: string;
  updatedAt: string;
}

// 查询参数
export interface ListStrategiesQuery {
  page?: number;
  pageSize?: number;
  status?: StrategyStatus;
  type?: StrategyType;
  exchange?: string;
  symbol?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'profitRate' | 'totalTrades';
  sortOrder?: 'asc' | 'desc';
}

export interface ListTemplatesQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  type?: StrategyType;
  isOfficial?: boolean;
  tags?: string[];
  sortBy?: 'createdAt' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ListExecutionsQuery {
  page?: number;
  pageSize?: number;
  strategyId?: string;
  status?: ExecutionStatus;
  exchange?: string;
  symbol?: string;
  startDate?: string;
  endDate?: string;
}

// 策略统计
export interface StrategyStats {
  totalStrategies: number;
  activeStrategies: number;
  totalProfit: string;
  totalTrades: number;
  averageWinRate: string;
  bestStrategy?: {
    id: string;
    name: string;
    profitRate: string;
  };
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
