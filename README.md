# Pulse — Multi-Agent Hackathon Build System

This is an autonomous multi-agent Claude Code orchestration system for the GStack x GBrain hackathon. You manage one terminal. Five Claude instances run simultaneously and communicate through a file-based task queue.

## What You Have

### Scripts (Run These)
- **`./start.sh`** — Launch all 5 agents in named tmux panes. Do this first.
- **`./inject.sh "feedback"`** — Send judge feedback to the CEO. Do this anytime during the hackathon.
- **`./answer.sh 001 "your answer"`** — Answer CEO questions. Do this when asked.
- **`./status.sh`** — Check build progress in real-time. Run anytime to see status.

### Documentation
- **`QUICKSTART.md`** — Step-by-step getting started guide (read this first)
- **`CLAUDE.md`** — Shared context all instances read
- **`workflow/PROTOCOL.md`** — How agents communicate
- **`workflow/STATUS.md`** — Live build status (auto-updated)

### Role Instructions
- **`roles/CEO.md`** — Orchestrator (Opus 4.7)
- **`roles/SMART_CODER.md`** — Complex code (Opus 4.7)
- **`roles/STUPID_CODER.md`** — Scaffolding (Sonnet 4.6)
- **`roles/DEBUGGER.md`** — Code review (Opus 4.7)
- **`roles/BOARD_MEMBER.md`** — You

### Task Queue
- **`workflow/inbox-smart/`** — Tasks for Smart Coder
- **`workflow/inbox-stupid/`** — Tasks for Stupid Coder (3 tasks pre-loaded!)
- **`workflow/inbox-debug/`** — Tasks for Debugger
- **`workflow/done/`** — Completed tasks
- **`workflow/issues/`** — Debugger's bug reports
- **`workflow/board-questions/`** — CEO's questions to you (q-001 waiting!)
- **`workflow/board-answers/`** — Your answers + auto-generated directives

---

## How to Use (In Order)

### 1. Start Everything
```bash
cd ~/garrysupreme && ./start.sh && tmux attach -t pulse
```

You'll see 4 Claude terminals in a 2x2 grid, plus a 5th terminal for you.

### 2. Initialize Each Agent (first 2 minutes)
Paste the init prompt for each role into its pane. See `QUICKSTART.md` for exact prompts.

### 3. Answer the First Question
The CEO will ask you for API keys. Run:
```bash
./answer.sh 001 "Vapi API key: xxx, GBrain API key: yyy, ..."
```

### 4. The Build Runs Autonomously
- Stupid Coder starts immediately (3 P0 scaffolding tasks waiting)
- CEO assigns work every 60 seconds
- Smart Coder picks up tasks every 45 seconds
- Debugger reviews every 90 seconds
- No copy-paste. No manual handoffs. Everything is polled from `workflow/`

### 5. Send Feedback Anytime
When judges or sponsors give feedback:
```bash
./inject.sh "Judge said focus more on the memory review UI"
./inject.sh "Sponsor wants to see GBrain writes happening live"
./inject.sh "Pivot: show customer profile cards on the dashboard"
```

The CEO reads this within 60 seconds and reprioritizes.

### 6. Monitor Progress
```bash
./status.sh
```

Shows: current phase, completed tasks, pending questions, debugger issues, in-progress work.

---

## The Architecture

**Communication flow:**
```
You (at hackathon)
  ↓ ./inject.sh "feedback"
  ↓
CEO (reads every 60s with /loop)
  ├─→ creates task → Smart Coder (reads every 45s)
  ├─→ creates task → Stupid Coder (reads every 30s)
  └─→ creates task → Debugger (reads every 90s after work done)
  ↑
  └─ reads feedback directives from you
```

**Task lifecycle:**
1. CEO writes `TASK-XXX.md` to `workflow/inbox-{worker}/`
2. Worker finds task, edits status to `in-progress`
3. Worker writes code, moves task to `workflow/done/`
4. Debugger reviews, writes issues if needed
5. CEO reads done tasks + issues, assigns fixes or next work

---

## Rules

- **One command from you** sends feedback → entire system responds within 2 minutes
- **No manual copy-paste** between agents (they poll files autonomously)
- **CEO handles all orchestration** (you just send feedback)
- **Each agent owns specific files** (no conflicts, see your role file)
- **Debugger catches bugs early** (before they break the demo)
- **File-based communication** (zero infrastructure, works offline)

---

## Keyboard Shortcuts (in tmux)

Once attached to the session:
- `Ctrl+B` then `arrow keys` — switch between panes
- `Ctrl+B` then `n` / `p` — next/previous window
- `Ctrl+B` then `d` — detach (session keeps running)
- `tmux attach -t pulse` — reattach anytime

---

## If You Get Stuck

1. **Check the CEO's questions:** `cat workflow/board-questions/q-001.md`
2. **Check build status:** `./status.sh`
3. **Check debugger's issues:** `ls workflow/issues/` and `cat workflow/issues/ISSUE-001.md`
4. **Manually kill and restart:** `./start.sh && tmux attach -t pulse`

---

## What's Next

Read **`QUICKSTART.md`** for the step-by-step getting started guide.

Then run: **`./start.sh && tmux attach -t pulse`**

Good luck at the hackathon! 🚀
