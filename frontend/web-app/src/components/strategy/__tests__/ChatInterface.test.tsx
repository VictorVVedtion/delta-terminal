/**
 * ChatInterface 组件核心交互测试
 * 测试 AI 对话交互、消息发送、Insight 处理等核心功能
 *
 * 已从 Jest 迁移到 Vitest
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import {
  InsightCardStatus,
  type InsightData,
  type InsightType,
  type ParamType,
} from '@/types/insight'

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock Zustand stores
vi.mock('@/store/ai', () => ({
  useAIStore: vi.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    conversationId: null,
  })),
}))

vi.mock('@/store/agent', () => ({
  useAgentStore: vi.fn(() => ({
    selectedAgent: null,
    isAgentMode: false,
  })),
}))

vi.mock('@/store/mode', () => ({
  useModeStore: vi.fn(() => ({
    mode: 'chat',
    setMode: vi.fn(),
  })),
}))

vi.mock('@/store', () => ({
  useMarketStore: vi.fn(() => ({
    activeSymbol: 'BTC/USDT',
  })),
}))

vi.mock('@/store/paperTrading', () => ({
  usePaperTradingStore: vi.fn(() => ({
    isEnabled: false,
  })),
}))

vi.mock('@/store/analysis', () => ({
  useAnalysisStore: vi.fn(() => ({
    reports: [],
  })),
}))

// Mock hooks
vi.mock('@/hooks/useA2UIInsight', () => ({
  useA2UIInsight: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  })),
}))

vi.mock('@/hooks/useDeployment', () => ({
  useDeployment: vi.fn(() => ({
    deploy: vi.fn(),
    isDeploying: false,
  })),
}))

vi.mock('@/hooks/useBacktest', () => ({
  useBacktest: vi.fn(() => ({
    runBacktest: vi.fn(),
    isRunning: false,
  })),
}))

vi.mock('@/hooks/useMonitor', () => ({
  useMonitor: vi.fn(() => ({
    strategies: [],
    isLoading: false,
  })),
}))

// Mock UI components
vi.mock('@/components/ui/toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}))

vi.mock('@/components/thinking', () => ({
  useInsightLoadingState: vi.fn(() => ({
    isLoading: false,
    setLoading: vi.fn(),
  })),
  InsightCardLoading: () => <div>Loading...</div>,
}))

vi.mock('@/components/insight', () => ({
  InsightMessage: ({ insight }: { insight: InsightData }) => (
    <div data-testid="insight-message">{insight.explanation}</div>
  ),
}))

vi.mock('@/components/canvas/BacktestCanvas', () => ({
  BacktestCanvas: () => <div>Backtest Canvas</div>,
}))

vi.mock('@/components/canvas/CanvasPanel', () => ({
  CanvasPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/canvas/DeployCanvas', () => ({
  DeployCanvas: () => <div>Deploy Canvas</div>,
}))

vi.mock('@/components/canvas/MonitorCanvas', () => ({
  MonitorCanvas: () => <div>Monitor Canvas</div>,
}))

vi.mock('@/components/spirit/SpiritOrb', () => ({
  SpiritOrb: () => <div>Spirit Orb</div>,
}))

// Dynamic imports for mocked modules
const getUseA2UIInsight = async () => {
  const mod = await import('@/hooks/useA2UIInsight')
  return mod.useA2UIInsight as Mock
}

const getUseAIStore = async () => {
  const mod = await import('@/store/ai')
  return mod.useAIStore as Mock
}

const getUseInsightLoadingState = async () => {
  const mod = await import('@/components/thinking')
  return mod.useInsightLoadingState as Mock
}

// =============================================================================
// Test Data
// =============================================================================

const mockInsightData: InsightData = {
  id: 'insight-001',
  type: 'strategy_create' as InsightType,
  params: [
    {
      key: 'symbol',
      label: '交易对',
      type: 'select' as ParamType,
      value: 'BTC/USDT',
      level: 1,
      config: {
        options: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
      },
    },
    {
      key: 'rsi_period',
      label: 'RSI 周期',
      type: 'slider' as ParamType,
      value: 14,
      level: 1,
      config: {
        min: 7,
        max: 21,
        step: 1,
        unit: '期',
      },
    },
    {
      key: 'rsi_oversold',
      label: 'RSI 超卖阈值',
      type: 'number' as ParamType,
      value: 30,
      level: 2,
      config: {
        min: 20,
        max: 40,
        unit: '',
      },
    },
  ],
  explanation: '这是一个基于 RSI 指标的交易策略',
  evidence: {
    charts: [],
    metrics: {},
  },
  impact: {
    confidence: 0.85,
    riskLevel: 'medium',
    expectedReturn: 0.15,
    maxDrawdown: 0.08,
  },
  actions: [
    {
      type: 'approve',
      label: '批准策略',
      variant: 'primary',
    },
    {
      type: 'backtest',
      label: '运行回测',
      variant: 'secondary',
    },
  ],
}

// =============================================================================
// Tests
// =============================================================================

describe('ChatInterface', () => {
  // Lazy import to allow mocks to take effect
  let ChatInterface: typeof import('../ChatInterface').ChatInterface

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import after mocks are set up
    const mod = await import('../ChatInterface')
    ChatInterface = mod.ChatInterface
  })

  describe('基础渲染', () => {
    it('应该渲染聊天界面基础元素', async () => {
      render(<ChatInterface />)

      // 验证组件渲染 - 使用更宽松的匹配
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
    })

    it('应该显示 Spirit Orb', async () => {
      render(<ChatInterface />)

      await waitFor(() => {
        expect(screen.getByText('Spirit Orb')).toBeInTheDocument()
      })
    })
  })

  describe('消息发送', () => {
    it('应该能够输入消息', async () => {
      const user = userEvent.setup()

      render(<ChatInterface />)

      const input = screen.getByRole('textbox')
      await user.type(input, '帮我创建一个 BTC RSI 策略')

      expect(input).toHaveValue('帮我创建一个 BTC RSI 策略')
    })

    it('应该在加载时显示加载状态', async () => {
      const useA2UIInsight = await getUseA2UIInsight()
      useA2UIInsight.mockReturnValue({
        sendMessage: vi.fn(),
        isLoading: true,
      })

      render(<ChatInterface />)

      // 组件应该渲染
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })

  describe('消息显示', () => {
    it('应该显示用户消息', async () => {
      const useAIStore = await getUseAIStore()
      useAIStore.mockReturnValue({
        messages: [
          {
            id: 'msg-001',
            role: 'user',
            content: '帮我创建策略',
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
        sendMessage: vi.fn(),
        clearMessages: vi.fn(),
      })

      render(<ChatInterface />)

      await waitFor(() => {
        expect(screen.getByText('帮我创建策略')).toBeInTheDocument()
      })
    })
  })

  describe('Insight 处理', () => {
    it('应该渲染 InsightData', async () => {
      const useAIStore = await getUseAIStore()
      useAIStore.mockReturnValue({
        messages: [
          {
            id: 'msg-003',
            role: 'assistant',
            content: '',
            insight: mockInsightData,
            insightStatus: InsightCardStatus.PENDING,
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
        sendMessage: vi.fn(),
        clearMessages: vi.fn(),
      })

      render(<ChatInterface />)

      await waitFor(() => {
        const insightMessage = screen.getByTestId('insight-message')
        expect(insightMessage).toBeInTheDocument()
        expect(insightMessage).toHaveTextContent(mockInsightData.explanation)
      })
    })

    it('应该显示加载状态', async () => {
      const useInsightLoadingState = await getUseInsightLoadingState()
      useInsightLoadingState.mockReturnValue({
        isLoading: true,
        setLoading: vi.fn(),
      })

      render(<ChatInterface />)

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })
    })
  })

  describe('辅助功能', () => {
    it('应该渲染多条消息', async () => {
      const useAIStore = await getUseAIStore()
      const messages = [
        {
          id: 'msg-001',
          role: 'user',
          content: '消息1',
          timestamp: Date.now() - 1000,
        },
        {
          id: 'msg-002',
          role: 'assistant',
          content: '回复1',
          timestamp: Date.now(),
        },
      ]

      useAIStore.mockReturnValue({
        messages,
        isLoading: false,
        sendMessage: vi.fn(),
        clearMessages: vi.fn(),
      })

      render(<ChatInterface />)

      await waitFor(() => {
        expect(screen.getByText('消息1')).toBeInTheDocument()
        expect(screen.getByText('回复1')).toBeInTheDocument()
      })
    })
  })
})
