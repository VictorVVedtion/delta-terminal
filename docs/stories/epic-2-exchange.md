# Epic 2: 交易所集成

**Epic ID**: DELTA-EPIC-002
**创建时间**: 2025-12-24
**状态**: 规划中
**优先级**: P0 (最高)
**预计周期**: 2-3 Sprint

---

## Epic 概述

构建与主流加密货币交易所的安全连接，实现 API 密钥管理、实时市场数据获取和订单执行能力。本 Epic 专注于币安（Binance）作为首个支持的交易所，为后续多交易所扩展奠定架构基础。

### 业务价值

- 用户能够安全地连接自己的交易所账户
- 平台可以获取实时市场数据用于分析和决策
- 为 AI 策略执行提供交易能力基础

### 成功指标

- [ ] API 密钥存储通过安全审计（加密存储）
- [ ] 市场数据延迟 < 100ms (WebSocket 连接)
- [ ] 交易所连接成功率 > 99.5%
- [ ] 支持币安现货市场 200+ 交易对

---

## Story 2.1: 交易所 API 密钥管理

**Story ID**: DELTA-004
**优先级**: P0
**复杂度**: 5 points (中等)
**依赖**: DELTA-001 (用户认证系统)

### 用户故事

**作为** 交易用户
**我想要** 安全地添加和管理我的交易所 API 密钥
**以便** Delta Terminal 能够代表我执行交易

### 验收标准

#### API 密钥添加
- [ ] 用户可以添加交易所 API 密钥（API Key + Secret Key）
- [ ] 支持为密钥设置别名（如 "币安主账户"）
- [ ] 支持权限范围配置（只读、交易、提币）
- [ ] 添加时验证密钥有效性（调用交易所 API 测试连接）
- [ ] 密钥验证失败显示具体错误原因（格式错误/权限不足/IP 限制等）
- [ ] 用户可以设置密钥的交易权限限制（最大单笔金额、每日交易次数等）

#### 安全存储
- [ ] API Secret 使用 AES-256-GCM 加密存储
- [ ] 加密密钥存储在环境变量/密钥管理服务（AWS KMS/HashiCorp Vault）
- [ ] 数据库中不存储明文 Secret
- [ ] API Key 使用单向哈希索引（便于查询但不可逆）

#### 密钥管理
- [ ] 用户可以查看已添加的密钥列表（只显示 API Key 前 8 位和后 4 位）
- [ ] 用户可以删除密钥（二次确认）
- [ ] 用户可以禁用/启用密钥（不删除但暂停使用）
- [ ] 显示密钥最后使用时间和状态（正常/异常/已撤销）
- [ ] 密钥过期提醒（交易所端撤销或过期）

#### 审计与监控
- [ ] 记录所有密钥操作日志（添加、删除、使用）
- [ ] 异常使用告警（连续失败 3 次）
- [ ] IP 白名单检查（可选，如果交易所支持）

#### UI/UX 要求
- [ ] 添加密钥表单清晰引导用户在交易所创建 API Key
- [ ] 提供交易所 API 文档链接
- [ ] 密钥权限设置图形化界面（复选框形式）
- [ ] 密钥状态实时更新（WebSocket 或轮询）

### 技术任务分解

#### 后端任务 (backend/user-service)
1. **数据库设计** (2h)
   ```sql
   CREATE TABLE exchange_api_keys (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     exchange VARCHAR(50) NOT NULL,  -- 'binance', 'okx', etc.
     alias VARCHAR(100),
     api_key_hash VARCHAR(64) NOT NULL,  -- SHA-256 哈希
     api_key_encrypted TEXT NOT NULL,  -- 加密后的完整 API Key
     secret_encrypted TEXT NOT NULL,   -- 加密后的 Secret
     permissions JSONB,  -- { "read": true, "trade": true, "withdraw": false }
     constraints JSONB,  -- { "maxOrderAmount": 1000, "dailyTradeLimit": 10 }
     status VARCHAR(20) DEFAULT 'active',  -- active/disabled/revoked
     last_used_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, api_key_hash)
   );

   CREATE INDEX idx_api_keys_user ON exchange_api_keys(user_id);
   CREATE INDEX idx_api_keys_status ON exchange_api_keys(status);
   ```

