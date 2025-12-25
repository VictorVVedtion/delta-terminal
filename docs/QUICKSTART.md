# Delta Terminal 快速开始指南

本指南将帮助你在 5 分钟内启动 Delta Terminal 开发环境。

## 前置要求检查

在开始之前,请确保已安装以下软件:

```bash
# 检查 Node.js 版本 (需要 >= 18.17.0)
node --version

# 检查 pnpm 版本 (需要 >= 8.0.0)
pnpm --version

# 检查 PostgreSQL
psql --version

# 检查 Redis
redis-cli --version
```

如果缺少任何工具,请参考 [安装指南](./INSTALLATION.md)

## 第一步: 克隆项目

```bash
git clone <repository-url>
cd delta-terminal
```

## 第二步: 安装依赖

使用 pnpm 安装所有 monorepo 依赖:

```bash
# 安装根依赖和所有工作区依赖
pnpm install
```

这将安装所有模块的依赖,包括:
- 前端 (Next.js, React, TailwindCSS)
- 后端 (Fastify, PostgreSQL, Redis)
- 共享库 (TypeScript, Zod)

## 第三步: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 使用你喜欢的编辑器编辑 .env
# 至少需要配置以下关键变量:
# - JWT_SECRET
# - POSTGRES_PASSWORD
# - ANTHROPIC_API_KEY (用于 AI 功能)
```

## 第四步: 启动数据库

### 使用 Docker (推荐)

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d postgres redis

# 检查容器状态
docker-compose ps
```

### 本地安装

如果你本地已安装 PostgreSQL 和 Redis:

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql

# 启动 Redis
sudo systemctl start redis

# 创建数据库
createdb delta_terminal
```

## 第五步: 运行数据库迁移

```bash
# 初始化数据库表结构
pnpm db:migrate
```

## 第六步: 启动开发服务器

```bash
# 启动所有服务 (使用 Turbo)
pnpm dev
```

这将同时启动:
- **Web 应用**: http://localhost:3000
- **API 网关**: http://localhost:3001
- **认证服务**: http://localhost:3002
- **其他后端服务**

## 验证安装

### 检查 Web 应用

打开浏览器访问: http://localhost:3000

你应该能看到 Delta Terminal 的欢迎页面。

### 检查 API 网关

```bash
curl http://localhost:3001/health
```

预期响应:
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T..."
}
```

### 检查数据库连接

```bash
# 连接到 PostgreSQL
psql -U postgres -d delta_terminal -c "\dt"

# 应该能看到已创建的表
```

## 常见问题

### 端口被占用

如果看到端口冲突错误:

```bash
# 修改 .env 文件中的端口配置
PORT=3100  # 改为其他未使用的端口
```

### 数据库连接失败

检查 PostgreSQL 是否运行:

```bash
# Linux/Mac
sudo systemctl status postgresql

# 或使用 Docker
docker-compose logs postgres
```

### pnpm 命令找不到

安装 pnpm:

```bash
npm install -g pnpm
```

### TypeScript 编译错误

重新构建共享模块:

```bash
# 清理所有构建输出
pnpm clean

# 重新构建
pnpm build
```

## 下一步

- 📖 阅读 [开发指南](./DEVELOPMENT.md)
- 🏗️ 查看 [架构文档](./ARCHITECTURE.md)
- 🔧 了解 [API 文档](./API.md)
- 💡 探索 [示例代码](../examples/)

## 开发工作流

```bash
# 启动特定模块
pnpm dev --filter=@delta/web-app
pnpm dev --filter=@delta/api-gateway

# 运行测试
pnpm test

# 代码格式化
pnpm format

# 类型检查
pnpm type-check

# 构建生产版本
pnpm build
```

## 获取帮助

如果遇到问题:

1. 查看 [故障排除指南](./TROUBLESHOOTING.md)
2. 搜索 [GitHub Issues](https://github.com/your-org/delta-terminal/issues)
3. 加入 [Discord 社区](https://discord.gg/delta-terminal)
4. 发送邮件至 support@delta-terminal.com

---

**祝你开发愉快!** 🚀
