# Multi-Agent Communication Protocol

## How It Works

Each Claude Code instance has a role and watches a specific inbox directory. Communication happens through markdown files.

## Task Lifecycle

1. **CEO creates task** → writes `.md` file to `workflow/inbox-{worker}/`
2. **Worker picks up task** → reads file, sets status to `in-progress` (edits file)
3. **Worker completes task** → writes code to project, moves task file to `workflow/done/`, adds completion notes
4. **Debugger reviews** → watches `workflow/done/`, reviews code, writes issues to `workflow/issues/` if needed
5. **CEO tracks** → reads `workflow/done/` and `workflow/issues/`, updates `STATUS.md`

## Task File Format

```markdown
---
id: TASK-XXX
priority: P0 | P1 | P2
status: pending | in-progress | done | blocked | needs-fix
assigned_at: ISO timestamp
completed_at: ISO timestamp (when done)
files_changed: list of files (when done)
---

## Objective
What to build/do.

## Context
Why this matters, what depends on it.

## Files to Create/Modify
Exact file paths.

## Acceptance Criteria
What "done" looks like.

## Notes from Worker (filled on completion)
What was done, any deviations, any blockers found.
```

## Board Communication

- CEO writes questions to `workflow/board-questions/q-XXX.md`
- Board member (human) writes answers to `workflow/board-answers/a-XXX.md`
- Format: question with 2 options max, recommendation marked, yes/no ask

## Issue File Format (Debugger)

```markdown
---
id: ISSUE-XXX
severity: critical | warning | nit
related_task: TASK-XXX
files: [list]
---

## Problem
What's wrong.

## Fix
What to change (be specific — line numbers and code).
```

## Rules

- Never overwrite another worker's in-progress code
- Smart Coder owns: packages/*, apps/backend/src/routes/*, apps/backend/src/services/*
- Stupid Coder owns: config files, seed data, dashboard components, deploy files, scripts
- Debugger ONLY reviews — does not write production code
- If two tasks touch the same file, CEO must sequence them (not parallel)
