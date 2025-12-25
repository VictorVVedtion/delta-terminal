'use client'

/**
 * 登录页面 - 钱包连接版本
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // wagmi hooks
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  // 状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'connect' | 'sign' | 'verifying'>('connect')
  const [autoSignAttempted, setAutoSignAttempted] = useState(false) // 防止无限重试

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  // 钱包签名登录流程
  const handleSignIn = useCallback(async () => {
    if (!address) return

    setError('')
    setLoading(true)
    setStep('sign')

    try {
      // 1. 获取 Nonce
      const { message } = await apiClient.getNonce(address)

      // 2. 请求签名
      setStep('verifying')
      const signature = await signMessageAsync({ message })

      // 3. 验证签名并登录
      const response = await apiClient.walletLogin(address, signature)

      // 4. 保存认证状态
      login(response.user, response.tokens.accessToken, response.tokens.refreshToken)

      // 5. 跳转到仪表盘
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as Error
      // 检查是否是用户取消签名
      if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        setError('签名已取消')
      } else {
        setError(error.message || '登录失败，请重试')
      }
      setStep('connect')
    } finally {
      setLoading(false)
    }
  }, [address, signMessageAsync, login, router])

  // 当钱包连接后自动触发签名（仅一次）
  useEffect(() => {
    if (isConnected && address && !loading && step === 'connect' && !isAuthenticated && !autoSignAttempted) {
      setAutoSignAttempted(true)
      handleSignIn()
    }
  }, [isConnected, address, loading, step, isAuthenticated, autoSignAttempted, handleSignIn])

  // 断开连接
  const handleDisconnect = () => {
    disconnect()
    setStep('connect')
    setError('')
    setAutoSignAttempted(false) // 重置自动签名标志
  }

  return (
    <Card className="border-border/50 shadow-xl bg-card/95 backdrop-blur w-full max-w-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl text-center">欢迎来到 Delta Terminal</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          连接钱包开始交易
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className={`flex items-center gap-1.5 ${step === 'connect' ? 'text-primary' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'connect' ? 'bg-primary text-primary-foreground' :
              isConnected ? 'bg-green-500/20 text-green-500' : 'bg-muted'
            }`}>
              {isConnected ? '✓' : '1'}
            </div>
            <span>连接钱包</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-1.5 ${step === 'sign' || step === 'verifying' ? 'text-primary' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'sign' || step === 'verifying' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span>签名验证</span>
          </div>
        </div>

        {/* 钱包连接/签名区域 */}
        <div className="flex flex-col items-center gap-4 py-4">
          {!isConnected ? (
            // 未连接：显示连接按钮
            <div className="flex flex-col items-center gap-3">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button
                    onClick={openConnectModal}
                    size="lg"
                    className="w-full min-w-[200px]"
                  >
                    <WalletIcon className="mr-2 h-5 w-5" />
                    连接钱包
                  </Button>
                )}
              </ConnectButton.Custom>
              <p className="text-xs text-muted-foreground text-center">
                支持 MetaMask, WalletConnect, Coinbase Wallet 等
              </p>
            </div>
          ) : (
            // 已连接：显示地址和操作
            <div className="flex flex-col items-center gap-4 w-full">
              {/* 已连接的钱包地址 */}
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg w-full justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>

              {loading ? (
                // 加载状态
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-primary">
                    <LoadingSpinner />
                    <span>
                      {step === 'sign' ? '请在钱包中签名...' : '验证中...'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step === 'sign'
                      ? '此签名不会发起任何交易或消耗 Gas'
                      : '正在验证您的身份'
                    }
                  </p>
                </div>
              ) : (
                // 操作按钮
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    onClick={handleSignIn}
                    size="lg"
                    className="w-full"
                  >
                    签名登录
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                  >
                    更换钱包
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 安全提示 */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              签名验证仅用于证明钱包所有权，不会发起任何链上交易。
              您的资产始终由您自己掌控。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading Spinner 组件
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// 钱包图标
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

// 盾牌图标
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
