---
from: Board Member / CEO
priority: high
created: 2026-05-16T13:35:00
---

## Finalization Steps (When Build Complete)

### Prerequisites for Running ship.sh
✅ All tasks done (D01-D07, S01-S04, F01-F04)
✅ No in-progress tasks
✅ No critical issues remaining
✅ S04 integration test passes

### Command to Finalize
Once all prerequisites are met, run:
```bash
cd ~/garrysupreme && ./ship.sh
```

### What ship.sh Does
1. **Verify build complete** — checks for in-progress tasks and critical issues
2. **Generate BUILD_SUMMARY.md** — comprehensive documentation of:
   - Project overview (Pulse MVP)
   - Features implemented (Vapi, GBrain, GStack, Fastify, Next.js)
   - Phase deliverables (scaffolding + core implementation)
   - Architecture and tech stack
   - Multi-agent orchestration system
   - Build statistics (150+ files, 5000+ LOC, 5 agents)
   - Judge talking points
   - Demo flow walkthrough
3. **Stage all changes** — `git add -A` (150+ new files)
4. **Create git commit** — detailed message explaining:
   - MVP completion
   - All features delivered
   - Multi-agent approach
   - Ready for demo
5. **Push to remote** — `git push origin main`

### After ship.sh Completes
✅ Everything is committed and pushed
✅ BUILD_SUMMARY.md is created in repo root
✅ Ready for demo setup:
   - Deploy backend to Railway
   - Deploy dashboard to Vercel
   - Setup Vapi assistant
   - Provide DEMO_PHONE for test call

### BLOCKING ITEM
⚠️ **DEMO_PHONE required** — See `workflow/board-questions/q-002.md`

The integration test will show what still needs setup vs. what's done.

---

**Ship when ready. Build is yours to finalize.**
