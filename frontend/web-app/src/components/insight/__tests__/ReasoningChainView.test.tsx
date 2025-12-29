/**
 * ReasoningChainView Component Tests
 *
 * Tests for the AI reasoning chain visualization component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReasoningChainView, ReasoningNodeView } from '../ReasoningChainView'
import type { ReasoningChain, ReasoningNode } from '@/types/reasoning'

describe('ReasoningChainView', () => {
  const mockChain: ReasoningChain = {
    id: 'chain-1',
    user_input: '我想创建一个保守型BTC策略',
    nodes: [
      {
        id: 'node-1',
        type: 'understanding',
        title: '理解用户意图',
        content: '用户希望创建一个**保守型**的BTC交易策略。关键词：保守、风险可控。',
        confidence: 0.95,
        status: 'confirmed',
        evidence: [
          {
            type: 'pattern',
            label: '意图识别',
            value: '策略创建',
            significance: 'high',
          },
        ],
        branches: [],
        interactions: [],
        available_actions: ['expand', 'collapse'],
        children: [],
        created_at: '2025-12-29T00:00:00Z',
        expanded: false,
        highlight: true,
      },
      {
        id: 'node-2',
        type: 'analysis',
        title: '市场状态分析',
        content: 'BTC当前价格 $96,234，RSI=32，处于超卖区域。波动率中等。',
        confidence: 0.88,
        status: 'pending',
        evidence: [
          {
            type: 'indicator',
            label: 'RSI',
            value: 32,
            significance: 'high',
          },
        ],
        branches: [],
        interactions: [],
        available_actions: ['confirm', 'challenge', 'skip'],
        children: [],
        created_at: '2025-12-29T00:00:00Z',
        expanded: false,
        highlight: false,
      },
      {
        id: 'node-3',
        type: 'recommendation',
        title: '策略推荐',
        content: '推荐使用**RSI超卖策略**，止损3%，止盈5%，仓位20%。',
        confidence: 0.85,
        status: 'pending',
        evidence: [],
        branches: [
          {
            id: 'branch-1',
            label: '网格策略',
            description: '也可以考虑使用网格策略，但风险稍高',
            probability: 0.6,
            trade_offs: ['更高收益潜力', '需要更多资金'],
          },
        ],
        interactions: [],
        available_actions: ['confirm', 'challenge', 'modify', 'skip'],
        children: [],
        created_at: '2025-12-29T00:00:00Z',
        expanded: false,
        highlight: true,
      },
    ],
    status: 'in_progress',
    active_node_id: 'node-2',
    overall_confidence: 0.89,
    confirmed_count: 1,
    total_count: 3,
    created_at: '2025-12-29T00:00:00Z',
    updated_at: '2025-12-29T00:00:00Z',
  }

  it('renders the chain header with correct info', () => {
    render(<ReasoningChainView chain={mockChain} />)

    expect(screen.getByText('AI 推理过程')).toBeInTheDocument()
    expect(screen.getByText(/1\/3 步已确认/)).toBeInTheDocument()
    expect(screen.getByText(/置信度 89%/)).toBeInTheDocument()
  })

  it('expands and collapses when header is clicked', async () => {
    const user = userEvent.setup()
    render(<ReasoningChainView chain={mockChain} />)

    // Should be collapsed by default
    expect(screen.queryByText('您说：')).not.toBeInTheDocument()

    // Click to expand
    const header = screen.getByRole('button', { name: /AI 推理过程/ })
    await user.click(header)

    // Should show user input
    expect(screen.getByText('您说：')).toBeInTheDocument()
    expect(screen.getByText(/我想创建一个保守型BTC策略/)).toBeInTheDocument()
  })

  it('renders all nodes when expanded', async () => {
    const user = userEvent.setup()
    render(<ReasoningChainView chain={mockChain} defaultExpanded />)

    // Check nodes are present (use getAllByText for duplicates)
    expect(screen.getAllByText('理解用户意图').length).toBeGreaterThan(0)
    expect(screen.getAllByText('市场状态分析').length).toBeGreaterThan(0)
    expect(screen.getAllByText('策略推荐').length).toBeGreaterThan(0)
  })

  it('highlights the active node', () => {
    render(<ReasoningChainView chain={mockChain} defaultExpanded />)

    // Node-2 should be active (marked in mockChain)
    // Get all nodes with this text and find the card
    const nodes = screen.getAllByText('市场状态分析')
    const activeCard = nodes[0].closest('[class*="ring-2"]')
    expect(activeCard).toBeTruthy()
  })

  it('calls onNodeAction when user confirms a node', async () => {
    const user = userEvent.setup()
    const handleNodeAction = vi.fn()

    render(
      <ReasoningChainView
        chain={mockChain}
        defaultExpanded
        onNodeAction={handleNodeAction}
      />
    )

    // Expand node-2 (pending node) - get first occurrence
    const node2Titles = screen.getAllByText('市场状态分析')
    await user.click(node2Titles[0])

    // Click confirm button - there might be multiple, get all
    const confirmButtons = screen.getAllByRole('button', { name: /确认/ })
    await user.click(confirmButtons[0])

    expect(handleNodeAction).toHaveBeenCalledWith('node-2', 'confirm', undefined)
  })

  it('calls onBranchSelect when user selects a branch', async () => {
    const user = userEvent.setup()
    const handleBranchSelect = vi.fn()

    render(
      <ReasoningChainView
        chain={mockChain}
        defaultExpanded
        onBranchSelect={handleBranchSelect}
      />
    )

    // Expand node-3 (has branches) - get first occurrence
    const node3Titles = screen.getAllByText('策略推荐')
    await user.click(node3Titles[0])

    // Click branch card
    const branchCard = screen.getByText('网格策略')
    await user.click(branchCard)

    expect(handleBranchSelect).toHaveBeenCalledWith('node-3', 'branch-1')
  })

  it('renders only highlighted nodes in highlight_only mode', () => {
    render(
      <ReasoningChainView
        chain={mockChain}
        displayMode="highlight_only"
        defaultExpanded
      />
    )

    // Only node-1 and node-3 are highlighted
    expect(screen.getAllByText('理解用户意图').length).toBeGreaterThan(0)
    expect(screen.queryByText('市场状态分析')).not.toBeInTheDocument()
    expect(screen.getAllByText('策略推荐').length).toBeGreaterThan(0)
  })
})

describe('ReasoningNodeView', () => {
  const mockNode: ReasoningNode = {
    id: 'node-1',
    type: 'decision',
    title: '决策：选择RSI策略',
    content: '基于当前**超卖**状态，RSI策略最适合。\n\n• 风险可控\n• 成功率高',
    confidence: 0.92,
    status: 'pending',
    evidence: [
      {
        type: 'indicator',
        label: 'RSI',
        value: 32,
        significance: 'high',
      },
      {
        type: 'history',
        label: '历史胜率',
        value: '78%',
        significance: 'medium',
      },
    ],
    branches: [],
    interactions: [],
    available_actions: ['confirm', 'challenge', 'modify', 'skip'],
    children: [],
    created_at: '2025-12-29T00:00:00Z',
    expanded: false,
    highlight: false,
  }

  it('renders node with correct type and status', () => {
    render(<ReasoningNodeView node={mockNode} />)

    expect(screen.getByText('决策：选择RSI策略')).toBeInTheDocument()
    expect(screen.getByText('决策点')).toBeInTheDocument()
    expect(screen.getByText('待确认')).toBeInTheDocument()
  })

  it('shows confidence percentage', () => {
    render(<ReasoningNodeView node={mockNode} />)

    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('expands to show content when clicked', async () => {
    const user = userEvent.setup()
    render(<ReasoningNodeView node={mockNode} />)

    // Should be collapsed
    expect(screen.queryByText(/基于当前/)).not.toBeInTheDocument()

    // Click to expand
    const title = screen.getByText('决策：选择RSI策略')
    await user.click(title)

    // Should show content
    expect(screen.getByText(/基于当前/)).toBeInTheDocument()
  })

  it('renders evidence tags', async () => {
    const user = userEvent.setup()
    render(<ReasoningNodeView node={mockNode} />)

    // Expand node
    const title = screen.getByText('决策：选择RSI策略')
    await user.click(title)

    expect(screen.getByText('证据支撑')).toBeInTheDocument()
    expect(screen.getByText('RSI:')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('历史胜率:')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('shows action buttons for pending nodes', async () => {
    const user = userEvent.setup()
    const handleAction = vi.fn()

    render(<ReasoningNodeView node={mockNode} onAction={handleAction} />)

    // Expand node
    const title = screen.getAllByText('决策：选择RSI策略')[0]
    await user.click(title)

    // Check action buttons exist
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map((b) => b.textContent)
    expect(buttonTexts.some((t) => t?.includes('确认'))).toBe(true)
    expect(buttonTexts.some((t) => t?.includes('质疑'))).toBe(true)
    expect(buttonTexts.some((t) => t?.includes('修改'))).toBe(true)
    expect(buttonTexts.some((t) => t?.includes('跳过'))).toBe(true)

    // Click confirm - find button with "确认" text
    const confirmButton = buttons.find((b) => b.textContent?.includes('确认'))
    if (confirmButton) {
      await user.click(confirmButton)
      expect(handleAction).toHaveBeenCalledWith('confirm')
    }
  })

  it('highlights active node', () => {
    render(<ReasoningNodeView node={mockNode} isActive />)

    // Check for the ring classes in the rendered component
    const title = screen.getAllByText('决策：选择RSI策略')[0]
    const card = title.closest('[class*="ring-2"]')
    expect(card).toBeTruthy()
  })
})
