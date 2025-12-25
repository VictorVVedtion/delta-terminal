# Delta Terminal 前端项目设置指南

## 使用 Next.js 15 + TypeScript + TailwindCSS

### 快速初始化

```bash
# 进入项目目录
cd "/Users/victor/delta terminal"

# 创建前端目录结构
mkdir -p frontend/web-app

# 初始化 Next.js 15 项目
cd frontend/web-app
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbo

# 安装额外的依赖
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install zustand immer
npm install recharts react-chartjs-2 chart.js
npm install axios
npm install clsx tailwind-merge
npm install lucide-react
npm install react-hook-form zod @hookform/resolvers
npm install date-fns
npm install framer-motion

# 安装 shadcn/ui
npx shadcn@latest init -d

# 安装开发依赖
npm install -D @types/node
npm install -D prettier eslint-config-prettier
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 推荐的项目结构

```
frontend/web-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面组
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/        # 主应用页面组
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── strategies/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── trading/
│   │   │   │   └── page.tsx
│   │   │   ├── backtest/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                # API Routes (如需要)
│   │   │   └── webhooks/
│   │   ├── layout.tsx           # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── error.tsx           # 错误页
│   │   ├── loading.tsx         # 加载页
│   │   └── globals.css         # 全局样式
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── chat/               # AI 对话组件
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── InputArea.tsx
│   │   │   └── SuggestedActions.tsx
│   │   ├── strategy/           # 策略相关组件
│   │   │   ├── StrategyCard.tsx
│   │   │   ├── StrategyBuilder.tsx
│   │   │   ├── ParameterPanel.tsx
│   │   │   └── BacktestResults.tsx
│   │   ├── trading/            # 交易相关组件
│   │   │   ├── OrderBook.tsx
│   │   │   ├── TradingChart.tsx
│   │   │   ├── PositionPanel.tsx
│   │   │   └── TradeHistory.tsx
│   │   ├── layout/             # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   └── shared/             # 共享组件
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Toast.tsx
│   ├── lib/                    # 库函数
│   │   ├── api/                # API 客户端
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── strategies.ts
│   │   │   └── trading.ts
│   │   ├── hooks/              # 自定义 Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useStrategy.ts
│   │   │   └── useMarketData.ts
│   │   ├── stores/             # Zustand 状态管理
│   │   │   ├── authStore.ts
│   │   │   ├── strategyStore.ts
│   │   │   ├── tradingStore.ts
│   │   │   └── uiStore.ts
│   │   ├── utils/              # 工具函数
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   └── types/              # TypeScript 类型定义
│   │       ├── index.ts
│   │       ├── strategy.ts
│   │       ├── trading.ts
│   │       └── api.ts
│   └── styles/                 # 额外样式
│       └── components.css
├── public/                     # 静态资源
│   ├── images/
│   └── icons/
├── .env.local                  # 本地环境变量
├── .env.example               # 环境变量示例
├── next.config.mjs            # Next.js 配置
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置
├── package.json
└── README.md
```

### Next.js 15 配置文件

#### next.config.mjs
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 React 19 RC
  experimental: {
    // Turbopack 在 Next.js 15 中默认启用
    reactCompiler: true,
    ppr: true, // Partial Prerendering
    optimizeCss: true,
  },

  images: {
    domains: ['api.deltaterminal.com'],
  },

  // API 代理（开发环境）
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },

  // 安全头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 交易相关颜色
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

### 环境变量配置 (.env.example)

```env
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# 第三方服务
NEXT_PUBLIC_CLAUDE_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_ANALYTICS_ID=

# 功能开关
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### VSCode 配置 (.vscode/settings.json)

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 立即开始

1. **初始化前端项目**
   ```bash
   cd "/Users/victor/delta terminal"
   mkdir -p frontend/web-app && cd frontend/web-app
   npx create-next-app@latest . --typescript --tailwind --app --turbo
   ```

2. **安装 shadcn/ui 组件库**
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button card dialog form input
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

访问 http://localhost:3000 查看应用

## Next.js 15 新特性使用

### 1. Turbopack (默认启用)
开发环境自动使用 Turbopack，提供更快的构建速度。

### 2. Partial Prerendering (PPR)
```tsx
// app/strategies/page.tsx
export const experimental_ppr = true;

export default async function StrategiesPage() {
  // 静态外壳
  return (
    <div>
      <h1>我的策略</h1>
      <Suspense fallback={<StrategyListSkeleton />}>
        <StrategyList /> {/* 动态内容 */}
      </Suspense>
    </div>
  );
}
```

### 3. Server Actions
```tsx
// app/actions/strategy.ts
'use server'

export async function createStrategy(formData: FormData) {
  const name = formData.get('name');
  // 直接在服务器端处理
  const result = await db.strategy.create({
    data: { name }
  });
  revalidatePath('/strategies');
  return result;
}
```

## 核心组件示例

### AI 对话界面组件
```tsx
// components/chat/ChatInterface.tsx
'use client';

import { useState } from 'react';
import { useStrategyStore } from '@/lib/stores/strategyStore';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useStrategyStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你的交易策略..."
          className="w-full p-3 rounded-lg border"
        />
      </form>
    </div>
  );
}
```

## 下一步开发计划

1. **核心页面开发顺序**
   - 登录/注册页面
   - Dashboard 主页
   - AI 对话创建策略页面
   - 策略列表与详情页
   - 实时交易监控页

2. **关键功能实现**
   - WebSocket 实时数据连接
   - AI 对话状态管理
   - 图表可视化组件
   - 策略参数动态表单

3. **性能优化**
   - 使用 React 19 的 Suspense
   - 实现流式 SSR
   - 图表数据虚拟化
   - 代码分割优化