2. **加密服务** (4h)
   ```typescript
   // src/services/encryption.service.ts
   import crypto from 'crypto';

   export class EncryptionService {
     private algorithm = 'aes-256-gcm';
     private key: Buffer;

     constructor() {
       // 从环境变量或 KMS 获取加密密钥
       this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
     }

     encrypt(text: string): { encrypted: string; iv: string; tag: string } {
       const iv = crypto.randomBytes(16);
       const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

       let encrypted = cipher.update(text, 'utf8', 'hex');
       encrypted += cipher.final('hex');
       const tag = cipher.getAuthTag();

       return {
         encrypted,
         iv: iv.toString('hex'),
         tag: tag.toString('hex'),
       };
     }

     decrypt(encrypted: string, iv: string, tag: string): string {
       const decipher = crypto.createDecipheriv(
         this.algorithm,
         this.key,
         Buffer.from(iv, 'hex')
       );
       decipher.setAuthTag(Buffer.from(tag, 'hex'));

       let decrypted = decipher.update(encrypted, 'hex', 'utf8');
       decrypted += decipher.final('utf8');
       return decrypted;
     }
   }
   ```

3. **API 密钥管理 API** (6h)
   ```typescript
   // POST /api/v1/exchanges/api-keys
   // 添加 API 密钥
   Body: {
     exchange: 'binance',
     alias: '主账户',
     apiKey: string,
     secretKey: string,
     permissions: { read: true, trade: true, withdraw: false },
     constraints: { maxOrderAmount: 1000 }
   }
   Response: {
     id: string,
     exchange: string,
     alias: string,
     apiKeyPreview: 'abcd1234...xyz',
     status: 'active'
   }

   // GET /api/v1/exchanges/api-keys
   // 获取密钥列表
   Response: {
     keys: [{
       id: string,
       exchange: string,
       alias: string,
       apiKeyPreview: string,
       permissions: {...},
       status: string,
       lastUsedAt: string,
       createdAt: string
     }]
   }

   // DELETE /api/v1/exchanges/api-keys/:id
   // 删除密钥
   Response: { success: true }

   // PATCH /api/v1/exchanges/api-keys/:id/status
   // 启用/禁用密钥
   Body: { status: 'active' | 'disabled' }
   Response: { id: string, status: string }
   ```

4. **交易所连接验证** (3h)
   ```typescript
   // src/services/exchange-validator.service.ts
   import ccxt from 'ccxt';

   export class ExchangeValidatorService {
     async validateBinanceCredentials(
       apiKey: string,
       secretKey: string
     ): Promise<{ valid: boolean; error?: string; permissions?: string[] }> {
       try {
         const exchange = new ccxt.binance({
           apiKey,
           secret: secretKey,
         });

         // 测试连接并获取账户信息
         const account = await exchange.fetchBalance();

         // 检测权限（通过 API 响应判断）
         const permissions = await this.detectPermissions(exchange);

         return { valid: true, permissions };
       } catch (error: any) {
         return {
           valid: false,
           error: this.parseExchangeError(error),
         };
       }
     }

     private parseExchangeError(error: any): string {
       if (error.message.includes('Invalid API-key')) {
         return 'API Key 格式错误或不存在';
       }
       if (error.message.includes('Signature')) {
         return 'Secret Key 错误';
       }
       if (error.message.includes('IP')) {
         return 'IP 地址未在交易所白名单中';
       }
       return '连接验证失败，请检查密钥配置';
     }
   }
   ```

#### 前端任务 (frontend/web-app)
1. **API 密钥列表页** (4h)
   - 表格展示已添加的密钥
   - 状态指示器（绿色/黄色/红色）
   - 操作按钮（禁用、删除）

2. **添加密钥模态框** (5h)
   - 多步骤表单（选择交易所 → 输入密钥 → 配置权限 → 验证）
   - 实时验证反馈
   - 权限配置界面（复选框 + 滑块）
   - 帮助提示（如何在币安创建 API Key）

3. **密钥详情页** (3h)
   - 显示密钥使用统计（调用次数、成功率）
   - 最近使用记录
   - 编辑限制配置

#### 测试任务
1. **单元测试** (4h)
   - 加密/解密功能测试
   - API Key 哈希生成测试
   - 权限验证逻辑测试

