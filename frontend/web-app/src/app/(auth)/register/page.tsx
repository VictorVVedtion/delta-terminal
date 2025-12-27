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

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // 模拟 API 调用
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 模拟注册逻辑
      if (formData.email === 'exist@example.com') {
        throw new Error('该邮箱已被注册')
      }

      // 注册成功并自动登录
      login(
        {
          id: 'user_new_' + Date.now(),
          email: formData.email,
          displayName: formData.name,
          role: 'user',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`,
        },
        'mock_access_token',
        'mock_refresh_token'
      )

      toast.success('账户创建成功！')
      
      // 可以在这里跳转到问卷或邮箱验证
      router.push('/chat?onboarding=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">创建账户</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          已有账户？
          <Link href="/login" className="font-medium text-primary hover:text-primary/90 ml-1">
            直接登录
          </Link>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">显示名称</Label>
          <Input
            id="name"
            placeholder="您的昵称"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isLoading}
          />
        </div>

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
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="至少 8 位字符"
            required
            minLength={8}
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
          注册
        </Button>
      </form>
      
      <p className="px-8 text-center text-xs text-muted-foreground">
        点击注册即表示您同意我们的{' '}
        <Link href="/terms" className="underline hover:text-primary">
          服务条款
        </Link>{' '}
        和{' '}
        <Link href="/privacy" className="underline hover:text-primary">
          隐私政策
        </Link>
        。
      </p>

      <div className="text-center pt-2">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          返回首页
        </Link>
      </div>
    </div>
  )
}

