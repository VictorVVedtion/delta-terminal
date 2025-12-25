#!/bin/bash

# Risk Manager API 测试脚本

BASE_URL="http://localhost:8004"
API_PREFIX="/api/v1"

echo "🧪 Testing Risk Manager API..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"

    if [ -z "$data" ]; then
        response=$(curl -s -X ${method} "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi

    if echo "$response" | jq . > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Success${NC}"
        echo "$response" | jq '.'
    else
        echo -e "  ${RED}✗ Failed${NC}"
        echo "$response"
    fi
    echo ""
}

# 1. 健康检查
test_endpoint "GET" "/health" "" "Health Check"

# 2. 获取根路径
test_endpoint "GET" "/" "" "Root Endpoint"

# 3. 获取风控配置
test_endpoint "GET" "${API_PREFIX}/limits/config" "" "Get Risk Limits Config"

# 4. 验证订单 - 正常订单
test_endpoint "POST" "${API_PREFIX}/limits/validate-order" '{
  "user_id": "test_user_001",
  "symbol": "BTCUSDT",
  "side": "buy",
  "quantity": 0.1,
  "price": 50000,
  "order_type": "limit",
  "leverage": 3
}' "Validate Order - Normal"

# 5. 验证订单 - 大额订单
test_endpoint "POST" "${API_PREFIX}/limits/validate-order" '{
  "user_id": "test_user_001",
  "symbol": "BTCUSDT",
  "side": "buy",
  "quantity": 10,
  "price": 50000,
  "order_type": "limit"
}' "Validate Order - Large Size"

# 6. 检查持仓
test_endpoint "POST" "${API_PREFIX}/limits/check-position" '{
  "user_id": "test_user_001"
}' "Check Position Risk"

# 7. 获取风险报告
test_endpoint "GET" "${API_PREFIX}/reports/test_user_001" "" "Get Risk Report"

# 8. 获取风险摘要
test_endpoint "GET" "${API_PREFIX}/reports/test_user_001/summary" "" "Get Risk Summary"

# 9. 获取告警列表
test_endpoint "GET" "${API_PREFIX}/alerts/test_user_001?page=1&page_size=10" "" "Get Alerts List"

# 10. 获取活跃告警数量
test_endpoint "GET" "${API_PREFIX}/alerts/test_user_001/stats/count" "" "Get Active Alerts Count"

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📚 Full API Documentation: ${BASE_URL}/docs"
