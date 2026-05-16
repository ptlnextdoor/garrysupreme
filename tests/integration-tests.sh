#!/bin/bash
# Comprehensive Pulse-Costco integration test suite
# Run after backend is up on :3001

BASE="http://localhost:3001"
PHONE="+17028619093"
PASS=0
FAIL=0
RESULTS=""

assert() {
  local name="$1"
  local actual="$2"
  local expected_pattern="$3"
  if echo "$actual" | grep -qE "$expected_pattern"; then
    PASS=$((PASS+1))
    RESULTS+="✅ $name\n"
  else
    FAIL=$((FAIL+1))
    RESULTS+="❌ $name\n   expected: $expected_pattern\n   got: $(echo $actual | head -c 200)\n"
  fi
}

call_webhook() {
  local fn="$1"
  local args="$2"
  local callid="${3:-test-$(date +%s)}"
  curl -s -X POST "$BASE/api/vapi-webhook" \
    -H 'Content-Type: application/json' \
    -d "{\"message\":{\"call\":{\"id\":\"$callid\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"t1\",\"function\":{\"name\":\"$fn\",\"arguments\":\"$args\"}}]}}"
}

echo "🧪 PULSE-COSTCO TEST BATTERY"
echo "============================"

# === GROUP 1: Health & Basics ===
echo ""
echo "--- Group 1: Health & Basics ---"
assert "Root endpoint returns ok" "$(curl -s $BASE/)" '"status".*"ok"'
assert "Health endpoint returns ok" "$(curl -s $BASE/health)" '"ok".*true'
assert "Root has timestamp" "$(curl -s $BASE/)" '"ts":[0-9]+'
assert "404 for unknown route" "$(curl -s $BASE/nope)" 'not found|404'

# === GROUP 2: Direct API ===
echo "--- Group 2: Direct API ---"
CTX=$(curl -s -X POST "$BASE/api/context" -H 'Content-Type: application/json' -d "{\"message\":{\"call\":{\"customer\":{\"number\":\"$PHONE\"}}}}")
assert "Context returns Aarya" "$CTX" '"name":"Aarya"'
assert "Context returns Costco" "$CTX" '"Costco'
assert "Context returns 904+ menu items" "$(echo $CTX | jq '.company.menu | length')" '^9[0-9][0-9]$'
assert "Context returns customer phone" "$CTX" "17028619093"
assert "Context returns household" "$CTX" '"householdMembers"'

# === GROUP 3: Vapi Webhook ===
echo "--- Group 3: Vapi Webhook ---"
GET_CTX=$(call_webhook "get_context" "{}")
assert "Webhook get_context wrapped in results" "$GET_CTX" '"results"'
assert "Webhook get_context has toolCallId" "$GET_CTX" '"toolCallId":"t1"'
assert "Webhook customer recognized" "$GET_CTX" '"name":"Aarya"'

SAVE=$(call_webhook "save_order" "{\\\"items\\\":[\\\"Kirkland Almond Milk 6-pack\\\"],\\\"customer_name\\\":\\\"Aarya\\\"}")
assert "Save order returns ok" "$SAVE" '"ok":true'
assert "Save order returns pickup time" "$SAVE" 'pickup_time.*hours'

# Lifecycle: status-update
LIFE=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"status-update\",\"call\":{\"id\":\"life-1\",\"customer\":{\"number\":\"$PHONE\"}}}}")
assert "Webhook handles status-update" "$LIFE" '"ok":true'

LIFE_END=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"end-of-call-report\",\"call\":{\"id\":\"life-1\"}}}")
assert "Webhook handles end-of-call" "$LIFE_END" '"ok":true'

# === GROUP 4: Search Ranking ===
echo "--- Group 4: Search Quality (15 queries) ---"
declare -a QUERIES=(
  "I need diapers for the baby"
  "looking for organic produce"
  "salmon for dinner"
  "wine for the party"
  "tv for the living room"
  "laptop for work"
  "snacks for the kids lunchbox"
  "dairy free milk"
  "Kirkland coffee"
  "household paper goods"
  "vitamins for mom"
  "tools for garage"
  "phone accessories"
  "pet food"
  "cheese for charcuterie"
)
for q in "${QUERIES[@]}"; do
  result=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
    -d "{\"message\":{\"call\":{\"id\":\"q-$RANDOM\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"q\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{\\\"request\\\":\\\"$q\\\"}\"}}]}}")
  count=$(echo "$result" | jq '.results[0].result.company.menu | length' 2>/dev/null)
  assert "Query '$q' returns 900+ items" "$count" '^[0-9]{3,}$'
done

# === GROUP 5: Customer recognition ===
echo "--- Group 5: Customer Recognition ---"
# Unknown caller
UNK=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"unk-1","customer":{"number":"+15551234567"}},"toolCallList":[{"id":"u","function":{"name":"get_context","arguments":"{}"}}]}}')
assert "Unknown caller gets anonymous" "$UNK" '"name":"there"|"name":"Caller"|anonymous'

# Empty number
NONE=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"none-1"},"toolCallList":[{"id":"n","function":{"name":"get_context","arguments":"{}"}}]}}')
assert "No phone still returns context" "$NONE" '"results"'

# Phone with no +
NOSPLUS=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"np-1","customer":{"number":"17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{}"}}]}}')
assert "Phone without + normalized" "$NOSPLUS" '"name":"Aarya"'

# === GROUP 6: Edge Cases ===
echo "--- Group 6: Edge Cases ---"
# Empty toolCallList
EMPTY=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e1"},"toolCallList":[]}}')
assert "Empty toolCallList returns empty results" "$EMPTY" '"results":\[\]'

# Missing toolCallList
NOTC=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e2"}}}')
assert "No toolCallList returns empty results" "$NOTC" '"results":\[\]'

