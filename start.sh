#!/bin/bash
# Launch all agents in a tmux session so you can see everything at once
# Requires: brew install tmux (if not installed)

SESSION="pulse"
REPO="/Users/aaryapatel/garrysupreme"

# Kill existing session if any
tmux kill-session -t $SESSION 2>/dev/null

# Create new session with CEO pane
tmux new-session -d -s $SESSION -n "agents" -c "$REPO"

# Split into 4 panes (2x2 grid)
tmux split-window -h -t $SESSION -c "$REPO"
tmux split-window -v -t $SESSION:0.0 -c "$REPO"
tmux split-window -v -t $SESSION:0.1 -c "$REPO"

# Create a second window for your feedback terminal
tmux new-window -t $SESSION -n "board" -c "$REPO"

# SET PANE NAMES (displayed in status line)
tmux select-pane -t $SESSION:0.0 -T "CEO"
tmux select-pane -t $SESSION:0.1 -T "Stupid-Coder"
tmux select-pane -t $SESSION:0.2 -T "Smart-Coder"
tmux select-pane -t $SESSION:0.3 -T "Debugger"

# Configure status line to show pane names
tmux set-option -t $SESSION:0 pane-border-status top
tmux set-option -t $SESSION:0 pane-border-format "#{pane_title}"

# Send init commands to each pane
# Pane 0 (top-left): CEO
tmux send-keys -t $SESSION:0.0 "clear && echo '=== CEO (Opus 4.7) ===' && echo '' && claude --model opus" Enter

# Pane 1 (top-right): Stupid Coder
tmux send-keys -t $SESSION:0.1 "clear && echo '=== STUPID CODER (Sonnet 4.6) ===' && echo '' && claude --model sonnet" Enter

# Pane 2 (bottom-left): Smart Coder
tmux send-keys -t $SESSION:0.2 "clear && echo '=== SMART CODER (Opus 4.7) ===' && echo '' && claude --model opus" Enter

# Pane 3 (bottom-right): Debugger
tmux send-keys -t $SESSION:0.3 "clear && echo '=== DEBUGGER (Opus 4.7) ===' && echo '' && claude --model opus" Enter

# Window 2: Board Member (your terminal)
tmux select-pane -t $SESSION:1 -T "BOARD"
tmux set-option -t $SESSION:1 pane-border-status top
tmux set-option -t $SESSION:1 pane-border-format "#{pane_title}"
tmux send-keys -t $SESSION:1 "cd $REPO && clear && echo '=== BOARD MEMBER (You) ===' && echo '' && echo 'Quick commands:' && echo '  ./inject.sh \"feedback here\"  — send judge feedback to CEO' && echo '  ./answer.sh 001 \"answer\"      — answer a CEO question' && echo '  cat workflow/STATUS.md       — check build progress' && echo '  ls workflow/issues/          — check debugger findings' && echo '' && echo 'Press Ctrl+C and run: watch -n 5 \"cat workflow/STATUS.md\"' && sleep 30" Enter

echo ""
echo "tmux session '$SESSION' created!"
echo ""
echo "Attach with:  tmux attach -t $SESSION"
echo ""
echo "Navigation:"
echo "  Switch panes: Ctrl+B then arrow keys"
echo "  Switch windows: Ctrl+B then n (next) or p (previous)"
echo "  Detach: Ctrl+B then d"
echo ""
echo "Window 1 (agents): 4 Claude instances in a grid"
echo "Window 2 (board): Your feedback injection terminal"
echo ""
echo "NEXT STEPS after attaching:"
echo "  1. In each Claude pane, paste the init prompt from launch.sh"
echo "  2. In the board window, answer q-001 (API keys)"
echo "  3. Run ./inject.sh to send judge feedback anytime"
echo ""
