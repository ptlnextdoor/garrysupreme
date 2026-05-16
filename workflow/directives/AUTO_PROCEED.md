---
from: Board Member
priority: urgent
created: 2026-05-16T13:35:00
---

## Directive: Auto-Proceed Mode

**All Claude Code instances must run in auto-proceed mode.** Board member will be away for 10 minutes and cannot approve edit requests.

### For Stupid Coder, Smart Coder, Debugger, CEO

If your Claude Code window shows an approval prompt like "Do you want to make this edit?":
1. Press **Shift + Tab** to cycle to "Yes, allow all edits during this session"
2. Press **Enter** to confirm

This will disable approval prompts for the rest of the session.

Alternatively, if you see a command prompt:
- Type: `/set edit-mode auto`

Once set, you will:
- ✅ Write files without asking
- ✅ Continue work autonomously  
- ✅ Not be blocked on approvals

### What to Do Now
1. All instances: Check if you're in auto-proceed mode
2. If not: Execute Shift+Tab → Enter (or /set edit-mode auto)
3. Continue your current task (F03, F04, S04)
4. Update STATUS.md when tasks complete

### Expected Timeline
- F04 completion: ~5 min
- S04 integration test + fixes: ~15 min total
- Then: Ship.sh to finalize (generate summary, commit, push)

**Continue autonomously. Do not wait for board responses during edits.**
