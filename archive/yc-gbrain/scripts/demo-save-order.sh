#!/usr/bin/env bash
set -euo pipefail

curl -s http://localhost:3001/api/save_order \
  -H 'content-type: application/json' \
  -d '{
    "customer_name": "Aayushya",
    "phone_number": "+15551234567",
    "items": [
      "Iced Chai Latte, oat milk, cardamom",
      "Hot Chai Latte, extra sweet, cardamom"
    ],
    "new_preferences": [
      "Customer likes cold chai variants.",
      "Mom likes hot sweet chai with cardamom."
    ],
    "confidence": 0.86
  }' | jq
