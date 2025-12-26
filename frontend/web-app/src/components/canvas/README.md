# Canvas 组件

## 概述

Canvas 组件系统为 Delta Terminal 的 A2UI（Agent-to-UI）系统提供完整的 Proposal Canvas 功能，允许用户查看、编辑和批准 AI 生成的策略提案。

## 组件结构

### CanvasPanel

ChatGPT 风格的滑动侧边栏，用于展示完整的策略提案编辑界面。

#### 功能特性

1. **头部区域**
   - 策略名称显示
   - 类型 Badge（新建策略/策略调整/批量调整/风险警报）
   - 关闭按钮

2. **AI 解释区**
   - 以卡片形式展示 AI 生成的策略逻辑说明
   - 使用 RiverBit glass effect 样式

3. **影响指标区**
   - 4 宫格布局展示关键指标
   - 支持趋势显示（上升/下降/持平）
   - 对比旧值和新值
   - 置信度进度条

4. **L1 参数区（核心参数）**
   - 直接展示的核心可编辑参数
   - 使用 ParamControl 组件渲染
   - 支持多种控件类型（slider/number/toggle/select 等）

5. **L2 参数区（高级参数）**
   - 使用 Collapsible 组件折叠展示
   - 点击展开/收起
   - 左侧边框视觉分隔

6. **操作区**
   - **拒绝** 按钮：拒绝当前提案
   - **批准** 按钮：无修改时显示，直接批准原始参数
   - **修改后提交** 按钮：参数有修改时显示，提交编辑后的参数
   - 参数重置按钮（参数修改后显示）

#### Props

```typescript
interface CanvasPanelProps {
  insight: InsightData | null      // 策略提案数据
  isOpen: boolean                   // 面板是否打开
  onClose?: () => void              // 关闭回调
  onApprove?: (insight, params) => void  // 批准回调
  onReject?: (insight) => void      // 拒绝回调
  isLoading?: boolean               // 加载状态
}
```

#### 使用示例

```tsx
import { CanvasPanel } from '@/components/canvas/CanvasPanel'
import { useInsightStore } from '@/store/insight'

function MyComponent() {
  const { activeInsight, canvasOpen, closeCanvas, setLoading } = useInsightStore()

  const handleApprove = async (insight, params) => {
    setLoading(true)
    try {
      // 提交到后端
      await apiClient.approveInsight(insight.id, params)
      closeCanvas()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (insight) => {
    setLoading(true)
    try {
      await apiClient.rejectInsight(insight.id)
      closeCanvas()
    } finally {
      setLoading(false)
    }
  }

  return (
    <CanvasPanel
      insight={activeInsight}
      isOpen={canvasOpen}
      onClose={closeCanvas}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  )
}
```

### Canvas

底层的策略提案内容组件，支持两种变体：

- `standalone`: 独立卡片模式（带边框、头部、底部）
- `embedded`: 嵌入模式（用于 CanvasPanel 内部）

CanvasPanel 内部使用 `embedded` 变体来渲染内容。

## 样式系统

### RiverBit Glass Effect

所有卡片和容器使用 RiverBit 设计风格的毛玻璃效果：

```tsx
className="bg-card/80 backdrop-blur-sm"
```

### 颜色语义

- **绿色**：正向趋势、收益增加
- **红色**：负向趋势、风险增加
- **黄色**：警告、中等置信度
- **灰色**：中性、无变化

## 状态管理

组件内部管理：
- `editedParams`: 当前编辑的参数值
- `showAdvanced`: 高级参数展开状态
- `hasChanges`: 参数是否被修改

自动同步：
- 当 `insight` prop 变化时，自动重置 `editedParams`
- Escape 键关闭面板

## 相关组件

- `ParamControl`: 参数控件统一接口
- `ParamSlider`: 滑块控件
- `HeatmapSlider`: 热力图滑块
- `Collapsible`: 折叠面板（来自 Radix UI）

## 设计参考

- **PRD**: FR-A2UI-020 Proposal Canvas
- **设计风格**: ChatGPT 侧边栏 + RiverBit Glass Effect
- **交互模式**: AI 提议 → 人工审核 → 批准/拒绝

## 未来优化

- [ ] 添加参数验证错误提示
- [ ] 支持参数约束规则检查
- [ ] 添加键盘快捷键（Ctrl+Enter 批准）
- [ ] 参数历史对比视图
- [ ] 支持批量参数重置
