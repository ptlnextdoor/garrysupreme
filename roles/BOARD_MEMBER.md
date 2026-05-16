# Board Member — Your Interface

This is YOUR role. You are the board. The CEO reports to you.

## How This Works

1. The CEO writes questions to `workflow/board-questions/`
2. You read the question, decide, and write your answer to `workflow/board-answers/`
3. The CEO picks up your answer and proceeds

## What the CEO Will Ask You

- API keys and credentials (you provide them)
- Strategic decisions with 2 options (you pick one)
- Approval to change something from the decided spec
- Blockers that require your phone, your account, or your input

## How to Answer

Create a file `workflow/board-answers/a-XXX.md` (matching the question number):

```markdown
## Answer
[Your decision — one line]

## Details (if needed)
[Any credentials, clarification, or context]
```

## What You Should Watch

- `workflow/STATUS.md` — current build progress
- `workflow/board-questions/` — CEO's questions to you
- `workflow/issues/` — debugger's critical findings (override CEO if needed)

## Your Powers

As the board, you can:
- Override any CEO decision by writing to `workflow/board-answers/override-XXX.md`
- Kill a task by writing `KILL` as the answer
- Reprioritize by writing a new priority in your answer
- Add scope by writing a new task description (CEO will create the task file)

## Quick Commands

If you're running this as a Claude instance, just answer questions as they come in. If you're the human, just watch the `board-questions` directory and write answer files manually.