2. **集成测试** (4h)
   - 添加密钥流程测试（Mock 交易所 API）
   - 密钥验证测试
   - 删除密钥测试

3. **安全测试** (3h)
   - SQL 注入测试
   - 加密强度验证
   - 权限绕过测试

### 依赖项

- PostgreSQL 数据库
- 加密密钥管理方案（环境变量或 KMS）
- CCXT 库（交易所统一接口）

### 技术风险

- **密钥泄露风险**：数据库被攻破导致密钥泄露 → 多层加密 + 定期密钥轮换
- **交易所 API 变更**：币安 API 升级导致验证失败 → 版本兼容处理 + 监控告警
- **性能问题**：加密解密操作耗时 → 使用缓存 + 异步处理

---

## Story 2.2: 币安交易所连接器

**Story ID**: DELTA-005
**优先级**: P0
**复杂度**: 8 points (复杂)
**依赖**: DELTA-004

### 用户故事

**作为** 系统开发者
**我想要** 稳定的币安交易所连接器
**以便** 获取市场数据和执行交易订单

### 验收标准

#### 核心功能
- [ ] 使用 CCXT 库封装币安 API
- [ ] 支持现货市场（Spot）基础操作：
  - 获取交易对列表
  - 查询账户余额
  - 获取订单簿（Order Book）
  - 查询历史成交记录
- [ ] 支持订单操作（本 Story 仅实现查询，下单在后续 Story）：
  - 查询订单状态
  - 查询历史订单
  - 查询开仓订单

#### 连接管理
- [ ] 连接池管理（复用 CCXT 实例）
- [ ] 自动重连机制（网络故障时）
- [ ] 请求限流（遵守币安 API Rate Limit）
- [ ] 并发请求控制（避免超限）

#### 错误处理
- [ ] 统一错误格式封装
- [ ] 区分错误类型（网络错误/权限错误/业务错误）
- [ ] 自动重试机制（指数退避策略）
- [ ] 错误日志记录

#### 性能要求
- [ ] API 调用响应时间 < 500ms (P95)
- [ ] 支持 100+ 并发请求
- [ ] 缓存优化（交易对信息等静态数据）

### 技术任务分解

#### 后端任务 (trading-engine/exchange-connector)
1. **项目初始化** (1h)
   - 安装 CCXT 依赖
   - TypeScript 配置
   - 目录结构设计

2. **币安连接器核心类** (6h)
   ```typescript
   // src/connectors/binance.connector.ts
   import ccxt from 'ccxt';

   export class BinanceConnector {
     private exchange: ccxt.binance;
     private rateLimiter: RateLimiter;

     constructor(apiKey: string, secretKey: string) {
       this.exchange = new ccxt.binance({
         apiKey,
         secret: secretKey,
         enableRateLimit: true,
         options: {
           defaultType: 'spot',
           recvWindow: 10000,
         },
       });

       this.rateLimiter = new RateLimiter({
         maxRequests: 1200,  // 币安限制 1200 req/min
         interval: 60000,
       });
     }

     async fetchBalance(): Promise<Balance> {
       await this.rateLimiter.wait();
       try {
         const balance = await this.exchange.fetchBalance();
         return this.normalizeBalance(balance);
       } catch (error) {
         throw this.handleError(error);
       }
     }

     async fetchTicker(symbol: string): Promise<Ticker> {
       await this.rateLimiter.wait();
       const ticker = await this.exchange.fetchTicker(symbol);
       return this.normalizeTicker(ticker);
     }

     async fetchOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
       await this.rateLimiter.wait();
       const orderBook = await this.exchange.fetchOrderBook(symbol, limit);
       return this.normalizeOrderBook(orderBook);
     }

     async fetchMyOrders(symbol: string, limit = 50): Promise<Order[]> {
       await this.rateLimiter.wait();
       const orders = await this.exchange.fetchOrders(symbol, undefined, limit);
       return orders.map(this.normalizeOrder);
     }

     private handleError(error: any): ExchangeError {
       // 统一错误处理
       if (error instanceof ccxt.NetworkError) {
         return new ExchangeNetworkError(error.message);
       }
       if (error instanceof ccxt.AuthenticationError) {
         return new ExchangeAuthError(error.message);
       }
       return new ExchangeGenericError(error.message);
     }

     private normalizeBalance(raw: any): Balance {
       // 标准化数据格式
       return {
         free: raw.free,
         used: raw.used,
         total: raw.total,
       };
     }
   }
   ```

