'use client'

import React from 'react'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw,
  Link2,
  Link2Off,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ExchangeIcon, getExchangeLabel } from './ExchangeIcon'
import type { ExchangeAccount, ConnectionStatus, ExchangeType } from '@/store/exchange'
import { SUPPORTED_EXCHANGES } from '@/store/exchange'

// =============================================================================
// Types
// =============================================================================

interface ExchangeConnectionCardProps {
  account?: ExchangeAccount
  exchangeType: ExchangeType
  onConnect?: () => void
  onEdit?: (account: ExchangeAccount) => void
  onDisconnect?: (account: ExchangeAccount) => void
  onRefresh?: (account: ExchangeAccount) => void
  isLoading?: boolean
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config: Record<
    ConnectionStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
  > = {
    connected: {
      label: '已连接',
      variant: 'default',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    disconnected: {
      label: '未连接',
      variant: 'secondary',
      icon: <XCircle className="h-3 w-3" />,
    },
    connecting: {
      label: '连接中',
      variant: 'outline',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    error: {
      label: '错误',
      variant: 'destructive',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  }

  const { label, variant, icon } = config[status]

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {label}
    </Badge>
  )
}

// =============================================================================
// Connected Account View
// =============================================================================

function ConnectedAccountView({
  account,
  onEdit,
  onDisconnect,
  onRefresh,
  isLoading,
}: {
  account: ExchangeAccount
  onEdit?: (account: ExchangeAccount) => void
  onDisconnect?: (account: ExchangeAccount) => void
  onRefresh?: (account: ExchangeAccount) => void
  isLoading?: boolean
}) {
  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return '从未同步'
    const diff = Date.now() - timestamp
    if (diff < 60000) return `${Math.floor(diff / 1000)} 秒前`
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    return `${Math.floor(diff / 3600000)} 小时前`
  }

  return (
    <div className="space-y-3">
      {/* Account Name & API Key */}
      <div>
        <p className="font-medium text-foreground">{account.name}</p>
        <p className="text-sm text-muted-foreground font-mono">
          API Key: {account.apiKey}
        </p>
      </div>

      {/* Permissions */}
      <div className="flex gap-1.5">
        {account.permissions.includes('read') && (
          <Badge variant="outline" className="text-[10px] h-5">
            只读
          </Badge>
        )}
        {account.permissions.includes('trade') && (
          <Badge variant="outline" className="text-[10px] h-5 border-green-500/50 text-green-500">
            交易
          </Badge>
        )}
        {account.permissions.includes('withdraw') && (
          <Badge variant="destructive" className="text-[10px] h-5">
            提现 (危险)
          </Badge>
        )}
      </div>

      {/* Balance */}
      {account.status === 'connected' && account.balance && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">总余额</span>
            <span className="font-semibold text-lg">
              {formatBalance(account.balance.total)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              可用: {formatBalance(account.balance.available)}
            </span>
            <span className="text-xs text-muted-foreground">
              最后同步: {formatLastSync(account.lastSync)}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {account.status === 'error' && account.errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{account.errorMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh?.(account)}
          disabled={isLoading || account.status !== 'connected'}
        >
          <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
          刷新
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit?.(account)}>
          <Settings className="h-4 w-4 mr-1" />
          编辑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDisconnect?.(account)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          断开
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// Empty State View
// =============================================================================

function EmptyStateView({
  exchangeType,
  onConnect,
}: {
  exchangeType: ExchangeType
  onConnect?: () => void
}) {
  const exchangeInfo = SUPPORTED_EXCHANGES.find((e) => e.id === exchangeType)
  const isSupported = exchangeInfo?.supported ?? false

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Link2Off className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">
        {isSupported
          ? `点击添加 ${getExchangeLabel(exchangeType)} 账户`
          : `${getExchangeLabel(exchangeType)} 即将支持`}
      </p>
      <Button onClick={onConnect} disabled={!isSupported} size="sm">
        <Link2 className="h-4 w-4 mr-2" />
        {isSupported ? '连接账户' : '敬请期待'}
      </Button>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ExchangeConnectionCard({
  account,
  exchangeType,
  onConnect,
  onEdit,
  onDisconnect,
  onRefresh,
  isLoading,
}: ExchangeConnectionCardProps) {
  const hasAccount = !!account
  const status = account?.status ?? 'disconnected'

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-all',
        hasAccount && status === 'connected' && 'border-green-500/30 bg-green-500/5',
        hasAccount && status === 'error' && 'border-destructive/30 bg-destructive/5',
        !hasAccount && 'border-dashed hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
      )}
      onClick={!hasAccount ? onConnect : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ExchangeIcon exchange={exchangeType} size="lg" />
          <span className="font-semibold">{getExchangeLabel(exchangeType)}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Content */}
      {hasAccount ? (
        <ConnectedAccountView
          account={account}
          {...(onEdit && { onEdit })}
          {...(onDisconnect && { onDisconnect })}
          {...(onRefresh && { onRefresh })}
          {...(isLoading !== undefined && { isLoading })}
        />
      ) : (
        <EmptyStateView exchangeType={exchangeType} {...(onConnect && { onConnect })} />
      )}
    </div>
  )
}

export default ExchangeConnectionCard
