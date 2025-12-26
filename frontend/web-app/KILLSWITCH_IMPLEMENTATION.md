# Kill Switch 紧急停止组件实现文档

## 概述

根据 PRD FR-A2UI-052 要求，实现了紧急全局停止按钮（Kill Switch），用于在紧急情况下快速停止所有交易活动。

## 实现文件

### 1. 核心组件
- **文件**: `/src/components/KillSwitch.tsx`
- **功能**: 紧急停止按钮及确认对话框
- **特性**:
  - 使用 RiverBit 红色警告色 (`--rb-red`)
  - Shadcn/ui AlertDialog 二次确认机制
  - 加载状态显示
  - 详细的操作列表展示

### 2. UI 组件
- **文件**: `/src/components/ui/alert-dialog.tsx`
- **说明**: 基于 @radix-ui/react-alert-dialog 的确认对话框组件

### 3. API 扩展
- **文件**: `/src/lib/api.ts`
- **新增方法**:
  ```typescript
  // 订单相关
  cancelAllOrders()           // 取消所有挂单
  getActiveOrdersCount()      // 获取活跃订单数

  // 持仓相关
  getPositions()              // 获取所有持仓
  closeAllPositions()         // 平所有持仓
  getOpenPositionsCount()     // 获取开仓数量

  // 日志记录
  logKillSwitchEvent(data)    // 记录 Kill Switch 事件
  ```

### 4. Header 集成
- **文件**: `/src/components/layout/Header.tsx`
- **位置**: 顶部状态栏，实时连接指示器右侧
- **显示**: 桌面端显示"紧急停止"文字，移动端仅显示图标

## 功能流程

```
用户点击 Kill Switch 按钮
    ↓
显示确认对话框（列出将执行的操作）
    ↓
用户确认
    ↓
并行执行以下操作：
  1. 取消所有挂单 (apiClient.cancelAllOrders)
  2. 平所有持仓 (apiClient.closeAllPositions)
  3. 暂停所有运行中的策略 (apiClient.stopStrategy × N)
    ↓
记录操作日志 (apiClient.logKillSwitchEvent)
    ↓
显示完成状态 / 错误提示
```

## 安装步骤

### 1. 安装依赖

```bash
cd /Users/victor/delta\ terminal/frontend/web-app
pnpm install @radix-ui/react-alert-dialog
```

### 2. 验证安装

```bash
# 检查类型定义
pnpm type-check

# 启动开发服务器
pnpm dev
```

### 3. 测试功能

访问 `http://localhost:3000/dashboard`，查看 Header 右侧是否显示紧急停止按钮。

## UI 设计

### 按钮样式
- **颜色**: 红色警告色 (`text-destructive`)
- **图标**: Power (Lucide React)
- **文本**: "紧急停止" (桌面端)
- **变体**: Ghost variant，鼠标悬停时高亮背景

### 确认对话框
- **标题**: "确认紧急停止?"
- **图标**: AlertCircle (红色)
- **内容**:
  - 操作列表（4项）
  - 不可撤销警告
- **按钮**:
  - 取消（outline）
  - 确认执行（红色 destructive）

### 响应式设计
- **桌面端**: 显示完整文字和图标
- **移动端**: 仅显示图标
- **对话框**: 固定宽度 max-w-md，居中显示

## 错误处理

### 1. API 失败
```typescript
try {
  await apiClient.cancelAllOrders()
} catch (error) {
  console.error('[KillSwitch] 执行失败:', error)
  // 建议集成 toast 通知用户
}
```

### 2. 部分失败
即使某个操作失败，其他操作仍会继续执行（独立性）。

### 3. 日志记录
所有操作结果都会通过 `console.log` 记录，便于调试。

## 后端 API 需求

Kill Switch 需要后端支持以下端点：

### 1. 取消所有订单
```
POST /orders/cancel-all
Response: { cancelledCount: number }
```

### 2. 平所有持仓
```
POST /portfolio/positions/close-all
Response: { closedCount: number }
```

### 3. 获取持仓列表
```
GET /portfolio/positions
Response: Position[]
```

### 4. 记录 Kill Switch 事件
```
POST /system/killswitch-log
Body: {
  timestamp: string
  cancelledOrders: number
  closedPositions: number
  stoppedStrategies: number
}
Response: { success: boolean }
```

## 待完成项

### 高优先级
- [ ] 集成 Toast 通知系统（显示成功/失败消息）
- [ ] 添加操作权限验证（仅管理员可用？）
- [ ] 实现后端 API 端点
- [ ] 添加操作日志查询页面

### 中优先级
- [ ] 添加操作冷却期（防止误触）
- [ ] 支持部分停止（仅停止特定交易对）
- [ ] 添加操作统计（执行次数、平均耗时）

### 低优先级
- [ ] 快捷键支持（Ctrl+Shift+K）
- [ ] 操作确认密码/二次验证
- [ ] 自动生成操作报告

## 使用示例

### 组件使用
```tsx
import { KillSwitch } from '@/components/KillSwitch'

// 在 Header 或其他布局组件中
<KillSwitch />
```

### API 调用
```typescript
import { apiClient } from '@/lib/api'

// 手动触发紧急停止
await apiClient.cancelAllOrders()
await apiClient.closeAllPositions()
await apiClient.logKillSwitchEvent({
  timestamp: new Date().toISOString(),
  cancelledOrders: 10,
  closedPositions: 3,
  stoppedStrategies: 2
})
```

## 性能考虑

- 所有 API 调用使用 `Promise.all` 并行执行
- 策略停止操作使用 `Promise.all` 批量处理
- 对话框使用 Radix UI 的优化渲染机制

## 安全性

1. **二次确认**: 防止误操作
2. **操作日志**: 所有操作记录可追溯
3. **权限控制**: 建议后端添加权限验证
4. **不可撤销提示**: 明确告知用户操作后果

## 测试建议

### 单元测试
```typescript
describe('KillSwitch', () => {
  it('should show confirmation dialog on click', () => {})
  it('should call all emergency APIs on confirm', () => {})
  it('should handle API failures gracefully', () => {})
  it('should log events after completion', () => {})
})
```

### 集成测试
- 测试与后端 API 的交互
- 测试状态更新的正确性
- 测试并发操作的可靠性

### E2E 测试
- 测试完整的用户流程
- 测试响应式设计
- 测试错误场景处理

## 相关文件

- PRD: `FR-A2UI-052` (紧急停止按钮需求)
- 设计系统: `/src/app/globals.css`
- API 客户端: `/src/lib/api.ts`
- 状态管理: `/src/store/index.ts`

## 维护说明

- 如需修改按钮样式，编辑 `KillSwitch.tsx` 中的 Button 组件
- 如需调整确认对话框内容，编辑 `AlertDialogContent` 部分
- 如需添加新的紧急操作，在 `handleEmergencyStop` 函数中添加

---

**创建时间**: 2025-12-25
**状态**: 已实现（待安装依赖）
**维护者**: Delta Terminal 开发团队
