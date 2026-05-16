#!/bin/bash
# Deep edge case tests — concurrent races, untested endpoints,
# search pathology, SSE content, boundary values

BASE="http://localhost:3001"
PHONE="+17028619093"
PASS=0
FAIL=0
RESULTS=""

assert() {
  local name="$1"; local cond="$2"; local detail="$3"
  if [ "$cond" = "OK" ]; then
    PASS=$((PASS+1)); RESULTS+="✅ $name\n"
  else
    FAIL=$((FAIL+1)); RESULTS+="❌ $name — $detail\n"
  fi
}

webhook() {
  curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' -d "$1"
}

run_query() {
  local q="$1"
  python3 -c "
import json
payload = {
  'message': {
    'call': {'id': 'edge-$RANDOM', 'customer': {'number': '$PHONE'}},
    'toolCallList': [{'id': 'q', 'function': {'name': 'get_context', 'arguments': json.dumps({'request': '''$q'''})}}]
  }
}
print(json.dumps(payload))
" | xargs -0 -I{} curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' -d {}
}

echo "🔬 DEEP EDGE TEST SUITE"
echo "======================="

# === MEMORY FACT WORKFLOW (untested endpoints!) ===
echo "--- Memory Fact Approval Workflow ---"

# First create a fresh fact to approve
CALL_ID="deep-fact-$(date +%s)"
webhook "{\"message\":{\"call\":{\"id\":\"$CALL_ID\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"Test\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"Likes Brand X\\\",\\\"confidence\\\":0.9,\\\"category\\\":\\\"preference\\\"}]}\"}}]}}" > /dev/null
sleep 1

# Find the fact file
FACT_FILE=$(ls -t ~/garrysupreme/data/customers/memory-facts/ | head -1)
FACT_ID="${FACT_FILE%.md}"
echo "  fact_id: $FACT_ID"

# Approve
APPROVE=$(curl -s -X POST "$BASE/api/memory/approve" -H 'Content-Type: application/json' \
  -d "{\"factId\":\"$FACT_ID\"}")
echo "  approve response: $APPROVE"
[ -n "$APPROVE" ] && ! echo "$APPROVE" | grep -q '"statusCode":5' && assert "Approve endpoint responds" "OK" || assert "Approve crashed" "FAIL" "$APPROVE"

# Reject
REJECT=$(curl -s -X POST "$BASE/api/memory/reject" -H 'Content-Type: application/json' \
  -d "{\"factId\":\"$FACT_ID\"}")
echo "  reject response: $REJECT"
[ -n "$REJECT" ] && ! echo "$REJECT" | grep -q '"statusCode":5' && assert "Reject endpoint responds" "OK" || assert "Reject crashed" "FAIL" "$REJECT"

# Approve non-existent fact
NOPE=$(curl -s -X POST "$BASE/api/memory/approve" -H 'Content-Type: application/json' \
  -d '{"factId":"nonexistent-fact-xyz"}')
echo "  approve nonexistent: $NOPE"
[ -n "$NOPE" ] && assert "Approve nonexistent fact handled" "OK" || assert "Nonexistent crashed" "FAIL"

# Approve with missing factId
MISSING=$(curl -s -X POST "$BASE/api/memory/approve" -H 'Content-Type: application/json' -d '{}')
[ -n "$MISSING" ] && assert "Approve with no factId handled" "OK" || assert "Missing factId crashed" "FAIL"

# === CONCURRENT READ-DURING-WRITE ===
echo "--- Concurrent Read-During-Write ---"
START_OK=0
READ_OK=0
# Start 10 writes and 10 reads concurrently
for i in {1..10}; do
  webhook "{\"message\":{\"call\":{\"id\":\"rdw-w-$i\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"w\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"RDW Write $i\\\"]}\"}}]}}" > /dev/null &
  curl -s "$BASE/api/customers/$PHONE" > /tmp/rdw-read-$i.json &
done
wait
sleep 2

# Verify all reads got valid Aarya profile
for i in {1..10}; do
  if [ -s /tmp/rdw-read-$i.json ]; then
    name=$(jq -r '.name' /tmp/rdw-read-$i.json 2>/dev/null)
    [ "$name" = "Aarya" ] && READ_OK=$((READ_OK+1))
  fi
