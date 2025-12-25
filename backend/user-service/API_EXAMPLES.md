# User Service - API 使用示例

本文档提供常见 API 调用的示例。

## 基础 URL

```
http://localhost:3002/api/v1
```

## 1. 用户管理

### 1.1 创建用户

```bash
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "SecurePass123",
    "firstName": "Alice",
    "lastName": "Smith"
  }'
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "username": "alice",
    "firstName": "Alice",
    "lastName": "Smith",
    "role": "USER",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2025-12-24T10:00:00.000Z"
  }
}
```

### 1.2 获取用户列表（分页）

```bash
# 基础查询
curl "http://localhost:3002/api/v1/users?page=1&limit=10"

# 搜索用户
curl "http://localhost:3002/api/v1/users?search=alice"

# 按角色过滤
curl "http://localhost:3002/api/v1/users?role=ADMIN"

# 综合查询
curl "http://localhost:3002/api/v1/users?page=1&limit=20&search=alice&isActive=true&sortBy=createdAt&sortOrder=desc"
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alice@example.com",
      "username": "alice",
      "role": "USER"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 1.3 获取单个用户

```bash
curl http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000
```

### 1.4 更新用户信息

```bash
curl -X PATCH http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Johnson",
    "avatar": "https://example.com/avatars/alice.jpg"
  }'
```

### 1.5 更新密码

```bash
curl -X POST http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123",
    "newPassword": "NewSecurePass456"
  }'
```

### 1.6 删除用户

```bash
curl -X DELETE http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000
```

## 2. 用户资料

### 2.1 获取用户资料

```bash
curl http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/profile
```

### 2.2 更新用户资料

```bash
curl -X PATCH http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/profile \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced crypto trader",
    "country": "United States",
    "city": "New York",
    "riskTolerance": "high",
    "experience": "advanced",
    "twitter": "@alice_trader",
    "telegram": "@alice_crypto"
  }'
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "profile-id",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "bio": "Experienced crypto trader",
    "country": "United States",
    "city": "New York",
    "riskTolerance": "high",
    "experience": "advanced",
    "twitter": "@alice_trader",
    "telegram": "@alice_crypto"
  }
}
```

## 3. 用户设置

### 3.1 获取用户设置

```bash
curl http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/settings
```

### 3.2 更新用户设置

```bash
curl -X PATCH http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/settings \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotifications": true,
    "tradeNotifications": true,
    "marketAlerts": false,
    "defaultExchange": "binance",
    "defaultTradingPair": "BTC/USDT",
    "defaultOrderType": "limit",
    "theme": "dark",
    "currency": "USD"
  }'
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "settings-id",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "emailNotifications": true,
    "tradeNotifications": true,
    "marketAlerts": false,
    "defaultExchange": "binance",
    "defaultTradingPair": "BTC/USDT",
    "theme": "dark",
    "currency": "USD"
  }
}
```

## 4. API 密钥管理

### 4.1 创建 API 密钥

```bash
curl -X POST http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "binance",
    "name": "My Binance Trading Key",
    "apiKey": "your-binance-api-key",
    "apiSecret": "your-binance-api-secret",
    "permissions": ["spot_trade", "read_only"]
  }'
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "apikey-id",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "exchange": "binance",
    "name": "My Binance Trading Key",
    "isActive": true,
    "permissions": ["spot_trade", "read_only"],
    "createdAt": "2025-12-24T10:00:00.000Z"
  },
  "message": "API 密钥已安全存储"
}
```

**注意**：API 密钥和密码已加密存储，响应中不会返回明文。

### 4.2 创建 OKX API 密钥（需要 Passphrase）

```bash
curl -X POST http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "okx",
    "name": "My OKX Trading Key",
    "apiKey": "your-okx-api-key",
    "apiSecret": "your-okx-api-secret",
    "passphrase": "your-okx-passphrase",
    "permissions": ["trade", "read"]
  }'
```

### 4.3 获取所有 API 密钥

```bash
# 获取用户的所有 API 密钥
curl http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys

# 按交易所过滤
curl "http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys?exchange=binance"
```

### 4.4 获取单个 API 密钥

```bash
curl http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys/apikey-id
```

### 4.5 更新 API 密钥

```bash
curl -X PATCH http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys/apikey-id \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Key Name",
    "isActive": false,
    "permissions": ["read_only"]
  }'
```

**注意**：无法通过 API 更新已存储的 `apiKey`、`apiSecret` 或 `passphrase`。如需更换密钥，请删除旧密钥并创建新密钥。

### 4.6 删除 API 密钥

```bash
curl -X DELETE http://localhost:3002/api/v1/users/550e8400-e29b-41d4-a716-446655440000/api-keys/apikey-id
```

## 5. 健康检查

```bash
curl http://localhost:3002/health
```

**响应示例**：
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T10:00:00.000Z",
  "service": "user-service",
  "version": "1.0.0"
}
```

## 使用 JavaScript/TypeScript 调用

### 使用 Fetch API

```typescript
// 创建用户
const createUser = async () => {
  const response = await fetch('http://localhost:3002/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'bob@example.com',
      username: 'bob',
      password: 'SecurePass123',
      firstName: 'Bob',
      lastName: 'Williams',
    }),
  });

  const data = await response.json();
  console.log(data);
};

// 获取用户列表
const getUsers = async () => {
  const response = await fetch('http://localhost:3002/api/v1/users?page=1&limit=10');
  const data = await response.json();
  console.log(data);
};

// 更新用户资料
const updateProfile = async (userId: string) => {
  const response = await fetch(`http://localhost:3002/api/v1/users/${userId}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bio: 'Professional trader',
      riskTolerance: 'medium',
      experience: 'intermediate',
    }),
  });

  const data = await response.json();
  console.log(data);
};
```

### 使用 Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建用户
const createUser = async () => {
  const { data } = await api.post('/users', {
    email: 'charlie@example.com',
    username: 'charlie',
    password: 'SecurePass123',
  });
  return data;
};

// 获取用户
const getUser = async (userId: string) => {
  const { data } = await api.get(`/users/${userId}`);
  return data;
};

// 创建 API 密钥
const createApiKey = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/api-keys`, {
    exchange: 'binance',
    name: 'My Binance Key',
    apiKey: 'your-api-key',
    apiSecret: 'your-api-secret',
    permissions: ['spot_trade', 'read_only'],
  });
  return data;
};
```

## 错误处理

API 返回的错误格式：

```json
{
  "success": false,
  "error": "该邮箱已被注册",
  "statusCode": 400
}
```

常见错误代码：

- `400` - 请求参数错误或验证失败
- `404` - 资源不存在
- `500` - 服务器内部错误

---

更多详细信息，请访问 [Swagger 文档](http://localhost:3002/docs)