3. **限流器实现** (3h)
   ```typescript
   // src/utils/rate-limiter.ts
   export class RateLimiter {
     private queue: number[] = [];
     private maxRequests: number;
     private interval: number;

     constructor(config: { maxRequests: number; interval: number }) {
       this.maxRequests = config.maxRequests;
       this.interval = config.interval;
     }

     async wait(): Promise<void> {
       const now = Date.now();
       this.queue = this.queue.filter(t => now - t < this.interval);

       if (this.queue.length >= this.maxRequests) {
         const oldestRequest = this.queue[0];
         const waitTime = this.interval - (now - oldestRequest);
         await new Promise(resolve => setTimeout(resolve, waitTime));
         return this.wait();
       }

       this.queue.push(now);
     }
   }
   ```

4. **连接器工厂** (2h)
   ```typescript
   // src/services/connector-factory.service.ts
   export class ConnectorFactory {
     private connectors = new Map<string, BinanceConnector>();

     getConnector(apiKeyId: string): BinanceConnector {
       if (!this.connectors.has(apiKeyId)) {
         const credentials = await this.fetchCredentials(apiKeyId);
         const connector = new BinanceConnector(
           credentials.apiKey,
           credentials.secretKey
         );
         this.connectors.set(apiKeyId, connector);
       }
       return this.connectors.get(apiKeyId)!;
     }

     removeConnector(apiKeyId: string): void {
       this.connectors.delete(apiKeyId);
     }
   }
   ```

5. **API 端点** (4h)
   ```typescript
   // GET /api/v1/exchanges/binance/balance
   // 查询账户余额
   Headers: { X-API-Key-ID: string }
   Response: {
     balances: [
       { asset: 'BTC', free: '1.5', locked: '0.5', total: '2.0' },
       { asset: 'USDT', free: '10000', locked: '0', total: '10000' }
     ]
   }

   // GET /api/v1/exchanges/binance/ticker/:symbol
   // 获取行情快照
   Response: {
     symbol: 'BTC/USDT',
     last: 45000,
     bid: 44999,
     ask: 45001,
     volume: 12345,
     timestamp: '...'
   }

   // GET /api/v1/exchanges/binance/orderbook/:symbol
   // 获取订单簿
   Response: {
     symbol: 'BTC/USDT',
     bids: [[44999, 1.5], [44998, 2.0]],
     asks: [[45001, 1.2], [45002, 3.0]],
     timestamp: '...'
   }

   // GET /api/v1/exchanges/binance/orders
   // 查询订单历史
   Query: { symbol?: string, limit?: number }
   Response: {
     orders: [{
       id: '12345',
       symbol: 'BTC/USDT',
       type: 'limit',
       side: 'buy',
       price: 45000,
       amount: 0.1,
       status: 'closed',
       createdAt: '...'
     }]
   }
   ```

6. **重试机制** (2h)
   ```typescript
   // src/utils/retry.ts
   export async function retryWithBackoff<T>(
     fn: () => Promise<T>,
     maxRetries = 3
   ): Promise<T> {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
     throw new Error('Max retries reached');
   }
   ```

#### 测试任务
1. **单元测试** (4h)
   - 数据标准化函数测试
   - 错误处理测试
   - 限流器测试

2. **集成测试** (5h)
   - Mock CCXT 响应测试各 API
   - 重试机制测试
   - 连接池测试

3. **真实环境测试** (3h)
   - 使用币安测试网验证功能
   - 性能基准测试

### 依赖项

- DELTA-004 完成（API 密钥管理）
- 币安测试网账户（用于测试）

### 技术风险

- **API 限流超限**：请求过快被封禁 → 严格限流控制 + 请求队列
- **数据格式变更**：CCXT 库更新导致数据结构变化 → 版本锁定 + 标准化层
- **网络不稳定**：WebSocket 连接频繁断开 → 自动重连 + 心跳检测

---

## Story 2.3: 实时市场数据订阅（WebSocket）

**Story ID**: DELTA-006
**优先级**: P1
**复杂度**: 8 points (复杂)
**依赖**: DELTA-005

