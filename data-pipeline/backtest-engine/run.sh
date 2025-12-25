#!/bin/bash

# Delta Terminal - Backtest Engine 启动脚本

set -e

echo "=========================================="
echo "Delta Terminal - Backtest Engine"
echo "=========================================="

# 检查Python版本
python_version=$(python3 --version | awk '{print $2}')
echo "Python版本: $python_version"

# 检查Poetry是否安装
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry未安装,正在安装..."
    pip install poetry
fi

# 安装依赖
if [ ! -d ".venv" ]; then
    echo "📦 安装依赖..."
    poetry install
fi

# 创建必要目录
mkdir -p logs reports

# 复制环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建.env文件..."
    cp .env.example .env
fi

# 启动服务
echo "🚀 启动回测引擎..."
poetry run python -m src.main