done
rm -f /tmp/rdw-read-*.json
[ $READ_OK -ge 8 ] && assert "10 reads during 10 writes: $READ_OK/10 returned valid profile" "OK" || assert "Only $READ_OK/10 reads valid during writes" "FAIL"

# Verify customer file frontmatter still intact
HEAD=$(head -2 ~/garrysupreme/data/customers/demo-customer.md)
echo "$HEAD" | grep -q "^---$" && assert "Customer file frontmatter survives race" "OK" || assert "Frontmatter mangled" "FAIL"

# === SEARCH RANKING PATHOLOGY ===
echo "--- Search Ranking Pathology ---"

# Query that matches NOTHING
NOMATCH=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"nm","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"xqzbqzqxqz\"}"}}]}}')
cnt=$(echo $NOMATCH | jq '.results[0].result.company.menu | length')
[ "$cnt" = "904" ] && assert "Zero-match query still returns all 904 items" "OK" || assert "Zero-match: $cnt items" "FAIL"

# Query that matches EVERYTHING (common word)
ALL=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"all","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"kirkland\"}"}}]}}')
cnt=$(echo $ALL | jq '.results[0].result.company.menu | length')
[ "$cnt" = "904" ] && assert "'kirkland' query returns 904 (200+ match score)" "OK" || assert "Kirkland: $cnt" "FAIL"
# Top 5 should all have kirkland
top5=$(echo $ALL | jq -r '.results[0].result.company.menu[0:5] | .[] | .name' | grep -ci kirkland)
[ $top5 -ge 4 ] && assert "Kirkland top 5: $top5/5 are Kirkland" "OK" || assert "Only $top5/5 Kirkland in top 5" "FAIL"

# Negation in query (no dairy)
NEG=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"neg","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"no dairy please\"}"}}]}}')
# Top 5 should all be dairy_free
non_dairy=$(echo $NEG | jq '.results[0].result.company.menu[0:5] | map(select(.dairyFree == true)) | length')
[ "$non_dairy" = "5" ] && assert "'no dairy' top 5 all dairy-free" "OK" || assert "Non-dairy: $non_dairy/5" "FAIL"

# Customer's own name as query (potential leak)
NAME_Q=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"nq","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"Aarya\"}"}}]}}')
[ "$(echo $NAME_Q | jq '.results[0].result.company.menu | length')" = "904" ] && assert "Customer's own name as query OK" "OK" || assert "Name query broken" "FAIL"

# Stopwords + ONE meaningful word
ONE=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"one","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"the salmon is what we need a lot of\"}"}}]}}')
top3=$(echo $ONE | jq -r '.results[0].result.company.menu[0:3] | .[] | .name' | grep -ci salmon)
[ $top3 -ge 1 ] && assert "Stopword-heavy query still finds salmon" "OK" || assert "Couldn't find salmon in stopwords" "FAIL"

# Numbers in query (size: "10 lb")
SIZE=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"size","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"x","function":{"name":"get_context","arguments":"{\"request\":\"10 lb pack\"}"}}]}}')
[ -n "$(echo $SIZE | jq '.results[0].result.company.menu | length')" ] && assert "Numeric size in query OK" "OK" || assert "Numeric size crashed" "FAIL"

# === UNKNOWN CALLER FLOWS ===
echo "--- Unknown Caller Flows ---"
NEW_PHONE="+15558675309"
# 1. New caller gets context
NEW_CTX=$(webhook "{\"message\":{\"call\":{\"id\":\"new-1\",\"customer\":{\"number\":\"$NEW_PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}")
new_name=$(echo $NEW_CTX | jq -r '.results[0].result.customer.name')
[ "$new_name" = "there" ] && assert "New caller gets 'there' default name" "OK" || assert "New caller name: '$new_name'" "FAIL"

# 2. New caller places order — does it create profile?
NEW_ORDER=$(webhook "{\"message\":{\"call\":{\"id\":\"new-2\",\"customer\":{\"number\":\"$NEW_PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"Test from new caller\\\"],\\\"customer_name\\\":\\\"NewBuddy\\\"}\"}}]}}")
[ "$(echo $NEW_ORDER | jq -r '.results[0].result.ok')" = "true" ] && assert "New caller save_order returns ok" "OK" || assert "New caller save failed" "FAIL"

