#!/bin/bash

# Strategy Generator 健康检查脚本

set -e

API_URL="${API_URL:-http://localhost:8002}"
TIMEOUT=5

echo "========================================="
echo "Strategy Generator 健康检查"
echo "========================================="
echo ""
echo "检查地址: $API_URL"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查服务是否运行
echo "1. 检查服务状态..."
if curl -s -f -m $TIMEOUT "$API_URL/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 服务正在运行${NC}"
else
    echo -e "${RED}❌ 服务未运行或无法访问${NC}"
    echo ""
    echo "请检查:"
    echo "  1. 服务是否已启动: make dev 或 make docker-run"
    echo "  2. 端口是否正确: 默认8002"
    echo "  3. 防火墙是否阻止连接"
    exit 1
fi

echo ""

# 获取健康状态详情
echo "2. 获取服务详情..."
HEALTH_RESPONSE=$(curl -s -f -m $TIMEOUT "$API_URL/api/v1/health")

if [ $? -eq 0 ]; then
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"

    # 检查AI服务状态
    if echo "$HEALTH_RESPONSE" | grep -q '"status": "healthy"'; then
        echo -e "${GREEN}✅ 服务状态健康${NC}"
    elif echo "$HEALTH_RESPONSE" | grep -q '"status": "degraded"'; then
        echo -e "${YELLOW}⚠️  服务状态降级（可能缺少AI API密钥）${NC}"
    else
        echo -e "${RED}❌ 服务状态异常${NC}"
    fi
else
    echo -e "${RED}❌ 无法获取健康状态${NC}"
    exit 1
fi

echo ""

# 检查API文档
echo "3. 检查API文档..."
if curl -s -f -m $TIMEOUT "$API_URL/api/v1/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API文档可访问: $API_URL/api/v1/docs${NC}"
else
    echo -e "${YELLOW}⚠️  API文档无法访问${NC}"
fi

echo ""

# 快速功能测试
echo "4. 快速功能测试..."

# 测试快速生成端点
QUICK_TEST=$(curl -s -f -m 10 -X POST "$API_URL/api/v1/generate/quick?description=测试策略&trading_pair=BTC/USDT" 2>&1)

if [ $? -eq 0 ]; then
    if echo "$QUICK_TEST" | grep -q '"success": true'; then
        echo -e "${GREEN}✅ 策略生成功能正常${NC}"
    else
        echo -e "${YELLOW}⚠️  策略生成返回失败（可能需要配置API密钥）${NC}"
        # echo "$QUICK_TEST" | python3 -m json.tool 2>/dev/null
    fi
else
    echo -e "${RED}❌ 策略生成测试失败${NC}"
fi

echo ""

# 性能测试
echo "5. 简单性能测试..."
START_TIME=$(date +%s%N)
curl -s -f -m $TIMEOUT "$API_URL/api/v1/health" > /dev/null 2>&1
END_TIME=$(date +%s%N)
DURATION=$(( ($END_TIME - $START_TIME) / 1000000 ))

if [ $DURATION -lt 100 ]; then
    echo -e "${GREEN}✅ 响应时间: ${DURATION}ms (优秀)${NC}"
elif [ $DURATION -lt 500 ]; then
    echo -e "${GREEN}✅ 响应时间: ${DURATION}ms (良好)${NC}"
else
    echo -e "${YELLOW}⚠️  响应时间: ${DURATION}ms (较慢)${NC}"
fi

echo ""
echo "========================================="
echo "健康检查完成"
echo "========================================="
echo ""

# 总结
echo "快速访问链接:"
echo "  - 健康检查: $API_URL/api/v1/health"
echo "  - API文档: $API_URL/api/v1/docs"
echo "  - ReDoc: $API_URL/api/v1/redoc"
echo ""

# 提示
if echo "$HEALTH_RESPONSE" | grep -q '"status": "degraded"'; then
    echo -e "${YELLOW}💡 提示: 服务处于降级状态，可能未配置ANTHROPIC_API_KEY${NC}"
    echo "   请编辑 .env 文件并填入有效的API密钥"
    echo ""
fi

echo "✅ 所有检查完成！"
