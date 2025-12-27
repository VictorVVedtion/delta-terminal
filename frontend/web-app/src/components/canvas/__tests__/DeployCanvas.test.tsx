import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { type BacktestSummary, DeployCanvas, type PaperPerformance } from '../DeployCanvas'

// =============================================================================
// Test Data
// =============================================================================

const mockBacktestPassed: BacktestSummary = {
  passed: true,
  expectedReturn: 15.2,
  maxDrawdown: 8.5,
  winRate: 68.5,
}

const mockBacktestFailed: BacktestSummary = {
  passed: false,
  expectedReturn: -5.2,
  maxDrawdown: 25.0,
  winRate: 35.0,
}

const mockPaperPerformanceOk: PaperPerformance = {
  runningDays: 10,
  requiredDays: 7,
  pnl: 1250.5,
  pnlPercent: 12.5,
}

const mockPaperPerformanceNotReady: PaperPerformance = {
  runningDays: 3,
  requiredDays: 7,
  pnl: 250.0,
  pnlPercent: 2.5,
}

const defaultProps = {
  strategyId: 'strategy-001',
  strategyName: 'Test Strategy',
  symbol: 'BTC/USDT',
  isOpen: true,
  onDeploy: jest.fn().mockResolvedValue(undefined),
  onCancel: jest.fn(),
  isLoading: false,
}

// =============================================================================
// Render Tests
// =============================================================================

