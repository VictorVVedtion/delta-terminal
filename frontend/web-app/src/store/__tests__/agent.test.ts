/**
 * AgentStore Tests - 部署功能测试
 * Story 1.2: 部署 API 接口与 AgentStore 状态管理
 */

import { act } from '@testing-library/react'
import { useAgentStore, type Agent, type AgentStatus } from '../agent'

// =============================================================================
// Test Setup
// =============================================================================

const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test_agent_001',
  name: 'Test Strategy',
  symbol: 'BTC/USDT',
  status: 'stopped',
  pnl: 0,
  pnlPercent: 0,
  trades: 0,
  winRate: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

describe('AgentStore - Deployment Actions', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useAgentStore.setState({
        agents: [],
        activeAgentId: null,
      })
    })
  })

  // =============================================================================
  // deployAgentToPaper Tests
  // =============================================================================

  describe('deployAgentToPaper', () => {
    it('should update agent status to paper', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'stopped' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToPaper('agent_1', 10000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.status).toBe('paper')
    })

    it('should set deploymentStatus to deployed', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToPaper('agent_1', 10000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('deployed')
    })

    it('should set virtualCapital correctly', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToPaper('agent_1', 25000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.virtualCapital).toBe(25000)
    })

    it('should set deployedAt and paperStartedAt timestamps', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      const beforeDeploy = Date.now()

      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToPaper('agent_1', 10000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deployedAt).toBeGreaterThanOrEqual(beforeDeploy)
      expect(updatedAgent?.paperStartedAt).toBeGreaterThanOrEqual(beforeDeploy)
    })

    it('should not affect other agents', () => {
      const agent1 = createMockAgent({ id: 'agent_1', status: 'stopped' })
      const agent2 = createMockAgent({ id: 'agent_2', status: 'stopped' })

      act(() => {
        useAgentStore.getState().addAgent(agent1)
        useAgentStore.getState().addAgent(agent2)
        useAgentStore.getState().deployAgentToPaper('agent_1', 10000)
      })

      const unchangedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_2')
      expect(unchangedAgent?.status).toBe('stopped')
      expect(unchangedAgent?.deploymentStatus).toBeUndefined()
    })
  })

  // =============================================================================
  // deployAgentToLive Tests
  // =============================================================================

  describe('deployAgentToLive', () => {
    it('should update agent status to live', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'paper' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToLive('agent_1', 5000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.status).toBe('live')
    })

    it('should set initialCapital correctly', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'paper' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToLive('agent_1', 15000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.initialCapital).toBe(15000)
    })

    it('should set deploymentStatus to deployed', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'paper' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().deployAgentToLive('agent_1', 5000)
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('deployed')
    })
  })

  // =============================================================================
  // updateDeploymentProgress Tests
  // =============================================================================

  describe('updateDeploymentProgress', () => {
    it('should set deploymentStatus to deploying for in_progress', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().updateDeploymentProgress('agent_1', {
          status: 'in_progress',
          progress: 50,
          currentStep: 'Initializing...',
        })
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('deploying')
    })

    it('should set deploymentStatus to deployed for completed', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().updateDeploymentProgress('agent_1', {
          status: 'completed',
          progress: 100,
          currentStep: 'Done',
        })
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('deployed')
    })

    it('should set deploymentStatus to failed for failed', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().updateDeploymentProgress('agent_1', {
          status: 'failed',
          progress: 30,
          currentStep: 'Error',
          error: 'Connection failed',
        })
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('failed')
    })
  })

  // =============================================================================
  // rollbackDeployment Tests
  // =============================================================================

  describe('rollbackDeployment', () => {
    it('should restore previous status', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'paper' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().rollbackDeployment('agent_1', 'stopped')
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.status).toBe('stopped')
    })

    it('should set deploymentStatus to failed', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'paper' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
        useAgentStore.getState().rollbackDeployment('agent_1', 'stopped')
      })

      const updatedAgent = useAgentStore.getState().agents.find((a) => a.id === 'agent_1')
      expect(updatedAgent?.deploymentStatus).toBe('failed')
    })
  })

  // =============================================================================
  // canDeployToPaper Tests
  // =============================================================================

  describe('canDeployToPaper', () => {
    it('should return true when agent has backtestId', () => {
      const agent = createMockAgent({ id: 'agent_1', backtestId: 'backtest_001' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const canDeploy = useAgentStore.getState().canDeployToPaper('agent_1')
      expect(canDeploy).toBe(true)
    })

    it('should return false when agent has no backtestId', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const canDeploy = useAgentStore.getState().canDeployToPaper('agent_1')
      expect(canDeploy).toBe(false)
    })

    it('should return false when agent does not exist', () => {
      const canDeploy = useAgentStore.getState().canDeployToPaper('non_existent')
      expect(canDeploy).toBe(false)
    })
  })

  // =============================================================================
  // canDeployToLive Tests
  // =============================================================================

  describe('canDeployToLive', () => {
    it('should return false when agent is not in paper mode', () => {
      const agent = createMockAgent({ id: 'agent_1', status: 'stopped' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const canDeploy = useAgentStore.getState().canDeployToLive('agent_1')
      expect(canDeploy).toBe(false)
    })

    it('should return false when paper running days < 7', () => {
      const agent = createMockAgent({
        id: 'agent_1',
        status: 'paper',
        paperStartedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const canDeploy = useAgentStore.getState().canDeployToLive('agent_1')
      expect(canDeploy).toBe(false)
    })

    it('should return true when paper running days >= 7', () => {
      const agent = createMockAgent({
        id: 'agent_1',
        status: 'paper',
        paperStartedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const canDeploy = useAgentStore.getState().canDeployToLive('agent_1')
      expect(canDeploy).toBe(true)
    })

    it('should return false when agent does not exist', () => {
      const canDeploy = useAgentStore.getState().canDeployToLive('non_existent')
      expect(canDeploy).toBe(false)
    })
  })

  // =============================================================================
  // getPaperRunningDays Tests
  // =============================================================================

  describe('getPaperRunningDays', () => {
    it('should return 0 when agent has no paperStartedAt', () => {
      const agent = createMockAgent({ id: 'agent_1' })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const days = useAgentStore.getState().getPaperRunningDays('agent_1')
      expect(days).toBe(0)
    })

    it('should return correct number of days', () => {
      const daysAgo = 5
      const agent = createMockAgent({
        id: 'agent_1',
        paperStartedAt: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      })
      act(() => {
        useAgentStore.getState().addAgent(agent)
      })

      const days = useAgentStore.getState().getPaperRunningDays('agent_1')
      expect(days).toBe(daysAgo)
    })

    it('should return 0 when agent does not exist', () => {
      const days = useAgentStore.getState().getPaperRunningDays('non_existent')
      expect(days).toBe(0)
    })
  })
})
