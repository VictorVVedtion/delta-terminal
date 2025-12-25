#!/bin/bash

# Strategy Generator 开发环境设置脚本

set -e

echo "================================================"
echo "Strategy Generator 开发环境设置"
echo "================================================"
echo ""

# 检查Python版本
echo "检查Python版本..."
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python版本不符合要求 (需要 >= $REQUIRED_VERSION, 当前 $PYTHON_VERSION)"
    exit 1
fi

echo "✅ Python版本: $PYTHON_VERSION"
echo ""

# 检查Poetry
echo "检查Poetry..."
if ! command -v poetry &> /dev/null; then
    echo "Poetry未安装，正在安装..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
else
    echo "✅ Poetry已安装"
fi

echo ""

# 安装依赖
echo "安装项目依赖..."
poetry install

echo "✅ 依赖安装完成"
echo ""

# 设置环境变量
echo "设置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ 已创建.env文件"
    echo "⚠️  请编辑.env文件并填入ANTHROPIC_API_KEY"
else
    echo "✅ .env文件已存在"
fi

echo ""

# 创建必要目录
echo "创建必要目录..."
mkdir -p logs
mkdir -p examples
echo "✅ 目录创建完成"
echo ""

# 运行测试
echo "运行测试..."
if poetry run pytest --version &> /dev/null; then
    poetry run pytest -v
    echo "✅ 测试通过"
else
    echo "⚠️  跳过测试（pytest未安装）"
fi

echo ""
echo "================================================"
echo "✅ 开发环境设置完成!"
echo "================================================"
echo ""
echo "下一步:"
echo "  1. 编辑 .env 文件，填入 ANTHROPIC_API_KEY"
echo "  2. 运行开发服务器: make dev"
echo "  3. 访问API文档: http://localhost:8002/api/v1/docs"
echo ""
