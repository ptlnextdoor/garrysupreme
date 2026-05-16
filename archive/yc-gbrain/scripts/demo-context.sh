#!/usr/bin/env bash
set -euo pipefail

curl -s http://localhost:3001/api/context \
  -H 'content-type: application/json' \
  -d '{"phone_number":"+15551234567","request":"I want something cold, sweet, not too heavy, no dairy."}' | jq
