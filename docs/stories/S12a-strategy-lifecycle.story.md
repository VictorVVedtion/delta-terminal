# Story S12a: 策略删除与归档

## Status

**Draft**

---

## Metadata

| 属性 | 值 |
|------|-----|
| **Epic** | Epic 3: 策略创建与回测 |
| **Feature** | Feature 3.3: 策略生命周期管理 |
| **Priority** | P0 (MVP 阻塞) |
| **Estimate** | 5 Story Points |
| **PRD Reference** | US-3.3.1 策略删除, US-3.3.2 策略归档 |
| **Dependencies** | 策略列表页、策略详情页已实现 |

---

## Story

### US-3.3.1: 策略删除

**As a** 用户,
**I want** 删除不再需要的策略,
**so that** 我可以保持策略列表整洁，避免混淆。

### US-3.3.2: 策略归档

**As a** 长期用户,
**I want** 归档暂时不用但不想删除的策略,
**so that** 我可以保持活跃策略列表简洁，同时保留历史策略供日后参考。

---

## Acceptance Criteria

### AC-1: 策略删除入口

```gherkin
Given 用户在策略列表页或策略详情页
When 用户点击策略操作菜单
Then 应该显示"删除"选项
And 删除选项应使用警告色（红色）标识
```

### AC-2: 删除确认对话框

```gherkin
Given 用户点击了"删除"选项
When 系统显示确认对话框
Then 对话框应包含策略名称
And 对话框应说明删除后的影响（移入回收站，保留30天）
And 对话框应提供"取消"和"确认删除"按钮
And "确认删除"按钮应使用警告色
```

### AC-3: 运行中策略删除保护

```gherkin
Given 策略当前状态为"运行中"（live 或 paper）
When 用户尝试删除该策略
Then 系统应阻止删除操作
And 显示提示"运行中的策略不能删除，请先停止策略"
And 提供"停止策略"快捷操作按钮
```

### AC-4: 软删除机制

```gherkin
Given 用户确认删除一个已停止的策略
When 删除操作执行成功
Then 策略应从主列表中移除
And 策略应移入"回收站"
And 策略应保留30天自动清理时间戳
And 策略关联的交易历史记录应保留（用于审计）
And 显示成功提示"策略已移入回收站，30天内可恢复"
```

### AC-5: 回收站功能

```gherkin
Given 用户进入回收站页面
When 页面加载完成
Then 应显示所有已删除的策略列表
And 每个策略应显示删除时间和剩余保留天数
And 每个策略应提供"恢复"和"永久删除"操作
```

### AC-6: 策略恢复

```gherkin
Given 用户在回收站中选择一个策略
When 用户点击"恢复"按钮
Then 策略应从回收站移出
And 策略应恢复到主列表
And 策略状态应设为"已停止"
And 显示成功提示"策略已恢复"
```

### AC-7: 永久删除

```gherkin
Given 用户在回收站中选择一个策略
When 用户点击"永久删除"按钮
Then 系统应显示二次确认对话框
And 对话框应警告"此操作不可撤销"
When 用户确认永久删除
Then 策略数据应被永久删除
And 交易历史记录应保留（标记为已删除策略）
```

### AC-8: 自动清理

```gherkin
Given 策略在回收站中已超过30天
When 系统执行定时清理任务
Then 该策略应被自动永久删除
And 应记录清理日志
```

### AC-9: 策略归档操作

```gherkin
Given 用户在策略列表页或策略详情页
When 用户点击策略操作菜单中的"归档"选项
Then 策略应从主列表中隐藏
And 显示成功提示"策略已归档"
And 策略状态应标记为"已归档"
```

### AC-10: 归档策略列表

```gherkin
Given 用户切换到"已归档"标签页
When 页面加载完成
Then 应显示所有已归档的策略
And 每个策略应显示归档时间
And 每个策略应提供"取消归档"操作
```

### AC-11: 取消归档

```gherkin
Given 用户在已归档列表中选择一个策略
When 用户点击"取消归档"按钮
Then 策略应恢复到主列表
And 策略状态应恢复为归档前的状态
And 显示成功提示"策略已恢复到主列表"
```

### AC-12: 归档策略不计入限制

```gherkin
Given 用户账户有策略数量限制（如免费版最多5个活跃策略）
When 策略被归档后
Then 该策略不应计入活跃策略数量
And 用户可以创建新的活跃策略
```

---

## Tasks / Subtasks

### Task 1: 策略生命周期类型定义 (AC: 4, 9)

- [ ] 在 `shared/common-types/src/strategy.ts` 或 `frontend/web-app/src/types/` 中扩展策略类型
- [ ] 添加 `deletedAt?: Date` 字段（软删除时间戳）
- [ ] 添加 `archivedAt?: Date` 字段（归档时间戳）
- [ ] 添加 `lifecycleStatus: 'active' | 'archived' | 'deleted'` 字段
- [ ] 创建 `StrategyLifecycleAction` 类型：`'delete' | 'archive' | 'restore' | 'permanent-delete' | 'unarchive'`

