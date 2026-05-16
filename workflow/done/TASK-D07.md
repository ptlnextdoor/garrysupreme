---
id: TASK-D07
priority: P1
status: done
assigned_at: 2026-05-16T13:12:00
completed_at: 2026-05-16T13:22:00
files_changed:
  - apps/dashboard/src/app/page.tsx
  - apps/dashboard/src/hooks/useSSE.ts
---

## Notes from Worker
page.tsx already had useSSE wired from D04. Added InsightCards to right column. useSSE now does an initial REST fetch of /api/calls/active on mount (seeds state with any in-progress calls before SSE connects), silently ignores fetch errors so cold-start renders fine. All components receive live SSE state as props: activeCalls, recentOrders, pendingFacts, stats.
