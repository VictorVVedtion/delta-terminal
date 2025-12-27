'use client'

import {
  AlertTriangle,
  Bell,
  Brain,
  HelpCircle,
  Link2,
  Palette,
  RotateCcw,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { AIConfigPanel } from '@/components/ai/AIConfigPanel'
import {
  AddExchangeModal,
  ExchangeConnectionCard,
  ExchangeConnectionWizard,
} from '@/components/exchange'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/lib/notification'
import {
  CEX_EXCHANGES,
  type ExchangeAccount,
  type ExchangeType,
  PERP_DEX_EXCHANGES,
  useExchangeStore,
} from '@/store/exchange'
import { useOnboardingStore } from '@/store/onboarding'

// =============================================================================
// Exchange Settings Section
// =============================================================================

function ExchangeSettingsSection() {
  const {
    accounts,
    removeAccount,
    syncBalance,
  } = useExchangeStore()

  // State for Wizard (New Connection)
  const [wizardOpen, setWizardOpen] = React.useState(false)

  // State for Modal (Edit Connection)
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

  // Handle connect (Open Wizard)
  const handleConnect = (_exchangeType: ExchangeType) => { // Type arg unused as Wizard selects it
    setWizardOpen(true)
  }

  // Handle edit (Open Modal)
  const handleEdit = (account: ExchangeAccount) => {
    setModalState({
      isOpen: true,
      exchangeType: account.exchange,
      editAccount: account,
    })
  }

  // Handle disconnect
  const handleDisconnect = (account: ExchangeAccount) => {
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
        <Button onClick={() => setWizardOpen(true)}>
          添加新账户
        </Button>
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
                onConnect={() => { handleConnect(exchange.id); }}
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
                onConnect={() => { handleConnect(exchange.id); }}
                onEdit={handleEdit}
                onDisconnect={handleDisconnect}
                onRefresh={handleRefresh}
                isLoading={loadingAccountId === account?.id}
              />
            )
          })}
        </div>
      </div>

      {/* Edit Modal (Legacy for editing) */}
      <AddExchangeModal
        isOpen={modalState.isOpen}
        onClose={() => { setModalState({ ...modalState, isOpen: false }); }}
        exchangeType={modalState.exchangeType}
        {...(modalState.editAccount && { editAccount: modalState.editAccount })}
      />

      {/* New Wizard (For adding) */}
      <ExchangeConnectionWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  )
}

// =============================================================================
// Placeholder Sections (Unchanged)
// =============================================================================

