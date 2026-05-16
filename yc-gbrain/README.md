# Pulse Demo

Pulse is a Vapi-powered phone concierge that reads a company-specific catalog brain, reads a customer brain, matches real catalog rows, and writes learned memory after confirmation.

Costco is the primary live demo. Starbucks is a secondary proof that each business gets a separate brain and matcher behavior.

## Run locally

```bash
npm install
npm run dev
```

- Dashboard: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Data

Pulse ingests local catalog/research files into file-backed GBrain-shaped storage:

- Costco source: `/Users/aayu/CostcoProductCatalog/catalog_with_sources.csv`
- Starbucks source: `/Users/aayu/starbucks_full_product_menu_catalog.csv`
- Research seeds: `/Users/aayu/pulse_demo_research/*.csv`

Generated brains:

- `gbrain/companies/costco/company.md`
- `gbrain/companies/costco/catalog-index.json`
- `gbrain/companies/costco/policies.md`
- `gbrain/companies/costco/allergens.md`
- `gbrain/companies/starbucks/company.md`
- `gbrain/companies/starbucks/catalog-index.json`
- `gbrain/customers/costco-aarya-costco-household.md`
- `gbrain/customers/costco-office-manager.md`
- `gbrain/customers/starbucks-aayushya-starbucks.md`

Verified catalog counts:

- Costco: `5329` (`5011` local rows + `318` clean PR #6 seed rows)
- Starbucks: `935`

## API

- `GET /api/companies`
- `GET /api/dashboard`
- `POST /api/context`
- `POST /api/search`
- `POST /api/save_order`
- `POST /api/demo/reset`

Costco context example:

```bash
curl -s http://localhost:3001/api/context \
  -H 'content-type: application/json' \
  -d '{"company_id":"costco","phone_number":"+17028619093","request":"I am doing a quick Costco run that may turn into the big monthly haul. Add my usual almond milk, salmon, and kids snacks."}'
```

Starbucks context example:

```bash
curl -s http://localhost:3001/api/context \
  -H 'content-type: application/json' \
  -d '{"company_id":"starbucks","phone_number":"+15557654321","request":"I want something cold, not too sweet, with caffeine, but no dairy."}'
```

## Demo path

1. Open the dashboard.
2. Keep `Costco` selected.
3. Click `Reset`, then `Start call`.
4. Call the Vapi number and say: “I’m doing a quick Costco run that may turn into the big monthly haul. Add my usual almond milk, salmon, and kids snacks.”
5. Pulse loads the separate Costco Company Brain and Aarya household Customer Brain, including Mom/partner/kids memory cards.
6. Catalog Matcher returns ranked Costco rows, review reasons, and a clarifying question.
7. The n8n-style workflow lights up from backend events.
8. Click `Confirm demo order` or let Vapi call `save_order`.
9. Approve one memory candidate to update the Costco customer brain.
10. For the office-event Costco path, use `+15551234567` or the seeded query: “I need snacks and drinks for 35 people for the office next week, keep it under about $250.”
11. Switch to `Starbucks` to show the separate Starbucks brain and menu translation demo.
