#!/bin/bash
# Watch for new board questions from the CEO
# Run this in a terminal to see questions as they come in

cd /Users/aaryapatel/garrysupreme

echo "Watching for board questions... (Ctrl+C to stop)"
echo "Answer with: ./answer.sh <number> \"your answer\""
echo "---"

fswatch -r workflow/board-questions/ 2>/dev/null || \
  while true; do
    clear
    echo "=== PENDING BOARD QUESTIONS ==="
    echo ""
    for f in workflow/board-questions/q-*.md; do
      if [ -f "$f" ]; then
        NUM=$(echo "$f" | grep -o '[0-9]*')
        ANSWER="workflow/board-answers/a-${NUM}.md"
        if [ ! -f "$ANSWER" ]; then
          echo ">>> UNANSWERED: $f"
          echo "---"
          cat "$f"
          echo ""
          echo "==========================="
        fi
      fi
    done
    sleep 5
  done
