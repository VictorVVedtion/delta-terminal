#!/bin/bash
# 测试运行脚本

set -e

echo "========================================="
echo "Delta Terminal NLP Processor 测试套件"
echo "========================================="
echo ""

# 检查是否安装了 pytest
if ! command -v pytest &> /dev/null; then
    echo "错误: pytest 未安装"
    echo "请运行: pip install pytest pytest-asyncio pytest-cov"
    exit 1
fi

# 运行测试
echo "运行测试..."
echo ""

# 基本测试
pytest tests/ -v --tb=short

echo ""
echo "========================================="
echo "测试完成!"
echo "========================================="
