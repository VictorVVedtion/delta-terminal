#!/bin/bash

# NLP Processor 快速设置脚本

set -e

echo "🚀 Delta Terminal NLP Processor - 快速设置"
echo "=========================================="

# 检查 Python 版本
echo "📋 检查 Python 版本..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ 错误: 需要 Python 3.11 或更高版本"
    echo "   当前版本: $python_version"
    exit 1
fi

echo "✅ Python 版本: $python_version"

# 检查 Poetry
echo "📋 检查 Poetry..."
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry 未安装"
    echo "📦 正在安装 Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    echo "✅ Poetry 安装完成"
else
    echo "✅ Poetry 已安装"
fi

# 安装依赖
echo "📦 安装项目依赖..."
poetry install

# 创建 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，填入必要的配置（特别是 ANTHROPIC_API_KEY）"
else
    echo "✅ .env 文件已存在"
fi

# 检查 API 密钥
if grep -q "your_anthropic_api_key_here" .env 2>/dev/null; then
    echo "⚠️  警告: 请在 .env 文件中设置 ANTHROPIC_API_KEY"
    echo "   获取 API 密钥: https://console.anthropic.com/"
fi

echo ""
echo "✨ 设置完成！"
echo ""
echo "🎯 下一步:"
echo "   1. 编辑 .env 文件，填入 ANTHROPIC_API_KEY"
echo "   2. 运行 'make dev' 启动开发服务器"
echo "   3. 访问 http://localhost:8001/docs 查看 API 文档"
echo ""
echo "💡 常用命令:"
echo "   make dev          - 启动开发服务器"
echo "   make test         - 运行测试"
echo "   make format       - 格式化代码"
echo "   make docker-build - 构建 Docker 镜像"
echo ""
