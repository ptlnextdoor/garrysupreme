---
id: TASK-S01
priority: P0
status: done
assigned_at: 2026-05-16T12:40:00
completed_at: 2026-05-16T12:46:00
depends_on: TASK-D02
files_changed:
  - packages/gbrain/src/client.ts
  - packages/gbrain/src/company.ts
  - packages/gbrain/src/customer.ts
  - packages/gbrain/src/index.ts
---

## Objective
Build the GBrain client library — the core memory layer that reads/writes company and customer knowledge items.

## Context
GBrain is Pulse's persistence layer. Every brain (company brain, customer brain) is stored as markdown knowledge items. This client wraps the GBrain API (or falls back to local file-backed markdown). The backend routes (/api/context, /api/save_order) depend on this to fetch and store data.

**DO NOT START** until TASK-D02 is complete (you need the types from `apps/backend/src/types.ts`).

## Files to Create
1. `packages/gbrain/src/client.ts` — GBrainClient class with init, read, write, list, search methods
2. `packages/gbrain/src/company.ts` — CompanyBrain: getMenu(), getPolicies(), getAllergens()
3. `packages/gbrain/src/customer.ts` — CustomerBrain: getProfile(phone), updateProfile(phone, data), addMemoryFact(phone, fact)
4. `packages/gbrain/src/index.ts` — barrel export

## Architecture
- GBrainClient takes API key + project ID from env
- If no API key, fall back to reading from `data/` directory (file-backed mode)
- File-backed mode reads markdown files and parses frontmatter
- API mode hits GBrain REST endpoints
- All methods return typed objects matching types.ts definitions

## Acceptance Criteria
- GBrainClient can initialize in both API and file-backed modes
- company.ts can read menu items, parse them into MenuItem[] type
- customer.ts can read/write customer profiles as CustomerProfile type
- customer.ts can append MemoryFact entries
- File-backed fallback works with the seed data from TASK-D03
- All exports are typed, no `any` types in public API
- Index.ts barrel exports everything needed

## Specs
See SMART_CODER_PROMPT.md for detailed implementation specs.

## Notes from Worker
- `GBrainClient` auto-detects mode: `api` if both `GBRAIN_API_KEY` and `GBRAIN_BASE_URL` are set, otherwise `file`. Data root resolves to `process.env.GBRAIN_DATA_ROOT` or `<cwd>/data`.
- API endpoints are stubbed with the shape `GET/PUT /items/<encoded-path>` (and `GET /items?prefix=`); marked `// FIXME: adapt to real GBrain API` at every call site so they're easy to swap once the real schema lands.
- File-backed reads search `customers/<phone>.md` first, then fall back to scanning `customers/` for a frontmatter `phone:` match (handles the seed file naming today vs. phone-keyed naming later).
- `parseMenu` handles the `## Item\n- key: value` markdown format from the seed. `dairy_free` → `dairyFree`, list values parsed from `[a, b, c]` or comma-separated.
- `CustomerBrain.getProfile` parses the `## Preferences` / `## Avoids` / `## Style` / `## Order History` / `## Household Members` sections per the seed format and returns a typed `CustomerProfile`.
- `addMemoryFact` writes to `customers/memory-facts/<callId>-<sanitized-extractedAt>.md`. `updateFactStatus` rewrites only the `status:` frontmatter line in place.
- All methods catch and log via the local `log()` wrapper and return `null` / `false` / `[]` on failure — never throw to the caller (per the "never crash the live demo" rule).
- Types are imported via relative path `../../../apps/backend/src/types.js` (from TASK-D02). This works at compile time but requires either (a) a TS project reference from `packages/gbrain/tsconfig.json` to `apps/backend`, or (b) Stupid Coder bundling them as a `@pulse/types` workspace package. **Flagging for Stupid Coder / Debugger**: prefer option (b) for cleanliness, but (a) is fine for the hackathon. Imports won't resolve until install + tsconfig refs are wired.
- No `any` in public API. No `console.log` — all diagnostics go through `log()` to stderr.
- Depends on `TASK-D03` seed data being placed at `data/companies/sunrise-coffee/{menu,policies,allergens}.md` and `data/customers/<phone>.md` for file-backed mode to return non-empty data.