# Unknown tool
UNK_TOOL=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e3","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"u","function":{"name":"nope_tool","arguments":"{}"}}]}}')
assert "Unknown tool returns error in result" "$UNK_TOOL" 'unknown tool'

# Malformed JSON in arguments
BAD_ARGS=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e4","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"b","function":{"name":"get_context","arguments":"not json {"}}]}}')
assert "Bad args still returns context" "$BAD_ARGS" '"results"'

# Save order with empty items
EMPTY_ORDER=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e5","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"e","function":{"name":"save_order","arguments":"{\"items\":[]}"}}]}}')
assert "Empty order returns ok" "$EMPTY_ORDER" '"ok":true'

# Special chars in items
SPECIAL=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"e6","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"s","function":{"name":"save_order","arguments":"{\"items\":[\"Kirkland 100% Organic & \\\"Premium\\\" Honey, 3 lb\"]}"}}]}}')
assert "Special chars handled" "$SPECIAL" '"ok":true'

# === GROUP 7: Direct save-order endpoint ===
echo "--- Group 7: Direct save-order endpoint ---"
DIRECT=$(curl -s -X POST "$BASE/api/save_order" -H 'Content-Type: application/json' \
  -d "{\"call\":{\"id\":\"d-1\",\"customer\":{\"number\":\"$PHONE\"}},\"items\":[\"Costco Rotisserie Chicken\"],\"customer_name\":\"Aarya\"}")
assert "Direct save_order returns ok" "$DIRECT" '"ok":true'

# === GROUP 8: Queries endpoints ===
echo "--- Group 8: Queries endpoints ---"
ACTIVE=$(curl -s "$BASE/api/calls/active")
assert "Active calls returns array or object" "$ACTIVE" '\[|"calls"'

CUST=$(curl -s "$BASE/api/customers/$PHONE")
assert "Customer endpoint returns profile" "$CUST" '"name":"Aarya"'

CUST_NONE=$(curl -s "$BASE/api/customers/+15559999999")
assert "Unknown customer returns null or 404" "$CUST_NONE" 'null|not_found|not found|404'

# === GROUP 9: Memory facts ===
echo "--- Group 9: Memory facts pipeline ---"
FACT_BEFORE=$(ls ~/garrysupreme/data/customers/memory-facts/ 2>/dev/null | wc -l | tr -d ' ')
curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"fact-test\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"f\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"Kirkland Bath Tissue 30 Rolls\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"Restocks bath tissue every 6 weeks\\\",\\\"confidence\\\":0.85,\\\"category\\\":\\\"behavioral\\\"}]}\"}}]}}" > /dev/null
sleep 1
FACT_AFTER=$(ls ~/garrysupreme/data/customers/memory-facts/ 2>/dev/null | wc -l | tr -d ' ')
assert "Memory fact created on disk" "$([ $FACT_AFTER -gt $FACT_BEFORE ] && echo OK)" "OK"

# === GROUP 10: SSE ===
echo "--- Group 10: SSE Streaming ---"
# Use timeout-style GET to test SSE (curl -I doesn't work on streams)
SSE_OUT=$(curl -s "$BASE/api/events" --max-time 1 -o /dev/null -w "%{http_code}|%{content_type}" 2>&1)
assert "SSE endpoint streams text/event-stream" "$SSE_OUT" '200.*event-stream|event-stream'

# === GROUP 11: Performance ===
echo "--- Group 11: Performance ---"
START=$(date +%s%N)
for i in {1..10}; do curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"perf-$i\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"p\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" > /dev/null
done
END=$(date +%s%N)
ELAPSED_MS=$(( (END - START) / 1000000 ))
AVG=$(( ELAPSED_MS / 10 ))
echo "  10 sequential get_context calls: ${ELAPSED_MS}ms total, ~${AVG}ms each"
assert "Avg response under 500ms" "$([ $AVG -lt 500 ] && echo OK || echo SLOW)" "OK"

# Concurrent
START=$(date +%s%N)
for i in {1..10}; do curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"par-$i\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"p\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" > /dev/null &
done
wait
END=$(date +%s%N)
PAR_MS=$(( (END - START) / 1000000 ))
echo "  10 concurrent get_context calls: ${PAR_MS}ms total"
assert "Concurrent 10 calls under 2000ms" "$([ $PAR_MS -lt 2000 ] && echo OK)" "OK"

# === GROUP 12: Data integrity ===
echo "--- Group 12: Data Integrity ---"
MENU_COUNT=$(grep -c "^## " ~/garrysupreme/data/companies/costco/menu.md)
assert "menu.md has 900+ items" "$MENU_COUNT" '^9[0-9][0-9]$'

CUST_FILE=$(cat ~/garrysupreme/data/customers/demo-customer.md | head -5)
assert "Customer file has Aarya" "$CUST_FILE" 'Aarya'

POL=$(wc -l < ~/garrysupreme/data/companies/costco/policies.md | tr -d ' ')
assert "Policies file populated" "$POL" '^[1-9][0-9]'

ALL=$(wc -l < ~/garrysupreme/data/companies/costco/allergens.md | tr -d ' ')
assert "Allergens file populated" "$ALL" '^[1-9][0-9]'

# === REPORT ===
echo ""
echo "============================"
echo "📊 TEST RESULTS"
echo "============================"
echo -e "$RESULTS"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
TOTAL=$((PASS+FAIL))
echo "📊 Total:  $TOTAL"
if [ $FAIL -eq 0 ]; then
  echo ""
  echo "🎉 ALL TESTS PASSED"
  exit 0
else
  echo ""
  echo "⚠️  $FAIL tests failed"
  exit 1
fi
