'use client'

// Badge removed - unused
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface PortfolioCardProps {
  totalValue: number
  change24h: number
  changePercent: number
  availableBalance: number
}

export function PortfolioCard({
  totalValue,
  change24h,
  changePercent,
  availableBalance,
}: PortfolioCardProps) {
  const isPositive = change24h >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">总资产</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Total Value */}
          <div>
            <div className="text-3xl font-bold">
              ${formatCurrency(totalValue)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                {formatPercentage(changePercent)}
              </span>
              <span className="text-sm text-muted-foreground">
                (${formatCurrency(Math.abs(change24h))})
              </span>
            </div>
          </div>

          {/* Available Balance */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">可用余额</span>
              <span className="font-medium">
                ${formatCurrency(availableBalance)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
