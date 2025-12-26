# 流式渲染实现指南

> 基于 PRD S71 流式渲染规范

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         流式渲染架构                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   用户发送消息                                                           │
│        │                                                                │
│        ▼                                                                │
│   ┌─────────────────┐                                                   │
│   │  ChatInterface  │                                                   │
│   │                 │                                                   │
│   │  useThinkingStream() ◄──── WebSocket ───── Backend Agent          │
│   └────────┬────────┘                                                   │
│            │                                                            │
│            │ ThinkingProcess                                            │
│            ▼                                                            │
│   ┌─────────────────────────────────────────┐                          │
│   │         InsightCardLoading              │                          │
│   │                                         │                          │
│   │  Phase 1: Skeleton (0-0.5s)            │                          │
│   │     └─ shimmer 动画骨架屏               │                          │
│   │                                         │                          │
│   │  Phase 2: Thinking (0.5-3s)            │                          │
│   │     └─ ThinkingIndicator               │                          │
│   │        ├─ PulsingDot 状态点             │                          │
│   │        ├─ TodoList 任务列表             │                          │
│   │        └─ ProgressBar 进度条            │                          │
│   │                                         │                          │
│   │  Phase 3: Filling (3-5s)               │                          │
│   │     └─ 数据渐进填充                     │                          │
│   │                                         │                          │
│   │  Phase 4: Ready                        │                          │
│   │     └─ 真正的 InsightCard               │                          │
│   └─────────────────────────────────────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 在 ChatInterface 中集成

```tsx
import { useThinkingStream, useMockThinkingStream } from '@/hooks/useThinkingStream'
import { InsightCardLoading, useInsightLoadingState } from '@/components/thinking'

function ChatInterface() {
  // 使用真实 WebSocket (生产环境)
  const { process, isThinking, startThinking } = useThinkingStream()

  // 或使用 Mock (开发环境)
  // const { process, isThinking, startThinking } = useMockThinkingStream()

  // 加载状态管理
  const { state, isReady } = useInsightLoadingState(isThinking, process)

  const handleSend = (message: string) => {
    startThinking(message)
  }

  return (
    <div>
      {/* 消息列表 */}
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 流式加载状态 */}
      {isThinking && (
        <InsightCardLoading state={state} />
      )}

      {/* 完成后显示真正的 InsightCard */}
      {isReady && insight && (
        <InsightCard insight={insight} />
      )}
    </div>
  )
}
```

### 2. 独立使用 ThinkingIndicator

```tsx
import { ThinkingIndicator } from '@/components/thinking'

function MyComponent() {
  const process = {
    process_id: 'proc_001',
    user_message: '帮我创建一个 RSI 策略',
    status: 'thinking',
    todos: [
      { id: '1', description: '分析用户意图', status: 'completed' },
      { id: '2', description: '检索因子库', status: 'in_progress' },
      { id: '3', description: '生成策略', status: 'pending' },
    ],
    tool_history: [],
    started_at: Date.now(),
  }

  return (
    <ThinkingIndicator
      process={process}
      defaultExpanded
    />
  )
}
```

## WebSocket 事件流

### 事件类型

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| `thinking.started` | Agent 开始处理 | `{ process_id, user_message }` |
| `thinking.todos_updated` | 任务列表更新 | `{ process_id, todos[] }` |
| `thinking.tool_started` | 开始调用工具 | `{ process_id, tool_name, description }` |
| `thinking.tool_completed` | 工具调用完成 | `{ process_id, tool_name, result_summary, success }` |
| `thinking.progress_updated` | 进度更新 | `{ process_id, progress }` |
| `thinking.approval_required` | 需要人类审批 | `{ process_id, action, context }` |
| `thinking.completed` | 处理完成 | `{ process_id, result_type, insight_id? }` |
| `thinking.error` | 发生错误 | `{ process_id, error }` |

### 后端发送示例

```python
# Python 后端示例
async def send_thinking_event(websocket, event_type, data):
    await websocket.send_json({
        "type": event_type,
        "data": data
    })

# 使用示例
await send_thinking_event(ws, "thinking.started", {
    "process_id": "proc_001",
    "user_message": "帮我创建一个 RSI 策略"
})

await send_thinking_event(ws, "thinking.todos_updated", {
    "process_id": "proc_001",
    "todos": [
        {"id": "1", "description": "理解意图", "status": "completed"},
        {"id": "2", "description": "检索因子", "status": "in_progress"},
    ]
})
```

## 3 阶段加载状态

### Phase 1: Skeleton (骨架屏)

- **持续时间**: 0-0.5 秒
- **UI**: shimmer 动画的占位符
- **用途**: 立即响应用户操作，避免白屏

### Phase 2: Thinking (思考过程)

- **持续时间**: 0.5-3 秒
- **UI**: ThinkingIndicator 组件
  - PulsingDot 动画状态点
  - TodoList 任务完成状态
  - 当前工具调用指示器
  - 进度条
- **用途**: 展示 AI 正在做什么，增强信任感

### Phase 3: Filling (渐进填充)

- **持续时间**: 3-5 秒
- **UI**: 部分数据已显示，其余仍在加载
  - 标题、符号等先显示
  - 指标数值逐个出现
  - 解释文字最后加载
- **用途**: 尽早展示可用信息，减少等待感

## 样式变量

组件使用 RiverBit Design System 的 CSS 变量：

```css
/* 主色 */
--rb-cyan: #0EECBC;      /* 思考中 */
--rb-green: #61DD3C;     /* 完成 */
--rb-yellow: #E8BD30;    /* 需审批 */
--rb-red: #DD3C41;       /* 错误 */
--rb-purple: #a855f7;    /* 工具调用 */

/* 动画 */
.animate-ping   /* PulsingDot 动画 */
.animate-spin   /* Loader 旋转 */
```

## 文件结构

```
src/
├── types/
│   └── thinking.ts           # 类型定义
├── hooks/
│   └── useThinkingStream.ts  # WebSocket Hook
└── components/
    └── thinking/
        ├── index.ts              # 导出
        ├── ThinkingIndicator.tsx # 思考指示器
        ├── InsightCardLoading.tsx # 3阶段加载
        └── STREAMING_GUIDE.md    # 本文档
```

## 与 PRD 对齐检查

| 规范项 | 状态 | 文件 |
|--------|------|------|
| S71 骨架屏 | ✅ | InsightCardLoading.tsx |
| S71 思考过程可视化 | ✅ | ThinkingIndicator.tsx |
| S71 渐进填充 | ✅ | InsightCardLoading.tsx |
| ThinkingStream 事件 | ✅ | types/thinking.ts |
| TodoList 组件 | ✅ | ThinkingIndicator.tsx |
| PulsingDot 动画 | ✅ | ThinkingIndicator.tsx |
| 工具调用指示 | ✅ | ThinkingIndicator.tsx |
| 进度条 | ✅ | ThinkingIndicator.tsx |

## 开发调试

使用 `useMockThinkingStream` 进行本地开发：

```tsx
// 开发环境使用 Mock
const isDev = process.env.NODE_ENV === 'development'
const thinkingHook = isDev ? useMockThinkingStream : useThinkingStream

function ChatInterface() {
  const { process, isThinking, startThinking } = thinkingHook()
  // ...
}
```

Mock 会自动模拟完整的事件流：
1. 0ms: 开始思考
2. 500ms: 更新 todos
3. 1000ms: 开始工具调用
4. 2000ms: 工具完成
5. 2500ms: 更新 todos
6. 3500ms: 完成
