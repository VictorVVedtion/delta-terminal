#!/bin/bash

echo "🔧 初始化策略服务数据库..."

# 检查 .env 文件
if [ ! -f .env ]; then
  echo "⚠️  未找到 .env 文件，从 .env.example 复制..."
  cp .env.example .env
  echo "✅ 请编辑 .env 文件配置数据库连接"
  exit 1
fi

# 生成 Prisma Client
echo "📦 生成 Prisma Client..."
pnpm prisma:generate

# 推送数据库 Schema
echo "🗄️  推送数据库 Schema..."
pnpm db:push

echo "✅ 数据库初始化完成！"
echo "🚀 运行 'pnpm dev' 启动开发服务器"
