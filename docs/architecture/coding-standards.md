# Delta Terminal 编码规范

> **版本**: 1.0.0
> **更新日期**: 2025-12-24
> **适用范围**: 全体开发人员

---

## 目录

1. [通用规范](#通用规范)
2. [TypeScript/JavaScript 规范](#typescriptjavascript-规范)
3. [Python 规范](#python-规范)
4. [API 设计规范](#api-设计规范)
5. [数据库规范](#数据库规范)
6. [Git 提交规范](#git-提交规范)
7. [代码审查](#代码审查)

---

## 通用规范

### 1. 编码原则

#### SOLID 原则

- **S**ingle Responsibility: 单一职责
- **O**pen/Closed: 开闭原则
- **L**iskov Substitution: 里氏替换
- **I**nterface Segregation: 接口隔离
- **D**ependency Inversion: 依赖倒置

#### DRY (Don't Repeat Yourself)

避免重复代码，提取公共逻辑。

```typescript
// ❌ 不好
function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return user;
}

function getStrategyById(id: string) {
  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) throw new Error('Strategy not found');
  return strategy;
}

// ✅ 好
function findOrThrow<T>(
  promise: Promise<T | null>,
  errorMessage: string
): Promise<T> {
  const result = await promise;
  if (!result) throw new Error(errorMessage);
  return result;
}

const user = await findOrThrow(
  prisma.user.findUnique({ where: { id } }),
  'User not found'
);
```

#### KISS (Keep It Simple, Stupid)

保持代码简单易懂。

```typescript
// ❌ 过度复杂
const isValid = !!(user && user.email && user.email.includes('@'));

// ✅ 简单清晰
const isValid = user?.email?.includes('@') ?? false;
```

### 2. 命名规范

#### 通用命名

- **有意义**: 名称应该准确描述变量/函数的用途
- **避免缩写**: 除非是通用缩写 (如 `id`, `url`)
- **一致性**: 同一概念使用相同名称

```typescript
// ❌ 不好
const d = new Date();
const usrs = [];
const calc = (a, b) => a + b;

// ✅ 好
const currentDate = new Date();
const users = [];
const calculateSum = (first: number, second: number) => first + second;
```

#### 布尔值命名

使用 `is`, `has`, `should`, `can` 前缀。

```typescript
// ✅ 好
const isActive = true;
const hasPermission = false;
const shouldRefresh = true;
const canEdit = false;
```

### 3. 注释规范

#### 何时写注释

- **为什么**: 解释为什么这样做
- **复杂逻辑**: 复杂算法需要注释
- **注意事项**: 标注潜在问题

```typescript
// ❌ 无用注释
// 增加计数
count++;

// ✅ 有用注释
// 使用滑动窗口算法降低内存占用
// 时间复杂度: O(n), 空间复杂度: O(1)
function maxSlidingWindow(nums: number[], k: number): number[] {
  // ...
}

// ⚠️ 注意: 此函数会修改原数组
function sortInPlace(arr: number[]): void {
  arr.sort((a, b) => a - b);
}
```

#### JSDoc/TSDoc

为公共 API 编写文档注释。

```typescript
/**
 * 创建限价订单
 *
 * @param symbol - 交易对符号 (如 "BTC/USDT")
 * @param side - 订单方向 ("buy" | "sell")
 * @param amount - 订单数量
 * @param price - 订单价格
 * @returns 订单对象
 * @throws {InsufficientFundsError} 余额不足
 * @throws {InvalidSymbolError} 无效交易对
 *
 * @example
 * ```typescript
 * const order = await createLimitOrder('BTC/USDT', 'buy', 0.1, 42000);
 * console.log(order.id);
 * ```
 */
async function createLimitOrder(
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number
): Promise<Order> {
  // ...
}
```

---

## TypeScript/JavaScript 规范

### 1. TypeScript 配置

#### tsconfig.json

```json
{
  "compilerOptions": {
    // 严格模式
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // 模块
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,

    // 输出
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // 互操作
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // 路径
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. 命名约定

```typescript
// 文件名: kebab-case
user-service.ts
create-order.dto.ts

// 类名: PascalCase
class UserService {}
class CreateOrderDto {}

// 接口: PascalCase
interface User {}
interface CreateOrderRequest {}

// 类型别名: PascalCase
type UserId = string;
type OrderStatus = 'pending' | 'filled' | 'cancelled';

// 函数/方法: camelCase
function getUserById() {}
async function createOrder() {}

// 变量: camelCase
const userName = 'John';
let orderCount = 0;

// 常量: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 私有属性: _prefix (可选)
class UserService {
  private _cache = new Map();
}

// 枚举: PascalCase
enum OrderType {
  Market = 'market',
  Limit = 'limit',
}
```

### 3. 类型定义

#### 优先使用 interface

```typescript
// ✅ 使用 interface
interface User {
  id: string;
  email: string;
  name: string;
}

// 仅在需要联合/交叉类型时使用 type
type UserId = string;
type OrderSide = 'buy' | 'sell';
type UserWithStrategy = User & { strategies: Strategy[] };
```

#### 避免 any

```typescript
// ❌ 不好
function processData(data: any) {
  return data.value;
}

// ✅ 好
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}

// 更好: 使用 Zod 验证
import { z } from 'zod';

const DataSchema = z.object({
  value: z.string(),
});

function processData(data: unknown) {
  const parsed = DataSchema.parse(data);
  return parsed.value;
}
```

#### 使用严格的类型

```typescript
// ❌ 不好: 过于宽泛
function createOrder(params: object) {}

// ✅ 好: 精确类型
interface CreateOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  amount: number;
  price?: number; // limit 订单必须
}

function createOrder(params: CreateOrderParams) {}
```

### 4. 函数编写

#### 函数长度

单个函数不超过 50 行，超过则拆分。

```typescript
// ❌ 不好: 过长
async function processOrder() {
  // 100 行代码...
}

// ✅ 好: 拆分
async function processOrder(order: Order) {
  const validated = await validateOrder(order);
  const risk = await checkRisk(validated);
  if (!risk.passed) throw new RiskError();

  const executed = await executeOrder(validated);
  await notifyUser(executed);

  return executed;
}
```

#### 参数数量

最多 3 个参数，超过则使用对象。

```typescript
// ❌ 不好: 参数过多
function createUser(name: string, email: string, age: number, role: string) {}

// ✅ 好: 使用对象
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  role: string;
}

function createUser(params: CreateUserParams) {}
```

#### 单一职责

```typescript
// ❌ 不好: 做多件事
async function getUserAndOrders(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const orders = await prisma.order.findMany({ where: { userId } });
  return { user, orders };
}

// ✅ 好: 单一职责
async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function getUserOrders(userId: string) {
  return prisma.order.findMany({ where: { userId } });
}
```

### 5. 异步处理

#### 使用 async/await

```typescript
// ❌ 不好: Promise 链
function getUser(id: string) {
  return prisma.user
    .findUnique({ where: { id } })
    .then((user) => {
      if (!user) throw new Error('Not found');
      return user;
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}

// ✅ 好: async/await
async function getUser(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Not found');
    return user;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

#### 并行执行

```typescript
// ❌ 不好: 串行
const user = await getUser(userId);
const orders = await getOrders(userId);
const strategies = await getStrategies(userId);

// ✅ 好: 并行
const [user, orders, strategies] = await Promise.all([
  getUser(userId),
  getOrders(userId),
  getStrategies(userId),
]);
```

### 6. 错误处理

#### 自定义错误类

```typescript
// shared/errors/custom-errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// 使用
if (!user) {
  throw new NotFoundError('User');
}
```

#### 统一错误处理

```typescript
// api-gateway/middleware/error-handler.ts
export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.name,
      message: error.message,
      code: error.code,
    });
  }

  // 未知错误
  logger.error('Unhandled error', error);
  return reply.code(500).send({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
```

### 7. ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-floating-promises': 'error',

    // Import
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],

    // 通用
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
```

---

## Python 规范

### 1. PEP 8 标准

遵循 [PEP 8](https://pep8.org/) 编码规范。

#### 命名约定

```python
# 文件名: snake_case
user_service.py
create_order_dto.py

# 类名: PascalCase
class UserService:
    pass

class CreateOrderDto:
    pass

# 函数/变量: snake_case
def get_user_by_id():
    pass

user_name = "John"
order_count = 0

# 常量: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
API_BASE_URL = "https://api.example.com"

# 私有属性/方法: _prefix
class UserService:
    def __init__(self):
        self._cache = {}

    def _internal_method(self):
        pass
```

### 2. 类型标注

使用 Type Hints 提高代码可读性。

```python
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime

# ✅ 函数类型标注
def create_order(
    symbol: str,
    side: str,
    amount: Decimal,
    price: Optional[Decimal] = None
) -> Dict[str, Any]:
    """创建订单"""
    return {
        "symbol": symbol,
        "side": side,
        "amount": amount,
        "price": price,
    }

# ✅ 类属性类型标注
class Order:
    id: str
    symbol: str
    amount: Decimal
    created_at: datetime

    def __init__(self, id: str, symbol: str, amount: Decimal):
        self.id = id
        self.symbol = symbol
        self.amount = amount
        self.created_at = datetime.now()
```

### 3. Docstring 规范

使用 Google Style Docstring。

```python
def calculate_profit(
    entry_price: Decimal,
    exit_price: Decimal,
    quantity: Decimal
) -> Decimal:
    """计算交易利润

    Args:
        entry_price: 入场价格
        exit_price: 出场价格
        quantity: 交易数量

    Returns:
        利润金额

    Raises:
        ValueError: 价格或数量为负数

    Examples:
        >>> calculate_profit(Decimal('40000'), Decimal('42000'), Decimal('0.1'))
        Decimal('200.0')
    """
    if entry_price < 0 or exit_price < 0 or quantity < 0:
        raise ValueError("价格和数量必须为正数")

    return (exit_price - entry_price) * quantity
```

### 4. 代码格式化

#### Black

```bash
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py311']
include = '\.pyi?$'
```

#### Ruff (Linter)

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501", # line too long (handled by black)
]
```

### 5. 异步编程

```python
import asyncio
from typing import List

# ✅ 使用 async/await
async def fetch_user(user_id: str) -> dict:
    """异步获取用户"""
    # 模拟异步操作
    await asyncio.sleep(0.1)
    return {"id": user_id, "name": "John"}

# ✅ 并发执行
async def fetch_multiple_users(user_ids: List[str]) -> List[dict]:
    """并发获取多个用户"""
    tasks = [fetch_user(uid) for uid in user_ids]
    return await asyncio.gather(*tasks)

# 使用
users = await fetch_multiple_users(["1", "2", "3"])
```

### 6. 依赖注入

```python
from typing import Protocol

# 定义接口
class ExchangeConnector(Protocol):
    async def create_order(self, symbol: str, side: str, amount: float) -> dict:
        ...

# 实现
class BinanceConnector:
    async def create_order(self, symbol: str, side: str, amount: float) -> dict:
        # 实际实现
        pass

# 依赖注入
class OrderExecutor:
    def __init__(self, exchange: ExchangeConnector):
        self.exchange = exchange

    async def execute(self, order: dict):
        return await self.exchange.create_order(
            order["symbol"],
            order["side"],
            order["amount"]
        )

# 使用
connector = BinanceConnector()
executor = OrderExecutor(connector)
```

---

## API 设计规范

### 1. RESTful 规范

#### 资源命名

```
✅ 好
GET    /api/v1/users
GET    /api/v1/users/{id}
POST   /api/v1/users
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}

❌ 不好
GET    /api/v1/getUsers
POST   /api/v1/createUser
POST   /api/v1/user/delete
```

#### HTTP 状态码

```typescript
200 OK              // 成功 (GET, PUT)
201 Created         // 创建成功 (POST)
204 No Content      // 删除成功 (DELETE)
400 Bad Request     // 请求参数错误
401 Unauthorized    // 未认证
403 Forbidden       // 无权限
404 Not Found       // 资源不存在
409 Conflict        // 资源冲突
422 Unprocessable   // 验证失败
500 Internal Error  // 服务器错误
```

#### 响应格式

```typescript
// ✅ 成功响应
{
  "data": {
    "id": "123",
    "name": "BTC Trend Strategy"
  },
  "meta": {
    "timestamp": "2025-12-24T10:00:00Z"
  }
}

// ✅ 错误响应
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid symbol format",
    "details": [
      {
        "field": "symbol",
        "message": "Must be in format BASE/QUOTE"
      }
    ]
  }
}

// ✅ 分页响应
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. API 版本控制

使用 URL 版本控制。

```
/api/v1/strategies
/api/v2/strategies  // 新版本
```

### 3. 请求验证

使用 Zod 验证请求数据。

```typescript
import { z } from 'zod';

// 定义 Schema
const CreateStrategySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['trend', 'grid', 'arbitrage']),
  config: z.object({
    symbols: z.array(z.string()),
    maxPosition: z.number().positive(),
  }),
});

type CreateStrategyDto = z.infer<typeof CreateStrategySchema>;

// 验证
fastify.post('/api/v1/strategies', async (request, reply) => {
  try {
    const data = CreateStrategySchema.parse(request.body);
    const strategy = await createStrategy(data);
    return reply.code(201).send({ data: strategy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    throw error;
  }
});
```

---

## 数据库规范

### 1. 命名规范

```sql
-- 表名: snake_case 复数
users
strategies
order_executions

-- 列名: snake_case
user_id
created_at
is_active

-- 索引: idx_{table}_{columns}
idx_users_email
idx_strategies_user_id_is_active

-- 外键: fk_{table}_{referenced_table}
fk_strategies_users
```

### 2. 迁移管理

使用 Prisma Migrate。

```bash
# 创建迁移
npx prisma migrate dev --name add_user_role

# 应用迁移
npx prisma migrate deploy

# 回滚 (慎用)
npx prisma migrate reset
```

---

## Git 提交规范

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

```
feat:     新功能
fix:      修复 bug
docs:     文档更新
style:    代码格式调整 (不影响逻辑)
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/工具链更新
ci:       CI/CD 配置
```

#### 示例

```bash
# ✅ 好的提交
feat(auth): add OAuth2 login support

Implement Google and GitHub OAuth2 login flow.
Add new endpoints: /auth/google, /auth/github

Closes #123

# ✅ 修复 bug
fix(trading): prevent duplicate order execution

Add idempotency key check to avoid duplicate orders
when retry mechanism is triggered.

Fixes #456

# ✅ 文档
docs(api): update strategy API documentation

# ✅ 重构
refactor(user-service): simplify user validation logic
```

---

## 代码审查

### 审查清单

#### 功能

- [ ] 代码实现了需求
- [ ] 边界条件处理正确
- [ ] 错误处理完善

#### 质量

- [ ] 命名清晰易懂
- [ ] 无重复代码
- [ ] 函数单一职责
- [ ] 类型定义准确

#### 安全

- [ ] 输入验证
- [ ] 敏感数据加密
- [ ] SQL 注入防护
- [ ] XSS 防护

#### 性能

- [ ] 无 N+1 查询
- [ ] 合理使用缓存
- [ ] 避免阻塞操作

#### 测试

- [ ] 单元测试覆盖
- [ ] 测试用例充分

---

**文档维护**: 技术委员会
**审核周期**: 季度