### 用户故事

**作为** 交易策略引擎
**我想要** 实时接收市场数据推送
**以便** 及时响应市场变化并执行交易决策

### 验收标准

#### WebSocket 连接
- [ ] 建立与币安 WebSocket 服务器的稳定连接
- [ ] 支持订阅以下数据流：
  - 实时价格（Ticker）
  - 实时成交（Trade）
  - 深度更新（Order Book Depth）
  - K 线数据（Kline/Candlestick）
- [ ] 支持多交易对同时订阅（最多 50 个）
- [ ] 动态订阅/取消订阅

#### 数据处理
- [ ] 数据标准化（统一格式）
- [ ] 数据完整性校验（序列号检查）
- [ ] 本地订单簿维护（增量更新）
- [ ] 数据延迟监控（timestamp 对比）

#### 连接稳定性
- [ ] 自动重连机制（断线后 5 秒内重连）
- [ ] 心跳检测（30 秒无数据自动 ping）
- [ ] 订阅状态恢复（重连后自动重新订阅）
- [ ] 连接健康检查

#### 数据分发
- [ ] 使用 Redis Pub/Sub 分发数据到消费者
- [ ] 支持多订阅者（策略引擎、UI 客户端等）
- [ ] 数据缓存（最新 100 条 Trade、最新 Order Book）

#### 性能要求
- [ ] 数据延迟 < 100ms（从币安接收到分发）
- [ ] 支持 1000+ 消息/秒吞吐量
- [ ] 内存占用 < 500MB（单个连接器实例）

### 技术任务分解

#### 后端任务 (data-pipeline/market-data-collector)
1. **项目初始化** (1h)
   - 安装依赖（ws, ccxt）
   - TypeScript 配置

2. **WebSocket 管理器** (6h)
   ```typescript
   // src/services/binance-websocket.service.ts
   import WebSocket from 'ws';

   export class BinanceWebSocketService {
     private ws: WebSocket | null = null;
     private subscriptions = new Set<string>();
     private reconnectTimer: NodeJS.Timeout | null = null;
     private heartbeatTimer: NodeJS.Timeout | null = null;

     constructor(
       private dataHandler: MarketDataHandler,
       private redisPublisher: RedisPublisher
     ) {}

     connect(): void {
       const wsUrl = 'wss://stream.binance.com:9443/ws';
       this.ws = new WebSocket(wsUrl);

       this.ws.on('open', () => {
         console.log('Binance WebSocket connected');
         this.startHeartbeat();
         this.resubscribeAll();
       });

       this.ws.on('message', (data: string) => {
         this.handleMessage(JSON.parse(data));
       });

       this.ws.on('error', (error) => {
         console.error('WebSocket error:', error);
       });

       this.ws.on('close', () => {
         console.log('WebSocket closed, reconnecting...');
         this.scheduleReconnect();
       });
     }

     subscribe(symbol: string, streams: string[]): void {
       // streams: ['ticker', 'trade', 'depth', 'kline_1m']
       const formattedSymbol = symbol.toLowerCase().replace('/', '');

       streams.forEach(stream => {
         const streamName = `${formattedSymbol}@${stream}`;
         this.subscriptions.add(streamName);
       });

       if (this.ws?.readyState === WebSocket.OPEN) {
         this.sendSubscribe(Array.from(this.subscriptions));
       }
     }

     unsubscribe(symbol: string, streams: string[]): void {
       const formattedSymbol = symbol.toLowerCase().replace('/', '');

       streams.forEach(stream => {
         const streamName = `${formattedSymbol}@${stream}`;
         this.subscriptions.delete(streamName);
       });

       if (this.ws?.readyState === WebSocket.OPEN) {
         this.sendUnsubscribe(streams);
       }
     }

     private handleMessage(data: any): void {
       const { e: eventType, s: symbol } = data;

       switch (eventType) {
         case '24hrTicker':
           this.handleTicker(data);
           break;
         case 'trade':
           this.handleTrade(data);
           break;
         case 'depthUpdate':
           this.handleDepthUpdate(data);
           break;
         case 'kline':
           this.handleKline(data);
           break;
       }
     }

     private handleTicker(data: any): void {
       const ticker = {
         symbol: data.s,
         price: parseFloat(data.c),
         volume: parseFloat(data.v),
         high: parseFloat(data.h),
         low: parseFloat(data.l),
         timestamp: data.E,
       };

       // 发布到 Redis
       this.redisPublisher.publish('market:ticker', ticker);
     }

     private handleTrade(data: any): void {
       const trade = {
         symbol: data.s,
         price: parseFloat(data.p),
         quantity: parseFloat(data.q),
         side: data.m ? 'sell' : 'buy',  // m=true 表示买方是 maker
         timestamp: data.T,
       };

       this.redisPublisher.publish('market:trade', trade);
     }

     private handleDepthUpdate(data: any): void {
       // 维护本地订单簿
       this.dataHandler.updateOrderBook(data.s, {
         bids: data.b.map((b: any) => [parseFloat(b[0]), parseFloat(b[1])]),
         asks: data.a.map((a: any) => [parseFloat(a[0]), parseFloat(a[1])]),
         lastUpdateId: data.u,
       });
     }

     private startHeartbeat(): void {
       this.heartbeatTimer = setInterval(() => {
         if (this.ws?.readyState === WebSocket.OPEN) {
           this.ws.ping();
         }
       }, 30000);  // 30 秒心跳
     }

     private scheduleReconnect(): void {
       if (this.reconnectTimer) return;

       this.reconnectTimer = setTimeout(() => {
         this.reconnectTimer = null;
         this.connect();
       }, 5000);  // 5 秒后重连
     }

     private resubscribeAll(): void {
       if (this.subscriptions.size > 0) {
         this.sendSubscribe(Array.from(this.subscriptions));
       }
     }

     private sendSubscribe(streams: string[]): void {
       this.ws?.send(JSON.stringify({
         method: 'SUBSCRIBE',
         params: streams,
         id: Date.now(),
       }));
     }

     disconnect(): void {
       this.ws?.close();
       if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
       if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
     }
   }
   ```

