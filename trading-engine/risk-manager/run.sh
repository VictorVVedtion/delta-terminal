#!/bin/bash

# Risk Manager 启动脚本

set -e

echo "🚀 Starting Risk Manager..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, using .env.example"
    cp .env.example .env
fi

# 检查 Redis
echo "🔍 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   brew services start redis  # macOS"
    echo "   sudo systemctl start redis # Linux"
    echo "   docker run -d -p 6379:6379 redis:7-alpine # Docker"
    exit 1
fi
echo "✅ Redis is running"

# 检查 Python 版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"
if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "❌ Python 3.11+ is required (current: $python_version)"
    exit 1
fi
echo "✅ Python version: $python_version"

# 检查 Poetry
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Installing..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi
echo "✅ Poetry is installed"

# 安装依赖
echo "📦 Installing dependencies..."
poetry install --no-interaction --no-ansi

# 启动服务
echo "🎯 Starting Risk Manager Service..."
echo "📍 Service will be available at: http://localhost:8004"
echo "📚 API Documentation: http://localhost:8004/docs"
echo ""

poetry run python src/main.py