function NotificationSettingsSection() {
  const [settings, setSettings] = React.useState({
    tradeNotifications: true,
    priceAlerts: true,
    strategyAlerts: true,
    systemNotifications: true,
    emailNotifications: false,
    pushNotifications: true,
  })

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const notificationOptions = [
    { key: 'tradeNotifications' as const, label: '交易通知', description: '订单执行、成交确认等交易相关通知' },
    { key: 'priceAlerts' as const, label: '价格提醒', description: '价格达到设定目标时提醒' },
    { key: 'strategyAlerts' as const, label: '策略提醒', description: '策略启动、停止、异常等状态变化' },
    { key: 'systemNotifications' as const, label: '系统通知', description: '系统更新、维护等重要通知' },
  ]

  const channelOptions = [
    { key: 'pushNotifications' as const, label: '推送通知', description: '浏览器推送通知' },
    { key: 'emailNotifications' as const, label: '邮件通知', description: '重要事件通过邮件通知' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">通知设置</h3>
        <p className="text-sm text-muted-foreground">管理您的通知偏好</p>
      </div>

      {/* 通知类型 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知类型</CardTitle>
          <CardDescription>选择您想要接收的通知类型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map(option => (
            <div key={option.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <button
                onClick={() => { toggleSetting(option.key); }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[option.key] ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 通知渠道 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知渠道</CardTitle>
          <CardDescription>选择接收通知的方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channelOptions.map(option => (
            <div key={option.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <button
                onClick={() => { toggleSetting(option.key); }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[option.key] ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SecuritySettingsSection() {
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)
  const [sessionTimeout, setSessionTimeout] = React.useState('30')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">安全设置</h3>
        <p className="text-sm text-muted-foreground">管理账户安全选项</p>
      </div>

      {/* 两步验证 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            两步验证
          </CardTitle>
          <CardDescription>增加额外的安全层保护您的账户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">启用两步验证</p>
              <p className="text-xs text-muted-foreground">
                {twoFactorEnabled ? '已启用 - 使用验证器应用' : '建议启用以提高账户安全性'}
              </p>
            </div>
            <button
              onClick={() => { setTwoFactorEnabled(!twoFactorEnabled); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                twoFactorEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 会话设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">会话设置</CardTitle>
          <CardDescription>管理登录会话和超时设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">自动登出时间</p>
              <p className="text-xs text-muted-foreground">无操作后自动登出</p>
            </div>
            <select
              value={sessionTimeout}
              onChange={(e) => { setSessionTimeout(e.target.value); }}
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="15">15 分钟</option>
              <option value="30">30 分钟</option>
              <option value="60">1 小时</option>
              <option value="never">永不</option>
            </select>
          </div>
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full">
              登出所有其他设备
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API 密钥管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API 密钥</CardTitle>
          <CardDescription>管理您的 API 访问密钥</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              您还没有创建任何 API 密钥
            </p>
            <Button variant="outline" size="sm">
              创建 API 密钥
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileSettingsSection() {
  const [profile, setProfile] = React.useState({
    displayName: 'Trader',
    email: 'trader@example.com',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">个人资料</h3>
        <p className="text-sm text-muted-foreground">管理您的个人信息</p>
      </div>

      {/* 头像和基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 头像 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <Button variant="outline" size="sm">
                更换头像
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                支持 JPG、PNG，最大 2MB
              </p>
            </div>
          </div>

          {/* 显示名称 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">显示名称</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => { setProfile({ ...profile, displayName: e.target.value }); }}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* 邮箱 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">邮箱地址</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => { setProfile({ ...profile, email: e.target.value }); }}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* 区域设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">区域设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">时区</p>
              <p className="text-xs text-muted-foreground">用于显示时间和图表</p>
            </div>
            <select
              value={profile.timezone}
              onChange={(e) => { setProfile({ ...profile, timezone: e.target.value }); }}
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
              <option value="Asia/Tokyo">东京时间 (UTC+9)</option>
              <option value="America/New_York">美东时间 (UTC-5)</option>
              <option value="Europe/London">伦敦时间 (UTC+0)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">语言</p>
              <p className="text-xs text-muted-foreground">界面显示语言</p>
            </div>
            <select
              value={profile.language}
              onChange={(e) => { setProfile({ ...profile, language: e.target.value }); }}
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button>保存更改</Button>
      </div>
    </div>
  )
}

function AppearanceSettingsSection() {
  const [theme, setTheme] = React.useState<'dark' | 'light' | 'system'>('dark')
  const [chartStyle, setChartStyle] = React.useState('candle')
  const [compactMode, setCompactMode] = React.useState(false)
  const { completed: onboardingCompleted, skipped: onboardingSkipped, resetOnboarding } = useOnboardingStore()

  const handleResetOnboarding = () => {
    resetOnboarding()
    notify('success', '引导已重置', {
      description: '刷新页面后将重新显示新手引导',
      source: 'AppearanceSettings',
    })
  }

  const themeOptions = [
    { value: 'dark', label: '深色模式', icon: '🌙' },
    { value: 'light', label: '浅色模式', icon: '☀️' },
    { value: 'system', label: '跟随系统', icon: '💻' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">外观设置</h3>
        <p className="text-sm text-muted-foreground">自定义应用外观</p>
      </div>

      {/* 主题选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            主题
          </CardTitle>
          <CardDescription>选择您喜欢的界面主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => { setTheme(option.value as typeof theme); }}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  theme === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>
                <p className="text-sm font-medium mt-2">{option.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 图表设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">图表样式</CardTitle>
          <CardDescription>设置图表显示偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">K线类型</p>
              <p className="text-xs text-muted-foreground">选择默认的K线显示样式</p>
            </div>
            <select
              value={chartStyle}
              onChange={(e) => { setChartStyle(e.target.value); }}
              className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="candle">蜡烛图</option>
              <option value="bar">美国线</option>
              <option value="line">折线图</option>
              <option value="area">面积图</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 布局设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">布局</CardTitle>
          <CardDescription>调整界面布局偏好</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">紧凑模式</p>
              <p className="text-xs text-muted-foreground">减少间距，显示更多内容</p>
            </div>
            <button
              onClick={() => { setCompactMode(!compactMode); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                compactMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  compactMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 新手引导 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            新手引导
          </CardTitle>
          <CardDescription>管理新手引导设置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">引导状态</p>
              <p className="text-xs text-muted-foreground">
                {onboardingCompleted
                  ? '已完成引导流程'
                  : onboardingSkipped
                    ? '已跳过引导流程'
                    : '尚未完成引导'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOnboarding}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重新开始引导
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 颜色预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">颜色预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="w-full h-12 rounded-md bg-green-500 mb-2" />
              <p className="text-xs text-muted-foreground">涨</p>
            </div>
            <div className="text-center">
              <div className="w-full h-12 rounded-md bg-red-500 mb-2" />
              <p className="text-xs text-muted-foreground">跌</p>
            </div>
            <div className="text-center">
              <div className="w-full h-12 rounded-md bg-primary mb-2" />
              <p className="text-xs text-muted-foreground">主色</p>
            </div>
            <div className="text-center">
              <div className="w-full h-12 rounded-md bg-muted mb-2" />
              <p className="text-xs text-muted-foreground">背景</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Settings Page
// =============================================================================

// 有效的 tab 值
const VALID_TABS = ['exchanges', 'ai', 'notifications', 'security', 'profile', 'appearance']

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  // 从 URL 参数获取初始 tab，如果无效则默认为 exchanges
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'exchanges'
  const [activeTab, setActiveTab] = useState(initialTab)

  // 当 URL 参数变化时更新 activeTab
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="exchanges" className="gap-1.5 text-xs px-2">
              <Link2 className="h-4 w-4 shrink-0" />
              <span>交易所</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs px-2">
              <Brain className="h-4 w-4 shrink-0" />
              <span>AI</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs px-2">
              <Bell className="h-4 w-4 shrink-0" />
              <span>通知</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs px-2">
              <Shield className="h-4 w-4 shrink-0" />
              <span>安全</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5 text-xs px-2">
              <User className="h-4 w-4 shrink-0" />
              <span>资料</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs px-2">
              <Palette className="h-4 w-4 shrink-0" />
              <span>外观</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exchanges">
            <ExchangeSettingsSection />
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardContent className="p-0">
                <AIConfigPanel className="min-h-[500px]" />
              </CardContent>
            </Card>
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
