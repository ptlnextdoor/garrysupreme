#!/bin/bash
# Deeper quality tests: actual ranking, multi-turn, concurrency

BASE="http://localhost:3001"
PHONE="+17028619093"
PASS=0
FAIL=0
RESULTS=""

assert() {
  local name="$1"; local cond="$2"
  if [ "$cond" = "OK" ]; then
    PASS=$((PASS+1)); RESULTS+="✅ $name\n"
  else
    FAIL=$((FAIL+1)); RESULTS+="❌ $name — $cond\n"
  fi
}

webhook_query() {
  local query="$1"
  curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
    -d "{\"message\":{\"call\":{\"id\":\"q-$RANDOM\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"t\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{\\\"request\\\":\\\"$query\\\"}\"}}]}}"
}

echo "🎯 QUALITY TEST SUITE"
echo "====================="

# === RANKING QUALITY ===
echo "--- Search Ranking Quality ---"

# Salmon → should rank salmon items in top 5
result=$(webhook_query "I want some salmon for dinner")
top5=$(echo "$result" | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | tr '[:upper:]' '[:lower:]')
salmon_count=$(echo "$top5" | grep -c "salmon")
[ $salmon_count -ge 2 ] && assert "Salmon query: 2+ salmon items in top 5" "OK" || assert "Salmon query: only $salmon_count salmon items in top 5" "FAIL"

# Diaper → should rank diaper items in top 5
result=$(webhook_query "diapers for kids")
top5=$(echo "$result" | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | tr '[:upper:]' '[:lower:]')
diaper_count=$(echo "$top5" | grep -cE "diaper|huggies|pampers")
[ $diaper_count -ge 1 ] && assert "Diaper query: 1+ diaper items in top 5" "OK" || assert "Diaper query: $diaper_count diaper items" "FAIL"

# TV → should rank TVs first
result=$(webhook_query "looking for a new tv")
top5=$(echo "$result" | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | tr '[:upper:]' '[:lower:]')
tv_count=$(echo "$top5" | grep -cE "tv|television|qled|oled")
[ $tv_count -ge 1 ] && assert "TV query: 1+ TV items in top 5" "OK" || assert "TV query: $tv_count TV items" "FAIL"

# Coffee → should rank coffee
result=$(webhook_query "Kirkland coffee")
top3=$(echo "$result" | jq -r '.results[0].result.company.menu[0:3] | .[] | .name' | tr '[:upper:]' '[:lower:]')
coffee_count=$(echo "$top3" | grep -c "coffee")
[ $coffee_count -ge 1 ] && assert "Coffee query: 1+ coffee items in top 3" "OK" || assert "Coffee query: $coffee_count coffee items" "FAIL"

# Dairy-free → should NOT rank dairy items high
result=$(webhook_query "I want dairy free milk")
top3=$(echo "$result" | jq -r '.results[0].result.company.menu[0:3] | .[] | {name, dairyFree}')
non_dairy=$(echo "$result" | jq '.results[0].result.company.menu[0:3] | map(select(.dairyFree == true)) | length')
[ "$non_dairy" -ge 2 ] && assert "Dairy-free query: 2+ dairy-free items in top 3" "OK" || assert "Dairy-free query: $non_dairy dairy-free items" "FAIL"

# Wine → should rank wine
result=$(webhook_query "wine for dinner party")
top5=$(echo "$result" | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | tr '[:upper:]' '[:lower:]')
wine_count=$(echo "$top5" | grep -cE "wine|champagne|chardonnay|cabernet|merlot")
[ $wine_count -ge 1 ] && assert "Wine query: 1+ wine items in top 5" "OK" || assert "Wine query: $wine_count wine items" "FAIL"

# Pet food
result=$(webhook_query "dog food")
top5=$(echo "$result" | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | tr '[:upper:]' '[:lower:]')
pet_count=$(echo "$top5" | grep -cE "dog|puppy|cat|pet")
[ $pet_count -ge 1 ] && assert "Pet food query: 1+ pet items in top 5" "OK" || assert "Pet food query: $pet_count pet items" "FAIL"

# Generic "snacks for kids" should suggest kid-friendly items
result=$(webhook_query "snacks for the kids")
top10=$(echo "$result" | jq -r '.results[0].result.company.menu[0:10] | .[] | .name' | tr '[:upper:]' '[:lower:]')
snack_count=$(echo "$top10" | grep -cE "snack|goldfish|fruit|cracker|chip|cookie|granola|popcorn|popcorners")
[ $snack_count -ge 3 ] && assert "Kids snacks: 3+ snack items in top 10" "OK" || assert "Kids snacks: $snack_count snack items in top 10" "FAIL"

# === MULTI-TURN CONVERSATION ===
echo "--- Multi-turn Conversation Flow ---"
CALL_ID="multiturn-$(date +%s)"

# Step 1: call starts (status-update)
curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"status-update\",\"call\":{\"id\":\"$CALL_ID\",\"customer\":{\"number\":\"$PHONE\"}}}}" > /dev/null

# Step 2: get_context
ctx=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"$CALL_ID\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"ctx\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}")
[ "$(echo $ctx | jq -r '.results[0].result.customer.name')" = "Aarya" ] && assert "Multiturn: context for known caller" "OK" || assert "Multiturn: failed" "FAIL"

