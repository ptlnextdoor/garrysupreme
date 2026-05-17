#!/bin/bash
# Spin up a mock GBrain MCP server, point the backend at it,
# verify that get_page / put_page / list_pages JSON-RPC calls (real gbrain tool names)
# actually hit it.

PASS=0
FAIL=0

assert() {
  local name="$1"; local cond="$2"; local detail="$3"
  if [ "$cond" = "OK" ]; then
    PASS=$((PASS+1)); echo "  ✅ $name"
  else
    FAIL=$((FAIL+1)); echo "  ❌ $name — $detail"
  fi
}

echo "🧠 GBrain MCP API integration test"
echo "================================="

# Kill any leftovers
pkill -f "tsx.*backend/src/index.ts" 2>/dev/null
pkill -f "node.*mock-gbrain" 2>/dev/null
sleep 1

# Write the mock server — speaks the REAL garrytan/gbrain MCP tool names
# (get_page, put_page, list_pages, add_timeline_entry, add_link, etc.) and
# returns SSE-framed responses like the real streamable HTTP transport.
cat > /tmp/mock-gbrain.mjs << 'EOF'
import http from 'node:http'
const calls = []
const docs = new Map()
docs.set('costco/companies/costco/menu', '---\ntitle: From GBrain\n---\n## Test Item\n- price: 1.00')

function sse(obj) {
  return 'event: message\ndata: ' + JSON.stringify(obj) + '\n\n'
}
function ok(id, payload) {
  return sse({
    jsonrpc: '2.0',
    id,
    result: { content: [{ type: 'text', text: JSON.stringify(payload) }] },
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      const auth = req.headers.authorization || ''
      if (!auth.startsWith('Bearer test-token')) {
        res.writeHead(401); res.end(JSON.stringify({jsonrpc:'2.0', error:{code:-32600, message:'unauthorized'}, id:0}))
        return
      }
      const msg = JSON.parse(body)
      const { name, arguments: args } = msg.params || {}
      calls.push(name)
      let payload
      if (name === 'get_page') {
        const content = docs.get(args.slug)
        payload = content
          ? { slug: args.slug, content }
          : { error: 'not_found', slug: args.slug }
      } else if (name === 'put_page') {
        docs.set(args.slug, args.content)
        payload = { slug: args.slug, status: 'created_or_updated', chunks: 1 }
      } else if (name === 'list_pages') {
        const pages = [...docs.keys()].map((slug) => ({ slug, type: 'concept' }))
        payload = pages
      } else if (name === 'add_timeline_entry') {
        payload = { id: 1, slug: args.slug, date: args.date, summary: args.summary }
      } else if (name === 'add_link') {
        payload = { status: 'ok', from: args.from, to: args.to, link_type: args.link_type }
      } else if (name === 'traverse_graph') {
        payload = []
      } else if (name === 'get_brain_identity') {
        payload = { version: 'mock-1.0', engine: 'mock', page_count: docs.size }
      } else if (name === 'get_stats') {
        payload = { page_count: docs.size, chunk_count: docs.size, embedded_count: 0 }
      } else if (name === 'query' || name === 'search') {
        payload = []
      } else {
        payload = { mock: true, name }
      }
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.end(ok(msg.id, payload))
    })
  } else if (req.url === '/_calls') {
    res.writeHead(200); res.end(JSON.stringify(calls))
  } else {
    res.writeHead(404); res.end('not found')
  }
})
server.listen(4444, () => console.log('mock gbrain on :4444'))
EOF

node /tmp/mock-gbrain.mjs > /tmp/mock-gbrain.log 2>&1 &
MOCK_PID=$!
sleep 1

# Verify mock is up
curl -s http://localhost:4444/_calls >/dev/null && echo "  mock gbrain up on :4444" || { echo "  ❌ mock failed to start"; exit 1; }

# Boot backend in api mode
GBRAIN_BASE_URL=http://localhost:4444 \
GBRAIN_API_KEY=test-token \
GBRAIN_PROJECT_ID=costco \
GBRAIN_MODE=api \
npx tsx /Users/aaryapatel/garrysupreme/apps/backend/src/index.ts > /tmp/api-backend.log 2>&1 &
BE_PID=$!
sleep 4

# Verify backend up
HEALTH=$(curl -s http://localhost:3001/ | jq -r .status 2>/dev/null)
[ "$HEALTH" = "ok" ] && echo "  backend up on :3001 in api mode" || { echo "  ❌ backend failed to start"; cat /tmp/api-backend.log | tail -20; kill $BE_PID $MOCK_PID 2>/dev/null; exit 1; }

# Verify mode logged
grep -q "mode=api" /tmp/api-backend.log && assert "Backend reports mode=api" "OK" || assert "mode logging" "FAIL" "$(grep gbrain /tmp/api-backend.log | head -3)"

# Trigger a read (get_context calls company.getMenu + customers.getProfile)
curl -s -X POST http://localhost:3001/api/vapi-webhook -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"api-read","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"r","function":{"name":"get_context","arguments":"{}"}}]}}' > /tmp/api-resp.json
sleep 1

# Check mock got hit
CALLS=$(curl -s http://localhost:4444/_calls)
echo "  mock received: $CALLS"
echo "$CALLS" | grep -q "get_page" && assert "Backend called get_page (real gbrain tool)" "OK" || assert "get_page not called" "FAIL" "$CALLS"

# Trigger a write — save_order with new_preferences always writes a memory fact
# (regardless of whether the customer profile already exists)
curl -s -X POST http://localhost:3001/api/vapi-webhook -H 'Content-Type: application/json' \
  -d '{"message":{"call":{"id":"api-write","customer":{"number":"+17028619093"}},"toolCallList":[{"id":"w","function":{"name":"save_order","arguments":"{\"items\":[\"API mode test\"],\"new_preferences\":[{\"fact\":\"Test fact from API mode\",\"confidence\":0.9}]}"}}]}}' > /dev/null
sleep 2

CALLS=$(curl -s http://localhost:4444/_calls)
echo "  mock received after write: $CALLS"
echo "$CALLS" | grep -q "put_page" && assert "Backend called put_page" "OK" || assert "put_page not called" "FAIL" "$CALLS"
echo "$CALLS" | grep -q "add_timeline_entry" && assert "Backend called add_timeline_entry (new!)" "OK" || assert "add_timeline_entry not called" "FAIL" "$CALLS"
echo "$CALLS" | grep -q "add_link" && assert "Backend called add_link (new!)" "OK" || assert "add_link not called" "FAIL" "$CALLS"

# Verify menu came from mock (not file) — should have "From GBrain" title
MENU_NAME=$(echo "$(cat /tmp/api-resp.json)" | jq -r '.results[0].result.company.menu[0].name // empty')
if [ "$MENU_NAME" = "Test Item" ]; then
  assert "Menu served from GBrain mock (not local file)" "OK"
else
  assert "Menu source check" "FAIL" "first item was: $MENU_NAME (expected 'Test Item' from mock)"
fi

# Cleanup
kill $BE_PID $MOCK_PID 2>/dev/null
wait 2>/dev/null

echo ""
echo "================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
[ $FAIL -eq 0 ] && echo "🧠 GBrain API mode wiring confirmed working." || echo "⚠️  API mode has issues."
