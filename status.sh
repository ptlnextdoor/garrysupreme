#!/bin/bash
# Quick status dashboard — run anytime to see the build state

REPO="/Users/aaryapatel/garrysupreme"

clear
echo "═══════════════════════════════════════════════════════════════"
echo "                    PULSE BUILD STATUS                         "
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Current phase
echo "📊 CURRENT PHASE:"
if [ -f "$REPO/workflow/STATUS.md" ]; then
  head -5 "$REPO/workflow/STATUS.md"
else
  echo "  (Not started)"
fi

echo ""
echo "───────────────────────────────────────────────────────────────"

# Pending questions
echo "❓ CEO'S QUESTIONS FOR YOU:"
COUNT=$(ls "$REPO/workflow/board-questions/q-*.md" 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  ls -1 "$REPO/workflow/board-questions/q-"*.md 2>/dev/null | while read f; do
    NUM=$(echo "$f" | grep -o '[0-9]*')
    ANSWERED="$REPO/workflow/board-answers/a-${NUM}.md"
    if [ -f "$ANSWERED" ]; then
      echo "  ✅ q-${NUM}: ANSWERED"
    else
      echo "  ⏳ q-${NUM}: WAITING FOR YOUR ANSWER"
    fi
  done
else
  echo "  (none yet)"
fi

echo ""
echo "───────────────────────────────────────────────────────────────"

# Completed tasks
echo "✅ COMPLETED TASKS:"
COUNT=$(ls "$REPO/workflow/done/"*.md 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  ls -1 "$REPO/workflow/done/"*.md 2>/dev/null | tail -5 | while read f; do
    NUM=$(basename "$f" | sed 's/.md//')
    echo "  ✓ $NUM"
  done
  if [ "$COUNT" -gt 5 ]; then
    echo "  ... and $((COUNT - 5)) more"
  fi
else
  echo "  (none yet — tasks are still in progress)"
fi

echo ""
echo "───────────────────────────────────────────────────────────────"

# Debugger findings
echo "🐛 DEBUGGER ISSUES:"
COUNT=$(ls "$REPO/workflow/issues/"*.md 2>/dev/null | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "  ⚠️  $COUNT issue(s) found:"
  ls -1 "$REPO/workflow/issues/"*.md 2>/dev/null | while read f; do
    NUM=$(basename "$f" | sed 's/.md//')
    SEVERITY=$(grep "severity:" "$f" | head -1 | cut -d' ' -f2)
    echo "    - $NUM [$SEVERITY]"
  done
else
  echo "  (none — debugger is happy)"
fi

echo ""
echo "───────────────────────────────────────────────────────────────"

# In-progress tasks
echo "🔄 IN-PROGRESS TASKS:"
SMART=$(grep "status: in-progress" "$REPO/workflow/inbox-smart/"*.md 2>/dev/null | wc -l)
STUPID=$(grep "status: in-progress" "$REPO/workflow/inbox-stupid/"*.md 2>/dev/null | wc -l)
DEBUG=$(grep "status: in-progress" "$REPO/workflow/inbox-debug/"*.md 2>/dev/null | wc -l)

echo "  Smart Coder: $SMART task(s)"
echo "  Stupid Coder: $STUPID task(s)"
echo "  Debugger: $DEBUG task(s)"

echo ""
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "💡 QUICK COMMANDS:"
echo "  ./inject.sh \"feedback\"     → send judge feedback to CEO"
echo "  ./answer.sh 001 \"answer\"   → answer a CEO question"
echo "  cat workflow/STATUS.md     → detailed status"
echo "  ls workflow/issues/        → see all debugger issues"
echo ""
echo "═══════════════════════════════════════════════════════════════"