# Step 3: save_order
order=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"$CALL_ID\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"o\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"Costco Rotisserie Chicken\\\",\\\"Kirkland Almond Milk 6-pack\\\",\\\"Kirkland Bath Tissue 30 Rolls\\\"],\\\"customer_name\\\":\\\"Aarya\\\"}\"}}]}}")
[ "$(echo $order | jq -r '.results[0].result.ok')" = "true" ] && assert "Multiturn: order saved" "OK" || assert "Multiturn: save failed" "FAIL"

# Step 4: call-end
end=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"end-of-call-report\",\"call\":{\"id\":\"$CALL_ID\"}}}")
[ "$(echo $end | jq -r '.ok')" = "true" ] && assert "Multiturn: call ended cleanly" "OK" || assert "Multiturn: end failed" "FAIL"

# Verify order in history
sleep 1
HIST=$(grep -c "Costco Rotisserie Chicken, Kirkland Almond Milk 6-pack, Kirkland Bath Tissue 30 Rolls" ~/garrysupreme/data/customers/demo-customer.md)
[ $HIST -ge 1 ] && assert "Multiturn: order persisted to history" "OK" || assert "Multiturn: order missing from history" "FAIL"

# === CONCURRENT WRITES ===
echo "--- Concurrent Order Saves ---"
START=$(ls ~/garrysupreme/data/customers/memory-facts/ 2>/dev/null | wc -l | tr -d ' ')
for i in {1..5}; do
  curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
    -d "{\"message\":{\"call\":{\"id\":\"concurrent-$i-$$\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"c\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"Concurrent Test Item $i\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"Concurrent fact $i\\\",\\\"confidence\\\":0.7}]}\"}}]}}" > /dev/null &
done
wait
sleep 2
END=$(ls ~/garrysupreme/data/customers/memory-facts/ 2>/dev/null | wc -l | tr -d ' ')
ADDED=$((END - START))
[ $ADDED -ge 4 ] && assert "Concurrent saves: ~5 facts created ($ADDED added)" "OK" || assert "Concurrent saves: only $ADDED facts added" "FAIL"

# === LARGE PAYLOADS ===
echo "--- Large Payload Handling ---"
# 50-item order
BIG_ITEMS=$(printf '"Item %d",' {1..50} | sed 's/,$//')
BIG=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"big-1\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"b\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[${BIG_ITEMS//\"/\\\"}]}\"}}]}}")
[ "$(echo $BIG | jq -r '.results[0].result.ok')" = "true" ] && assert "Big order (50 items) saved" "OK" || assert "Big order failed" "FAIL"

# Many tool calls in one webhook
MULTI_TC=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"multi-tc\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"a\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}},{\"id\":\"b\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{\\\"request\\\":\\\"coffee\\\"}\"}},{\"id\":\"c\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"test\\\"]}\"}}]}}")
TC_COUNT=$(echo $MULTI_TC | jq '.results | length')
[ "$TC_COUNT" = "3" ] && assert "3 tool calls in one webhook handled" "OK" || assert "Multi tool: got $TC_COUNT results" "FAIL"

# === DATA INTEGRITY DEEP ===
echo "--- Data Integrity Deep ---"
# Check menu items have all required fields
SAMPLE=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"di-1\"},\"toolCallList\":[{\"id\":\"d\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" | jq '.results[0].result.company.menu[0]')
HAS_NAME=$(echo $SAMPLE | jq 'has("name")')
HAS_PRICE=$(echo $SAMPLE | jq 'has("price")')
HAS_ATTRS=$(echo $SAMPLE | jq 'has("attributes")')
[ "$HAS_NAME" = "true" ] && [ "$HAS_PRICE" = "true" ] && [ "$HAS_ATTRS" = "true" ] && assert "Menu items have required fields" "OK" || assert "Menu items missing fields" "FAIL"

# Check prices are numbers
NUMERIC=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"di-2\"},\"toolCallList\":[{\"id\":\"d\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" | jq '[.results[0].result.company.menu[].price] | map(type == "number") | all')
[ "$NUMERIC" = "true" ] && assert "All prices are numeric" "OK" || assert "Some prices are not numeric" "FAIL"

# Check no NaN/null in prices
NO_NAN=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"di-3\"},\"toolCallList\":[{\"id\":\"d\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" | jq '[.results[0].result.company.menu[].price] | map(. == null) | any')
[ "$NO_NAN" = "false" ] && assert "No null prices" "OK" || assert "Null prices found" "FAIL"

# Customer profile fields
CP=$(curl -s "$BASE/api/customers/$PHONE")
[ "$(echo $CP | jq 'has("name") and has("phone") and has("likes") and has("avoids")')" = "true" ] && assert "Customer profile has required fields" "OK" || assert "Customer profile missing fields" "FAIL"

# === DASHBOARD HEALTH ===
echo "--- Dashboard Health ---"
DASH=$(curl -s http://localhost:3000/)
echo "$DASH" | grep -q "Pulse" && assert "Dashboard contains Pulse branding" "OK" || assert "Dashboard missing branding" "FAIL"
echo "$DASH" | grep -q "Costco" && assert "Dashboard contains Costco branding" "OK" || assert "Dashboard missing Costco" "FAIL"
echo "$DASH" | grep -q "Aarya" && assert "Dashboard contains customer name" "OK" || assert "Dashboard missing customer" "FAIL"

# === REPORT ===
echo ""
echo "====================="
echo "📊 QUALITY RESULTS"
echo "====================="
echo -e "$RESULTS"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "Total:    $((PASS+FAIL))"
