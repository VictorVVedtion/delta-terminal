/**
 * Deployment Types Tests
 * Story 1.2: 部署 API 接口与 AgentStore 状态管理
 */

import {
  DeploymentError,
  type DeploymentErrorCode,
  type DeploymentResult,
  isDeploymentError,
  isDeploymentSuccess,
} from '../deployment'

describe('DeploymentError', () => {
  it('should create error with correct properties', () => {
    const error = new DeploymentError('Test error', 'API_ERROR', { detail: 'test' })

    expect(error.message).toBe('Test error')
    expect(error.code).toBe('API_ERROR')
    expect(error.details).toEqual({ detail: 'test' })
    expect(error.name).toBe('DeploymentError')
  })

  it('should be instanceof Error', () => {
    const error = new DeploymentError('Test', 'API_ERROR')
    expect(error instanceof Error).toBe(true)
    expect(error instanceof DeploymentError).toBe(true)
  })

  describe('toUserMessage', () => {
    const testCases: { code: DeploymentErrorCode; expected: string }[] = [
      { code: 'BACKTEST_NOT_PASSED', expected: '策略回测未通过，无法部署' },
      { code: 'PAPER_TIME_INSUFFICIENT', expected: 'Paper 模式运行时间不足 7 天，无法升级到 Live' },
      { code: 'INVALID_TOKEN', expected: '确认令牌无效，请重新确认' },
      { code: 'INSUFFICIENT_BALANCE', expected: '账户余额不足' },
      { code: 'STRATEGY_NOT_FOUND', expected: '策略不存在' },
      { code: 'AGENT_ALREADY_DEPLOYED', expected: 'Agent 已经在运行中' },
      { code: 'NETWORK_ERROR', expected: '网络连接失败，请检查网络' },
    ]

    testCases.forEach(({ code, expected }) => {
      it(`should return correct message for ${code}`, () => {
        const error = new DeploymentError('Original message', code)
        expect(error.toUserMessage()).toBe(expected)
      })
    })

    it('should include message for API_ERROR', () => {
      const error = new DeploymentError('Server timeout', 'API_ERROR')
      expect(error.toUserMessage()).toBe('服务器错误: Server timeout')
    })

    it('should return original message for UNKNOWN_ERROR', () => {
      const error = new DeploymentError('Something went wrong', 'UNKNOWN_ERROR')
      expect(error.toUserMessage()).toBe('Something went wrong')
    })
  })
})

describe('isDeploymentError', () => {
  it('should return true for DeploymentError instance', () => {
    const error = new DeploymentError('Test', 'API_ERROR')
    expect(isDeploymentError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Test')
    expect(isDeploymentError(error)).toBe(false)
  })

  it('should return false for non-Error values', () => {
    expect(isDeploymentError('string')).toBe(false)
    expect(isDeploymentError(123)).toBe(false)
    expect(isDeploymentError(null)).toBe(false)
    expect(isDeploymentError(undefined)).toBe(false)
    expect(isDeploymentError({})).toBe(false)
  })
})

describe('isDeploymentSuccess', () => {
  it('should return true when success is true', () => {
    const result: DeploymentResult = {
      success: true,
      agentId: 'agent_001',
      deploymentId: 'deploy_001',
      mode: 'paper',
      deployedAt: new Date().toISOString(),
      message: 'Success',
    }
    expect(isDeploymentSuccess(result)).toBe(true)
  })

  it('should return false when success is false', () => {
    const result: DeploymentResult = {
      success: false,
      agentId: '',
      deploymentId: 'deploy_001',
      mode: 'paper',
      deployedAt: new Date().toISOString(),
      message: 'Failed',
    }
    expect(isDeploymentSuccess(result)).toBe(false)
  })
})