describe('DeployCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders Paper mode content correctly', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
      expect(screen.getByText('Paper')).toBeInTheDocument()
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
      expect(screen.getByText('回测已通过')).toBeInTheDocument()
      expect(screen.getByText('模拟盘配置')).toBeInTheDocument()
      expect(screen.getByText('部署模拟盘')).toBeInTheDocument()
    })

    it('renders Live mode content correctly', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Live')).toBeInTheDocument()
      expect(screen.getByText('前置条件')).toBeInTheDocument()
      expect(screen.getByText('回测验证通过')).toBeInTheDocument()
      expect(screen.getByText('Paper 阶段表现')).toBeInTheDocument()
      expect(screen.getByText('实盘资金配置')).toBeInTheDocument()
      expect(screen.getByText('确认实盘部署')).toBeInTheDocument()
    })

    it('hides panel when isOpen is false', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          isOpen={false}
        />
      )

      const panel = screen.getByRole('dialog')
      expect(panel).toHaveClass('translate-x-full')
    })

    it('shows panel when isOpen is true', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          isOpen={true}
        />
      )

      const panel = screen.getByRole('dialog')
      expect(panel).toHaveClass('translate-x-0')
    })

    it('displays backtest failed status correctly', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestFailed}
        />
      )

      expect(screen.getByText('回测未通过')).toBeInTheDocument()
    })

    it('displays backtest metrics correctly', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
        />
      )

      expect(screen.getByText('+15.2%')).toBeInTheDocument()
      expect(screen.getByText('-8.5%')).toBeInTheDocument()
      expect(screen.getByText('69%')).toBeInTheDocument()
    })
  })

  // =============================================================================
  // Interaction Tests
  // =============================================================================

  describe('Interactions', () => {
    it('triggers onCancel when ESC key is pressed', () => {
      const onCancel = jest.fn()
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          onCancel={onCancel}
        />
      )

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('triggers onCancel when backdrop is clicked', async () => {
      const onCancel = jest.fn()
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          onCancel={onCancel}
        />
      )

      const backdrop = document.querySelector('[aria-hidden="true"]')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onCancel).toHaveBeenCalledTimes(1)
      }
    })

    it('triggers onCancel when close button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          onCancel={onCancel}
        />
      )

      const closeButton = screen.getByRole('button', { name: '' })
      await user.click(closeButton)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('triggers onDeploy with correct config in Paper mode', async () => {
      const user = userEvent.setup()
      const onDeploy = jest.fn().mockResolvedValue(undefined)
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          onDeploy={onDeploy}
        />
      )

      const deployButton = screen.getByText('部署模拟盘')
      await user.click(deployButton)

      await waitFor(() => {
        expect(onDeploy).toHaveBeenCalledWith({
          mode: 'paper',
          capital: 10000, // default Paper capital
        })
      })
    })

    it('triggers onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          onCancel={onCancel}
        />
      )

      const cancelButton = screen.getByText('取消')
      await user.click(cancelButton)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  // =============================================================================
  // Live Mode Double Confirmation Tests
  // =============================================================================

  describe('Live Mode Double Confirmation', () => {
    it('disables deploy button when checkbox is unchecked', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      const deployButton = screen.getByText('确认实盘部署')
      expect(deployButton).toBeDisabled()
    })

    it('enables deploy button after checkbox is checked', async () => {
      const user = userEvent.setup()
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const deployButton = screen.getByText('确认实盘部署')
      expect(deployButton).not.toBeDisabled()
    })

    it('triggers onDeploy with confirmationToken in Live mode', async () => {
      const user = userEvent.setup()
      const onDeploy = jest.fn().mockResolvedValue(undefined)
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
          onDeploy={onDeploy}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const deployButton = screen.getByText('确认实盘部署')
      await user.click(deployButton)

      await waitFor(() => {
        expect(onDeploy).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'live',
            capital: 5000, // default Live capital
            confirmationToken: expect.stringMatching(/^confirm_\d+$/),
          })
        )
      })
    })

    it('shows warning when prerequisites are not met', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceNotReady}
        />
      )

      expect(screen.getByText('请先满足所有前置条件后再进行实盘部署')).toBeInTheDocument()
    })

    it('disables checkbox when prerequisites are not met', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceNotReady}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('shows prerequisite status correctly when Paper days insufficient', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceNotReady}
        />
      )

      expect(screen.getByText('已运行 3 天')).toBeInTheDocument()
    })

    it('shows prerequisite status correctly when backtest failed', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestFailed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      // The checkbox should still be disabled because backtest failed
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('displays real fund warning in Live mode', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      expect(screen.getByText('实盘涉及真实资金')).toBeInTheDocument()
      expect(screen.getByText(/实盘交易将使用您的真实资金/)).toBeInTheDocument()
    })
  })

  // =============================================================================
  // Accessibility Tests
  // =============================================================================

  describe('Accessibility', () => {
    it('has correct role="dialog" attribute', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true" attribute', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-label attribute', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-label', 'Deploy Canvas')
    })

    it('checkbox has associated label', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('id', 'confirm-live')
      expect(screen.getByLabelText('我确认使用真实资金进行交易')).toBeInTheDocument()
    })
  })

  // =============================================================================
  // Loading State Tests
  // =============================================================================

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          isLoading={true}
        />
      )

      expect(screen.getByText('部署中...')).toBeInTheDocument()
    })

    it('disables deploy button when loading', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          isLoading={true}
        />
      )

      const deployButton = screen.getByText('部署中...').closest('button')
      expect(deployButton).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="paper"
          backtestResult={mockBacktestPassed}
          isLoading={true}
        />
      )

      const cancelButton = screen.getByText('取消')
      expect(cancelButton).toBeDisabled()
    })
  })

  // =============================================================================
  // Paper Performance Display Tests
  // =============================================================================

  describe('Paper Performance Display', () => {
    it('displays Paper performance metrics in Live mode', () => {
      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={mockPaperPerformanceOk}
        />
      )

      expect(screen.getByText('+12.50%')).toBeInTheDocument()
      expect(screen.getByText('运行 10 天')).toBeInTheDocument()
      expect(screen.getByText('+$1250.50')).toBeInTheDocument()
    })

    it('handles negative Paper PnL correctly', () => {
      const negativePaperPerformance: PaperPerformance = {
        runningDays: 10,
        requiredDays: 7,
        pnl: -500.0,
        pnlPercent: -5.0,
      }

      render(
        <DeployCanvas
          {...defaultProps}
          mode="live"
          backtestResult={mockBacktestPassed}
          paperPerformance={negativePaperPerformance}
        />
      )

      expect(screen.getByText('-5.00%')).toBeInTheDocument()
      expect(screen.getByText('-$500.00')).toBeInTheDocument()
    })
  })
})
