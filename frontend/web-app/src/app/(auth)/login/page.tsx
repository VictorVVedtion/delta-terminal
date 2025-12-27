'use client'

import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // 模拟 API 调用
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟验证
      if (formData.email === 'error@example.com') {
        throw new Error('邮箱或密码错误')
      }

      // 登录成功
      login(
        {
          id: 'user_123',
          email: formData.email,
          displayName: formData.email.split('@')[0] ?? formData.email,
          role: 'user',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`,
        },
        'mock_access_token',
        'mock_refresh_token'
      )

      toast.success('欢迎回来！')
      router.push('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">登录账户</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          还没有账户？
          <Link href="/register" className="font-medium text-primary hover:text-primary/90 ml-1">
            立即注册
          </Link>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">邮箱地址</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">密码</Label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/90">
              忘记密码？
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          登录
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            或通过以下方式继续
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" disabled={isLoading} onClick={() => toast.info('演示环境暂不支持 GitHub 登录')}>
          GitHub
        </Button>
        <Button variant="outline" disabled={isLoading} onClick={() => toast.info('演示环境暂不支持 Google 登录')}>
          Google
        </Button>
      </div>
      
      <div className="text-center pt-2">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          返回首页
        </Link>
      </div>
    </div>
  )
}

