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
import { MetaMaskIcon, CoinbaseIcon, WalletConnectIcon } from '@/components/icons/WalletIcons'

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
  const [autoSignAttempted, setAutoSignAttempted] = useState(false)

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
      const { message } = await apiClient.getNonce(address)
      setStep('verifying')
      const signature = await signMessageAsync({ message })
      const response = await apiClient.walletLogin(address, signature)
      login(response.user, response.tokens.accessToken, response.tokens.refreshToken)
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as Error
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

  const handleDisconnect = () => {
    disconnect()
    setStep('connect')
    setError('')
    setAutoSignAttempted(false)
  }

  return (
    <Card className="border-[hsl(var(--rb-cyan))]/30 shadow-2xl bg-black/40 backdrop-blur-xl w-full max-w-md relative overflow-hidden">
      {/* Decorative localized glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--rb-cyan))] to-transparent opacity-50" />

      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[hsl(var(--rb-cyan))]/10 flex items-center justify-center mb-2 animate-pulse">
          <svg className="w-6 h-6 text-[hsl(var(--rb-cyan))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">IDENTITY UPLINK</CardTitle>
        <p className="text-xs text-[hsl(var(--rb-cyan))]/70 font-mono tracking-widest uppercase">
          Secure Terminal Access
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-[hsl(var(--rb-red))] bg-[hsl(var(--rb-red))]/10 border border-[hsl(var(--rb-red))]/20 rounded-md text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-6 py-2">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button
                    onClick={openConnectModal}
                    size="lg"
                    className="w-full relative group overflow-hidden bg-[hsl(var(--rb-cyan))]/10 hover:bg-[hsl(var(--rb-cyan))]/20 text-[hsl(var(--rb-cyan))] border border-[hsl(var(--rb-cyan))]/50 transition-all duration-300"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 font-mono">
                      <WalletIcon className="w-4 h-4" />
                      INITIALIZE CONNECTION
                    </span>
                    <div className="absolute inset-0 bg-[hsl(var(--rb-cyan))] opacity-0 group-hover:opacity-10 transition-opacity" />
                  </Button>
                )}
              </ConnectButton.Custom>

              <div className="grid grid-cols-3 gap-4 w-full px-4 pt-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Replaced generic text with Icon placeholders for visual impact */}
                <div className="flex justify-center"><MetaMaskIcon className="w-8 h-8" /></div>
                <div className="flex justify-center"><CoinbaseIcon className="w-8 h-8" /></div>
                <div className="flex justify-center"><WalletConnectIcon className="w-8 h-8" /></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border border-[hsl(var(--rb-cyan))]/30 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-[hsl(var(--rb-cyan))]/50 border-dashed animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--rb-cyan))]/20 flex items-center justify-center overflow-hidden">
                    {/* Placeholder for Canvas Sigil */}
                    <span className="font-mono text-xs text-[hsl(var(--rb-cyan))]">{address?.slice(0, 4)}</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center gap-2 text-[hsl(var(--rb-cyan))]">
                  <LoadingSpinner />
                  <span className="text-xs font-mono animate-pulse">
                    {step === 'sign' ? 'AWAITING SIGNATURE...' : 'VERIFYING CREDENTIALS...'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <Button onClick={handleSignIn} size="lg" className="w-full bg-[hsl(var(--rb-cyan))] text-black hover:bg-[hsl(var(--rb-cyan))]/90 font-bold">
                    ESTABLISH LINK
                  </Button>
                  <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                    TERMINATE
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[hsl(var(--rb-cyan))]/10 text-center">
          <p className="text-[10px] text-muted-foreground font-mono">
            ENCRYPTED CONNECTION • SECURE CHANNEL • T0-L1
          </p>
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