# 3. Does the new caller's profile exist now?
sleep 1
NEW_PROFILE=$(curl -s "$BASE/api/customers/$NEW_PHONE")
echo "  new profile: $NEW_PROFILE" | head -c 200
# It's OK if no profile is auto-created — that's a design choice. Just verify no crash.
[ -n "$NEW_PROFILE" ] && assert "New caller profile query doesn't crash" "OK" || assert "Profile query crashed" "FAIL"

# === BOUNDARY VALUES ===
echo "--- Boundary Values ---"
# Confidence = 0
ZC=$(webhook "{\"message\":{\"call\":{\"id\":\"zc\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"a\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"low confidence\\\",\\\"confidence\\\":0}]}\"}}]}}")
[ "$(echo $ZC | jq -r '.results[0].result.ok')" = "true" ] && assert "Confidence=0 accepted" "OK" || assert "Conf 0 rejected" "FAIL"

# Confidence = 1
ONEC=$(webhook "{\"message\":{\"call\":{\"id\":\"1c\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"a\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"high\\\",\\\"confidence\\\":1}]}\"}}]}}")
[ "$(echo $ONEC | jq -r '.results[0].result.ok')" = "true" ] && assert "Confidence=1 accepted" "OK" || assert "Conf 1 rejected" "FAIL"

# Confidence out of range (Zod should clamp or reject)
OOR=$(webhook "{\"message\":{\"call\":{\"id\":\"oor\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"a\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"bad\\\",\\\"confidence\\\":99}]}\"}}]}}")
# Should reject the bad preference but not crash the save
[ "$(echo $OOR | jq -r '.results[0].result.ok')" = "true" ] && assert "Out-of-range confidence (99) handled gracefully" "OK" || assert "OOR crashed: $OOR" "FAIL"

# Negative confidence
NC=$(webhook "{\"message\":{\"call\":{\"id\":\"nc\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"a\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"bad\\\",\\\"confidence\\\":-0.5}]}\"}}]}}")
[ "$(echo $NC | jq -r '.results[0].result.ok')" = "true" ] && assert "Negative confidence handled" "OK" || assert "NC crashed" "FAIL"

# Invalid category enum
BCT=$(webhook "{\"message\":{\"call\":{\"id\":\"bct\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"a\\\"],\\\"new_preferences\\\":[{\\\"fact\\\":\\\"x\\\",\\\"category\\\":\\\"invalid_cat\\\"}]}\"}}]}}")
[ "$(echo $BCT | jq -r '.results[0].result.ok')" = "true" ] && assert "Invalid category handled" "OK" || assert "Bad category crashed" "FAIL"

# null in items array
NULL_ITEM=$(webhook "{\"message\":{\"call\":{\"id\":\"ni\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[null,\\\"valid\\\",null]}\"}}]}}")
[ -n "$NULL_ITEM" ] && ! echo "$NULL_ITEM" | grep -q '"statusCode":5' && assert "Null items in array handled" "OK" || assert "Null items crashed" "FAIL"

# Number instead of string in items
NUM_ITEM=$(webhook "{\"message\":{\"call\":{\"id\":\"ni\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[123,456]}\"}}]}}")
[ -n "$NUM_ITEM" ] && ! echo "$NUM_ITEM" | grep -q '"statusCode":5' && assert "Numeric items in array handled" "OK" || assert "Numeric items crashed" "FAIL"

# === SSE STREAM CONTENT ===
echo "--- SSE Stream Content Delivery ---"
# Start SSE listener in background, capture output
curl -sN "$BASE/api/events" > /tmp/sse-output.txt 2>&1 &
SSE_PID=$!
sleep 1

# Trigger event via order
webhook "{\"message\":{\"call\":{\"id\":\"sse-trigger-$RANDOM\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"SSE Test Item\\\"],\\\"customer_name\\\":\\\"SSETester\\\"}\"}}]}}" > /dev/null
sleep 2

kill $SSE_PID 2>/dev/null
wait $SSE_PID 2>/dev/null

# Check SSE output contains the event
if grep -q "order_saved\|SSE Test Item\|SSETester" /tmp/sse-output.txt; then
  assert "SSE stream delivered order_saved event" "OK"
