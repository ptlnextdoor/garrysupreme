# Quick Start — Multi-Agent Pulse Build

## 1️⃣ Start Everything

```bash
cd ~/garrysupreme && ./start.sh && tmux attach -t pulse
```

This launches 5 named terminals in a 2x2 grid + 1 dedicated to you.

**You'll see:**
```
┌─────────────────────────────┬──────────────────────────────┐
│      CEO (Opus 4.7)         │  STUPID CODER (Sonnet 4.6)   │
│                             │                              │
│     [Claude instance]       │     [Claude instance]        │
│                             │                              │
├─────────────────────────────┼──────────────────────────────┤
│  SMART CODER (Opus 4.7)     │    DEBUGGER (Opus 4.7)       │
│                             │                              │
│     [Claude instance]       │     [Claude instance]        │
│                             │                              │
└─────────────────────────────┴──────────────────────────────┘
```

*Window 2: Your board member terminal (separate tab)*

---

## 2️⃣ Initialize Each Claude Instance

In the first 2 minutes after starting:

**CEO pane:**
```
Paste: I am the CEO. Read roles/CEO.md, workflow/PROTOCOL.md, and pulse_final_build_plan_with_vapi_v2.0.md. Begin orchestrating now. Create the first batch of tasks and use /loop 60 to poll workflow/ for completions.
```

**STUPID CODER pane:**
```
Paste: I am the Stupid Coder. Read roles/STUPID_CODER.md and STUPID_CODER_PROMPT.md. Use /loop 30 to watch workflow/inbox-stupid/ for tasks. Three P0 tasks are already in your inbox — start immediately.
```

**SMART CODER pane:**
```
Paste: I am the Smart Coder. Read roles/SMART_CODER.md and SMART_CODER_PROMPT.md. Use /loop 45 to watch workflow/inbox-smart/ for tasks. Wait for the Stupid Coder to finish Phase 1 scaffolding, then begin.
```

**DEBUGGER pane:**
```
Paste: I am the Debugger. Read roles/DEBUGGER.md. Use /loop 90 to watch workflow/done/ for completed tasks. Review code for type errors, integration issues, and demo-breaking bugs. Write issues to workflow/issues/ if found.
```

**BOARD MEMBER pane (you):**
Use the commands below.

---

## 3️⃣ Your Commands

**Answer the CEO's first question (API keys):**
```bash
./answer.sh 001 "Vapi key: xxx, GBrain key: yyy, ..."
```

**Send judge feedback anytime:**
```bash
./inject.sh "Judge said focus more on GBrain writes"
./inject.sh "Sponsor wants to see the memory review queue in action"
./inject.sh "Pivot: add live call transcript to dashboard"
```

**Check build status:**
```bash
cat workflow/STATUS.md
```

**Check what CEO is asking you:**
```bash
ls workflow/board-questions/
cat workflow/board-questions/q-001.md
```

**Check debugger's findings:**
```bash
ls workflow/issues/
cat workflow/issues/ISSUE-001.md
```

---

## tmux Keyboard Shortcuts

**While in tmux:**
- `Ctrl+B` then `←` `→` `↑` `↓` — switch between panes
- `Ctrl+B` then `n` — next window (Board pane)
- `Ctrl+B` then `p` — previous window (Agents)
- `Ctrl+B` then `d` — detach (closes window, keeps session running)
- Reattach: `tmux attach -t pulse`

---

## How It Flows

1. You answer q-001 (API keys) in the BOARD pane
2. CEO picks up answer within 60 seconds, starts assigning tasks
3. STUPID CODER picks up tasks within 30 seconds, outputs files
4. Once types exist, SMART CODER picks up tasks within 45 seconds, writes complex code
5. DEBUGGER reviews completed work within 90 seconds, flags bugs
6. CEO sees bugs/completions, adjusts plan, assigns fixes
7. **You inject feedback anytime:** `./inject.sh "..."`
8. CEO reads directive within 60 seconds, pivots as needed
9. Loop continues until 12 hours are up or demo is perfect

---

## If You Need to Stop

```bash
tmux kill-session -t pulse
```

## If You Lose Connection

```bash
tmux attach -t pulse
```

---

## Remember

- Each `./inject.sh` is **one line** to update the entire system
- No copy-paste between agents — they poll autonomously
- CEO will ask you questions in `workflow/board-questions/` — answer promptly
- Watch `workflow/STATUS.md` to see progress
- The goal is to ship a **working demo**, not perfect code
