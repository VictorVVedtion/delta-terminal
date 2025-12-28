import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentStore, type Agent } from '../agent'

describe('AgentStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAgentStore.setState({
      agents: [],
      activeAgentId: null,
      riskOverview: {
        marginRate: 0,
        totalExposure: 0,
        maxDrawdown: 0,
        riskLevel: 'low',
      },
      pnlDashboard: {
        totalPnL: 0,
        totalPnLPercent: 0,
        todayPnL: 0,
        todayPnLPercent: 0,
        weekPnL: 0,
        monthPnL: 0,
      },
      chatHistory: [],
    })
  })

  describe('Initial State', () => {
    it('should have empty agents array', () => {
      const { agents } = useAgentStore.getState()
      expect(agents).toEqual([])
    })

    it('should have null activeAgentId', () => {
      const { activeAgentId } = useAgentStore.getState()
      expect(activeAgentId).toBeNull()
    })

    it('should have default risk overview', () => {
      const { riskOverview } = useAgentStore.getState()
      expect(riskOverview.riskLevel).toBe('low')
      expect(riskOverview.marginRate).toBe(0)
    })
  })

  describe('Agent Actions', () => {
    const mockAgent: Agent = {
      id: 'agent-1',
      name: 'Test Agent',
      symbol: 'BTC/USDT',
      status: 'paper',
      pnl: 100,
      pnlPercent: 5,
      trades: 10,
      winRate: 0.6,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('should add agent', () => {
      useAgentStore.getState().addAgent(mockAgent)
      const { agents } = useAgentStore.getState()
      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('agent-1')
    })

    it('should update agent', () => {
      useAgentStore.getState().addAgent(mockAgent)
      useAgentStore.getState().updateAgent('agent-1', { pnl: 200 })
      const { agents } = useAgentStore.getState()
      expect(agents[0].pnl).toBe(200)
    })

    it('should remove agent', () => {
      useAgentStore.getState().addAgent(mockAgent)
      useAgentStore.getState().removeAgent('agent-1')
      const { agents } = useAgentStore.getState()
      expect(agents).toHaveLength(0)
    })

    it('should set active agent', () => {
      useAgentStore.getState().addAgent(mockAgent)
      useAgentStore.getState().setActiveAgent('agent-1')
      const { activeAgentId } = useAgentStore.getState()
      expect(activeAgentId).toBe('agent-1')
    })

    it('should set multiple agents', () => {
      const agents = [mockAgent, { ...mockAgent, id: 'agent-2', name: 'Agent 2' }]
      useAgentStore.getState().setAgents(agents)
      expect(useAgentStore.getState().agents).toHaveLength(2)
    })
  })

  describe('Risk Overview Actions', () => {
    it('should update risk overview', () => {
      useAgentStore.getState().updateRiskOverview({
        riskLevel: 'high',
        marginRate: 50,
      })
      const { riskOverview } = useAgentStore.getState()
      expect(riskOverview.riskLevel).toBe('high')
      expect(riskOverview.marginRate).toBe(50)
    })
  })

  describe('PnL Dashboard Actions', () => {
    it('should update pnl dashboard', () => {
      useAgentStore.getState().updatePnLDashboard({
        totalPnL: 1000,
        todayPnL: 100,
      })
      const { pnlDashboard } = useAgentStore.getState()
      expect(pnlDashboard.totalPnL).toBe(1000)
      expect(pnlDashboard.todayPnL).toBe(100)
    })
  })

  describe('Chat History Actions', () => {
    it('should add chat history', () => {
      useAgentStore.getState().addChatHistory({
        id: 'chat-1',
        title: 'Test Chat',
        preview: 'Hello world',
        timestamp: Date.now(),
      })
      const { chatHistory } = useAgentStore.getState()
      expect(chatHistory).toHaveLength(1)
    })

    it('should clear chat history', () => {
      useAgentStore.getState().addChatHistory({
        id: 'chat-1',
        title: 'Test Chat',
        preview: 'Hello world',
        timestamp: Date.now(),
      })
      useAgentStore.getState().clearChatHistory()
      const { chatHistory } = useAgentStore.getState()
      expect(chatHistory).toHaveLength(0)
    })
  })
})