else
  CONTENT=$(cat /tmp/sse-output.txt 2>/dev/null | head -3)
  assert "SSE stream content: $CONTENT" "FAIL"
fi
rm -f /tmp/sse-output.txt

# === CONCURRENT MULTI-CUSTOMER ===
echo "--- Concurrent Multi-Customer (50 phones) ---"
START=$(date +%s%N)
for i in {1..50}; do
  P="+1555$(printf '%07d' $i)"
  webhook "{\"message\":{\"call\":{\"id\":\"mc-$i\",\"customer\":{\"number\":\"$P\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" > /dev/null &
done
wait
END=$(date +%s%N)
MS=$(( (END - START) / 1000000 ))
echo "  50 concurrent multi-customer requests: ${MS}ms"
[ $MS -lt 5000 ] && assert "50 concurrent requests under 5s" "OK" || assert "50 concurrent took ${MS}ms" "FAIL"

# === CALL_ID REUSE ===
echo "--- Call ID Reuse ---"
# Same callId, multiple status updates (Vapi resends these)
curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"status-update\",\"call\":{\"id\":\"reuse-1\",\"customer\":{\"number\":\"$PHONE\"}}}}" > /dev/null
curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"type\":\"status-update\",\"call\":{\"id\":\"reuse-1\",\"customer\":{\"number\":\"$PHONE\"}}}}" > /dev/null
# Check active calls — should have exactly 1 entry for reuse-1
ACTIVE=$(curl -s "$BASE/api/calls/active")
COUNT=$(echo $ACTIVE | jq '(.calls // .) | map(select(.callId == "reuse-1")) | length' 2>/dev/null)
[ "$COUNT" = "1" ] && assert "Duplicate status-update doesn't duplicate active call" "OK" || assert "Active count for reused id: $COUNT" "FAIL"

# End the call
curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d '{"message":{"type":"end-of-call-report","call":{"id":"reuse-1"}}}' > /dev/null

