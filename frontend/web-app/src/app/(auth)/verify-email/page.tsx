'use client'

import { ArrowRight, Mail } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <Mail className="h-8 w-8" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold tracking-tight">请验证您的邮箱</h2>
      
      <p className="text-muted-foreground">
        我们已向您的邮箱发送了验证链接。<br />
        请检查您的收件箱（以及垃圾邮件文件夹）并点击链接完成注册。
      </p>

      <div className="pt-4 space-y-4">
        <Link href="/login">
          <Button variant="outline" className="w-full">
            返回登录
          </Button>
        </Link>
        
        <p className="text-sm text-muted-foreground">
          没收到邮件？{' '}
          <button className="text-primary hover:underline font-medium">
            重新发送
          </button>
        </p>
      </div>
      
      <div className="pt-4 border-t border-border mt-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
          返回首页 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

