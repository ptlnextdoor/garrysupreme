#!/bin/bash
# Inject feedback into the system with ONE command
# Usage: ./inject.sh "Judge said we should focus more on the GBrain integration"
# This writes to feedback.md AND creates a board directive for the CEO

REPO="/Users/aaryapatel/garrysupreme"
FEEDBACK="$1"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NUM=$(ls "$REPO/workflow/board-answers/" 2>/dev/null | wc -l | tr -d ' ')
NUM=$((NUM + 1))
NUM=$(printf "%03d" $NUM)

if [ -z "$FEEDBACK" ]; then
  echo "Usage: ./inject.sh \"your feedback here\""
  echo ""
  echo "Examples:"
  echo "  ./inject.sh \"Judge loves the memory review queue, make it more prominent\""
  echo "  ./inject.sh \"Sponsor asked about GBrain integration depth, show more writes\""
  echo "  ./inject.sh \"Pivot: drop GStack roles, focus on GBrain read/write demo\""
  echo "  ./inject.sh \"Add feature: show call transcript live on dashboard\""
  exit 1
fi

# Append to feedback log
echo "" >> "$REPO/workflow/feedback.md"
echo "## [$TIMESTAMP]" >> "$REPO/workflow/feedback.md"
echo "$FEEDBACK" >> "$REPO/workflow/feedback.md"

# Create a board directive that the CEO will pick up
cat > "$REPO/workflow/board-answers/directive-${NUM}.md" << EOF
---
id: directive-${NUM}
type: board-directive
priority: urgent
issued_at: ${TIMESTAMP}
---

## Board Directive

**External feedback received:** ${FEEDBACK}

**Action required:** CEO must evaluate this feedback and adjust priorities/tasks immediately. If this contradicts current work, create new tasks or kill existing ones as needed. Report back what changed.
EOF

echo ""
echo "Feedback injected:"
echo "  - Logged to workflow/feedback.md"
echo "  - Directive created: workflow/board-answers/directive-${NUM}.md"
echo "  - CEO will pick this up on next loop cycle (≤60 seconds)"
echo ""
