# Fix: Stop Approval Prompts

Your Claude Code instances are asking for file edit approvals. **You don't need to approve each one.** Here's how to silence them:

## Quick Fix (Do This Now)

For **each Claude Code window that's asking for approval**, do:

1. Look for the prompt like: `Do you want to make this edit?` or `secret edits on (shift+tab to cycle)`
2. Press **`Shift + Tab`** 
3. Select **"Yes, allow all edits during this session"**

This tells that instance to stop asking and just do the work.

---

## Why This Happens

Claude Code is being cautious about editing files. Once you press Shift+Tab, it enters "non-interactive edit mode" and will silently write code for the rest of the session.

---

## For Future Sessions

If you want to avoid this in future builds, you can set a Claude Code preference:
- Open Claude Code Settings (⚙️)
- Look for "Confirm file edits" or similar
- Set to "Never ask" or "Automatic"

---

## Alternative (If Shift+Tab Doesn't Work)

If Shift+Tab doesn't work, try:
1. Type `/set edit-mode auto` (in the Claude instance)
2. Or just keep pressing Tab until you see "allow all edits" option, then press Enter

Once you've done this in each window, they'll work autonomously.
