#!/usr/bin/env bash
set -euo pipefail

curl -s http://localhost:3001/api/context \
  -H 'content-type: application/json' \
  -d '{"company_id":"costco","phone_number":"+17028619093","request":"I am doing a quick Costco run that may turn into the big monthly haul. Add my usual almond milk, salmon, and kids snacks."}' | jq