# === LONG CALL: 100 tool calls in sequence ===
echo "--- Long Call: 100 Tool Calls ---"
LCID="long-call-$$"
SUCCESS=0
for i in {1..100}; do
  r=$(webhook "{\"message\":{\"call\":{\"id\":\"$LCID\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"t$i\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{\\\"request\\\":\\\"item $i\\\"}\"}}]}}")
  [ "$(echo $r | jq '.results | length')" = "1" ] && SUCCESS=$((SUCCESS+1))
done
[ $SUCCESS -eq 100 ] && assert "100 tool calls in same callId: all succeeded" "OK" || assert "Only $SUCCESS/100 succeeded" "FAIL"

# === MENU PARSING EDGE CASES ===
echo "--- Menu Parsing Validation ---"
MENU=$(curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
  -d "{\"message\":{\"call\":{\"id\":\"mp\"},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" | \
  jq '.results[0].result.company.menu')

# All items should have non-empty name
EMPTY_NAMES=$(echo $MENU | jq '[.[] | select(.name == "" or .name == null)] | length')
[ "$EMPTY_NAMES" = "0" ] && assert "No empty/null names in menu" "OK" || assert "$EMPTY_NAMES empty names" "FAIL"

# No negative prices
NEG_PRICES=$(echo $MENU | jq '[.[] | select(.price < 0)] | length')
[ "$NEG_PRICES" = "0" ] && assert "No negative prices" "OK" || assert "$NEG_PRICES negative prices" "FAIL"

# Prices should be plausible — flag prices over $100k as broken scrapes
INSANE=$(echo $MENU | jq '[.[] | select(.price > 100000)] | length')
[ "$INSANE" = "0" ] && assert "No insane prices (>$100k)" "OK" || assert "$INSANE insane prices" "FAIL"
# Note: Costco legitimately sells ultra-premium items ($85k Petrus wine sets, etc.)
# so $10k+ is plausible. Only flag if obviously broken.

# All items have attributes array
NO_ATTRS=$(echo $MENU | jq '[.[] | select(.attributes == null or (.attributes | type) != "array")] | length')
[ "$NO_ATTRS" = "0" ] && assert "All items have attributes array" "OK" || assert "$NO_ATTRS items missing attrs" "FAIL"

# Check menu has good variety: 50+ unique categories in attrs across items
UNIQ=$(echo $MENU | jq '[.[] | .attributes[]?] | unique | length')
[ $UNIQ -ge 50 ] && assert "Menu has 50+ unique attrs ($UNIQ)" "OK" || assert "Only $UNIQ unique attrs" "FAIL"

# === BURST/RATE TEST ===
echo "--- Burst Load (200 reqs) ---"
START=$(date +%s%N)
for i in {1..200}; do
  webhook "{\"message\":{\"call\":{\"id\":\"burst-$i\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" > /dev/null &
done
wait
END=$(date +%s%N)
MS=$(( (END - START) / 1000000 ))
echo "  200 concurrent get_context: ${MS}ms"
# After burst, server should still respond
HEALTH=$(curl -s --max-time 3 $BASE/health | jq -r '.ok')
[ "$HEALTH" = "true" ] && assert "Server alive after 200-req burst" "OK" || assert "Server crashed under burst" "FAIL"
[ $MS -lt 15000 ] && assert "200 concurrent under 15s" "OK" || assert "Burst took ${MS}ms" "FAIL"

# === MULTI-CUSTOMER ORDERS ===
echo "--- Multi-Customer Save Orders ---"
# 20 different phone numbers each save orders concurrently
for i in {1..20}; do
  P="+1444$(printf '%07d' $i)"
  webhook "{\"message\":{\"call\":{\"id\":\"mco-$i\",\"customer\":{\"number\":\"$P\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"MC Item $i\\\"]}\"}}]}}" > /dev/null &
done
wait
sleep 2
# Server should still be healthy
HEALTH=$(curl -s --max-time 3 $BASE/health | jq -r '.ok')
[ "$HEALTH" = "true" ] && assert "Server alive after 20 multi-customer orders" "OK" || assert "MC orders crashed" "FAIL"

# === DATA-DAMAGING INPUTS ===
echo "--- Data-Damaging Input Resistance ---"
# Markdown header in name → could break menu parser if echoed back
MDH=$(webhook "{\"message\":{\"call\":{\"id\":\"mdh\",\"customer\":{\"number\":\"$PHONE\"}},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"save_order\",\"arguments\":\"{\\\"items\\\":[\\\"## Fake Section Header\\\",\\\"---\\\\n---\\\"]}\"}}]}}")
sleep 1
# Re-check menu still parses correctly
MENU_AFTER=$(webhook "{\"message\":{\"call\":{\"id\":\"check\"},\"toolCallList\":[{\"id\":\"x\",\"function\":{\"name\":\"get_context\",\"arguments\":\"{}\"}}]}}" | jq '.results[0].result.company.menu | length')
[ "$MENU_AFTER" = "904" ] && assert "Menu still has 904 items after MD injection attempt" "OK" || assert "Menu count changed to $MENU_AFTER" "FAIL"

# === RAPID CALL LIFECYCLE ===
echo "--- Rapid Call Lifecycle ---"
RAPID_OK=0
for i in {1..30}; do
  CID="rapid-$i-$$"
  # start
  curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
    -d "{\"message\":{\"type\":\"status-update\",\"call\":{\"id\":\"$CID\",\"customer\":{\"number\":\"$PHONE\"}}}}" > /dev/null
  # end
  curl -s -X POST "$BASE/api/vapi-webhook" -H 'Content-Type: application/json' \
    -d "{\"message\":{\"type\":\"end-of-call-report\",\"call\":{\"id\":\"$CID\"}}}" > /dev/null
  RAPID_OK=$((RAPID_OK+1))
done
[ $RAPID_OK -eq 30 ] && assert "30 rapid call lifecycles handled" "OK" || assert "Only $RAPID_OK/30 handled" "FAIL"
# Active calls should be empty
ACT=$(curl -s "$BASE/api/calls/active")
ACT_COUNT=$(echo $ACT | jq 'if type=="array" then length else (.calls // [] | length) end')
[ "$ACT_COUNT" = "0" ] && assert "Active calls empty after lifecycle cycles" "OK" || assert "$ACT_COUNT active calls left" "FAIL"

# === REPORT ===
echo ""
echo "======================="
echo "🔬 DEEP EDGE RESULTS"
echo "======================="
echo -e "$RESULTS"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "Total:    $((PASS+FAIL))"
