#!/bin/bash
# Quick answer helper for the Board Member
# Usage: ./answer.sh 001 "Your answer here"

QUESTION_NUM=$1
ANSWER=$2

if [ -z "$QUESTION_NUM" ] || [ -z "$ANSWER" ]; then
  echo "Usage: ./answer.sh <question-number> \"your answer\""
  echo "Example: ./answer.sh 001 \"Yes, approved. Here are the keys: ...\""
  exit 1
fi

cat > "workflow/board-answers/a-${QUESTION_NUM}.md" << EOF
---
id: a-${QUESTION_NUM}
answered_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

## Answer
${ANSWER}
EOF

echo "Answer saved to workflow/board-answers/a-${QUESTION_NUM}.md"
