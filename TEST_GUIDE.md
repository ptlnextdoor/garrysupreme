# Pulse Local Testing Guide

## What's Running
- **Backend**: http://localhost:3001
- **Dashboard**: http://localhost:3000
- **Customer**: Aarya (+17028619093)

## Test 1: Open Dashboard
Visit http://localhost:3000 — should show:
- Aarya's profile with preferences (oat milk, warm, less sweet)
- Empty order feed (no orders yet)
- Empty memory review

## Test 2: Simulate Agent Getting Context
This is what Vapi agent sees when customer calls in.

```bash
curl -X POST http://localhost:3001/api/vapi-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "call": {"id": "call-001", "customer": {"number": "+17028619093"}},
      "toolCallList": [{
        "id": "tool-1",
        "function": {
          "name": "get_context",
          "arguments": "{\"request\": \"I want something warm with oat milk\"}"
        }
      }]
    }
  }' | jq .
```

**What you should see**: Aarya's profile + ranked menu (Oat Milk Latte first)

## Test 3: Place an Order
Agent calls this when customer orders.

```bash
curl -X POST http://localhost:3001/api/vapi-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "call": {"id": "call-002", "customer": {"number": "+17028619093"}},
      "toolCallList": [{
        "id": "tool-2",
        "function": {
          "name": "save_order",
          "arguments": "{\"items\": [\"Oat Milk Latte\", \"Blueberry Muffin\"], \"customer_name\": \"Aarya\", \"new_preferences\": [{\"fact\": \"Prefers extra hot\", \"confidence\": 0.9}]}"
        }
      }]
    }
  }' | jq .
```

**What you should see**: `{"ok": true, "pickup_time": "~10 minutes"}`

**Dashboard updates**: Check http://localhost:3000 — should show new order in feed

## Test 4: Check Memory Fact Was Created
A memory fact was extracted from the call.

```bash
ls data/customers/memory-facts/
cat data/customers/memory-facts/*.md
```

## Test 5: Check Order Was Saved to History
```bash
grep "Oat Milk Latte" data/customers/demo-customer.md
```

Should show the order in Aarya's order history.

## Test 6: Try Different Scenarios

### Test with Mom (household member)
```bash
curl -X POST http://localhost:3001/api/vapi-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "call": {"id": "call-mom", "customer": {"number": "+17028619093"}},
      "toolCallList": [{
        "id": "tool-mom",
        "function": {
          "name": "save_order",
          "arguments": "{\"items\": [\"Chai Latte with oat milk\"], \"customer_name\": \"Mom\", \"new_preferences\": [{\"fact\": \"Mom called ahead\"}]}"
        }
      }]
    }
  }' | jq .
```

### Test with Unknown Caller
```bash
curl -X POST http://localhost:3001/api/vapi-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "call": {"id": "call-new", "customer": {"number": "+15551234567"}},
      "toolCallList": [{
        "id": "tool-new",
        "function": {
          "name": "get_context",
          "arguments": "{}"
        }
      }]
    }
  }' | jq .
```

**What you should see**: Anonymous profile (default "there"), full menu unranked

## Copy/Paste Ready Commands

**Get Aarya's context:**
```bash
curl -X POST http://localhost:3001/api/vapi-webhook -H 'Content-Type: application/json' -d '{"message": {"call": {"id": "test-1", "customer": {"number": "+17028619093"}}, "toolCallList": [{"id": "t1", "function": {"name": "get_context", "arguments": "{}"}}]}}' | jq .
```

**Place order:**
```bash
curl -X POST http://localhost:3001/api/vapi-webhook -H 'Content-Type: application/json' -d '{"message": {"call": {"id": "test-2", "customer": {"number": "+17028619093"}}, "toolCallList": [{"id": "t2", "function": {"name": "save_order", "arguments": "{\"items\": [\"Oat Milk Latte\"], \"customer_name\": \"Aarya\"}"}}]}}' | jq .
```

**Check backend health:**
```bash
curl http://localhost:3001/
```

## What to Look For

- **Agent sees ranked menu** → Preferences being remembered ✅
- **Order saved** → Backend responding correctly ✅
- **Dashboard shows orders** → Real-time updates working ✅
- **Memory facts created** → Learning customer preferences ✅

---

**Ready to deploy?** Once you confirm everything works locally, deploy backend to Railway and dashboard to Vercel.
