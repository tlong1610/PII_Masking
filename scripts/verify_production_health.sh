#!/usr/bin/env bash
# ==============================================================================
# Script: verify_production_health.sh
# Purpose: Kiểm tra tính sẵn sàng của Production Backend qua endpoint /health
# Author: PIIGuard Shield Team (P-138)
# ==============================================================================

set -euo pipefail

PROD_URL="${1:-https://piiguard-vn-api.onrender.com/health}"
MAX_RETRIES="${2:-10}"
RETRY_INTERVAL="${3:-15}"

echo "🔍 Bắt đầu kiểm tra Production Health Check..."
echo "Target URL: $PROD_URL"
echo "Tối đa $MAX_RETRIES lần thử (mỗi lần cách $RETRY_INTERVAL giây)"

count=0
while [ $count -lt "$MAX_RETRIES" ]; do
  count=$((count + 1))
  echo "[Lần thử $count/$MAX_RETRIES] Đang gửi yêu cầu đến $PROD_URL..."
  
  HTTP_STATUS=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "$PROD_URL" || true)
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Production Backend HOẠT ĐỘNG HOÀN HẢO (HTTP 200)!"
    cat /tmp/health_response.json
    echo ""
    exit 0
  else
    echo "⚠️ Backend chưa phản hồi 200 (HTTP Status: $HTTP_STATUS). Có thể Render đang khởi động (Cold Start)..."
    if [ -f /tmp/health_response.json ]; then
      cat /tmp/health_response.json || true
      echo ""
    fi
  fi
  
  if [ $count -lt "$MAX_RETRIES" ]; then
    echo "Đang chờ $RETRY_INTERVAL giây trước lần thử tiếp theo..."
    sleep "$RETRY_INTERVAL"
  fi
done

echo "❌ Thất bại: Đã thử $MAX_RETRIES lần nhưng $PROD_URL không trả về HTTP 200."
exit 1
