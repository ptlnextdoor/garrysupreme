---
id: TASK-D03
priority: P0
status: done
assigned_at: 2026-05-16T10:00:00
completed_at: 2026-05-16T10:15:00
files_changed:
  - data/companies/sunrise-coffee/menu.md
  - data/companies/sunrise-coffee/policies.md
  - data/companies/sunrise-coffee/allergens.md
  - data/customers/demo-customer.md
  - data/customers/new-customer.md
  - vapi/system-prompt.md
  - vapi/tool-definitions.json
---

## Objective
Create all seed data files and Vapi configuration.

## Notes from Worker
menu.md has 8 items with all required fields (price, description, dairy_free, attributes, modifiers). Demo customer is Aarya with oat milk preference, 4 order history entries, household member Mom (chai, extra spiced). new-customer.md is the anonymous fallback. Vapi system prompt covers all rules from spec. tool-definitions.json has exactly 2 tools: get_context and save_order. Note: demo-customer phone is placeholder +1XXXXXXXXXX — must be replaced with real phone before demo.
