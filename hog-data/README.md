# HOG Demo Data

This folder contains the explicit HOG-labeled demo data used by the Pulse Costco/Starbucks demo.

## Catalogs

- `costco_catalog.csv` - Costco product catalog used for the primary HOG demo brain.
- `starbucks_catalog.csv` - Starbucks product catalog used for the secondary HOG demo brain.
- `costco_seed_taxonomy.csv` - HOG demo taxonomy/enrichment seeds for Costco matching.
- `starbucks_seed_taxonomy.csv` - HOG demo taxonomy/enrichment seeds for Starbucks matching.
- `demo_queries.csv` - HOG demo query set for Costco and Starbucks smoke tests.

## Runtime Copy

The Railway backend loads the runtime copies from `yc-gbrain/server/data/`.
This top-level folder exists so the provenance is obvious in the repository: these are the HOG catalog/demo data artifacts, with Costco and Starbucks kept as separate company brains.

Some fields are seeded or inferred for demo realism and should not be treated as live inventory, pricing, allergen, or availability guarantees.
