#!/bin/bash

# 数据库初始化脚本

set -e

echo "🚀 初始化 Delta Terminal 认证服务数据库..."

# 默认配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-delta_terminal}
DB_USER=${DB_USER:-postgres}

# 检查 PostgreSQL 是否运行
echo "📡 检查 PostgreSQL 连接..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "❌ 无法连接到 PostgreSQL"
    echo "请确保 PostgreSQL 正在运行: $DB_HOST:$DB_PORT"
    exit 1
fi

echo "✅ PostgreSQL 连接成功"

# 创建数据库
echo "📦 创建数据库: $DB_NAME"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "✅ 数据库已创建或已存在"

# 运行迁移
echo "🔄 运行数据库迁移..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo "  - 执行: $(basename "$migration")"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
    fi
done

echo "✅ 数据库迁移完成"
echo ""
echo "🎉 数据库初始化成功!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "数据库: $DB_NAME"
echo "主机: $DB_HOST:$DB_PORT"
echo "用户: $DB_USER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
