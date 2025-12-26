# Epic 005: 通知系统 - Brownfield Enhancement

> 为 Delta Terminal 添加完整的通知系统，包括即时 Toast 和通知中心

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-005 |
| 名称 | 通知系统 (Notification System) |
| 类型 | Brownfield Enhancement |
| 优先级 | P0 (用户体验必需) |
| 预估 Stories | 3 |
| 创建日期 | 2025-12-25 |
| PRD 参考 | Feature 4.3 熔断通知, Feature 5.1 策略状态 |
| 前置依赖 | EPIC-001 ~ EPIC-004 ✅ |

---

## Epic Goal

**为所有关键操作提供即时反馈和历史通知记录，提升用户体验。**

核心功能：
1. **Toast 即时通知** - 操作成功/失败的即时反馈
2. **通知中心** - 历史通知的集中管理
3. **通知集成** - 将通知接入现有组件

---

## 现有系统上下文

### 待通知的组件

| 组件 | 通知场景 | 当前状态 |
|------|---------|---------|
| KillSwitch | 紧急停止执行结果 | 有注释 `// toast.success()` |
| DeployCanvas | 部署成功/失败 | 无通知 |
| BacktestCanvas | 回测完成/失败 | 无通知 |
| MonitorCanvas | 策略状态变化 | 无通知 |
| RiskSettings | 风险验证警告 | 仅显示文本 |

### 缺失组件

| 组件 | 路径 | 功能 | 状态 |
|------|------|------|------|
| Toast | `components/ui/toast.tsx` | 即时通知组件 | ❌ 待创建 |
| Toaster | `components/ui/toaster.tsx` | Toast 容器 | ❌ 待创建 |
| NotificationStore | `store/notification.ts` | 通知状态管理 | ❌ 待创建 |
| NotificationCenter | `components/NotificationCenter.tsx` | 通知中心 UI | ❌ 待创建 |

---

## 功能设计

### Toast 类型

```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  title: string
  description?: string
  type: ToastType
  duration?: number  // 默认 5000ms
  action?: {
    label: string
    onClick: () => void
  }
}
```

### 通知中心设计

```
┌─────────────────────────────────────────────┐
│ 🔔 通知中心                           [全部已读] │
├─────────────────────────────────────────────┤
│                                             │
│ ● 今天                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ ✅ 策略部署成功                    10:32 │ │
│ │    RSI 反弹 已部署到 Paper 模式          │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠️ 风控警告                       09:15 │ │
│ │    网格交易 触发止损 -$245              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ● 昨天                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ ✅ 回测完成                       18:45 │ │
│ │    BTC 突破策略 收益率 +23.5%           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Stories

### Story 5.1: Toast 组件 ✅

**标题**: 创建 Toast 即时通知组件

**描述**:
使用 Sonner 创建即时通知组件。

**验收标准**:
- [x] 安装 Sonner 依赖
- [x] 创建 `lib/toast.ts` 封装
- [x] 支持 success/error/warning/info 四种类型
- [x] 支持自定义持续时间
- [x] 支持带操作按钮的 Toast
- [x] Toast 可堆叠显示
- [x] 集成到 layout.tsx

---

### Story 5.2: NotificationCenter 组件 ✅

**标题**: 创建通知中心组件

**描述**:
创建通知中心用于查看历史通知，并创建 NotificationStore 管理通知状态。

**验收标准**:
- [x] 创建 `store/notification.ts`
- [x] 创建 `components/NotificationCenter.tsx`
- [x] 通知按时间分组 (今天/昨天/更早)
- [x] 支持标记已读/未读
- [x] 支持清空所有通知
- [x] 未读通知数量徽章
- [x] 可展开/收起面板

---

### Story 5.3: 集成通知到现有组件 ✅

**标题**: 将通知系统集成到关键操作

**描述**:
为 KillSwitch、DeployCanvas、BacktestCanvas、MonitorCanvas 添加通知。

**验收标准**:
- [x] KillSwitch 执行后显示通知
- [x] DeployCanvas 部署成功/失败通知
- [x] BacktestCanvas 回测完成通知
- [x] MonitorCanvas 策略状态变化通知
- [x] 所有通知记录到 NotificationStore

---

## 技术方案

### 推荐: 使用 Sonner

Sonner 是一个轻量级的 Toast 库，与 Shadcn/ui 风格兼容。

```bash
pnpm add sonner
```

```typescript
// 使用示例
import { toast } from 'sonner'

toast.success('部署成功', {
  description: 'RSI 反弹 已部署到 Paper 模式',
})

toast.error('部署失败', {
  description: '网络错误，请重试',
  action: {
    label: '重试',
    onClick: () => handleDeploy(),
  },
})
```

### NotificationStore 设计

```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  timestamp: number
  read: boolean
  source?: string  // 来源组件
  actionUrl?: string  // 点击跳转
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}
```

---

## 文件路径

| 文件 | 路径 | 操作 |
|------|------|------|
| Sonner Provider | `app/layout.tsx` | 修改 |
| Toast (可选) | `components/ui/toast.tsx` | 创建 |
| NotificationStore | `store/notification.ts` | 创建 |
| NotificationCenter | `components/NotificationCenter.tsx` | 创建 |
| KillSwitch | `components/KillSwitch.tsx` | 修改 |
| DeployCanvas | `components/canvas/DeployCanvas.tsx` | 修改 |
| BacktestCanvas | `components/canvas/BacktestCanvas.tsx` | 修改 |
| MonitorCanvas | `components/canvas/MonitorCanvas.tsx` | 修改 |

---

## Definition of Done

- [x] 所有 3 个 Stories 完成并通过验收
- [x] Toast 组件功能完整
- [x] NotificationCenter 组件功能完整
- [x] 通知集成到关键操作
- [x] TypeScript 类型检查通过
- [x] 生产构建通过
- [x] 无 P0/P1 级别 Bug

---

**创建时间**: 2025-12-25
**完成时间**: 2025-12-25
**创建者**: YOLO Workflow Autonomous Agent
**来源**: PRD Feature 4.3, Feature 5.1
