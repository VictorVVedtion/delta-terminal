'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  Settings,
  Link2,
  Bell,
  Shield,
  User,
  Palette,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ExchangeConnectionCard,
  AddExchangeModal,
} from '@/components/exchange'
import {
  useExchangeStore,
  CEX_EXCHANGES,
  PERP_DEX_EXCHANGES,
  type ExchangeType,
  type ExchangeAccount,
} from '@/store/exchange'
import { notify } from '@/lib/notification'

// =============================================================================
// Exchange Settings Section
// =============================================================================

function ExchangeSettingsSection() {
  const {
    accounts,
    removeAccount,
    syncBalance,
  } = useExchangeStore()

  const [modalState, setModalState] = React.useState<{
    isOpen: boolean
    exchangeType: ExchangeType
    editAccount?: ExchangeAccount
  }>({
    isOpen: false,
    exchangeType: 'binance',
  })

  const [loadingAccountId, setLoadingAccountId] = React.useState<string | null>(null)

  // Get account for each exchange
  const getAccountForExchange = (exchangeType: ExchangeType) => {
    return accounts.find((a) => a.exchange === exchangeType)
  }

  // Handle connect
  const handleConnect = (exchangeType: ExchangeType) => {
    setModalState({
      isOpen: true,
      exchangeType,
    })
  }

  // Handle edit
  const handleEdit = (account: ExchangeAccount) => {
    setModalState({
      isOpen: true,
      exchangeType: account.exchange,
      editAccount: account,
    })
  }

  // Handle disconnect
  const handleDisconnect = async (account: ExchangeAccount) => {
    if (confirm(`确定要断开 ${account.name} 吗？`)) {
      removeAccount(account.id)
      notify('info', '账户已断开', {
        description: `${account.name} 已从列表中移除`,
        source: 'ExchangeSettings',
      })
    }
  }

  // Handle refresh
  const handleRefresh = async (account: ExchangeAccount) => {
    setLoadingAccountId(account.id)
    await syncBalance(account.id)
    setLoadingAccountId(null)
    notify('success', '余额已同步', {
      source: 'ExchangeSettings',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">交易所账户</h3>
          <p className="text-sm text-muted-foreground">
            连接您的交易所账户以启用自动交易
          </p>
        </div>
      </div>

      {/* CEX Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground px-2">
            CEX 中心化交易所
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {CEX_EXCHANGES.map((exchange) => {
            const account = getAccountForExchange(exchange.id)
            return (
              <ExchangeConnectionCard
                key={exchange.id}
                exchangeType={exchange.id}
                {...(account && { account })}
                onConnect={() => handleConnect(exchange.id)}
                onEdit={handleEdit}
                onDisconnect={handleDisconnect}
                onRefresh={handleRefresh}
                isLoading={loadingAccountId === account?.id}
              />
            )
          })}
        </div>
      </div>

      {/* Perp-DEX Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground px-2">
            Perp-DEX 去中心化永续合约
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PERP_DEX_EXCHANGES.map((exchange) => {
            const account = getAccountForExchange(exchange.id)
            return (
              <ExchangeConnectionCard
                key={exchange.id}
                exchangeType={exchange.id}
                {...(account && { account })}
                onConnect={() => handleConnect(exchange.id)}
                onEdit={handleEdit}
                onDisconnect={handleDisconnect}
                onRefresh={handleRefresh}
                isLoading={loadingAccountId === account?.id}
              />
            )
          })}
        </div>
      </div>

      {/* Add Exchange Modal */}
      <AddExchangeModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        exchangeType={modalState.exchangeType}
        {...(modalState.editAccount && { editAccount: modalState.editAccount })}
      />
    </div>
  )
}

// =============================================================================
// Placeholder Sections
// =============================================================================

function NotificationSettingsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">通知设置</h3>
        <p className="text-sm text-muted-foreground">管理您的通知偏好</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            通知设置功能即将推出
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SecuritySettingsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">安全设置</h3>
        <p className="text-sm text-muted-foreground">管理账户安全选项</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            安全设置功能即将推出
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileSettingsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">个人资料</h3>
        <p className="text-sm text-muted-foreground">管理您的个人信息</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            个人资料设置功能即将推出
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function AppearanceSettingsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">外观设置</h3>
        <p className="text-sm text-muted-foreground">自定义应用外观</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            外观设置功能即将推出
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Settings Page
// =============================================================================

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">设置</h1>
            <p className="text-muted-foreground">管理您的账户和应用偏好</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="exchanges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="exchanges" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">交易所</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">通知</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">安全</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">资料</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">外观</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exchanges">
            <ExchangeSettingsSection />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettingsSection />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsSection />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettingsSection />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettingsSection />
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              危险区域
            </CardTitle>
            <CardDescription>
              以下操作不可逆，请谨慎操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              删除账户
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
