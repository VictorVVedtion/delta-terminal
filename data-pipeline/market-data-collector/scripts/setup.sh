#!/bin/bash

# Market Data Collector 快速设置脚本

set -e

echo "================================================"
echo "🚀 Market Data Collector 快速设置"
echo "================================================"
echo ""

# 检查依赖
echo "📋 检查依赖..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.11+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose 未安装，尝试使用 docker compose"
fi

echo "✅ 依赖检查完成"
echo ""

# 创建环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建（从 .env.example 复制）"
    echo "⚠️  请根据需要修改 .env 文件中的配置"
else
    echo "ℹ️  .env 文件已存在，跳过创建"
fi
echo ""

# 安装 Python 依赖
echo "📦 安装 Python 依赖..."
if command -v poetry &> /dev/null; then
    poetry install
    echo "✅ Poetry 依赖安装完成"
else
    echo "⚠️  Poetry 未安装，跳过 Python 依赖安装"
    echo "   如需本地开发，请安装 Poetry: curl -sSL https://install.python-poetry.org | python3 -"
fi
echo ""

# 启动 Docker 服务
echo "🐳 启动 Docker 服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d redis timescale
else
    docker compose up -d redis timescale
fi

echo "⏳ 等待数据库启动..."
sleep 10

# 初始化数据库
echo "🗄️  初始化 TimescaleDB..."
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T timescale psql -U postgres -d market_data < scripts/init-db.sql
else
    docker compose exec -T timescale psql -U postgres -d market_data < scripts/init-db.sql
fi

echo "✅ 数据库初始化完成"
echo ""

# 完成
echo "================================================"
echo "✅ 设置完成！"
echo "================================================"
echo ""
echo "🎯 下一步："
echo ""
echo "1️⃣  启动服务："
echo "   make dev              # 本地开发"
echo "   或"
echo "   docker-compose up -d  # Docker 部署"
echo ""
echo "2️⃣  查看文档："
echo "   http://localhost:8003/docs"
echo ""
echo "3️⃣  测试 API："
echo "   ./scripts/example-requests.sh"
echo ""
echo "4️⃣  查看日志："
echo "   docker-compose logs -f market-data-collector"
echo ""
