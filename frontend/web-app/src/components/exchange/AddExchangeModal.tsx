'use client'

import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
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
  type ExchangeAccount,
  type ExchangeType,
  type Permission,
  SUPPORTED_EXCHANGES,
  useExchangeStore,
} from '@/store/exchange'

import { ExchangeIcon, getExchangeLabel } from './ExchangeIcon'

// =============================================================================
// Types
// =============================================================================

interface AddExchangeModalProps {
  isOpen: boolean
  onClose: () => void
  exchangeType: ExchangeType
  editAccount?: ExchangeAccount // 编辑模式
}

interface FormData {
  name: string
  apiKey: string
  apiSecret: string
  passphrase: string
}

// =============================================================================
// Component
// =============================================================================

export function AddExchangeModal({
  isOpen,
  onClose,
  exchangeType,
  editAccount,
}: AddExchangeModalProps) {
  const { addAccount, updateAccount, testConnection } = useExchangeStore()

  const exchangeInfo = SUPPORTED_EXCHANGES.find((e) => e.id === exchangeType)
  const isEditMode = !!editAccount

  // Form state
  const [formData, setFormData] = React.useState<FormData>({
    name: editAccount?.name ?? '',
    apiKey: editAccount?.apiKeyFull ?? '',
    apiSecret: editAccount?.apiSecret ?? '',
    passphrase: editAccount?.passphrase ?? '',
  })

  const [showSecret, setShowSecret] = React.useState(false)
  const [isTestingConnection, setIsTestingConnection] = React.useState(false)
  const [testResult, setTestResult] = React.useState<'success' | 'error' | null>(null)
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormData, string>>>({})

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editAccount?.name ?? `${getExchangeLabel(exchangeType)}-主账户`,
        apiKey: editAccount?.apiKeyFull ?? '',
        apiSecret: editAccount?.apiSecret ?? '',
        passphrase: editAccount?.passphrase ?? '',
      })
      setShowSecret(false)
      setTestResult(null)
      setErrors({})
    }
  }, [isOpen, editAccount, exchangeType])

  // Validation
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入账户别名'
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = '请输入 API Key'
    } else if (formData.apiKey.length < 10) {
      newErrors.apiKey = 'API Key 格式不正确'
    }

    if (!formData.apiSecret.trim()) {
      newErrors.apiSecret = '请输入 API Secret'
    } else if (formData.apiSecret.length < 10) {
      newErrors.apiSecret = 'API Secret 格式不正确'
    }

    if (exchangeInfo?.requiresPassphrase && !formData.passphrase.trim()) {
      newErrors.passphrase = '请输入 Passphrase'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Test connection
  const handleTestConnection = async () => {
    if (!validate()) return

    setIsTestingConnection(true)
    setTestResult(null)

    // 模拟测试连接
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 90% 成功率
    const success = Math.random() > 0.1
    setTestResult(success ? 'success' : 'error')
    setIsTestingConnection(false)
  }

  // Save
  const handleSave = () => {
    if (!validate()) return

    const permissions: Permission[] = ['read', 'trade'] // 默认权限

    if (isEditMode && editAccount) {
      updateAccount(editAccount.id, {
        name: formData.name,
        apiKeyFull: formData.apiKey,
        apiSecret: formData.apiSecret,
        ...(formData.passphrase && { passphrase: formData.passphrase }),
        permissions,
      })

      notify('success', '账户已更新', {
        description: `${formData.name} 配置已保存`,
        source: 'ExchangeSettings',
      })
    } else {
      const accountId = addAccount({
        exchange: exchangeType,
        name: formData.name,
        apiKeyFull: formData.apiKey,
        apiSecret: formData.apiSecret,
        ...(formData.passphrase && { passphrase: formData.passphrase }),
        permissions,
      })

      // 自动测试连接
      void testConnection(accountId)

      notify('success', '账户已添加', {
        description: `${formData.name} 正在连接...`,
        source: 'ExchangeSettings',
      })
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <ExchangeIcon exchange={exchangeType} size="lg" />
            <div>
              <h2 className="font-semibold">
                {isEditMode ? '编辑' : '连接'} {getExchangeLabel(exchangeType)} 账户
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? '更新 API 配置' : '输入 API 密钥以连接'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="name">账户别名 *</Label>
            <Input
              id="name"
              placeholder="例如: 币安-主账户"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              placeholder="输入 API Key"
              value={formData.apiKey}
              onChange={(e) => { setFormData({ ...formData, apiKey: e.target.value }); }}
              className={cn('font-mono text-sm', errors.apiKey && 'border-destructive')}
            />
            {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret *</Label>
            <div className="relative">
              <Input
                id="apiSecret"
                type={showSecret ? 'text' : 'password'}
                placeholder="输入 API Secret"
                value={formData.apiSecret}
                onChange={(e) => { setFormData({ ...formData, apiSecret: e.target.value }); }}
                className={cn('font-mono text-sm pr-10', errors.apiSecret && 'border-destructive')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => { setShowSecret(!showSecret); }}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.apiSecret && <p className="text-xs text-destructive">{errors.apiSecret}</p>}
          </div>

          {/* Passphrase (OKX) */}
          {exchangeInfo?.requiresPassphrase && (
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase *</Label>
              <Input
                id="passphrase"
                type="password"
                placeholder="输入 Passphrase"
                value={formData.passphrase}
                onChange={(e) => { setFormData({ ...formData, passphrase: e.target.value }); }}
                className={cn('font-mono text-sm', errors.passphrase && 'border-destructive')}
              />
              {errors.passphrase && (
                <p className="text-xs text-destructive">{errors.passphrase}</p>
              )}
            </div>
          )}

          {/* Security Warning */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-500 mb-1">安全提示</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• 请确保 API Key 只有「只读」和「交易」权限</li>
                  <li>• 请勿开启「提现」权限</li>
                  <li>• 建议绑定 IP 白名单</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Doc Link */}
          {exchangeInfo?.docUrl && (
            <a
              href={exchangeInfo.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              查看如何创建 API Key
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={cn(
                'p-3 rounded-lg flex items-center gap-2',
                testResult === 'success'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-destructive/10 border border-destructive/20'
              )}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-500">连接测试成功!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive">连接失败，请检查 API 配置</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              '测试连接'
            )}
          </Button>
          <Button onClick={handleSave} disabled={isTestingConnection}>
            {isEditMode ? '保存' : '添加账户'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddExchangeModal
