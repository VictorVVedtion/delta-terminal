# Epic 3: AI 对话助手

**Epic ID**: DELTA-EPIC-003
**创建时间**: 2025-12-24
**状态**: 规划中
**优先级**: P0 (最高)
**预计周期**: 3-4 Sprint

---

## Epic 概述

构建 Delta Terminal 的核心差异化功能 - AI 驱动的交易助手。用户通过自然语言对话即可查询市场信息、创建交易策略、执行交易操作，无需编写代码或学习复杂的交易术语。

### 业务价值

- **降低交易门槛**：非技术用户也能创建和执行交易策略
- **提升效率**：自然语言交互比传统 UI 操作更快捷
- **智能决策辅助**：AI 基于市场数据提供交易建议和风险提示
- **产品差异化**：区别于传统交易平台的核心竞争力

### 成功指标

- [ ] 用户对话满意度 > 4.5/5.0
- [ ] 意图识别准确率 > 95%
- [ ] AI 响应延迟 < 2s (P95)
- [ ] 日活用户对话使用率 > 60%
- [ ] 策略创建成功率 > 80%（用户通过对话成功创建策略的比例）

---

## Story 3.1: 对话界面 UI 与会话管理

**Story ID**: DELTA-007
**优先级**: P0
**复杂度**: 5 points (中等)
**依赖**: DELTA-001 (用户认证)

### 用户故事

**作为** 交易用户
**我想要** 一个直观的对话界面
**以便** 通过聊天方式与 AI 助手交互

### 验收标准

#### 对话界面 UI
- [ ] 类 ChatGPT 的对话界面（消息气泡、输入框、发送按钮）
- [ ] 支持多行文本输入（Shift + Enter 换行，Enter 发送）
- [ ] 实时显示 AI 打字效果（流式响应）
- [ ] 消息时间戳显示
- [ ] 用户消息与 AI 回复明确区分（不同颜色/对齐方式）
- [ ] 代码块语法高亮显示（如 AI 返回策略代码）
- [ ] Markdown 格式支持（粗体、列表、链接等）

#### 会话管理
- [ ] 用户可以创建多个对话会话（类似 ChatGPT 的 Conversation）
- [ ] 会话列表显示（左侧边栏）
- [ ] 会话重命名功能（默认用首条消息摘要命名）
- [ ] 会话删除功能（二次确认）
- [ ] 会话历史持久化存储
- [ ] 会话上下文保持（切换会话后保留历史消息）
- [ ] 新建会话默认展示欢迎消息和快捷指令

#### 快捷功能
- [ ] 快捷指令按钮（如 "查看 BTC 价格"、"创建交易策略"、"查询余额"）
- [ ] 历史消息滚动加载（分页加载）
- [ ] 消息搜索功能
- [ ] 清空当前会话

#### 响应式设计
- [ ] 桌面端：左侧会话列表 + 右侧对话区域
- [ ] 移动端：底部导航切换会话列表与对话
- [ ] 输入框自适应高度（最多 5 行）

#### 交互体验
- [ ] 消息发送中状态提示（Loading 动画）
- [ ] 发送失败重试按钮
- [ ] 网络断开提示
- [ ] 消息复制功能
- [ ] AI 回复点赞/点踩反馈

### 技术任务分解

#### 后端任务 (backend/chat-service)
1. **数据库设计** (2h)
   ```sql
   CREATE TABLE conversations (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     title VARCHAR(255) DEFAULT '新对话',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE messages (
     id UUID PRIMARY KEY,
     conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
     role VARCHAR(20) NOT NULL,  -- 'user' | 'assistant' | 'system'
     content TEXT NOT NULL,
     metadata JSONB,  -- { tokens: number, model: string, etc. }
     created_at TIMESTAMP DEFAULT NOW(),
     INDEX idx_messages_conversation (conversation_id, created_at)
   );

   CREATE TABLE message_feedback (
     id UUID PRIMARY KEY,
     message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     rating INTEGER CHECK (rating IN (-1, 1)),  -- -1: 踩, 1: 赞
     comment TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **会话管理 API** (4h)
   ```typescript
   // POST /api/v1/conversations
   // 创建新会话
   Response: {
     id: string,
     title: '新对话',
     createdAt: string
   }

   // GET /api/v1/conversations
   // 获取用户所有会话
   Response: {
     conversations: [{
       id: string,
       title: string,
       lastMessage: string,
       updatedAt: string
     }]
   }

   // GET /api/v1/conversations/:id/messages
   // 获取会话消息历史
   Query: { limit?: number, offset?: number }
   Response: {
     messages: [{
       id: string,
       role: 'user' | 'assistant',
       content: string,
       createdAt: string
     }],
     total: number
   }

   // PATCH /api/v1/conversations/:id
   // 更新会话标题
   Body: { title: string }
   Response: { id: string, title: string }

   // DELETE /api/v1/conversations/:id
   // 删除会话
   Response: { success: true }

   // POST /api/v1/messages/:id/feedback
   // 提交消息反馈
   Body: { rating: 1 | -1, comment?: string }
   Response: { success: true }
   ```

3. **消息发送 API** (3h)
   ```typescript
   // POST /api/v1/conversations/:id/messages
   // 发送消息并获取 AI 响应
   Body: { content: string }
   Response: {
     userMessage: {
       id: string,
       role: 'user',
       content: string,
       createdAt: string
     },
     assistantMessage: {
       id: string,
       role: 'assistant',
       content: string,
       createdAt: string
     }
   }

   // 或者使用流式响应（Server-Sent Events）
   // POST /api/v1/conversations/:id/messages/stream
   // Response: text/event-stream
   // data: {"type":"start","messageId":"..."}
   // data: {"type":"delta","content":"你好"}
   // data: {"type":"delta","content":"，我"}
   // data: {"type":"done"}
   ```

#### 前端任务 (frontend/web-app)
1. **对话界面布局** (4h)
   ```tsx
   // src/app/chat/page.tsx
   export default function ChatPage() {
     return (
       <div className="flex h-screen">
         {/* 左侧会话列表 */}
         <ConversationSidebar />

         {/* 右侧对话区域 */}
         <div className="flex-1 flex flex-col">
           <ChatHeader />
           <MessageList />
           <ChatInput />
         </div>
       </div>
     );
   }
   ```

2. **消息列表组件** (5h)
   ```tsx
   // src/components/chat/MessageList.tsx
   import { useEffect, useRef } from 'react';
   import Markdown from 'react-markdown';
   import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

   export function MessageList({ messages }: { messages: Message[] }) {
     const bottomRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
     }, [messages]);

     return (
       <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {messages.map((msg) => (
           <MessageBubble key={msg.id} message={msg} />
         ))}
         <div ref={bottomRef} />
       </div>
     );
   }

   function MessageBubble({ message }: { message: Message }) {
     const isUser = message.role === 'user';

     return (
       <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
         <div className={`max-w-[70%] rounded-lg p-3 ${
           isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
         }`}>
           <Markdown
             components={{
               code({ node, inline, className, children, ...props }) {
                 const match = /language-(\w+)/.exec(className || '');
                 return !inline && match ? (
                   <SyntaxHighlighter language={match[1]} PreTag="div">
                     {String(children).replace(/\n$/, '')}
                   </SyntaxHighlighter>
                 ) : (
                   <code className={className} {...props}>
                     {children}
                   </code>
                 );
               },
             }}
           >
             {message.content}
           </Markdown>
           <div className="text-xs opacity-70 mt-1">
             {formatTime(message.createdAt)}
           </div>
         </div>
       </div>
     );
   }
   ```

3. **输入框组件** (4h)
   ```tsx
   // src/components/chat/ChatInput.tsx
   export function ChatInput({ onSend }: { onSend: (content: string) => void }) {
     const [input, setInput] = useState('');
     const [isLoading, setIsLoading] = useState(false);
     const textareaRef = useRef<HTMLTextAreaElement>(null);

     const handleKeyDown = (e: React.KeyboardEvent) => {
       if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSend();
       }
     };

     const handleSend = async () => {
       if (!input.trim() || isLoading) return;

       setIsLoading(true);
       try {
         await onSend(input.trim());
         setInput('');
       } catch (error) {
         console.error('发送失败:', error);
       } finally {
         setIsLoading(false);
       }
     };

     return (
       <div className="border-t p-4">
         <div className="flex gap-2">
           <textarea
             ref={textareaRef}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="输入消息... (Shift+Enter 换行)"
             className="flex-1 resize-none border rounded-lg p-3 max-h-32"
             rows={1}
           />
           <button
             onClick={handleSend}
             disabled={!input.trim() || isLoading}
             className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
           >
             {isLoading ? '发送中...' : '发送'}
           </button>
         </div>

         {/* 快捷指令 */}
         <div className="flex gap-2 mt-2">
           <button
             onClick={() => setInput('查询 BTC 当前价格')}
             className="text-sm px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
           >
             查询 BTC 价格
           </button>
           <button
             onClick={() => setInput('帮我创建一个网格交易策略')}
             className="text-sm px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
           >
             创建交易策略
           </button>
         </div>
       </div>
     );
   }
   ```

4. **会话侧边栏** (3h)
   ```tsx
   // src/components/chat/ConversationSidebar.tsx
   export function ConversationSidebar() {
     const { conversations, activeId, createConversation, deleteConversation } =
       useConversations();

     return (
       <div className="w-64 border-r flex flex-col">
         <div className="p-4">
           <button
             onClick={createConversation}
             className="w-full py-2 bg-blue-500 text-white rounded-lg"
           >
             + 新对话
           </button>
         </div>

         <div className="flex-1 overflow-y-auto">
           {conversations.map((conv) => (
             <ConversationItem
               key={conv.id}
               conversation={conv}
               isActive={conv.id === activeId}
               onDelete={() => deleteConversation(conv.id)}
             />
           ))}
         </div>
       </div>
     );
   }
   ```

5. **状态管理** (3h)
   ```typescript
   // src/stores/chat.store.ts
   import { create } from 'zustand';

   interface ChatState {
     conversations: Conversation[];
     activeConversationId: string | null;
     messages: Map<string, Message[]>;

     fetchConversations: () => Promise<void>;
     createConversation: () => Promise<void>;
     deleteConversation: (id: string) => Promise<void>;
     sendMessage: (conversationId: string, content: string) => Promise<void>;
     fetchMessages: (conversationId: string) => Promise<void>;
   }

   export const useChatStore = create<ChatState>((set, get) => ({
     conversations: [],
     activeConversationId: null,
     messages: new Map(),

     fetchConversations: async () => {
       const response = await fetch('/api/v1/conversations');
       const data = await response.json();
       set({ conversations: data.conversations });
     },

     sendMessage: async (conversationId, content) => {
       // 乐观更新
       const userMessage = {
         id: crypto.randomUUID(),
         role: 'user' as const,
         content,
         createdAt: new Date().toISOString(),
       };

       const currentMessages = get().messages.get(conversationId) || [];
       get().messages.set(conversationId, [...currentMessages, userMessage]);
       set({ messages: new Map(get().messages) });

       // 发送到服务器
       const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ content }),
       });

       const { assistantMessage } = await response.json();
       const updatedMessages = get().messages.get(conversationId) || [];
       get().messages.set(conversationId, [...updatedMessages, assistantMessage]);
       set({ messages: new Map(get().messages) });
     },
   }));
   ```

#### 测试任务
1. **单元测试** (3h)
   - 消息格式化测试
   - Markdown 渲染测试
   - 输入验证测试

2. **集成测试** (3h)
   - 会话创建流程测试
   - 消息发送接收测试

3. **E2E 测试** (3h)
   - Playwright 测试完整对话流程

### 依赖项

- PostgreSQL 数据库
- 前端 Markdown 渲染库（react-markdown）
- 代码高亮库（react-syntax-highlighter）

---

## Story 3.2: Claude API 集成与上下文管理

**Story ID**: DELTA-008
**优先级**: P0
**复杂度**: 8 points (复杂)
**依赖**: DELTA-007

### 用户故事

**作为** AI 引擎开发者
**我想要** 集成 Claude API 并管理对话上下文
**以便** 生成高质量的 AI 响应

### 验收标准

#### Claude API 集成
- [ ] 使用 Anthropic SDK 调用 Claude API
- [ ] 支持流式响应（Server-Sent Events）
- [ ] 错误处理与重试机制（网络错误、速率限制等）
- [ ] Token 使用量统计与监控
- [ ] 成本控制（单次对话 Token 限制）

#### 上下文管理
- [ ] 维护对话历史（最近 10 轮对话）
- [ ] 上下文窗口管理（超出限制时截断旧消息）
- [ ] 系统提示词（System Prompt）设计：
  - AI 角色定义（交易助手）
  - 可用功能说明（查询价格、创建策略等）
  - 响应格式要求（结构化输出）
  - 安全约束（不提供投资建议等）

#### 功能增强
- [ ] 注入实时市场数据到上下文（如用户询问价格时）
- [ ] 用户账户信息注入（如查询余额时）
- [ ] 交易所支持列表注入
- [ ] 多模态支持（图片分析，如 K 线图）

#### 响应质量
- [ ] AI 响应相关性（不答非所问）
- [ ] 响应速度 < 2s (P95)
- [ ] 流式响应延迟 < 500ms（首个 token）

#### 安全与合规
- [ ] 内容过滤（禁止生成高风险交易建议）
- [ ] 用户输入安全检查（SQL 注入、XSS 防护）
- [ ] 敏感信息脱敏（API Key 等不传给 Claude）

### 技术任务分解

#### 后端任务 (ai-engine/nlp-processor)
1. **项目初始化** (1h)
   - 安装 @anthropic-ai/sdk
   - TypeScript 配置

2. **Claude 服务封装** (5h)
   ```typescript
   // src/services/claude.service.ts
   import Anthropic from '@anthropic-ai/sdk';

   export class ClaudeService {
     private client: Anthropic;

     constructor() {
       this.client = new Anthropic({
         apiKey: process.env.ANTHROPIC_API_KEY!,
       });
     }

     async chat(params: {
       conversationHistory: Message[];
       userMessage: string;
       context?: Record<string, any>;
     }): Promise<string> {
       const systemPrompt = this.buildSystemPrompt(params.context);
       const messages = this.formatMessages(params.conversationHistory, params.userMessage);

       const response = await this.client.messages.create({
         model: 'claude-3-5-sonnet-20241022',
         max_tokens: 2048,
         system: systemPrompt,
         messages,
       });

       return response.content[0].type === 'text'
         ? response.content[0].text
         : '';
     }

     async *chatStream(params: {
       conversationHistory: Message[];
       userMessage: string;
       context?: Record<string, any>;
     }): AsyncGenerator<string> {
       const systemPrompt = this.buildSystemPrompt(params.context);
       const messages = this.formatMessages(params.conversationHistory, params.userMessage);

       const stream = await this.client.messages.stream({
         model: 'claude-3-5-sonnet-20241022',
         max_tokens: 2048,
         system: systemPrompt,
         messages,
       });

       for await (const chunk of stream) {
         if (
           chunk.type === 'content_block_delta' &&
           chunk.delta.type === 'text_delta'
         ) {
           yield chunk.delta.text;
         }
       }
     }

     private buildSystemPrompt(context?: Record<string, any>): string {
       let prompt = `
你是 Delta Terminal 的 AI 交易助手，专注于帮助用户进行加密货币交易。

## 你的能力
1. 查询实时市场数据（价格、成交量、订单簿等）
2. 帮助用户创建交易策略（网格交易、DCA 等）
3. 解答交易相关问题
4. 查询用户账户余额和订单状态

## 响应规范
- 使用简洁、专业的语言
- 对于数字货币价格，保留小数点后 2 位
- 提供的策略建议需要明确风险提示
- 不提供具体的投资建议（如 "现在买入"）

## 安全约束
- 不执行提币操作
- 不修改用户 API 密钥
- 单笔交易金额需在用户设置的限额内
`;

       if (context?.marketData) {
         prompt += `\n## 当前市场数据\n${JSON.stringify(context.marketData, null, 2)}`;
       }

       if (context?.userBalance) {
         prompt += `\n## 用户账户余额\n${JSON.stringify(context.userBalance, null, 2)}`;
       }

       return prompt;
     }

     private formatMessages(
       history: Message[],
       newMessage: string
     ): Anthropic.MessageParam[] {
       // 保留最近 10 轮对话
       const recentHistory = history.slice(-20);  // 10 轮 = 20 条消息（用户+助手）

       const formattedHistory = recentHistory.map((msg) => ({
         role: msg.role as 'user' | 'assistant',
         content: msg.content,
       }));

       return [
         ...formattedHistory,
         { role: 'user', content: newMessage },
       ];
     }
   }
   ```

3. **上下文注入器** (4h)
   ```typescript
   // src/services/context-injector.service.ts
   export class ContextInjector {
     constructor(
       private marketDataService: MarketDataService,
       private userService: UserService
     ) {}

     async buildContext(params: {
       userId: string;
       userMessage: string;
     }): Promise<Record<string, any>> {
       const context: Record<string, any> = {};

       // 检测用户意图，决定注入哪些上下文
       const intent = this.detectIntent(params.userMessage);

       if (intent.needsMarketData) {
         const symbols = this.extractSymbols(params.userMessage);
         context.marketData = await this.marketDataService.getTickers(symbols);
       }

       if (intent.needsBalance) {
         context.userBalance = await this.userService.getBalance(params.userId);
       }

       if (intent.needsOrders) {
         context.recentOrders = await this.userService.getRecentOrders(params.userId);
       }

       return context;
     }

     private detectIntent(message: string): {
       needsMarketData: boolean;
       needsBalance: boolean;
       needsOrders: boolean;
     } {
       const lowerMessage = message.toLowerCase();

       return {
         needsMarketData:
           /价格|行情|涨|跌|ticker/.test(lowerMessage) ||
           this.extractSymbols(message).length > 0,
         needsBalance: /余额|资产|持仓/.test(lowerMessage),
         needsOrders: /订单|成交|历史/.test(lowerMessage),
       };
     }

     private extractSymbols(message: string): string[] {
       const symbolPattern = /\b(BTC|ETH|BNB|SOL|ADA|DOT|MATIC)(\/USDT|\/BUSD|\/USD)?\b/gi;
       const matches = message.match(symbolPattern) || [];
       return matches.map((s) => {
         const symbol = s.toUpperCase();
         return symbol.includes('/') ? symbol : `${symbol}/USDT`;
       });
     }
   }
   ```

4. **消息处理 API** (4h)
   ```typescript
   // src/controllers/chat.controller.ts
   export class ChatController {
     constructor(
       private claudeService: ClaudeService,
       private contextInjector: ContextInjector,
       private chatRepository: ChatRepository
     ) {}

     async sendMessage(req: Request, res: Response) {
       const { conversationId } = req.params;
       const { content } = req.body;
       const userId = req.user!.id;

       // 保存用户消息
       const userMessage = await this.chatRepository.saveMessage({
         conversationId,
         role: 'user',
         content,
       });

       // 获取对话历史
       const history = await this.chatRepository.getMessages(conversationId, 20);

       // 构建上下文
       const context = await this.contextInjector.buildContext({
         userId,
         userMessage: content,
       });

       // 调用 Claude
       const aiResponse = await this.claudeService.chat({
         conversationHistory: history,
         userMessage: content,
         context,
       });

       // 保存 AI 响应
       const assistantMessage = await this.chatRepository.saveMessage({
         conversationId,
         role: 'assistant',
         content: aiResponse,
         metadata: { context },
       });

       res.json({
         userMessage,
         assistantMessage,
       });
     }

     async sendMessageStream(req: Request, res: Response) {
       const { conversationId } = req.params;
       const { content } = req.body;
       const userId = req.user!.id;

       // 设置 SSE 响应头
       res.setHeader('Content-Type', 'text/event-stream');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');

       // 保存用户消息
       const userMessage = await this.chatRepository.saveMessage({
         conversationId,
         role: 'user',
         content,
       });

       res.write(`data: ${JSON.stringify({ type: 'start', messageId: userMessage.id })}\n\n`);

       // 获取历史和上下文
       const history = await this.chatRepository.getMessages(conversationId, 20);
       const context = await this.contextInjector.buildContext({ userId, userMessage: content });

       // 流式响应
       let fullResponse = '';
       for await (const chunk of this.claudeService.chatStream({
         conversationHistory: history,
         userMessage: content,
         context,
       })) {
         fullResponse += chunk;
         res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`);
       }

       // 保存完整响应
       const assistantMessage = await this.chatRepository.saveMessage({
         conversationId,
         role: 'assistant',
         content: fullResponse,
       });

       res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id })}\n\n`);
       res.end();
     }
   }
   ```

5. **Token 使用监控** (2h)
   ```typescript
   // src/services/usage-tracker.service.ts
   export class UsageTracker {
     async trackTokenUsage(params: {
       userId: string;
       conversationId: string;
       inputTokens: number;
       outputTokens: number;
       model: string;
     }): Promise<void> {
       await db.tokenUsage.create({
         data: {
           ...params,
           cost: this.calculateCost(params),
           createdAt: new Date(),
         },
       });

       // 检查用户配额
       const monthlyUsage = await this.getMonthlyUsage(params.userId);
       if (monthlyUsage.totalCost > 100) {  // $100 月度限额
         throw new Error('超出月度 AI 使用配额');
       }
     }

     private calculateCost(params: {
       inputTokens: number;
       outputTokens: number;
       model: string;
     }): number {
       // Claude 3.5 Sonnet 定价：$3/MTok (input), $15/MTok (output)
       const inputCost = (params.inputTokens / 1_000_000) * 3;
       const outputCost = (params.outputTokens / 1_000_000) * 15;
       return inputCost + outputCost;
     }
   }
   ```

#### 前端任务 (frontend/web-app)
1. **流式响应处理** (4h)
   ```typescript
   // src/hooks/useChatStream.ts
   export function useChatStream() {
     const sendMessage = async (conversationId: string, content: string) => {
       const response = await fetch(
         `/api/v1/conversations/${conversationId}/messages/stream`,
         {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ content }),
         }
       );

       const reader = response.body!.getReader();
       const decoder = new TextDecoder();

       let assistantMessageId: string | null = null;
       let fullContent = '';

       while (true) {
         const { done, value } = await reader.read();
         if (done) break;

         const chunk = decoder.decode(value);
         const lines = chunk.split('\n\n');

         for (const line of lines) {
           if (line.startsWith('data: ')) {
             const data = JSON.parse(line.slice(6));

             if (data.type === 'start') {
               assistantMessageId = data.messageId;
             } else if (data.type === 'delta') {
               fullContent += data.content;
               // 更新 UI（触发重新渲染）
               updateMessageContent(assistantMessageId!, fullContent);
             } else if (data.type === 'done') {
               // 流式响应完成
             }
           }
         }
       }
     };

     return { sendMessage };
   }
   ```

#### 测试任务
1. **单元测试** (4h)
   - 上下文注入逻辑测试
   - Token 计算测试
   - 消息格式化测试

2. **集成测试** (5h)
   - Mock Claude API 测试
   - 流式响应测试
   - 上下文窗口管理测试

3. **E2E 测试** (3h)
   - 完整对话流程测试

### 依赖项

- DELTA-007 完成（对话界面）
- Anthropic API Key
- 市场数据服务（DELTA-006）

### 技术风险

- **API 成本超支**：用户滥用 AI 功能 → Token 配额限制 + 使用监控
- **响应延迟**：Claude API 响应慢 → 流式响应优化体验
- **上下文过长**：历史消息过多超出 Token 限制 → 智能截断策略

---

## Story 3.3: 交易意图识别与函数调用

**Story ID**: DELTA-009
**优先级**: P1
**复杂度**: 13 points (非常复杂)
**依赖**: DELTA-008, DELTA-005 (交易所连接器)

### 用户故事

**作为** 用户
**我想要** AI 能够理解我的交易意图并执行相应操作
**以便** 我可以用自然语言完成查询价格、创建策略等任务

### 验收标准

#### 意图识别
- [ ] 支持以下意图类型：
  - **查询类**：查询价格、查询余额、查询订单
  - **策略类**：创建网格策略、创建 DCA 策略、修改策略
  - **分析类**：市场分析、技术指标分析
  - **通用类**：问答、帮助说明
- [ ] 意图识别准确率 > 95%
- [ ] 支持复合意图（如 "查询 BTC 价格并创建网格策略"）

#### 函数调用（Function Calling）
- [ ] 使用 Claude 的 Tools 功能实现函数调用
- [ ] 定义以下工具函数：
  - `get_ticker(symbol)` - 获取实时价格
  - `get_balance()` - 查询账户余额
  - `create_grid_strategy(params)` - 创建网格交易策略
  - `get_market_analysis(symbol, timeframe)` - 获取市场分析
- [ ] 函数调用结果返回给 AI 生成最终回复
- [ ] 支持多步函数调用（需要多次调用才能完成任务）

#### 策略生成
- [ ] AI 根据用户描述生成策略参数
- [ ] 策略参数验证（价格区间、网格数量等）
- [ ] 风险提示生成（如 "该策略可能损失 X%"）
- [ ] 策略预览（模拟收益计算）
- [ ] 用户确认后才创建策略

#### 响应格式
- [ ] 结构化响应（区分普通文本、数据表格、操作结果）
- [ ] 图表生成（如价格走势、策略收益曲线）
- [ ] 操作确认提示（如 "是否创建该策略？"）

### 技术任务分解

#### 后端任务 (ai-engine/strategy-generator)
1. **工具函数定义** (6h)
   ```typescript
   // src/tools/market-tools.ts
   export const marketTools: Anthropic.Tool[] = [
     {
       name: 'get_ticker',
       description: '获取加密货币的实时价格信息',
       input_schema: {
         type: 'object',
         properties: {
           symbol: {
             type: 'string',
             description: '交易对符号，如 BTC/USDT',
           },
         },
         required: ['symbol'],
       },
     },
     {
       name: 'get_balance',
       description: '查询用户的账户余额',
       input_schema: {
         type: 'object',
         properties: {},
       },
     },
     {
       name: 'create_grid_strategy',
       description: '创建网格交易策略',
       input_schema: {
         type: 'object',
         properties: {
           symbol: { type: 'string', description: '交易对' },
           lowerPrice: { type: 'number', description: '网格下限价格' },
           upperPrice: { type: 'number', description: '网格上限价格' },
           gridCount: { type: 'number', description: '网格数量' },
           totalInvestment: { type: 'number', description: '总投资金额' },
         },
         required: ['symbol', 'lowerPrice', 'upperPrice', 'gridCount', 'totalInvestment'],
       },
     },
     {
       name: 'get_market_analysis',
       description: '获取市场技术分析',
       input_schema: {
         type: 'object',
         properties: {
           symbol: { type: 'string' },
           timeframe: { type: 'string', enum: ['1h', '4h', '1d'] },
         },
         required: ['symbol', 'timeframe'],
       },
     },
   ];
   ```

2. **函数调用处理器** (8h)
   ```typescript
   // src/services/tool-executor.service.ts
   export class ToolExecutor {
     constructor(
       private marketDataService: MarketDataService,
       private userService: UserService,
       private strategyService: StrategyService
     ) {}

     async executeTool(
       toolName: string,
       toolInput: Record<string, any>,
       userId: string
     ): Promise<any> {
       switch (toolName) {
         case 'get_ticker':
           return this.getTicker(toolInput.symbol);

         case 'get_balance':
           return this.getBalance(userId);

         case 'create_grid_strategy':
           return this.createGridStrategy(userId, toolInput);

         case 'get_market_analysis':
           return this.getMarketAnalysis(toolInput.symbol, toolInput.timeframe);

         default:
           throw new Error(`Unknown tool: ${toolName}`);
       }
     }

     private async getTicker(symbol: string) {
       const ticker = await this.marketDataService.getTicker(symbol);
       return {
         symbol,
         price: ticker.last,
         change24h: ticker.percentage,
         volume24h: ticker.volume,
         timestamp: ticker.timestamp,
       };
     }

     private async getBalance(userId: string) {
       const balance = await this.userService.getBalance(userId);
       return {
         assets: balance.map((b) => ({
           asset: b.asset,
           free: b.free,
           locked: b.locked,
           total: b.total,
           usdValue: b.usdValue,
         })),
         totalUsdValue: balance.reduce((sum, b) => sum + b.usdValue, 0),
       };
     }

     private async createGridStrategy(userId: string, params: any) {
       // 验证参数
       this.validateGridParams(params);

       // 计算网格详情
       const gridDetails = this.calculateGridDetails(params);

       // 创建策略（待用户确认）
       const strategy = await this.strategyService.createDraftStrategy({
         userId,
         type: 'grid',
         symbol: params.symbol,
         parameters: params,
         details: gridDetails,
         status: 'draft',  // 草稿状态，需用户确认
       });

       return {
         strategyId: strategy.id,
         status: 'draft',
         message: '策略已创建为草稿，请确认后启动',
         details: gridDetails,
       };
     }

     private validateGridParams(params: any): void {
       if (params.lowerPrice >= params.upperPrice) {
         throw new Error('下限价格必须小于上限价格');
       }
       if (params.gridCount < 2 || params.gridCount > 100) {
         throw new Error('网格数量必须在 2-100 之间');
       }
       if (params.totalInvestment <= 0) {
         throw new Error('投资金额必须大于 0');
       }
     }

     private calculateGridDetails(params: any) {
       const priceRange = params.upperPrice - params.lowerPrice;
       const gridSize = priceRange / params.gridCount;
       const quantityPerGrid = params.totalInvestment / params.gridCount;

       return {
         gridSize,
         quantityPerGrid,
         estimatedProfit: this.estimateProfit(params),
         riskLevel: this.assessRisk(params),
       };
     }

     private estimateProfit(params: any): number {
       // 简化的收益估算（实际应使用回测）
       const gridSize = (params.upperPrice - params.lowerPrice) / params.gridCount;
       const profitPerGrid = gridSize * 0.002;  // 假设 0.2% 利润
       return profitPerGrid * params.gridCount;
     }

     private assessRisk(params: any): 'low' | 'medium' | 'high' {
       const volatility = (params.upperPrice - params.lowerPrice) / params.lowerPrice;
       if (volatility < 0.1) return 'low';
       if (volatility < 0.3) return 'medium';
       return 'high';
     }
   }
   ```

3. **AI Agent 循环** (10h)
   ```typescript
   // src/services/ai-agent.service.ts
   export class AIAgentService {
     constructor(
       private claudeService: ClaudeService,
       private toolExecutor: ToolExecutor
     ) {}

     async processMessage(params: {
       userId: string;
       conversationId: string;
       userMessage: string;
       history: Message[];
     }): Promise<string> {
       let messages = this.formatMessages(params.history, params.userMessage);
       let finalResponse = '';
       let iterationCount = 0;
       const MAX_ITERATIONS = 5;  // 防止无限循环

       while (iterationCount < MAX_ITERATIONS) {
         iterationCount++;

         const response = await this.claudeService.client.messages.create({
           model: 'claude-3-5-sonnet-20241022',
           max_tokens: 2048,
           tools: marketTools,
           messages,
         });

         // 检查是否需要调用工具
         const toolUseBlock = response.content.find(
           (block) => block.type === 'tool_use'
         );

         if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
           // 没有工具调用，返回最终回复
           const textBlock = response.content.find((block) => block.type === 'text');
           finalResponse = textBlock && textBlock.type === 'text' ? textBlock.text : '';
           break;
         }

         // 执行工具调用
         const toolResult = await this.toolExecutor.executeTool(
           toolUseBlock.name,
           toolUseBlock.input,
           params.userId
         );

         // 将工具结果添加到消息历史
         messages = [
           ...messages,
           { role: 'assistant', content: response.content },
           {
             role: 'user',
             content: [
               {
                 type: 'tool_result',
                 tool_use_id: toolUseBlock.id,
                 content: JSON.stringify(toolResult),
               },
             ],
           },
         ];
       }

       return finalResponse;
     }

     private formatMessages(history: Message[], newMessage: string): any[] {
       const recentHistory = history.slice(-20);
       return [
         ...recentHistory.map((msg) => ({
           role: msg.role,
           content: msg.content,
         })),
         { role: 'user', content: newMessage },
       ];
     }
   }
   ```

4. **策略确认流程** (4h)
   ```typescript
   // POST /api/v1/strategies/:id/confirm
   // 用户确认并启动策略
   export async function confirmStrategy(req: Request, res: Response) {
     const { id } = req.params;
     const userId = req.user!.id;

     const strategy = await strategyService.getStrategy(id);

     // 验证所有权
     if (strategy.userId !== userId) {
       return res.status(403).json({ error: 'Forbidden' });
     }

     // 验证状态
     if (strategy.status !== 'draft') {
       return res.status(400).json({ error: '只能确认草稿状态的策略' });
     }

     // 启动策略
     await strategyService.activateStrategy(id);

     res.json({ success: true, strategy });
   }
   ```

#### 前端任务
1. **策略确认 UI** (5h)
   - 策略详情卡片（参数、预期收益、风险等级）
   - 确认/取消按钮
   - 策略启动后状态更新

2. **数据可视化** (4h)
   - 价格表格组件
   - 余额饼图
   - 策略收益曲线图（使用 Recharts/Chart.js）

#### 测试任务
1. **单元测试** (5h)
   - 工具函数测试
   - 参数验证测试
   - 收益计算测试

2. **集成测试** (6h)
   - 函数调用流程测试
   - 多步调用测试
   - 错误处理测试

3. **E2E 测试** (4h)
   - 完整的策略创建流程

### 依赖项

- DELTA-008 完成（Claude 集成）
- DELTA-005 完成（交易所连接器）
- 策略管理服务（需先设计数据库结构）

### 技术风险

- **意图误判**：AI 理解错误导致错误操作 → 关键操作需用户确认
- **函数调用循环**：AI 重复调用工具 → 最大迭代次数限制
- **参数验证不足**：生成的策略参数不合理 → 多层验证机制

---

## Epic 级别的 DoD (Definition of Done)

- [ ] 所有 Story 验收标准通过
- [ ] AI 响应质量人工评审合格（10 个测试对话场景）
- [ ] 意图识别准确率测试达标（> 95%）
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] Token 使用成本控制验证
- [ ] 安全审计通过（内容过滤、敏感信息保护）
- [ ] API 文档完成
- [ ] 用户手册更新（如何与 AI 交互）
- [ ] 部署到 Staging 环境并完成 UAT

---

## 技术栈确认

### 后端
- **AI SDK**: @anthropic-ai/sdk
- **模型**: Claude 3.5 Sonnet
- **数据库**: PostgreSQL (会话存储)
- **缓存**: Redis (上下文缓存)

### 前端
- **Markdown**: react-markdown
- **代码高亮**: react-syntax-highlighter
- **图表**: Recharts / Chart.js
- **状态管理**: Zustand

---

## 参考资料

- [Anthropic Claude API 文档](https://docs.anthropic.com/claude/docs)
- [Claude Tool Use (Function Calling)](https://docs.anthropic.com/claude/docs/tool-use)
- [LangChain 文档](https://python.langchain.com/docs/get_started/introduction)
- [Conversational AI 最佳实践](https://www.rasa.com/docs/rasa/conversation-driven-development/)

---

**最后更新**: 2025-12-24
**负责人**: AI 团队 Lead + 产品经理
**审核人**: Tech Lead + UX Designer
