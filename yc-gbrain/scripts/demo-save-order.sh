#!/usr/bin/env bash
set -euo pipefail

curl -s http://localhost:3001/api/save_order \
  -H 'content-type: application/json' \
  -d '{
    "company_id": "costco",
    "customer_name": "Aarya",
    "phone_number": "+17028619093",
    "items": [
      "Kirkland almond milk",
      "Salmon fillets",
      "Goldfish variety pack for the kids",
      "Kirkland bath tissue"
    ],
    "new_preferences": [
      "Customer often asks whether this is a quick Costco run or the big monthly household haul.",
      "Customer wants Mom, partner, and kids preferences remembered separately."
    ],
    "confidence": 0.9
  }' | jq