### Task 2: 删除确认对话框组件 (AC: 2, 3)

- [ ] 在 `frontend/web-app/src/components/strategy/` 创建 `DeleteConfirmDialog.tsx`
- [ ] 实现对话框 UI，复用 shadcn Dialog 组件
- [ ] 显示策略名称、删除影响说明
- [ ] 运行中策略显示阻止信息和"停止策略"按钮
- [ ] 实现"取消"和"确认删除"按钮

### Task 3: 回收站页面组件 (AC: 5, 6, 7)

- [ ] 在 `frontend/web-app/src/components/strategy/` 创建 `RecycleBinPage.tsx`
- [ ] 实现已删除策略列表展示
- [ ] 显示删除时间、剩余保留天数倒计时
- [ ] 实现"恢复"操作及成功反馈
- [ ] 实现"永久删除"操作及二次确认
- [ ] 空状态处理（回收站为空时的友好提示）

### Task 4: 归档策略列表组件 (AC: 10, 11)

- [ ] 在策略列表页添加"已归档"标签页
- [ ] 创建 `ArchivedStrategyList.tsx` 组件
- [ ] 显示归档时间
- [ ] 实现"取消归档"操作

### Task 5: 策略列表增强 (AC: 1, 9)

- [ ] 在 `StrategyList.tsx` 或 `StrategyCard.tsx` 添加操作菜单
- [ ] 菜单项包含：编辑、归档、删除
- [ ] 删除选项使用红色警告样式
- [ ] 根据策略状态动态显示/禁用菜单项

### Task 6: 策略生命周期 Store (AC: 4, 6, 9, 11)

- [ ] 在 `frontend/web-app/src/store/` 创建 `strategyLifecycle.ts`
- [ ] 实现 `softDelete(strategyId)` 方法
- [ ] 实现 `restore(strategyId)` 方法
- [ ] 实现 `permanentDelete(strategyId)` 方法
- [ ] 实现 `archive(strategyId)` 方法
- [ ] 实现 `unarchive(strategyId)` 方法
- [ ] 实现 `getDeletedStrategies()` 方法
- [ ] 实现 `getArchivedStrategies()` 方法

### Task 7: API 路由实现 (AC: 4, 6, 7, 8, 9, 11)

- [ ] 在 `frontend/web-app/src/app/api/strategy/` 创建生命周期相关路由
- [ ] `DELETE /api/strategy/[id]` - 软删除策略
- [ ] `POST /api/strategy/[id]/restore` - 恢复策略
- [ ] `DELETE /api/strategy/[id]/permanent` - 永久删除
- [ ] `POST /api/strategy/[id]/archive` - 归档策略
- [ ] `POST /api/strategy/[id]/unarchive` - 取消归档
- [ ] `GET /api/strategy/recyclebin` - 获取回收站列表
- [ ] `GET /api/strategy/archived` - 获取归档列表

### Task 8: 数据库迁移 (AC: 4, 8, 9)

- [ ] 创建 Supabase 迁移文件 `supabase/migrations/YYYYMMDD_strategy_lifecycle.sql`
- [ ] 添加 `deleted_at` 列到策略表
- [ ] 添加 `archived_at` 列到策略表
- [ ] 创建定时清理函数 `cleanup_deleted_strategies()`
- [ ] 配置 pg_cron 每日执行清理任务

### Task 9: 自动清理调度 (AC: 8)

- [ ] 在 `supabase/functions/` 创建 `strategy-cleanup` Edge Function
- [ ] 实现30天过期策略查询和删除逻辑
- [ ] 添加清理日志记录
- [ ] 配置定时触发（每日 UTC 00:00）

### Task 10: 单元测试

- [ ] 创建 `DeleteConfirmDialog.test.tsx`
- [ ] 创建 `RecycleBinPage.test.tsx`
- [ ] 创建 `strategyLifecycle.test.ts` (Store 测试)
- [ ] 测试运行中策略删除阻止逻辑
- [ ] 测试恢复和永久删除流程

---

## Dev Notes

### 现有代码结构参考

**策略相关组件位置**:
```
frontend/web-app/src/
├── components/
│   └── strategy/
│       ├── ChatInterface.tsx      # 策略对话界面
│       └── ... (需新增删除/归档组件)
├── store/
│   └── agent.ts                   # 现有 Agent Store
├── types/
│   └── strategy-lifecycle.ts      # 需新建
└── app/api/
    └── strategy/                  # 需新建 API 路由
```

**AgentStore 现有状态** [Source: store/agent.ts]:
```typescript
export type AgentStatus = 'live' | 'paper' | 'shadow' | 'paused' | 'stopped'
```