3. **订单簿管理器** (4h)
   ```typescript
   // src/services/orderbook-manager.service.ts
   export class OrderBookManager {
     private orderBooks = new Map<string, OrderBook>();

     updateOrderBook(symbol: string, update: DepthUpdate): void {
       let book = this.orderBooks.get(symbol);

       if (!book) {
         book = { bids: [], asks: [], lastUpdateId: 0 };
         this.orderBooks.set(symbol, book);
       }

       // 应用增量更新
       this.applyDepthUpdate(book, update);

       // 发布到 Redis
       this.publishOrderBook(symbol, book);
     }

     private applyDepthUpdate(book: OrderBook, update: DepthUpdate): void {
       // 更新 bids
       update.bids.forEach(([price, quantity]) => {
         if (quantity === 0) {
           // 移除该价格档位
           book.bids = book.bids.filter(b => b[0] !== price);
         } else {
           const index = book.bids.findIndex(b => b[0] === price);
           if (index >= 0) {
             book.bids[index] = [price, quantity];
           } else {
             book.bids.push([price, quantity]);
           }
         }
       });

       // 按价格降序排序
       book.bids.sort((a, b) => b[0] - a[0]);

       // 只保留前 20 档
       book.bids = book.bids.slice(0, 20);

       // 同理处理 asks
       // ...
     }

     getOrderBook(symbol: string): OrderBook | null {
       return this.orderBooks.get(symbol) || null;
     }
   }
   ```

4. **Redis 发布器** (2h)
   ```typescript
   // src/services/redis-publisher.service.ts
   import Redis from 'ioredis';

   export class RedisPublisher {
     private redis: Redis;

     constructor() {
       this.redis = new Redis({
         host: process.env.REDIS_HOST,
         port: Number(process.env.REDIS_PORT),
       });
     }

     publish(channel: string, data: any): void {
       this.redis.publish(channel, JSON.stringify(data));
     }

     // 缓存最新数据
     async cacheLatestTicker(symbol: string, ticker: Ticker): Promise<void> {
       await this.redis.setex(
         `ticker:${symbol}`,
         60,  // 60 秒过期
         JSON.stringify(ticker)
       );
     }

     async getLatestTicker(symbol: string): Promise<Ticker | null> {
       const data = await this.redis.get(`ticker:${symbol}`);
       return data ? JSON.parse(data) : null;
     }
   }
   ```

