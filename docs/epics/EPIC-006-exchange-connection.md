# Epic 006: 交易所账户连接 - Brownfield Enhancement

> 为 Delta Terminal 添加交易所 API 连接和账户管理功能

---

## Epic 元数据

| 属性 | 值 |
|------|-----|
| Epic ID | EPIC-006 |
| 名称 | 交易所账户连接 (Exchange Connection) |
| 类型 | Brownfield Enhancement |
| 优先级 | P0 (MVP 必需) |
| 预估 Stories | 4 |
| 创建日期 | 2025-12-25 |
| PRD 参考 | Feature 2.1 交易所账户连接 |
| 前置依赖 | EPIC-001 ~ EPIC-005 ✅ |

---

## Epic Goal

**让用户能够安全地连接和管理交易所账户，为策略执行奠定基础。**

核心功能：
1. **交易所选择** - 支持主流交易所 (Binance, OKX, Coinbase)
2. **API Key 管理** - 安全输入和存储 API 密钥
3. **连接状态** - 实时显示连接状态和账户信息
4. **账户管理** - 添加、编辑、删除交易所账户

---

## 支持的交易所

| 交易所 | Logo | 状态 | 备注 |
|--------|------|------|------|
| Binance | 🟡 | MVP | 全球最大交易所 |
| OKX | 🔵 | MVP | 亚洲主流 |
| Coinbase | 🔷 | Post-MVP | 美国合规 |
| Kraken | 🟣 | Post-MVP | 欧洲主流 |
| Bitfinex | 🟢 | Future | 专业交易 |

---

## 功能设计

### 交易所连接卡片

```
┌─────────────────────────────────────────────────────────────┐
│ 交易所账户                                        [+ 添加账户] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 Binance                                    [已连接] ✅ │ │
│ │    币安-主账户                                           │ │
│ │    API Key: ****...****1234                             │ │
│ │    权限: 只读 + 交易 (无提现)                            │ │
│ │    余额: $12,450.80                                     │ │
│ │    最后同步: 10 秒前                      [编辑] [断开]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔵 OKX                                       [未连接] ❌ │ │
│ │    点击添加 OKX 账户                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔷 Coinbase                                  [未连接] ❌ │ │
│ │    点击添加 Coinbase 账户                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Key 添加表单

```
┌─────────────────────────────────────────────────────────────┐
│ 连接 Binance 账户                                      [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 账户别名 *                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 币安-主账户                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ API Key *                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ API Secret *                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ****************************************                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ 安全提示:                                                │
│ • 请确保 API Key 只有「只读」和「交易」权限                  │
│ • 请勿开启「提现」权限                                      │
│ • 建议绑定 IP 白名单                                        │
│                                                             │
│ [查看如何创建 API Key →]                                    │
│                                                             │
│                              [取消]  [测试连接]  [保存]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Stories

### Story 6.1: ExchangeConnectionCard 组件

**标题**: 创建交易所连接卡片组件

**描述**:
创建可复用的交易所连接卡片，展示连接状态和账户信息。

**验收标准**:
- [ ] 显示交易所 Logo 和名称
- [ ] 显示连接状态 (已连接/未连接/连接中/错误)
- [ ] 已连接时显示账户别名、API Key 掩码、权限、余额
- [ ] 显示最后同步时间
- [ ] 提供编辑和断开按钮
- [ ] 未连接时显示添加提示

---

### Story 6.2: API Key 管理表单

**标题**: 创建 API Key 添加/编辑表单

**描述**:
创建安全的 API Key 输入表单，支持添加和编辑。

**验收标准**:
- [ ] 账户别名输入 (必填)
- [ ] API Key 输入 (必填)
- [ ] API Secret 输入 (必填, 密码类型)
- [ ] Passphrase 输入 (OKX 需要)
- [ ] 安全提示显示
- [ ] 测试连接功能
- [ ] 表单验证
- [ ] 加载状态处理

---

### Story 6.3: Exchange Store 状态管理

**标题**: 创建交易所状态管理 Store

**描述**:
使用 Zustand 创建交易所连接状态管理。

**验收标准**:
- [ ] 创建 `store/exchange.ts`
- [ ] ExchangeAccount 接口定义
- [ ] CRUD 操作 (添加/更新/删除账户)
- [ ] 连接状态管理
- [ ] 余额同步
- [ ] 持久化存储 (加密)
- [ ] 测试连接 API 模拟

---

### Story 6.4: Settings 页面集成

**标题**: 将交易所连接集成到设置页面

**描述**:
在设置页面添加交易所账户管理区域。

**验收标准**:
- [ ] Settings 页面添加交易所区域
- [ ] 显示所有支持的交易所
- [ ] 添加账户弹窗
- [ ] 编辑/删除确认
- [ ] 响应式布局

---

## 技术方案

### Exchange Store 设计

```typescript
interface ExchangeAccount {
  id: string
  exchange: 'binance' | 'okx' | 'coinbase'
  name: string  // 账户别名
  apiKey: string  // 存储时加密
  apiSecret: string  // 存储时加密
  passphrase?: string  // OKX 需要
  permissions: ('read' | 'trade' | 'withdraw')[]
  status: 'connected' | 'disconnected' | 'error'
  balance?: {
    total: number
    available: number
    currency: string
  }
  lastSync?: number
  createdAt: number
}

interface ExchangeState {
  accounts: ExchangeAccount[]
  activeAccountId: string | null

  addAccount: (account: Omit<ExchangeAccount, 'id' | 'createdAt' | 'status'>) => void
  updateAccount: (id: string, updates: Partial<ExchangeAccount>) => void
  removeAccount: (id: string) => void
  setActiveAccount: (id: string) => void
  testConnection: (id: string) => Promise<boolean>
  syncBalance: (id: string) => Promise<void>
}
```

### 安全考虑

1. **API Secret 不明文显示** - 输入后仅显示掩码
2. **本地加密存储** - 使用 AES 加密存储敏感信息
3. **权限提示** - 强调禁止开启提现权限
4. **IP 白名单建议** - 引导用户配置安全设置

---

## 文件路径

| 文件 | 路径 | 操作 |
|------|------|------|
| Exchange Store | `store/exchange.ts` | 创建 |
| ExchangeConnectionCard | `components/exchange/ExchangeConnectionCard.tsx` | 创建 |
| AddExchangeModal | `components/exchange/AddExchangeModal.tsx` | 创建 |
| ExchangeIcon | `components/exchange/ExchangeIcon.tsx` | 创建 |
| Settings Page | `app/settings/page.tsx` | 修改 |

---

## Definition of Done

- [ ] 所有 4 个 Stories 完成并通过验收
- [ ] 交易所卡片组件功能完整
- [ ] API Key 表单功能完整
- [ ] Exchange Store 状态管理正常
- [ ] Settings 页面集成完成
- [ ] TypeScript 类型检查通过
- [ ] 生产构建通过
- [ ] 无 P0/P1 级别 Bug

---

**创建时间**: 2025-12-25
**创建者**: YOLO Workflow Autonomous Agent
**来源**: PRD Feature 2.1 交易所账户连接
