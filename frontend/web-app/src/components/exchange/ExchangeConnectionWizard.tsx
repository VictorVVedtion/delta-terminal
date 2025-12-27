'use client'

import {
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Shield,
  ShieldAlert,
  X,
} from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify } from '@/lib/notification'
import { cn } from '@/lib/utils'
import {
  type ExchangeType,
  SUPPORTED_EXCHANGES,
  useExchangeStore,
} from '@/store/exchange'

import { ExchangeIcon, getExchangeLabel } from './ExchangeIcon'

interface ExchangeConnectionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ExchangeConnectionWizard({
  isOpen,
  onClose,
  onSuccess,
}: ExchangeConnectionWizardProps) {
  const { addAccount, testConnection } = useExchangeStore()
  const [step, setStep] = React.useState(1)
  const [selectedExchange, setSelectedExchange] = React.useState<ExchangeType | null>(null)
  
  // Form State
  const [formData, setFormData] = React.useState({
    name: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  })
  const [showSecret, setShowSecret] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [permissionsConfirmed, setPermissionsConfirmed] = React.useState({
    noWithdraw: false,
    ipWhitelist: false,
  })

  // Reset on open
  React.useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedExchange(null)
      setFormData({ name: '', apiKey: '', apiSecret: '', passphrase: '' })
      setPermissionsConfirmed({ noWithdraw: false, ipWhitelist: false })
    }
  }, [isOpen])

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSelectExchange = (exchange: ExchangeType) => {
    setSelectedExchange(exchange)
    setFormData(prev => ({ ...prev, name: `${getExchangeLabel(exchange)}-主账户` }))
    handleNext()
  }

  const handleConnect = async () => {
    if (!selectedExchange) return

    setIsTesting(true)
    
    // Simulate connection test
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const accountId = addAccount({
        exchange: selectedExchange,
        name: formData.name,
        apiKeyFull: formData.apiKey,
        apiSecret: formData.apiSecret,
        ...(formData.passphrase && { passphrase: formData.passphrase }),
        permissions: ['read', 'trade'],
      })

      // Trigger actual test
      await testConnection(accountId)

      notify('success', '交易所连接成功', {
        description: `${formData.name} 已连接`,
        source: 'ExchangeWizard',
      })
      
      onSuccess?.()
      onClose()
    } catch (error) {
      notify('error', '连接失败', {
        description: '请检查 API Key 和网络连接',
        source: 'ExchangeWizard',
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Wizard Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            {/* Step Indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step === i ? "bg-primary text-primary-foreground" :
                    step > i ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {step > i ? <Check className="w-4 h-4" /> : i}
                  </div>
                  {i < 4 && <div className={cn("w-4 h-0.5 mx-1", step > i ? "bg-green-500" : "bg-muted")} />}
                </div>
              ))}
            </div>
            <div>
              <h2 className="font-semibold text-lg">连接交易所</h2>
              <p className="text-sm text-muted-foreground">
                {step === 1 && "选择交易所"}
                {step === 2 && "创建 API Key"}
                {step === 3 && "输入密钥"}
                {step === 4 && "安全确认"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
          
          {/* Step 1: Select Exchange */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {SUPPORTED_EXCHANGES.map(exchange => (
                <button
                  key={exchange.id}
                  onClick={() => handleSelectExchange(exchange.id)}
                  className="flex flex-col items-center justify-center p-6 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all gap-4 group"
                >
                  <ExchangeIcon exchange={exchange.id} size="lg" className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{exchange.name}</span>
                </button>
              ))}
              {/* Mock Option for Demo */}
              <button
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all gap-4 opacity-70"
                onClick={() => notify('info', '敬请期待', { description: '更多交易所即将接入' })}
              >
                <Globe className="w-12 h-12 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">更多...</span>
              </button>
            </div>
          )}

          {/* Step 2: Tutorial */}
          {step === 2 && selectedExchange && (
            <div className="space-y-6">
              <div className="bg-muted/30 p-6 rounded-xl border border-border text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">如何在 {getExchangeLabel(selectedExchange)} 获取 API Key？</h3>
                <p className="text-muted-foreground mb-6">
                  为了保障资金安全，请务必创建一个新的 API Key，并仅开启「读取」和「交易」权限。
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    查看图文教程
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    前往官网创建
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">准备工作检查清单：</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <span className="text-sm">登录您的交易所账户</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                    <span className="text-sm">进入 API 管理页面</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                    <span className="text-sm">创建新密钥，标签建议填写 &quot;Delta Terminal&quot;</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Input Keys */}
          {step === 3 && (
            <div className="space-y-6 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>账户别名</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="给这个账户起个名字"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={formData.apiKey}
                    onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="粘贴您的 API Key"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={formData.apiSecret}
                      onChange={e => setFormData({ ...formData, apiSecret: e.target.value })}
                      placeholder="粘贴您的 API Secret"
                      className="font-mono pr-10"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {/* OKX Passphrase */}
                {selectedExchange === 'okx' && (
                  <div className="space-y-2">
                    <Label>Passphrase</Label>
                    <Input
                      type="password"
                      value={formData.passphrase}
                      onChange={e => setFormData({ ...formData, passphrase: e.target.value })}
                      placeholder="输入 API Passphrase"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Permissions */}
          {step === 4 && (
            <div className="space-y-6 max-w-md mx-auto">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-4">
                <ShieldAlert className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-bold text-yellow-500">最后一步：安全确认</h4>
                  <p className="text-sm text-yellow-500/90">
                    Delta Terminal 采用非对称加密存储您的密钥，但为了绝对安全，我们需要您确认已遵循最小权限原则。
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors",
                    permissionsConfirmed.noWithdraw ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {permissionsConfirmed.noWithdraw && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={permissionsConfirmed.noWithdraw}
                    onChange={e => setPermissionsConfirmed({ ...permissionsConfirmed, noWithdraw: e.target.checked })}
                  />
                  <div>
                    <div className="font-medium">我确认已禁用「提现」权限</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      API Key 仅开启了「读取」和「交易」权限
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors",
                    permissionsConfirmed.ipWhitelist ? "bg-primary border-primary" : "border-muted-foreground"
                  )}>
                    {permissionsConfirmed.ipWhitelist && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={permissionsConfirmed.ipWhitelist}
                    onChange={e => setPermissionsConfirmed({ ...permissionsConfirmed, ipWhitelist: e.target.checked })}
                  />
                  <div>
                    <div className="font-medium">我已设置 IP 白名单 (推荐)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      限制仅特定 IP 可使用此 API (可选)
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex justify-between items-center bg-muted/10">
          <Button variant="ghost" onClick={step === 1 ? onClose : handleBack} disabled={isTesting}>
            {step === 1 ? '取消' : '上一步'}
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext} disabled={step === 1 && !selectedExchange}>
              下一步 <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={!permissionsConfirmed.noWithdraw || isTesting} className="min-w-[120px]">
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              {isTesting ? '连接中...' : '确认并连接'}
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}

