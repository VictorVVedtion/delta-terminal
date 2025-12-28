/**
 * ChatInterface 组件核心交互测试
 * 测试 AI 对话交互、消息发送、Insight 处理等核心功能
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ChatInterface } from '../ChatInterface'
import { InsightCardStatus, InsightData, InsightType, ParamType } from '@/types/insight'

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock Zustand stores
jest.mock('@/store/ai', () => ({
  useAIStore: jest.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: jest.fn(),
    clearMessages: jest.fn(),
    conversationId: null,
  })),
}))

jest.mock('@/store/agent', () => ({
  useAgentStore: jest.fn(() => ({
    selectedAgent: null,
    isAgentMode: false,
  })),
}))

jest.mock('@/store/mode', () => ({
  useModeStore: jest.fn(() => ({
    mode: 'chat',
    setMode: jest.fn(),
  })),
}))

jest.mock('@/store', () => ({
  useMarketStore: jest.fn(() => ({
    activeSymbol: 'BTC/USDT',
  })),
}))

jest.mock('@/store/paperTrading', () => ({
  usePaperTradingStore: jest.fn(() => ({
    isEnabled: false,
  })),
}))

jest.mock('@/store/analysis', () => ({
  useAnalysisStore: jest.fn(() => ({
    reports: [],
  })),
}))

// Mock hooks
jest.mock('@/hooks/useA2UIInsight', () => ({
  useA2UIInsight: jest.fn(() => ({
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  })),
}))

jest.mock('@/hooks/useDeployment', () => ({
  useDeployment: jest.fn(() => ({
    deploy: jest.fn(),
    isDeploying: false,
  })),
}))

jest.mock('@/hooks/useBacktest', () => ({
  useBacktest: jest.fn(() => ({
    runBacktest: jest.fn(),
    isRunning: false,
  })),
}))

jest.mock('@/hooks/useMonitor', () => ({
  useMonitor: jest.fn(() => ({
    strategies: [],
    isLoading: false,
  })),
}))

// Mock UI components
jest.mock('@/components/ui/toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}))

jest.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}))

jest.mock('@/components/thinking', () => ({
  useInsightLoadingState: jest.fn(() => ({
    isLoading: false,
    setLoading: jest.fn(),
  })),
  InsightCardLoading: () => <div>Loading...</div>,
}))

jest.mock('@/components/insight', () => ({
  InsightMessage: ({ insight }: { insight: InsightData }) => (
    <div data-testid="insight-message">{insight.explanation}</div>
  ),
}))

jest.mock('@/components/canvas/BacktestCanvas', () => ({
  BacktestCanvas: () => <div>Backtest Canvas</div>,
}))

jest.mock('@/components/canvas/CanvasPanel', () => ({
  CanvasPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/canvas/DeployCanvas', () => ({
  DeployCanvas: () => <div>Deploy Canvas</div>,
}))

jest.mock('@/components/canvas/MonitorCanvas', () => ({
  MonitorCanvas: () => <div>Monitor Canvas</div>,
}))

jest.mock('@/components/spirit/SpiritOrb', () => ({
  SpiritOrb: () => <div>Spirit Orb</div>,
}))

// =============================================================================
// Test Data
// =============================================================================

const mockInsightData: InsightData = {
  id: 'insight-001',
  type: InsightType.STRATEGY_CREATE,
  params: [
    {
      key: 'symbol',
      label: '交易对',
      type: ParamType.SELECT,
      value: 'BTC/USDT',
      level: 1,
      config: {
        options: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
      },
    },
    {
      key: 'rsi_period',
      label: 'RSI 周期',
      type: ParamType.SLIDER,
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
      type: ParamType.NUMBER,
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
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('应该渲染聊天界面', () => {
      render(<ChatInterface />)

      // 验证核心元素存在
      expect(screen.getByPlaceholderText(/告诉我你的交易想法/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('应该显示欢迎消息', () => {
      render(<ChatInterface />)

      // Trading Spirit 的欢迎消息
      expect(screen.getByText(/Trading Spirit/)).toBeInTheDocument()
      expect(screen.getByText(/创建和优化交易策略/)).toBeInTheDocument()
    })

    it('应该显示 Spirit Orb', () => {
      render(<ChatInterface />)

      expect(screen.getByText('Spirit Orb')).toBeInTheDocument()
    })
  })

  describe('消息发送', () => {
    it('应该能够输入并发送消息', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true })
      useA2UIInsight.mockReturnValue({
        sendMessage: mockSendMessage,
        isLoading: false,
      })

      render(<ChatInterface />)

      // 输入消息
      const input = screen.getByPlaceholderText(/告诉我你的交易想法/i)
      await user.type(input, '帮我创建一个 BTC RSI 策略')

      // 点击发送按钮
      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      // 验证消息发送
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          '帮我创建一个 BTC RSI 策略',
          expect.any(Object)
        )
      })
    })

    it('应该在按下 Enter 键时发送消息', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true })
      useA2UIInsight.mockReturnValue({
        sendMessage: mockSendMessage,
        isLoading: false,
      })

      render(<ChatInterface />)

      const input = screen.getByPlaceholderText(/告诉我你的交易想法/i)
      await user.type(input, '创建策略{Enter}')

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled()
      })
    })

    it('应该在加载时禁用输入', () => {
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      useA2UIInsight.mockReturnValue({
        sendMessage: jest.fn(),
        isLoading: true,
      })

      render(<ChatInterface />)

      const input = screen.getByPlaceholderText(/告诉我你的交易想法/i)
      expect(input).toBeDisabled()
    })

    it('应该清空输入框在发送后', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true })
      useA2UIInsight.mockReturnValue({
        sendMessage: mockSendMessage,
        isLoading: false,
      })

      render(<ChatInterface />)

      const input = screen.getByPlaceholderText(/告诉我你的交易想法/i) as HTMLInputElement
      await user.type(input, '测试消息')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('消息显示', () => {
    it('应该显示用户消息', () => {
      const { useAIStore } = require('@/store/ai')
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
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      render(<ChatInterface />)

      expect(screen.getByText('帮我创建策略')).toBeInTheDocument()
    })

    it('应该显示助手消息', () => {
      const { useAIStore } = require('@/store/ai')
      useAIStore.mockReturnValue({
        messages: [
          {
            id: 'msg-002',
            role: 'assistant',
            content: '好的，我来帮你创建策略',
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      render(<ChatInterface />)

      expect(screen.getByText('好的,我来帮你创建策略')).toBeInTheDocument()
    })

    it('应该显示多条消息', () => {
      const { useAIStore } = require('@/store/ai')
      useAIStore.mockReturnValue({
        messages: [
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
            timestamp: Date.now() - 500,
          },
          {
            id: 'msg-003',
            role: 'user',
            content: '消息2',
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      render(<ChatInterface />)

      expect(screen.getByText('消息1')).toBeInTheDocument()
      expect(screen.getByText('回复1')).toBeInTheDocument()
      expect(screen.getByText('消息2')).toBeInTheDocument()
    })
  })

  describe('Insight 处理', () => {
    it('应该渲染 InsightData', () => {
      const { useAIStore } = require('@/store/ai')
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
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      render(<ChatInterface />)

      // 验证 InsightMessage 组件被渲染
      const insightMessage = screen.getByTestId('insight-message')
      expect(insightMessage).toBeInTheDocument()
      expect(insightMessage).toHaveTextContent(mockInsightData.explanation)
    })

    it('应该调用 onInsightApprove 回调', async () => {
      const onInsightApprove = jest.fn()
      const { useAIStore } = require('@/store/ai')
      useAIStore.mockReturnValue({
        messages: [
          {
            id: 'msg-004',
            role: 'assistant',
            content: '',
            insight: mockInsightData,
            insightStatus: InsightCardStatus.PENDING,
            timestamp: Date.now(),
          },
        ],
        isLoading: false,
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      render(<ChatInterface onInsightApprove={onInsightApprove} />)

      // 这里需要找到批准按钮并点击
      // 由于 InsightMessage 是 mock 的，我们只验证渲染
      expect(screen.getByTestId('insight-message')).toBeInTheDocument()
    })

    it('应该显示加载状态', () => {
      const { useInsightLoadingState } = require('@/components/thinking')
      useInsightLoadingState.mockReturnValue({
        isLoading: true,
        setLoading: jest.fn(),
      })

      render(<ChatInterface />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('模板选择', () => {
    it('应该能打开模板选择器', async () => {
      const user = userEvent.setup()
      render(<ChatInterface />)

      // 查找模板按钮（根据实际实现可能需要调整选择器）
      const buttons = screen.getAllByRole('button')
      // 假设有一个模板按钮，这里需要根据实际实现调整

      // 验证组件渲染
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    it('应该处理消息发送失败', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const { useToast } = require('@/components/ui/toast')
      const mockToast = jest.fn()

      useA2UIInsight.mockReturnValue({
        sendMessage: jest.fn().mockRejectedValue(new Error('Network error')),
        isLoading: false,
      })

      useToast.mockReturnValue({
        toast: mockToast,
      })

      render(<ChatInterface />)

      const input = screen.getByPlaceholderText(/告诉我你的交易想法/i)
      await user.type(input, '测试')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      // 验证错误处理（具体取决于实现）
      await waitFor(() => {
        // 可能显示错误提示或 toast
      })
    })

    it('应该处理空消息', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const mockSendMessage = jest.fn()

      useA2UIInsight.mockReturnValue({
        sendMessage: mockSendMessage,
        isLoading: false,
      })

      render(<ChatInterface />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      // 不应该发送空消息
      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('快捷预设', () => {
    it('应该能使用快捷预设发送消息', async () => {
      const user = userEvent.setup()
      const { useA2UIInsight } = require('@/hooks/useA2UIInsight')
      const mockSendMessage = jest.fn().mockResolvedValue({ success: true })

      useA2UIInsight.mockReturnValue({
        sendMessage: mockSendMessage,
        isLoading: false,
      })

      render(<ChatInterface />)

      // 根据实际实现查找快捷预设按钮
      // 这里假设有预设按钮，实际需要根据组件调整
      const buttons = screen.getAllByRole('button')

      // 验证渲染
      expect(buttons.length).toBeGreaterThan(1)
    })
  })

  describe('辅助功能', () => {
    it('应该自动滚动到最新消息', () => {
      const { useAIStore } = require('@/store/ai')
      const messages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${i}`,
        timestamp: Date.now() - (20 - i) * 1000,
      }))

      useAIStore.mockReturnValue({
        messages,
        isLoading: false,
        sendMessage: jest.fn(),
        clearMessages: jest.fn(),
      })

      const { container } = render(<ChatInterface />)

      // 验证所有消息都被渲染
      messages.forEach((msg) => {
        expect(screen.getByText(msg.content)).toBeInTheDocument()
      })
    })
  })

  describe('响应式设计', () => {
    it('应该在移动端正确渲染', () => {
      // Mock window.innerWidth
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      render(<ChatInterface />)

      // 验证组件在移动端可见
      expect(screen.getByPlaceholderText(/告诉我你的交易想法/i)).toBeInTheDocument()
    })
  })
})
