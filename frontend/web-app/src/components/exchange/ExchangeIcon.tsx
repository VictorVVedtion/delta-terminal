'use client'

import React from 'react'

import { cn } from '@/lib/utils'
import type { ExchangeType } from '@/store/exchange'

// =============================================================================
// Types
// =============================================================================

interface ExchangeIconProps {
  exchange: ExchangeType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// =============================================================================
// Exchange Colors & Labels
// =============================================================================

const EXCHANGE_CONFIG: Record<
  ExchangeType,
  { color: string; bgColor: string; label: string; shortLabel: string }
> = {
  // CEX (中心化交易所)
  binance: {
    color: '#F0B90B',
    bgColor: 'bg-[#F0B90B]/10',
    label: 'Binance',
    shortLabel: 'BN',
  },
  okx: {
    color: '#FFFFFF',
    bgColor: 'bg-white/10',
    label: 'OKX',
    shortLabel: 'OK',
  },
  bybit: {
    color: '#F7A600',
    bgColor: 'bg-[#F7A600]/10',
    label: 'Bybit',
    shortLabel: 'BY',
  },
  bitget: {
    color: '#00F0FF',
    bgColor: 'bg-[#00F0FF]/10',
    label: 'Bitget',
    shortLabel: 'BG',
  },
  // Perp-DEX (去中心化永续合约交易所)
  hyperliquid: {
    color: '#84FF84',
    bgColor: 'bg-[#84FF84]/10',
    label: 'Hyperliquid',
    shortLabel: 'HL',
  },
  lighter: {
    color: '#FF6B35',
    bgColor: 'bg-[#FF6B35]/10',
    label: 'Lighter',
    shortLabel: 'LT',
  },
  aster: {
    color: '#9945FF',
    bgColor: 'bg-[#9945FF]/10',
    label: 'Aster DEX',
    shortLabel: 'AS',
  },
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
}

// =============================================================================
// Component
// =============================================================================

export function ExchangeIcon({ exchange, size = 'md', className }: ExchangeIconProps) {
  const config = EXCHANGE_CONFIG[exchange]

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold',
        config.bgColor,
        SIZE_CLASSES[size],
        className
      )}
      style={{ color: config.color }}
      title={config.label}
    >
      {config.shortLabel}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export function getExchangeLabel(exchange: ExchangeType): string {
  return EXCHANGE_CONFIG[exchange].label ?? exchange
}

export function getExchangeColor(exchange: ExchangeType): string {
  return EXCHANGE_CONFIG[exchange].color ?? '#888888'
}

export default ExchangeIcon