需要扩展为支持 `archived` 和 `deleted` 状态，或使用独立的 `lifecycleStatus` 字段。

### 删除确认对话框设计

参考 PRD 中的 UI 设计：
```
┌─────────────────────────────────────────────────┐
│  ⚠️ 确认删除策略                                 │
│                                                  │
│  您确定要删除策略 "BTC 40000 买入" 吗？           │
│                                                  │
│  • 策略将移入回收站，保留 30 天                   │
│  • 30 天内可在回收站恢复                         │
│  • 相关交易记录将保留                            │
│                                                  │
│  ┌────────────┐  ┌────────────┐                 │
│  │    取消    │  │  确认删除  │                 │
│  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────┘
```

### 策略生命周期类型定义

```typescript
// frontend/web-app/src/types/strategy-lifecycle.ts

export type LifecycleStatus = 'active' | 'archived' | 'deleted';

export interface StrategyLifecycle {
  strategyId: string;
  status: LifecycleStatus;
  deletedAt?: Date;
  archivedAt?: Date;
  // 永久删除前的倒计时（天数）
  daysUntilPermanentDeletion?: number;
}

export interface DeleteConfirmDialogProps {
  strategy: {
    id: string;
    name: string;
    status: AgentStatus;  // 检查是否运行中
  };
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export interface RecycleBinItem {
  strategy: Strategy;
  deletedAt: Date;
  daysRemaining: number;  // 剩余保留天数
}
```

### 数据库 Schema 扩展

```sql
-- supabase/migrations/YYYYMMDD_strategy_lifecycle.sql

ALTER TABLE strategies
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- 创建索引优化查询
CREATE INDEX idx_strategies_deleted_at ON strategies(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_strategies_archived_at ON strategies(archived_at) WHERE archived_at IS NOT NULL;

-- 创建自动清理函数
CREATE OR REPLACE FUNCTION cleanup_deleted_strategies()
RETURNS void AS $$
BEGIN
  DELETE FROM strategies
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 注意：交易记录表需要保留 strategy_id 外键，但不级联删除
-- 已删除策略的交易记录应标记 strategy_deleted = true
```

### API 路由实现示例

```typescript
// frontend/web-app/src/app/api/strategy/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// 软删除策略
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // 检查策略状态
  const { data: strategy } = await supabase
    .from('strategies')
    .select('status')
    .eq('id', params.id)
    .single();

  if (strategy?.status === 'live' || strategy?.status === 'paper') {
    return NextResponse.json(
      { error: '运行中的策略不能删除，请先停止策略' },
      { status: 400 }
    );
  }

  // 执行软删除
  const { error } = await supabase
    .from('strategies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### RiverBit Design System 颜色使用

| 场景 | 颜色变量 | 用途 |
|------|---------|------|
| 删除按钮 | `--rb-red` (#DD3C41) | 危险操作警告 |
| 归档按钮 | `--rb-yellow` (#E8BD30) | 普通操作 |
| 恢复按钮 | `--rb-green` (#61DD3C) | 正向操作 |
| 永久删除 | `--rb-red` + 二次确认 | 不可逆操作 |

### 依赖组件

- `@/components/ui/dialog` - shadcn Dialog (确认对话框)
- `@/components/ui/button` - Button 组件
- `@/components/ui/dropdown-menu` - 操作菜单
- `@/components/ui/tabs` - 标签页切换
- `lucide-react` 图标: Trash2, Archive, RotateCcw, AlertTriangle

---

## Testing

### 测试文件位置
```
frontend/web-app/src/
├── components/strategy/__tests__/
│   ├── DeleteConfirmDialog.test.tsx
│   └── RecycleBinPage.test.tsx
└── store/__tests__/
    └── strategyLifecycle.test.ts
```

### 测试用例

#### DeleteConfirmDialog 测试

1. **渲染测试**
   - 正确显示策略名称
   - 显示删除影响说明
   - 取消和确认按钮可见

2. **运行中策略保护**
   - status='live' 时显示阻止信息
   - 显示"停止策略"按钮
   - 确认删除按钮禁用

3. **交互测试**
   - 点击取消触发 onClose
   - 点击确认触发 onConfirm
   - 加载状态显示正确

#### RecycleBinPage 测试

1. **列表渲染**
   - 正确显示已删除策略
   - 显示剩余天数倒计时
   - 空状态友好提示

2. **操作测试**
   - 恢复操作调用正确 API
   - 永久删除显示二次确认
   - 成功/失败 toast 提示

#### Store 测试

1. **状态管理**
   - softDelete 正确更新状态
   - restore 正确恢复状态
   - 乐观更新和回滚机制

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-30 | 1.0 | 初始 Story 创建，基于 PRD US-3.3.1/US-3.3.2 | Sarah (PO) |
