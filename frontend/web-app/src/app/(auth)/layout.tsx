/**
 * 认证页面布局
 * 用于登录、注册等无需导航栏的页面
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* 主要内容 */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Delta Terminal
          </h1>
          <p className="text-muted-foreground mt-2">AI 驱动的智能交易终端</p>
        </div>

        {children}
      </div>
    </div>
  )
}
