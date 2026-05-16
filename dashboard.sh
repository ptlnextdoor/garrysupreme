#!/bin/bash
# LIVE DASHBOARD — run this and watch everything in one window
# No interaction needed. Updates every 5 seconds.

REPO="/Users/aaryapatel/garrysupreme"

while true; do
  clear

  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            🚀 PULSE BUILD DASHBOARD (LIVE)                     ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Current status
  if [ -f "$REPO/workflow/STATUS.md" ]; then
    PHASE=$(head -3 "$REPO/workflow/STATUS.md" | grep "Phase" | sed 's/.*Phase //' | sed 's/ .*//')
    GATE=$(head -5 "$REPO/workflow/STATUS.md" | grep "Gate" | sed 's/.*Gate: //')
    echo "📊 PHASE: $PHASE"
    echo "✅ GATE: $GATE"
  else
    echo "📊 PHASE: SETUP"
  fi
  echo ""

  # Task status
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 TASK STATUS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Count tasks
  DONE=$(ls "$REPO/workflow/done/"*.md 2>/dev/null | wc -l | tr -d ' ')
  INPROG_STUPID=$(grep -l "status: in-progress" "$REPO/workflow/inbox-stupid/"*.md 2>/dev/null | wc -l | tr -d ' ')
  INPROG_SMART=$(grep -l "status: in-progress" "$REPO/workflow/inbox-smart/"*.md 2>/dev/null | wc -l | tr -d ' ')
  PENDING_STUPID=$(grep -l "status: pending" "$REPO/workflow/inbox-stupid/"*.md 2>/dev/null | wc -l | tr -d ' ')
  PENDING_SMART=$(grep -l "status: pending" "$REPO/workflow/inbox-smart/"*.md 2>/dev/null | wc -l | tr -d ' ')

  echo "✅ COMPLETED: $DONE tasks"
  echo ""
  echo "🟢 IN-PROGRESS:"
  echo "   Stupid Coder: $INPROG_STUPID task(s)"
  echo "   Smart Coder: $INPROG_SMART task(s)"
  echo ""
  echo "⏳ PENDING:"
  echo "   Stupid Coder: $PENDING_STUPID task(s)"
  echo "   Smart Coder: $PENDING_SMART task(s)"
  echo ""

  # Last 5 completed
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🏁 LAST COMPLETIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ls -1t "$REPO/workflow/done/"*.md 2>/dev/null | head -5 | while read f; do
    TASK=$(basename "$f" | sed 's/.md//')
    echo "  ✓ $TASK"
  done
  echo ""

  # Debugger issues
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🐛 DEBUGGER FINDINGS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ISSUES=$(ls "$REPO/workflow/issues/"*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ISSUES" -gt 0 ]; then
    echo "⚠️  $ISSUES issue(s) to fix:"
    ls -1 "$REPO/workflow/issues/"*.md 2>/dev/null | head -3 | while read f; do
      ISSUE=$(basename "$f" | sed 's/.md//')
      SEVERITY=$(grep "severity:" "$f" | head -1 | cut -d' ' -f2)
      echo "  • $ISSUE [$SEVERITY]"
    done
  else
    echo "✅ No issues found"
  fi
  echo ""

  # Board status
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📢 BOARD COMMUNICATION"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  QUESTIONS=$(ls "$REPO/workflow/board-questions/"q-*.md 2>/dev/null | wc -l | tr -d ' ')
  ANSWERS=$(ls "$REPO/workflow/board-answers/" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$QUESTIONS" -gt "$ANSWERS" ]; then
    echo "❓ WAITING FOR YOUR ANSWER:"
    for f in "$REPO/workflow/board-questions/q-"*.md; do
      if [ -f "$f" ]; then
        NUM=$(basename "$f" q- | sed 's/.md//')
        ANSWER="$REPO/workflow/board-answers/a-${NUM}.md"
        if [ ! -f "$ANSWER" ]; then
          echo "   → q-$NUM (use: ./answer.sh $NUM \"your answer\")"
        fi
      fi
    done
  else
    echo "✅ All questions answered"
  fi
  echo ""

  # Quick commands
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚡ QUICK COMMANDS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ./inject.sh \"feedback\"        → Send judge feedback to CEO"
  echo "  ./answer.sh NUM \"answer\"      → Answer a board question"
  echo "  cat workflow/STATUS.md        → See detailed status"
  echo "  cat workflow/issues/ISSUE-*   → Read a debugger issue"
  echo ""
  echo "Last updated: $(date '+%H:%M:%S')"
  echo "Refreshing in 5 seconds... (Ctrl+C to stop)"
  echo ""

  sleep 5
done