5. **API 端点** (3h)
   ```typescript
   // POST /api/v1/market-data/subscribe
   // 订阅市场数据
   Body: {
     symbols: ['BTC/USDT', 'ETH/USDT'],
     streams: ['ticker', 'trade']
   }
   Response: { success: true, subscribedCount: 2 }

   // POST /api/v1/market-data/unsubscribe
   // 取消订阅
   Body: { symbols: ['BTC/USDT'], streams: ['ticker'] }
   Response: { success: true }

   // GET /api/v1/market-data/orderbook/:symbol
   // 获取最新订单簿
   Response: {
     symbol: 'BTC/USDT',
     bids: [[45000, 1.5], [44999, 2.0]],
     asks: [[45001, 1.2], [45002, 3.0]],
     timestamp: '...'
   }

   // WebSocket 端点（用于前端实时数据）
   // ws://api.delta-terminal.com/ws/market-data
   // Client 订阅：{ action: 'subscribe', symbols: ['BTC/USDT'] }
   // Server 推送：{ type: 'ticker', data: {...} }
   ```

#### 前端任务 (frontend/web-app)
1. **WebSocket 客户端** (4h)
   ```typescript
   // src/hooks/useMarketData.ts
   export function useMarketData(symbols: string[]) {
     const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());

     useEffect(() => {
       const ws = new WebSocket('ws://localhost:3000/ws/market-data');

       ws.onopen = () => {
         ws.send(JSON.stringify({
           action: 'subscribe',
           symbols,
         }));
       };

       ws.onmessage = (event) => {
         const message = JSON.parse(event.data);
         if (message.type === 'ticker') {
           setTickers(prev => new Map(prev).set(message.data.symbol, message.data));
         }
       };

       return () => ws.close();
     }, [symbols]);

     return tickers;
   }
   ```

2. **实时行情组件** (3h)
   - 价格闪烁效果（上涨绿色，下跌红色）
   - 订单簿深度图
   - 成交记录滚动列表

#### 测试任务
1. **单元测试** (3h)
   - 订单簿更新逻辑测试
   - 数据标准化测试

2. **集成测试** (4h)
   - Mock WebSocket 服务器测试订阅流程
   - 重连机制测试
   - 数据分发测试

3. **压力测试** (3h)
   - 模拟 1000 消息/秒吞吐量
   - 内存泄漏检测

### 依赖项

- DELTA-005 完成（交易所连接器）
- Redis 部署
- WebSocket 服务器框架（如 Socket.IO 或原生 ws）

### 技术风险

- **数据丢失**：网络抖动导致消息丢失 → 序列号检查 + 定期全量同步
- **内存泄漏**：长时间运行订单簿数据堆积 → 定期清理 + 内存监控
- **连接风暴**：大量客户端同时连接 → 连接限流 + 负载均衡

---

## Epic 级别的 DoD (Definition of Done)

- [ ] 所有 Story 验收标准通过
- [ ] 安全审计通过（API 密钥加密存储验证）
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 支持币安现货市场 200+ 交易对
- [ ] WebSocket 连接稳定性测试通过（24 小时运行无崩溃）
- [ ] 性能基准达标（延迟 < 100ms）
- [ ] API 文档完成（Swagger）
- [ ] 部署到 Staging 环境验证
- [ ] 监控面板配置完成（Grafana Dashboard）

---

## 技术栈确认

### 后端
- **交易库**: CCXT
- **WebSocket**: ws (原生) 或 Socket.IO
- **消息队列**: Redis Pub/Sub
- **数据库**: PostgreSQL (存储 API 密钥) + Redis (缓存市场数据)

### 前端
- **WebSocket 客户端**: 原生 WebSocket API
- **状态管理**: Zustand
- **图表**: Lightweight Charts (TradingView)

---

## 参考资料

- [币安 API 文档](https://binance-docs.github.io/apidocs/spot/en/)
- [CCXT 文档](https://docs.ccxt.com/)
- [WebSocket 最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [加密货币交易所安全最佳实践](https://www.sans.org/white-papers/cryptocurrency-exchange-security/)

---

**最后更新**: 2025-12-24
**负责人**: 后端团队 Lead + 交易引擎团队
**审核人**: Tech Lead + Security Officer
