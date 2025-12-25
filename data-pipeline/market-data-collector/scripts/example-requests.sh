#!/bin/bash

# Market Data Collector API 示例请求脚本

BASE_URL="http://localhost:8003"

echo "================================================"
echo "Market Data Collector API 示例请求"
echo "================================================"
echo ""

# 1. 健康检查
echo "1️⃣  健康检查"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq .
echo -e "\n"

# 2. 创建订阅
echo "2️⃣  创建订阅"
echo "POST $BASE_URL/api/v1/subscriptions"
SUBSCRIPTION_ID=$(curl -s -X POST "$BASE_URL/api/v1/subscriptions" \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "binance",
    "symbols": ["BTC/USDT", "ETH/USDT"],
    "data_types": ["ticker", "orderbook", "trade"],
    "intervals": ["1m", "5m"]
  }' | jq -r '.subscription_id')

echo "订阅ID: $SUBSCRIPTION_ID"
echo -e "\n"

# 等待数据采集
echo "⏳ 等待 10 秒，让数据采集启动..."
sleep 10
echo -e "\n"

# 3. 查询 Ticker 数据
echo "3️⃣  查询 Ticker 数据"
echo "GET $BASE_URL/api/v1/data/ticker?exchange=binance&symbol=BTC/USDT"
curl -s "$BASE_URL/api/v1/data/ticker?exchange=binance&symbol=BTC/USDT" | jq .
echo -e "\n"

# 4. 查询订单簿
echo "4️⃣  查询订单簿"
echo "GET $BASE_URL/api/v1/data/orderbook?exchange=binance&symbol=BTC/USDT"
curl -s "$BASE_URL/api/v1/data/orderbook?exchange=binance&symbol=BTC/USDT" | jq '.data | {exchange, symbol, bids: .bids[:3], asks: .asks[:3]}'
echo -e "\n"

# 5. 查询成交数据
echo "5️⃣  查询成交数据"
echo "GET $BASE_URL/api/v1/data/trades?exchange=binance&symbol=BTC/USDT&limit=5"
curl -s "$BASE_URL/api/v1/data/trades?exchange=binance&symbol=BTC/USDT&limit=5" | jq .
echo -e "\n"

# 6. 查询K线数据
echo "6️⃣  查询K线数据"
echo "GET $BASE_URL/api/v1/data/klines?exchange=binance&symbol=BTC/USDT&interval=1m&limit=5"
curl -s "$BASE_URL/api/v1/data/klines?exchange=binance&symbol=BTC/USDT&interval=1m&limit=5" | jq .
echo -e "\n"

# 7. 获取订阅信息
echo "7️⃣  获取订阅信息"
echo "GET $BASE_URL/api/v1/subscriptions/$SUBSCRIPTION_ID"
curl -s "$BASE_URL/api/v1/subscriptions/$SUBSCRIPTION_ID" | jq .
echo -e "\n"

# 8. 获取所有订阅
echo "8️⃣  获取所有订阅"
echo "GET $BASE_URL/api/v1/subscriptions"
curl -s "$BASE_URL/api/v1/subscriptions" | jq .
echo -e "\n"

# 9. 取消订阅（可选）
# echo "9️⃣  取消订阅"
# echo "DELETE $BASE_URL/api/v1/subscriptions/$SUBSCRIPTION_ID"
# curl -s -X DELETE "$BASE_URL/api/v1/subscriptions/$SUBSCRIPTION_ID"
# echo "订阅已取消"
# echo -e "\n"

echo "================================================"
echo "✅ 示例请求完成！"
echo "================================================"
echo ""
echo "📖 查看完整文档："
echo "   - Swagger UI: $BASE_URL/docs"
echo "   - ReDoc: $BASE_URL/redoc"
echo "   - Prometheus: http://localhost:9003/metrics"
echo ""
