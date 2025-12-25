#!/bin/bash

# Order Executor 快速启动脚本

set -e

echo "🚀 Delta Terminal - Order Executor 快速启动"
echo "=========================================="

# 检查 Python 版本
echo "📌 检查 Python 版本..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Python 版本: $python_version"

if ! command -v poetry &> /dev/null; then
    echo "❌ 未安装 Poetry, 正在安装..."
    curl -sSL https://install.python-poetry.org | python3 -
    echo "✅ Poetry 安装完成"
else
    echo "✅ Poetry 已安装"
fi

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
poetry install

# 配置环境变量
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件, 请编辑配置"
    echo ""
    echo "⚠️  重要: 请在 .env 文件中配置以下参数:"
    echo "   - EXCHANGE_API_KEY"
    echo "   - EXCHANGE_SECRET"
    echo "   - REDIS_HOST (如果使用 Docker, 保持默认)"
    echo ""
    read -p "按 Enter 继续..."
fi

# 启动 Docker Compose (可选)
echo ""
read -p "是否使用 Docker Compose 启动依赖服务 (Redis, PostgreSQL)? (y/n): " use_docker

if [ "$use_docker" = "y" ]; then
    echo "🐳 启动 Docker Compose..."
    docker-compose up -d postgres redis
    echo "✅ Docker 服务已启动"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Redis: localhost:6379"
    sleep 5
fi

# 启动服务
echo ""
echo "🎯 启动 Order Executor 服务..."
echo ""
poetry run python -m src.main
